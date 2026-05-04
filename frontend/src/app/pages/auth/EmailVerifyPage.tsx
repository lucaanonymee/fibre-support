import { Link, useNavigate } from 'react-router';
import { Mail, RefreshCw, ArrowRight, CheckCircle } from 'lucide-react';
import { LogoIcon } from '../../components/Logo';
import { useEffect, useRef, useState } from 'react';
import { apiRequest, getErrorMessage } from '../../utils/httpApi';

type AppRole = 'CLIENT' | 'TECHNICIEN' | 'ADMIN' | 'SUPER_ADMIN';
type BackendRole = AppRole | 'SUPER ADMIN';

const ROLE_HOME_PATHS: Record<AppRole, string> = {
  CLIENT: '/client/tickets',
  TECHNICIEN: '/tech/tickets',
  ADMIN: '/admin/dashboard',
  SUPER_ADMIN: '/superadmin/dashboard',
};

const OTP_LENGTH = 6;

const normalizeRole = (role: BackendRole | undefined): AppRole => {
  if (role === 'SUPER ADMIN') {
    return 'SUPER_ADMIN';
  }

  if (role === 'CLIENT' || role === 'TECHNICIEN' || role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return role;
  }

  return 'CLIENT';
};

export default function EmailVerifyPage() {
  const [code, setCode] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ''));
  const [timer, setTimer] = useState(10 * 60);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const navigate = useNavigate();
  const email = localStorage.getItem('pendingVerificationEmail') ?? '';
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const focusCodeInput = (index: number) => {
    const input = codeInputRefs.current[index];
    if (input) {
      input.focus();
      input.select();
    }
  };

  const applyDigits = (startIndex: number, rawValue: string) => {
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

  const handleDigit = (i: number, val: string) => {
    const digits = val.replace(/\D/g, '');

    if (!digits) {
      setCode((prev) => {
        const next = [...prev];
        next[i] = '';
        return next;
      });
      return;
    }

    if (digits.length > 1) {
      applyDigits(i, digits);
      return;
    }

    setCode((prev) => {
      const next = [...prev];
      next[i] = digits;
      return next;
    });

    if (i < OTP_LENGTH - 1) {
      window.requestAnimationFrame(() => focusCodeInput(i + 1));
    }
  };

  const handleKeyDown = (i: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();

      setCode((prev) => {
        const next = [...prev];

        if (next[i]) {
          next[i] = '';
          return next;
        }

        if (i > 0) {
          next[i - 1] = '';
          window.requestAnimationFrame(() => focusCodeInput(i - 1));
        }

        return next;
      });
      return;
    }

    if (event.key === 'ArrowLeft' && i > 0) {
      event.preventDefault();
      focusCodeInput(i - 1);
    }

    if (event.key === 'ArrowRight' && i < OTP_LENGTH - 1) {
      event.preventDefault();
      focusCodeInput(i + 1);
    }
  };

  const handlePaste = (i: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    applyDigits(i, event.clipboardData.getData('text'));
  };

  useEffect(() => {
    if (timer <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTimer((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [timer]);

  const handleVerify = async () => {
    if (!email) {
      setError('Email de verification introuvable. Recommencez l inscription.');
      return;
    }

    if (!allFilled) {
      setError('Saisissez le code complet a 6 chiffres.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = await apiRequest<{ user?: { role?: BackendRole } }>('/api/verifier-email', {
        method: 'POST',
        body: {
          email,
          code: code.join(''),
        },
      });

      localStorage.removeItem('pendingVerificationEmail');
      setSuccess('Email verifie avec succes. Connexion automatique...');

      const role = normalizeRole(payload?.user?.role);
      navigate(ROLE_HOME_PATHS[role], { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Verification impossible'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Email de verification introuvable. Recommencez l inscription.');
      return;
    }

    setResending(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest('/api/renvoyer-code', {
        method: 'POST',
        body: { email },
      });

      setTimer(10 * 60);
      setCode(Array.from({ length: OTP_LENGTH }, () => ''));
      setSuccess('Nouveau code envoye. Verifiez votre email.');

      window.requestAnimationFrame(() => focusCodeInput(0));
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de renvoyer le code'));
    } finally {
      setResending(false);
    }
  };

  const mins = Math.floor(timer / 60);
  const secs = timer % 60;

  const allFilled = code.every(c => c !== '');

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Inter", "Segoe UI", sans-serif', padding: '24px',
    }}>
      <div style={{
        background: 'white', borderRadius: 24, padding: '52px 48px',
        maxWidth: 440, width: '100%',
        boxShadow: '0 20px 60px rgba(26,35,126,0.12)',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          <LogoIcon size={64} />
          <span style={{ fontWeight: 800, fontSize: 16, color: '#1a237e' }}>Smart Fibre TT</span>
        </div>

        {/* Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #e3f2fd, #e8eaf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          border: '2px solid rgba(26,35,126,0.1)',
        }}>
          <Mail size={36} color="#1a237e" />
        </div>

        <h1 style={{ margin: '0 0 10px', fontSize: 26, fontWeight: 800, color: '#1a237e' }}>Vérifiez votre email</h1>
        <p style={{ margin: '0 0 8px', color: '#555', fontSize: 14, lineHeight: 1.6 }}>
          Un code de vérification à 6 chiffres a été envoyé à :
        </p>
        <p style={{ margin: '0 0 32px', color: '#1a237e', fontWeight: 700, fontSize: 15 }}>
          {email || 'Email non defini'}
        </p>

        {/* OTP Input */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
          {code.map((digit, i) => (
            <input
              key={i}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              ref={(input) => {
                codeInputRefs.current[i] = input;
              }}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={(event) => handleKeyDown(i, event)}
              onPaste={(event) => handlePaste(i, event)}
              onFocus={(event) => event.currentTarget.select()}
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              aria-label={`Chiffre ${i + 1} du code de verification`}
              style={{
                width: 52, height: 60, textAlign: 'center',
                fontSize: 24, fontWeight: 800, color: '#1a237e',
                borderRadius: 12, border: `2px solid ${digit ? '#1a237e' : '#e0e0e0'}`,
                background: digit ? '#e8eaf6' : '#fafafa',
                outline: 'none', fontFamily: 'inherit',
                boxShadow: digit ? '0 0 0 3px rgba(26,35,126,0.12)' : 'none',
                transition: 'all 0.15s',
              }}
            />
          ))}
        </div>

        {/* Separator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto 20px', maxWidth: 280 }}>
          <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: timer > 60 ? '#ff9800' : '#f44336',
            }} />
            <span style={{ fontSize: 13, color: timer > 60 ? '#ff9800' : '#f44336', fontWeight: 700 }}>
              Expire dans {mins}:{secs.toString().padStart(2, '0')}
            </span>
          </div>
          <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
        </div>

        {/* Submit btn */}
        <button onClick={handleVerify} disabled={!allFilled || loading} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px', borderRadius: 12,
          background: allFilled
            ? 'linear-gradient(135deg, #1a237e, #1565c0)'
            : '#e0e0e0',
          color: 'white',
          textDecoration: 'none', fontSize: 15, fontWeight: 700,
          boxShadow: allFilled ? '0 6px 16px rgba(26,35,126,0.3)' : 'none',
          marginBottom: 16,
          border: 'none',
          width: '100%',
          cursor: (!allFilled || loading) ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          opacity: loading ? 0.85 : 1,
        }}>
          {loading
            ? 'Verification...'
            : allFilled
              ? <><CheckCircle size={18} /> Vérifier et continuer</>
              : <>Saisissez le code complet <ArrowRight size={18} /></>}
        </button>

        {error && (
          <div style={{
            marginBottom: 12, padding: '10px 12px', borderRadius: 8,
            background: '#ffebee', border: '1px solid #ffcdd2',
            color: '#b71c1c', fontSize: 13, fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            marginBottom: 12, padding: '10px 12px', borderRadius: 8,
            background: '#e8f5e9', border: '1px solid #a5d6a7',
            color: '#1b5e20', fontSize: 13, fontWeight: 600,
          }}>
            {success}
          </div>
        )}

        {/* Resend */}
        <button onClick={handleResend} disabled={resending} style={{
          display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto',
          background: 'none', border: 'none', cursor: resending ? 'wait' : 'pointer',
          color: '#42a5f5', fontSize: 14, fontWeight: 600,
          padding: '8px 16px', borderRadius: 8,
          fontFamily: 'inherit',
          opacity: resending ? 0.7 : 1,
        }}>
          <RefreshCw size={15} />
          {resending ? 'Envoi...' : 'Renvoyer le code'}
        </button>

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #f0f0f0' }}>
          <Link to="/auth/change-email" style={{ fontSize: 13, color: '#aaa', textDecoration: 'none' }}>
            ← Modifier l'adresse email
          </Link>
        </div>

        {/* Help */}
        <div style={{
          marginTop: 20, padding: '12px 16px', borderRadius: 10,
          background: '#f8f9fa', border: '1px solid #e0e0e0',
        }}>
          <p style={{ margin: 0, fontSize: 12, color: '#888', lineHeight: 1.5 }}>
            💡 <strong>Vous ne trouvez pas l'email ?</strong> Vérifiez votre dossier spam ou courrier indésirable.
          </p>
        </div>
      </div>
    </div>
  );
}
