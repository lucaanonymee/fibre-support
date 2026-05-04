import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, ArrowRight, User, Mail, Phone, Lock, CheckCircle } from 'lucide-react';
import { LogoIcon } from '../../components/Logo';
import { useRef, useState } from 'react';
import { apiRequest, getErrorMessage } from '../../utils/httpApi';
import RecaptchaField from '../../components/RecaptchaField';

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [password, setPassword] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaInstanceKey, setRecaptchaInstanceKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const nomRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const confirmPasswordRef = useRef<HTMLInputElement | null>(null);

  const navigate = useNavigate();

  const rules = [
    { label: 'Minimum 8 caractères', ok: password.length >= 8 },
    { label: 'Au moins 1 majuscule', ok: /[A-Z]/.test(password) },
    { label: 'Au moins 1 minuscule', ok: /[a-z]/.test(password) },
    { label: 'Au moins 1 chiffre', ok: /[0-9]/.test(password) },
    { label: 'Au moins 1 caractère spécial', ok: /[!@#$%^&*]/.test(password) },
  ];

  const resetRecaptcha = () => {
    setRecaptchaToken(null);
    setRecaptchaInstanceKey((prev) => prev + 1);
  };

  const handleRegister = async () => {
    const nom = nomRef.current?.value?.trim() ?? '';
    const email = emailRef.current?.value?.trim()?.toLowerCase() ?? '';
    const numTelephone = phoneRef.current?.value?.trim() ?? '';
    const confirmation = confirmPasswordRef.current?.value ?? '';

    if (!nom || !email || !numTelephone || !password.trim() || !confirmation.trim()) {
      setError('Tous les champs sont obligatoires.');
      setSuccess(null);
      return;
    }

    if (password !== confirmation) {
      setError('Les mots de passe ne correspondent pas.');
      setSuccess(null);
      return;
    }

    if (!recaptchaToken) {
      setError('Veuillez valider le reCAPTCHA avant de continuer.');
      setSuccess(null);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest('/api/register', {
        method: 'POST',
        body: {
          nom,
          email,
          motDePasse: password,
          numTelephone,
          recaptchaToken,
        },
      });

      localStorage.setItem('pendingVerificationEmail', email);
      setSuccess('Compte cree. Un code de verification a ete envoye par email.');
      resetRecaptcha();
      navigate('/auth/verify', { replace: true });
    } catch (err) {
      const message = getErrorMessage(err, 'Inscription impossible');
      setError(message);

      if (/recaptcha|robot/i.test(message)) {
        resetRecaptcha();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#f0f4f8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Inter", "Segoe UI", sans-serif', padding: '40px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 920,
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        background: 'white', borderRadius: 20,
        overflow: 'hidden', boxShadow: '0 20px 60px rgba(26,35,126,0.12)',
      }}>
        {/* Left: Form */}
        <div style={{ padding: '48px 44px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
            <LogoIcon size={66} />
            <span style={{ fontWeight: 800, fontSize: 16, color: '#1a237e' }}>Smart Fibre TT</span>
          </div>

          <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: '#1a237e' }}>Créer un compte</h1>
          <p style={{ margin: '0 0 32px', color: '#666', fontSize: 14 }}>Inscription réservée aux clients Tunisie Telecom</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Username */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Nom d'utilisateur *</label>
              <div style={{ position: 'relative' }}>
                <User size={15} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  ref={nomRef}
                  defaultValue=""
                  placeholder="Ex: client_fibre_tt"
                  style={{
                    width: '100%', padding: '11px 12px 11px 36px',
                    borderRadius: 9, border: '1.5px solid #e0e0e0',
                    fontSize: 14, background: '#fafafa', boxSizing: 'border-box',
                    fontFamily: 'inherit', outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Adresse email *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  ref={emailRef}
                  type="email"
                  defaultValue=""
                  placeholder="votre@email.com"
                  style={{
                    width: '100%', padding: '11px 12px 11px 36px',
                    borderRadius: 9, border: '1.5px solid #e0e0e0',
                    fontSize: 14, background: '#fafafa', boxSizing: 'border-box',
                    fontFamily: 'inherit', outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>
                Numéro de téléphone tunisien *
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  ref={phoneRef}
                  defaultValue=""
                  placeholder="+21612345678"
                  style={{
                    width: '100%', padding: '11px 12px 11px 36px',
                    borderRadius: 9, border: '1.5px solid #e0e0e0',
                    fontSize: 14, background: '#fafafa', boxSizing: 'border-box',
                    fontFamily: 'inherit', outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Mot de passe *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  style={{
                    width: '100%', padding: '11px 36px 11px 36px',
                    borderRadius: 9, border: '1.5px solid #e0e0e0',
                    fontSize: 14, background: '#fafafa', boxSizing: 'border-box',
                    fontFamily: 'inherit', outline: 'none',
                  }}
                />
                <button onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}>
                  {showPass ? <EyeOff size={15} color="#aaa" /> : <Eye size={15} color="#aaa" />}
                </button>
              </div>
              {/* Password rules */}
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                {rules.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                      background: r.ok ? '#4caf50' : '#e0e0e0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {r.ok && <span style={{ color: 'white', fontSize: 9, fontWeight: 800 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 11, color: r.ok ? '#2e7d32' : '#999' }}>{r.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Confirmer le mot de passe *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  ref={confirmPasswordRef}
                  type={showConfirmPass ? 'text' : 'password'}
                  placeholder="Répéter le mot de passe"
                  style={{
                    width: '100%', padding: '11px 36px 11px 36px',
                    borderRadius: 9, border: '1.5px solid #e0e0e0',
                    fontSize: 14, background: '#fafafa', boxSizing: 'border-box',
                    fontFamily: 'inherit', outline: 'none',
                  }}
                />
                <button
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  {showConfirmPass ? <EyeOff size={15} color="#aaa" /> : <Eye size={15} color="#aaa" />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: '#ffebee', border: '1px solid #ffcdd2',
                color: '#b71c1c', fontSize: 13, fontWeight: 600,
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: '#e8f5e9', border: '1px solid #a5d6a7',
                color: '#1b5e20', fontSize: 13, fontWeight: 600,
              }}>
                {success}
              </div>
            )}

            <div style={{ marginTop: 2 }}>
              <RecaptchaField
                key={recaptchaInstanceKey}
                onTokenChange={setRecaptchaToken}
              />
            </div>

            <button onClick={handleRegister} disabled={loading} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px', borderRadius: 10,
              background: 'linear-gradient(135deg, #1a237e, #1565c0)',
              color: 'white', textDecoration: 'none', fontSize: 15, fontWeight: 700,
              boxShadow: '0 6px 16px rgba(26,35,126,0.3)',
              marginTop: 4,
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.8 : 1,
              fontFamily: 'inherit',
            }}>
              {loading ? 'Creation en cours...' : <>Créer mon compte <ArrowRight size={18} /></>}
            </button>

            <div style={{ textAlign: 'center', color: '#888', fontSize: 13 }}>
              Déjà un compte ?{' '}
              <Link to="/auth/login" style={{ color: '#42a5f5', fontWeight: 700, textDecoration: 'none' }}>
                Se connecter
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Info panel */}
        <div style={{
          background: 'linear-gradient(160deg, #1a237e 0%, #1565c0 100%)',
          padding: '48px 36px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute', borderRadius: '50%',
              width: [250, 180, 120][i], height: [250, 180, 120][i],
              border: '1px solid rgba(255,255,255,0.06)',
              top: `${[5, 50, 75][i]}%`, right: `${[-10, 10, 40][i]}%`,
              transform: 'translate(50%, -50%)',
            }} />
          ))}

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ color: 'white', fontWeight: 800, fontSize: 22, margin: '0 0 12px' }}>
              Rejoignez Smart Fibre TT
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
              En créant votre compte, vous pouvez signaler vos pannes fibre en quelques clics et suivre leur résolution en temps réel.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { icon: <CheckCircle size={18} color="#66bb6a" />, title: 'Signalement instantané', desc: 'Déclarez une panne en moins de 2 minutes' },
                { icon: <CheckCircle size={18} color="#66bb6a" />, title: 'Suivi en temps réel', desc: 'Statut mis à jour à chaque étape' },
                { icon: <CheckCircle size={18} color="#66bb6a" />, title: 'Historique complet', desc: 'Accédez à tous vos anciens tickets' },
                { icon: <CheckCircle size={18} color="#66bb6a" />, title: 'Notifications', desc: 'Alertes email à chaque action' },
              ].map((f, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ flexShrink: 0, marginTop: 1 }}>{f.icon}</div>
                  <div>
                    <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{f.title}</div>
                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 28, padding: '14px 18px', borderRadius: 10,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>COMPTE DESTINÉ AUX</div>
              <div style={{ color: '#42a5f5', fontWeight: 700, fontSize: 14 }}>Clients Tunisie Telecom uniquement</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
                Les comptes Admin et Technicien sont créés par les administrateurs du système.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
