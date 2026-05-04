import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { LogoIcon } from '../../components/Logo';
import { apiRequest, getErrorMessage } from '../../utils/httpApi';

export default function ChangeEmailPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const ancienEmail = localStorage.getItem('pendingVerificationEmail') ?? '';

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    if (!ancienEmail) {
      setError('Email actuel introuvable. Recommencez l inscription.');
      setSuccess(null);
      return;
    }

    if (!isValid) {
      setError('Veuillez saisir une adresse email valide.');
      setSuccess(null);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest('/api/modifier-email', {
        method: 'PUT',
        body: {
          ancienEmail,
          nouvelEmail: email.trim().toLowerCase(),
        },
      });

      localStorage.setItem('pendingVerificationEmail', email.trim().toLowerCase());
      setSuccess('Email modifie. Un nouveau code de verification a ete envoye.');
      navigate('/auth/verify', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de modifier l email'));
    } finally {
      setLoading(false);
    }
  };

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

        <h1 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, color: '#1a237e', textAlign: 'center' }}>
          Modifier l'adresse email
        </h1>
        <p style={{ margin: '0 0 8px', color: '#555', fontSize: 14, lineHeight: 1.6, textAlign: 'center' }}>
          Saisissez votre nouvelle adresse email. Un nouveau code de vérification sera envoyé.
        </p>
        <p style={{ margin: '0 0 28px', color: '#aaa', fontSize: 12, textAlign: 'center' }}>
          Adresse actuelle : <strong style={{ color: '#666' }}>{ancienEmail || 'non definie'}</strong>
        </p>

        {/* Email input */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#444', display: 'block', marginBottom: 8 }}>
            Nouvelle adresse email
          </label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} color="#aaa" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="email"
              placeholder="nouveau@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '14px 14px 14px 42px',
                borderRadius: 12, border: `2px solid ${email && !isValid ? '#f44336' : email && isValid ? '#4caf50' : '#e0e0e0'}`,
                fontSize: 15, fontFamily: 'inherit', outline: 'none',
                background: '#fafafa', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
          </div>
          {email && !isValid && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#f44336' }}>
              Veuillez saisir une adresse email valide.
            </p>
          )}
        </div>

        {/* Info box */}
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          background: '#e3f2fd', border: '1px solid #90caf9',
          marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 16 }}>💡</span>
          <p style={{ margin: 0, fontSize: 12, color: '#1565c0', lineHeight: 1.5 }}>
            Un nouveau code de vérification à 6 chiffres sera envoyé à cette adresse. 
            L'ancien code ne sera plus valide.
          </p>
        </div>

        {error && (
          <div style={{
            marginBottom: 16, padding: '10px 12px', borderRadius: 8,
            background: '#ffebee', border: '1px solid #ffcdd2',
            color: '#b71c1c', fontSize: 13, fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            marginBottom: 16, padding: '10px 12px', borderRadius: 8,
            background: '#e8f5e9', border: '1px solid #a5d6a7',
            color: '#1b5e20', fontSize: 13, fontWeight: 600,
          }}>
            {success}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: isValid
              ? 'linear-gradient(135deg, #1a237e, #1565c0)'
              : '#e0e0e0',
            color: 'white', fontSize: 15, fontWeight: 700,
            cursor: (!isValid || loading) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: isValid ? '0 6px 16px rgba(26,35,126,0.3)' : 'none',
            fontFamily: 'inherit', transition: 'all 0.2s',
            opacity: loading ? 0.8 : 1,
            marginBottom: 16,
          }}
        >
          {loading ? 'Envoi...' : <>Envoyer le code <ArrowRight size={18} /></>}
        </button>

        {/* Back link */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => navigate('/auth/verify')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#888', fontSize: 13, fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
            }}
          >
            <ArrowLeft size={14} /> Retour à la vérification
          </button>
        </div>
      </div>
    </div>
  );
}
