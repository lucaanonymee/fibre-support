import { Link } from 'react-router';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a1628, #1a237e)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        textAlign: 'center', maxWidth: 480, padding: '0 24px',
      }}>
        <div style={{
          fontSize: 120, fontWeight: 900, color: 'rgba(255,255,255,0.08)',
          lineHeight: 1, marginBottom: -20,
        }}>404</div>
        <h1 style={{
          margin: '0 0 12px', fontSize: 28, fontWeight: 800, color: 'white',
        }}>Page introuvable</h1>
        <p style={{
          margin: '0 0 32px', fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6,
        }}>
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '12px 24px', borderRadius: 10,
              border: '1.5px solid rgba(255,255,255,0.2)',
              background: 'transparent', color: 'white',
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: 'inherit',
            }}
          >
            <ArrowLeft size={16} /> Retour
          </button>
          <Link to="/" style={{
            padding: '12px 24px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #42a5f5, #1565c0)',
            color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(66,165,245,0.3)',
          }}>
            <Home size={16} /> Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
