import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { MapPlaceholder } from '../../components/MapPlaceholder';
import { User, Mail, Lock, Eye, EyeOff, Map, CheckCircle2, ArrowRight } from 'lucide-react';
import { apiRequest, getErrorMessage } from '../../utils/httpApi';

interface ZoneInterventionPayload {
  type: 'Polygon';
  coordinates: number[][][];
}

interface CreatedAdmin {
  nom?: string;
  email?: string;
}

const closePolygonIfNeeded = (points: [number, number][]): [number, number][] => {
  if (points.length === 0) {
    return points;
  }

  const first = points[0];
  const last = points[points.length - 1];

  if (first[0] === last[0] && first[1] === last[1]) {
    return points;
  }

  return [...points, first];
};

const toZoneIntervention = (points: [number, number][]): ZoneInterventionPayload | null => {
  if (points.length < 3) {
    return null;
  }

  const closed = closePolygonIfNeeded(points);
  if (closed.length < 4) {
    return null;
  }

  // GeoJSON Polygon expects [lng, lat].
  const ring = closed.map(([lat, lng]) => [lng, lat]);

  return {
    type: 'Polygon',
    coordinates: [ring],
  };
};

export default function SuperAdminCreateAdminPage() {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [zonePoints, setZonePoints] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedAdmin | null>(null);

  const zoneReady = zonePoints.length >= 3;

  const zonePayload = useMemo(() => toZoneIntervention(zonePoints), [zonePoints]);

  const resetForm = () => {
    setNom('');
    setEmail('');
    setMotDePasse('');
    setZonePoints([]);
    setDrawMode(false);
    setError(null);
  };

  const handleCreateAdmin = async () => {
    if (!nom.trim() || !email.trim() || !motDePasse.trim()) {
      setError('Tous les champs du compte sont obligatoires.');
      return;
    }

    if (!zonePayload) {
      setError('Ajoutez au moins 3 points pour definir une zone valide.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<{ user?: CreatedAdmin; message?: string }>('/api/superadmin/admin', {
        method: 'POST',
        body: {
          nom: nom.trim(),
          email: email.trim().toLowerCase(),
          motDePasse,
          zoneIntervention: zonePayload,
        },
      });

      setCreated(response.user || { nom: nom.trim(), email: email.trim().toLowerCase() });
      resetForm();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Creation de l\'administrateur impossible.'));
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
          <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Admin cree avec succes !</h2>
          <p style={{ color: '#555', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
            L'administrateur <strong>{created.nom || 'Nouveau compte admin'}</strong> a ete cree avec succes.
            Un email de bienvenue a ete envoye.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setCreated(null)} style={{
              flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #e0e0e0',
              background: 'white', color: '#666', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
            }}>Creer un autre</button>
            <Link to="/superadmin/utilisateurs" style={{
              flex: 1, padding: '12px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #1a237e, #1565c0)',
              color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              Voir les utilisateurs <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Creer un Administrateur</h1>
        <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Renseignez les informations du compte puis dessinez la zone d'intervention</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{
          minWidth: 0,
          background: 'white', borderRadius: 16, padding: '28px',
          border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        }}>
          <h2 style={{ margin: '0 0 24px', fontSize: 15, fontWeight: 700, color: '#1a237e', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#1a237e', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>1</span>
            Informations du compte
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#444', display: 'block', marginBottom: 6 }}>Nom complet *</label>
              <div style={{ position: 'relative' }}>
                <User size={15} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  value={nom}
                  onChange={(event) => setNom(event.target.value)}
                  placeholder="Nom de l'administrateur"
                  style={{
                    width: '100%', padding: '11px 12px 11px 36px', borderRadius: 9, border: '1.5px solid #e0e0e0',
                    fontSize: 14, background: '#fafafa', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#444', display: 'block', marginBottom: 6 }}>Email professionnel *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@tunisietelecom.tn"
                  style={{
                    width: '100%', padding: '11px 12px 11px 36px', borderRadius: 9, border: '1.5px solid #e0e0e0',
                    fontSize: 14, background: '#fafafa', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#444', display: 'block', marginBottom: 6 }}>Mot de passe provisoire *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={motDePasse}
                  onChange={(event) => setMotDePasse(event.target.value)}
                  placeholder="Mot de passe provisoire"
                  style={{
                    width: '100%', padding: '11px 36px 11px 36px', borderRadius: 9, border: '1.5px solid #e0e0e0',
                    fontSize: 14, background: '#fafafa', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button onClick={() => setShowPass((prev) => !prev)} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}>
                  {showPass ? <EyeOff size={15} color="#aaa" /> : <Eye size={15} color="#aaa" />}
                </button>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#888' }}>
                Minimum 8 caracteres avec majuscule, minuscule, chiffre et symbole.
              </p>
            </div>
          </div>
        </div>

        <div style={{
          minWidth: 0,
          background: 'white', borderRadius: 16, padding: '28px',
          border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#1a237e', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#1a237e', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>2</span>
            Definir la zone sur la carte
          </h2>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#888' }}>
            <Map size={13} style={{ verticalAlign: 'middle' }} /> Dessinez un polygone pour delimiter la zone d'intervention
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              onClick={() => setDrawMode(!drawMode)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1.5px solid',
                borderColor: drawMode ? '#1a237e' : '#e0e0e0',
                background: drawMode ? '#1a237e' : 'white',
                color: drawMode ? 'white' : '#555',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {drawMode ? 'Mode dessin actif' : 'Activer le dessin'}
            </button>

            <button
              onClick={() => {
                setZonePoints([]);
                setDrawMode(false);
              }}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e0e0e0',
                background: 'white', color: '#666', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Reinitialiser
            </button>
          </div>

          <MapPlaceholder
            height={300}
            showPolygon={false}
            drawMode={drawMode}
            editablePolygon={zonePoints}
            onEditablePolygonChange={setZonePoints}
            markers={[
              { x: 50, y: 48, label: 'Centre zone', color: '#1a237e', type: 'admin' },
            ]}
          />

          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{
              padding: '10px 12px', borderRadius: 8,
              background: '#f8faff', border: '1px solid #e3f2fd',
            }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Points dessines</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: zoneReady ? '#2e7d32' : '#1a237e' }}>
                {zonePoints.length} {zoneReady ? '(zone valide)' : '(minimum 3)'}
              </div>
            </div>

            <div style={{
              padding: '10px 12px', borderRadius: 8,
              background: '#f8faff', border: '1px solid #e3f2fd',
            }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Actions</div>
              <div style={{ fontSize: 12, color: '#555' }}>Clic gauche: ajouter, glisser: deplacer, clic droit: supprimer</div>
            </div>
          </div>

          <div style={{
            marginTop: 10, padding: '10px 12px', borderRadius: 8,
            background: zoneReady ? '#e8f5e9' : '#fff8e1',
            border: `1px solid ${zoneReady ? '#a5d6a7' : '#ffe082'}`,
            fontSize: 12, color: zoneReady ? '#2e7d32' : '#8d6e63',
          }}>
            {zoneReady
              ? 'Zone prete pour enregistrement.'
              : 'Ajoutez au moins 3 points pour former une zone valide.'}
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: 12,
          padding: '12px 14px',
          borderRadius: 10,
          background: '#ffebee',
          border: '1px solid #ffcdd2',
          color: '#b71c1c',
          fontSize: 13,
          fontWeight: 600,
        }}>
          {error}
        </div>
      )}

      <div style={{
        marginTop: 20, background: 'white', borderRadius: 16, padding: '20px 28px',
        border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: 13, color: '#666' }}>
          <strong style={{ color: '#1a237e' }}>Resume :</strong> {nom || '---'} · {email || '---'}
        </div>
        <div style={{ display: 'flex' }}>
          <button onClick={() => void handleCreateAdmin()} disabled={!zoneReady || loading} style={{
            padding: '12px 28px', borderRadius: 10, border: 'none',
            background: zoneReady ? 'linear-gradient(135deg, #1a237e, #1565c0)' : '#c5cae9',
            color: 'white', cursor: !zoneReady ? 'not-allowed' : (loading ? 'wait' : 'pointer'), fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: zoneReady ? '0 6px 16px rgba(26,35,126,0.3)' : 'none', fontFamily: 'inherit', opacity: loading ? 0.85 : 1,
          }}>
            <CheckCircle2 size={16} /> {loading ? 'Creation...' : 'Creer l\'administrateur'}
          </button>
        </div>
      </div>
    </div>
  );
}
