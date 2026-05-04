import { Link } from 'react-router';
import { Mail, ArrowRight, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { LogoIcon } from '../../components/Logo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest, getErrorMessage } from '../../utils/httpApi';
import RecaptchaField from '../../components/RecaptchaField';

type Step = 1 | 2 | 3 | 4;

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const OTP_LENGTH = 6;

const maskEmail = (value: string): string => {
  const [local, domain] = value.split('@');
  if (!local || !domain) {
    return value;
  }

  const visible = local.slice(0, 2);
  const hidden = '*'.repeat(Math.max(local.length - 2, 2));
  return `${visible}${hidden}@${domain}`;
};

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>(1);
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ''));
  const [timer, setTimer] = useState(10 * 60);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaInstanceKey, setRecaptchaInstanceKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const steps = [
    { n: 1, label: 'Email' },
    { n: 2, label: 'Vérification' },
    { n: 3, label: 'Nouveau mot de passe' },
  ];

  const allCodeFilled = code.every((digit) => digit !== '');

  const focusCodeInput = (index: number) => {
    const input = codeInputRefs.current[index];
    if (input) {
      input.focus();
      input.select();
    }
  };

  const applyOtpDigits = (startIndex: number, rawValue: string) => {
    const digits = rawValue.replace(/\D/g, '').slice(0, OTP_LENGTH - startIndex).split('');

    if (digits.length === 0) {
      return;
    }

    setCode((prev) => {
      const next = [...prev];
      digits.forEach((digit, offset) => {
        next[startIndex + offset] = digit;
      });
      return next;
    });

    const focusIndex = Math.min(startIndex + digits.length, OTP_LENGTH - 1);
    window.requestAnimationFrame(() => focusCodeInput(focusIndex));
  };

  const handleOtpChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');

    if (!digits) {
      setCode((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    if (digits.length > 1) {
      applyOtpDigits(index, digits);
      return;
    }

    setCode((prev) => {
      const next = [...prev];
      next[index] = digits;
      return next;
    });

    if (index < OTP_LENGTH - 1) {
      window.requestAnimationFrame(() => focusCodeInput(index + 1));
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();

      setCode((prev) => {
        const next = [...prev];

        if (next[index]) {
          next[index] = '';
          return next;
        }

        if (index > 0) {
          next[index - 1] = '';
          window.requestAnimationFrame(() => focusCodeInput(index - 1));
        }

        return next;
      });
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusCodeInput(index - 1);
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusCodeInput(index + 1);
    }
  };

  const handleOtpPaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    applyOtpDigits(index, event.clipboardData.getData('text'));
  };

  const resetRecaptcha = () => {
    setRecaptchaToken(null);
    setRecaptchaInstanceKey((prev) => prev + 1);
  };

  const passwordRules = useMemo(
    () => [
      { label: 'Minimum 8 caractères', ok: newPassword.length >= 8 },
      { label: 'Au moins 1 majuscule', ok: /[A-Z]/.test(newPassword) },
      { label: 'Au moins 1 minuscule', ok: /[a-z]/.test(newPassword) },
      { label: 'Au moins 1 chiffre', ok: /[0-9]/.test(newPassword) },
      { label: 'Au moins 1 caractère spécial', ok: /[^A-Za-z\d]/.test(newPassword) },
    ],
    [newPassword],
  );

  useEffect(() => {
    if (step !== 2 || timer <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTimer((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [step, timer]);

  const handleSendCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Adresse email requise.');
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('Format d email invalide.');
      return;
    }

    if (!recaptchaToken) {
      setError('Veuillez valider le reCAPTCHA avant de continuer.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest('/api/mot-de-passe-oublie', {
        method: 'POST',
        body: {
          email: normalizedEmail,
          recaptchaToken,
        },
      });

      setEmail(normalizedEmail);
      setCode(Array.from({ length: OTP_LENGTH }, () => ''));
      setTimer(10 * 60);
      setStep(2);
      setSuccess('Code de réinitialisation envoyé. Vérifiez votre boite mail.');
      resetRecaptcha();

      window.requestAnimationFrame(() => focusCodeInput(0));
    } catch (err) {
      const message = getErrorMessage(err, 'Impossible d envoyer le code de reinitialisation.');
      setError(message);

      if (/recaptcha|robot/i.test(message)) {
        resetRecaptcha();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!allCodeFilled) {
      setError('Saisissez le code complet à 6 chiffres.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest('/api/verifier-code-reset', {
        method: 'POST',
        body: {
          email,
          code: code.join(''),
        },
      });

      setStep(3);
      setSuccess('Code valide. Vous pouvez définir un nouveau mot de passe.');
    } catch (err) {
      setError(getErrorMessage(err, 'Verification du code impossible.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('Nouveau mot de passe et confirmation requis.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      setError('Le mot de passe doit respecter les règles de sécurité affichées.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest('/api/reset-mot-de-passe', {
        method: 'POST',
        body: {
          email,
          nouveauMotDePasse: newPassword,
          confirmationMotDePasse: confirmPassword,
        },
      });

      setStep(4);
      setSuccess('Mot de passe réinitialisé avec succès.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(getErrorMessage(err, 'Reinitialisation du mot de passe impossible.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setError('Adresse email introuvable. Recommencez le processus.');
      return;
    }

    if (!recaptchaToken) {
      setError('Veuillez valider le reCAPTCHA pour renvoyer le code.');
      return;
    }

    setResending(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest('/api/mot-de-passe-oublie', {
        method: 'POST',
        body: {
          email,
          recaptchaToken,
        },
      });

      setTimer(10 * 60);
      setCode(Array.from({ length: OTP_LENGTH }, () => ''));
      setSuccess('Nouveau code envoyé. Vérifiez votre boite mail.');
      resetRecaptcha();

      window.requestAnimationFrame(() => focusCodeInput(0));
    } catch (err) {
      const message = getErrorMessage(err, 'Impossible de renvoyer le code.');
      setError(message);

      if (/recaptcha|robot/i.test(message)) {
        resetRecaptcha();
      }
    } finally {
      setResending(false);
    }
  };

  const mins = Math.floor(timer / 60);
  const secs = timer % 60;

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Inter", "Segoe UI", sans-serif', padding: '24px',
    }}>
      <div style={{
        background: 'white', borderRadius: 24, padding: '52px 48px',
        maxWidth: 460, width: '100%',
        boxShadow: '0 20px 60px rgba(26,35,126,0.12)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36 }}>
          <LogoIcon size={64} />
          <span style={{ fontWeight: 800, fontSize: 16, color: '#1a237e' }}>Smart Fibre TT</span>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: step > s.n ? '#4caf50' : step === s.n ? '#1a237e' : '#e0e0e0',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                  transition: 'all 0.3s',
                }}>
                  {step > s.n ? <CheckCircle2 size={16} /> : s.n}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
                  color: step >= s.n ? '#1a237e' : '#aaa',
                }}>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  flex: 1, height: 2, marginBottom: 16,
                  background: step > s.n ? '#4caf50' : '#e0e0e0',
                  transition: 'background 0.3s',
                }} />
              )}
            </div>
          ))}
        </div>

        {/* STEP 1: Email */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Mail size={30} color="#1a237e" />
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Mot de passe oublié ?</h2>
              <p style={{ margin: 0, color: '#666', fontSize: 14 }}>Saisissez votre email pour recevoir un code de réinitialisation</p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Adresse email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 12px 12px 36px',
                    borderRadius: 10, border: '1.5px solid #e0e0e0',
                    fontSize: 14, background: '#fafafa', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <RecaptchaField
                key={`forgot-step-1-${recaptchaInstanceKey}`}
                onTokenChange={setRecaptchaToken}
              />
            </div>

            <button onClick={handleSendCode} disabled={loading} style={{
              width: '100%', padding: '13px', borderRadius: 10,
              background: 'linear-gradient(135deg, #1a237e, #1565c0)',
              color: 'white', border: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 6px 16px rgba(26,35,126,0.3)', fontFamily: 'inherit',
              opacity: loading ? 0.8 : 1,
            }}>
              {loading ? 'Envoi...' : <>Envoyer le code <ArrowRight size={18} /></>}
            </button>
          </div>
        )}

        {/* STEP 2: Code OTP */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Saisir le code</h2>
              <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
                Code envoyé à <strong>{maskEmail(email)}</strong>
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
              {code.map((digit, i) => (
                <input key={i} type="text" maxLength={1} value={digit}
                  inputMode="numeric"
                  ref={(input) => {
                    codeInputRefs.current[i] = input;
                  }}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(i, event)}
                  onPaste={(event) => handleOtpPaste(i, event)}
                  onFocus={(event) => event.currentTarget.select()}
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  aria-label={`Chiffre ${i + 1} du code de reinitialisation`}
                  style={{
                    width: 48, height: 56, textAlign: 'center',
                    fontSize: 22, fontWeight: 800, color: '#1a237e',
                    borderRadius: 10, border: `2px solid ${digit ? '#1a237e' : '#e0e0e0'}`,
                    background: digit ? '#e8eaf6' : '#fafafa', outline: 'none', fontFamily: 'inherit',
                  }}
                />
              ))}
            </div>

            <div style={{ textAlign: 'center', marginBottom: 16, color: timer > 60 ? '#ff9800' : '#f44336', fontWeight: 700, fontSize: 13 }}>
              Expire dans {mins}:{secs.toString().padStart(2, '0')}
            </div>

            <button onClick={handleVerifyCode} disabled={!allCodeFilled || loading} style={{
              width: '100%', padding: '13px', borderRadius: 10,
              background: allCodeFilled ? 'linear-gradient(135deg, #1a237e, #1565c0)' : '#e0e0e0',
              color: 'white', border: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
              opacity: loading ? 0.85 : 1,
            }}>
              {loading ? 'Verification...' : 'Verifier le code'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
              <button
                onClick={() => {
                  setStep(1);
                  setError(null);
                  setSuccess(null);
                }}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  padding: 0,
                }}
              >
                Modifier l email
              </button>

              <button
                onClick={handleResendCode}
                disabled={resending || !recaptchaToken}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#42a5f5',
                  cursor: resending ? 'wait' : 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  padding: 0,
                  opacity: resending ? 0.7 : 1,
                }}
              >
                {resending ? 'Renvoi...' : 'Renvoyer le code'}
              </button>
            </div>

            <div style={{ marginTop: 14 }}>
              <RecaptchaField
                key={`forgot-step-2-${recaptchaInstanceKey}`}
                onTokenChange={setRecaptchaToken}
                size="compact"
              />
            </div>
          </div>
        )}

        {/* STEP 3: New Password */}
        {step === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Lock size={30} color="#2e7d32" />
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Nouveau mot de passe</h2>
              <p style={{ margin: 0, color: '#666', fontSize: 14 }}>Choisissez un mot de passe sécurisé</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Nouveau mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      width: '100%', padding: '12px 36px 12px 36px',
                      borderRadius: 10, border: '1.5px solid #e0e0e0',
                      fontSize: 14, background: '#fafafa', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                  <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {showPass ? <EyeOff size={15} color="#aaa" /> : <Eye size={15} color="#aaa" />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Confirmer le mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      width: '100%', padding: '12px 36px 12px 36px',
                      borderRadius: 10, border: '1.5px solid #e0e0e0',
                      fontSize: 14, background: '#fafafa', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {passwordRules.map((rule) => (
                <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: rule.ok ? '#4caf50' : '#e0e0e0',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 11, color: rule.ok ? '#2e7d32' : '#999' }}>{rule.label}</span>
                </div>
              ))}
            </div>

            <button onClick={handleResetPassword} disabled={loading} style={{
              width: '100%', padding: '13px', borderRadius: 10,
              background: 'linear-gradient(135deg, #1a237e, #1565c0)',
              color: 'white', border: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
              opacity: loading ? 0.8 : 1,
            }}>
              {loading ? 'Reinitialisation...' : 'Reinitialiser le mot de passe'}
            </button>
          </div>
        )}

        {/* STEP 4: Success */}
        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 0 0 8px rgba(76,175,80,0.1)',
            }}>
              <CheckCircle2 size={40} color="#4caf50" />
            </div>
            <h2 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 800, color: '#1a237e' }}>Mot de passe réinitialisé !</h2>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
              Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
            <Link to="/auth/login" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px', borderRadius: 10,
              background: 'linear-gradient(135deg, #1a237e, #1565c0)',
              color: 'white', textDecoration: 'none', fontSize: 15, fontWeight: 700,
            }}>
              Aller à la connexion <ArrowRight size={18} />
            </Link>
          </div>
        )}

        {error && (
          <div style={{
            marginTop: 14,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#ffebee',
            border: '1px solid #ffcdd2',
            color: '#b71c1c',
            fontSize: 13,
            fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        {success && step !== 4 && (
          <div style={{
            marginTop: 14,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#e8f5e9',
            border: '1px solid #a5d6a7',
            color: '#1b5e20',
            fontSize: 13,
            fontWeight: 600,
          }}>
            {success}
          </div>
        )}

        {step < 4 && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Link to="/auth/login" style={{ fontSize: 13, color: '#aaa', textDecoration: 'none' }}>
              ← Retour à la connexion
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
