import { useState } from 'react';
import { Link } from 'react-router';
import { UserPlus, Mail, Lock, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { apiRequest, getErrorMessage } from '../../utils/httpApi';

interface CreatedTechnician {
  nom?: string;
  email?: string;
}

export default function AdminCreateTechnicianPage() {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [categorie, setCategorie] = useState<'UGS' | 'ULS'>('UGS');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedTechnician | null>(null);

  const resetForm = () => {
    setNom('');
    setEmail('');
    setMotDePasse('');
    setCategorie('UGS');
    setError(null);
  };

  const handleCreateTechnician = async () => {
    if (!nom.trim() || !email.trim() || !motDePasse.trim()) {
      setError('Tous les champs sont obligatoires.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<{ user?: CreatedTechnician }>('/api/admin/technicien', {
        method: 'POST',
        body: {
          nom: nom.trim(),
          email: email.trim().toLowerCase(),
          motDePasse,
          categorie,
        },
      });

      setCreated(response.user || { nom: nom.trim(), email: email.trim().toLowerCase() });
      resetForm();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Creation du technicien impossible.'));
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{
          background: 'white', borderRadius: 24, padding: '52px 44px', textAlign: 'center', maxWidth: 420,
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid #e8ecf0',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: '#e8f5e9',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            boxShadow: '0 0 0 10px rgba(76,175,80,0.08)',
          }}>
            <CheckCircle2 size={40} color="#4caf50" />
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Technicien cree avec succes !</h2>
          <p style={{ color: '#555', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
            Le technicien <strong>{created.nom || 'Nouveau technicien'}</strong> a ete cree avec succes.
            Un email de bienvenue a ete envoye.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setCreated(null)} style={{
              flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #e0e0e0',
              background: 'white', color: '#666', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
            }}>Creer un autre</button>
            <Link to="/admin/techniciens" style={{
              flex: 1, padding: '12px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #1a237e, #1565c0)',
              color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              Voir les techniciens <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Creer un Technicien</h1>
        <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Le technicien cree heritera automatiquement de votre zone d'intervention</p>
      </div>

      <div style={{
        background: 'white', borderRadius: 16, padding: '28px',
        border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
      }}>
        <h2 style={{ margin: '0 0 24px', fontSize: 15, fontWeight: 700, color: '#1a237e', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#1a237e', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>1</span>
          Informations du compte technicien
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#444', display: 'block', marginBottom: 5 }}>Nom d'utilisateur *</label>
            <div style={{ position: 'relative' }}>
              <UserPlus size={15} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={nom}
                onChange={(event) => setNom(event.target.value)}
                placeholder="Nom du technicien"
                style={{
                  width: '100%', padding: '11px 12px 11px 36px', borderRadius: 9, border: '1.5px solid #e0e0e0',
                  fontSize: 14, background: '#fafafa', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#444', display: 'block', marginBottom: 5 }}>Email professionnel *</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tech@tt.tn"
                style={{
                  width: '100%', padding: '11px 12px 11px 36px', borderRadius: 9, border: '1.5px solid #e0e0e0',
                  fontSize: 14, background: '#fafafa', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#444', display: 'block', marginBottom: 5 }}>Mot de passe provisoire *</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={motDePasse}
                onChange={(event) => setMotDePasse(event.target.value)}
                placeholder="Mot de passe provisoire"
                style={{
                  width: '100%', padding: '11px 36px 11px 36px', borderRadius: 9, border: '1.5px solid #e0e0e0',
                  fontSize: 14, background: '#fafafa', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={15} color="#888" /> : <Eye size={15} color="#888" />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#444', display: 'block', marginBottom: 5 }}>Categorie *</label>
            <select value={categorie} onChange={(event) => setCategorie(event.target.value as 'UGS' | 'ULS')} style={{
              width: '100%', padding: '11px 12px', borderRadius: 9, border: '1.5px solid #e0e0e0',
              fontSize: 14, background: '#fafafa', fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
            }}>
              <option value="UGS">UGS — Unite Gestion Service</option>
              <option value="ULS">ULS — Unite Livraison Service</option>
            </select>
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: 12,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#ffebee',
            border: '1px solid #ffcdd2',
            color: '#b71c1c',
            fontSize: 12,
            fontWeight: 700,
          }}>
            {error}
          </div>
        )}

        <div style={{
          marginTop: 14, padding: '10px 14px', borderRadius: 8,
          background: '#e3f2fd', border: '1px solid #90caf9', fontSize: 12, color: '#1565c0',
        }}>
          Le technicien herite automatiquement de votre zone d'intervention.
        </div>
      </div>

      <div style={{
        marginTop: 20, background: 'white', borderRadius: 16, padding: '20px 28px',
        border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: 13, color: '#666' }}>
          <strong style={{ color: '#1a237e' }}>Resume :</strong> {nom || '—'} · {email || '—'}
        </div>
        <div style={{ display: 'flex' }}>
          <button onClick={handleCreateTechnician} disabled={loading} style={{
            padding: '12px 28px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #1a237e, #1565c0)',
            color: 'white', cursor: loading ? 'wait' : 'pointer', fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 6px 16px rgba(26,35,126,0.3)', fontFamily: 'inherit', opacity: loading ? 0.8 : 1,
          }}>
            <CheckCircle2 size={16} /> {loading ? 'Creation...' : 'Creer le technicien'}
          </button>
        </div>
      </div>
    </div>
  );
}
