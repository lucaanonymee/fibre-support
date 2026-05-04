import { Link, useNavigate, useSearchParams } from 'react-router';
import { Eye, EyeOff, ArrowRight, Lock, Mail, User, Wrench, Shield, Crown } from 'lucide-react';
import { LogoIcon } from '../../components/Logo';
import { useState } from 'react';
import { ApiError, apiRequest, getErrorMessage } from '../../utils/httpApi';

const fiberImg = 'https://images.unsplash.com/photo-1726428977757-e724066e4447?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';

const ROLES = [
  { label: 'Client', icon: User, desc: 'Espace client' },
  { label: 'Technicien', icon: Wrench, desc: 'Espace technicien' },
  { label: 'Admin', icon: Shield, desc: 'Espace admin' },
  { label: 'Super Admin', icon: Crown, desc: 'Espace super admin' },
] as const;

type AppRole = 'CLIENT' | 'TECHNICIEN' | 'ADMIN' | 'SUPER_ADMIN';
type BackendRole = AppRole | 'SUPER ADMIN';

const ROLE_HOME_PATHS: Record<AppRole, string> = {
  CLIENT: '/client/tickets',
  TECHNICIEN: '/tech/tickets',
  ADMIN: '/admin/dashboard',
  SUPER_ADMIN: '/superadmin/dashboard',
};

const ROLE_PATH_PREFIX: Record<AppRole, string> = {
  CLIENT: '/client',
  TECHNICIEN: '/tech',
  ADMIN: '/admin',
  SUPER_ADMIN: '/superadmin',
};

const normalizeRole = (role: BackendRole | undefined): AppRole => {
  if (role === 'SUPER ADMIN') {
    return 'SUPER_ADMIN';
  }

  if (role === 'CLIENT' || role === 'TECHNICIEN' || role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return role;
  }

  return 'CLIENT';
};

const isSafeInternalPath = (value: string | null): value is string => {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'));
};

const buildLoginErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return 'Trop de tentatives de connexion. Veuillez patienter quelques minutes puis reessayer.';
    }

    if (error.status >= 500) {
      return 'Service temporairement indisponible. Veuillez reessayer plus tard.';
    }
  }

  return getErrorMessage(error, 'Connexion impossible');
};

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    setError(null);
    setEmailError(null);
    setPasswordError(null);

    if (!normalizedEmail || !motDePasse.trim()) {
      if (!normalizedEmail) {
        setEmailError('Email requis');
      }
      if (!motDePasse.trim()) {
        setPasswordError('Mot de passe requis');
      }
      return;
    }

    setLoading(true);

    try {
      const user = await apiRequest<{ role?: BackendRole; email?: string; nom?: string }>('/api/login', {
        method: 'POST',
        body: {
          email: normalizedEmail,
          motDePasse,
        },
      });

      const backendRole = (user.role ?? 'CLIENT') as BackendRole;
      const role = normalizeRole(backendRole);
      const nextParam = searchParams.get('next');
      const canUseNext =
        isSafeInternalPath(nextParam) &&
        nextParam.startsWith(ROLE_PATH_PREFIX[role]);

      const destination = canUseNext ? nextParam : ROLE_HOME_PATHS[role];

      navigate(destination, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        if (/email/i.test(err.message)) {
          setEmailError(err.message);
        } else if (/mot\s*de\s*passe/i.test(err.message)) {
          setPasswordError(err.message);
        } else {
          setError('Identifiants invalides.');
        }
        return;
      }

      if (err instanceof ApiError && err.status === 403 && /email non verifi|email non vérifié/i.test(err.message)) {
        localStorage.setItem('pendingVerificationEmail', normalizedEmail);
      }

      setError(buildLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: '"Inter", "Segoe UI", sans-serif',
    }}>
      {/* Left panel */}
      <div style={{
        flex: '0 0 540px', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '48px 52px',
        background: 'white', position: 'relative', zIndex: 1,
        boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <LogoIcon size={72} />
          <span style={{ fontWeight: 800, fontSize: 18, color: '#1a237e' }}>Smart Fibre TT</span>
        </div>

        <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: '#1a237e' }}>Bienvenue !</h1>
        <p style={{ margin: '0 0 28px', color: '#666', fontSize: 14 }}>
          Connectez-vous à votre espace personnel
        </p>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#333', display: 'block', marginBottom: 6 }}>
              Adresse email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#aaa" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) {
                    setEmailError(null);
                  }
                }}
                style={{
                  width: '100%', padding: '11px 14px 11px 40px',
                  borderRadius: 10, border: '1.5px solid #e0e0e0',
                  fontSize: 14, outline: 'none',
                  background: '#fafafa', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            {emailError && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#b71c1c', fontWeight: 600 }}>
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#333', display: 'block', marginBottom: 6 }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#aaa" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={motDePasse}
                onChange={(e) => {
                  setMotDePasse(e.target.value);
                  if (passwordError) {
                    setPasswordError(null);
                  }
                }}
                style={{
                  width: '100%', padding: '11px 40px 11px 40px',
                  borderRadius: 10, border: '1.5px solid #e0e0e0',
                  fontSize: 14, outline: 'none',
                  background: '#fafafa', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                {showPass ? <EyeOff size={16} color="#aaa" /> : <Eye size={16} color="#aaa" />}
              </button>
            </div>
            {passwordError && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#b71c1c', fontWeight: 600 }}>
                {passwordError}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Link to="/auth/forgot" style={{ fontSize: 13, color: '#42a5f5', textDecoration: 'none', fontWeight: 600 }}>
              Mot de passe oublié ?
            </Link>
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

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #1a237e, #1565c0)',
              color: 'white', fontSize: 15, fontWeight: 700,
              boxShadow: '0 6px 16px rgba(26,35,126,0.3)',
              cursor: loading ? 'wait' : 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading ? 'Connexion...' : <>Se connecter <ArrowRight size={18} /></>}
          </button>

          <div style={{ textAlign: 'center', color: '#888', fontSize: 14 }}>
            Pas encore de compte ?{' '}
            <Link to="/auth/register" style={{ color: '#42a5f5', fontWeight: 700, textDecoration: 'none' }}>
              Créer un compte
            </Link>
          </div>
        </div>

        {/* Back to landing */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
          <Link to="/" style={{ fontSize: 13, color: '#aaa', textDecoration: 'none' }}>
            ← Retour à l'accueil
          </Link>
        </div>
      </div>

      {/* Right panel */}
      <div style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #1a237e 0%, #1565c0 100%)',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${fiberImg})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.15,
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 48,
        }}>
          <div style={{ textAlign: 'center', color: 'white', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
              <LogoIcon size={150} radius={28} />
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 16px', letterSpacing: -0.5 }}>
              Smart Fibre TT
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 1.6, marginBottom: 36 }}>
              Plateforme intelligente de gestion et priorisation des incidents fibre optique — Tunisie Telecom
            </p>

            {/* Roles overview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
              {ROLES.map((r) => {
                const Icon = r.icon;
                return (
                  <div key={r.label} style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', gap: 10,
                    textAlign: 'left',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'rgba(255,255,255,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={16} color="rgba(255,255,255,0.9)" />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{r.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                '🔒 Authentification sécurisée par rôle',
                '🌍 Assignation géographique automatique',
                '🤖 Priorisation par intelligence artificielle',
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  fontSize: 13, color: 'rgba(255,255,255,0.8)',
                  textAlign: 'left',
                }}>{item}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
