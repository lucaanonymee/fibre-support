import { useState } from 'react';
import { Link } from 'react-router';
import { AlertCircle, CheckCircle2, MapPin, Send, LocateFixed } from 'lucide-react';
import { MapPlaceholder } from '../../components/MapPlaceholder';
import { apiRequest, getErrorMessage } from '../../utils/httpApi';

const problemTypes = [
  'Coupure totale',
  'Qualité dégradée',
  'Modem défectueux',
  'Câble endommagé',
  'Configuration modem',
  'Débit faible',
];

const descriptionPlaceholders: Record<string, string> = {
  'Coupure totale': 'Ex: Plus de connexion depuis 06:00. Voyant LOS rouge sur l\'ONT, aucun appareil n\'a internet.',
  'Qualité dégradée': 'Ex: Connexion instable avec coupures fréquentes, surtout le soir. Ping très élevé.',
  'Modem défectueux': 'Ex: Le modem redémarre tout seul et les voyants clignotent en continu.',
  'Configuration modem': 'Ex: Le modem est connecté mais certains services ne fonctionnent pas après un changement de réglages.',
  'Câble endommagé': 'Ex: Câble fibre visible endommagé à l\'extérieur du logement après des travaux.',
  'Débit faible': 'Ex: Débit mesuré très inférieur à l\'offre souscrite (ex: 8 Mbps au lieu de 100 Mbps).',
};

const problemTypeToApiValue: Record<string, string> = {
  'Coupure totale': 'COUPURE_TOTALE',
  'Qualité dégradée': 'QUALITE_DEGRADEE',
  'Modem défectueux': 'MODEM_DEFECTUEUX',
  'Câble endommagé': 'CABLE_ENDOMMAGE',
  'Configuration modem': 'CONFIG_MODEM',
  'Débit faible': 'DEBIT_FAIBLE',
};

export default function ClientNewTicketPage() {
  const [sn, setSn] = useState('');
  const [selectedType, setSelectedType] = useState('Coupure totale');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number }>({
    lat: 36.8189,
    lng: 10.1658,
  });
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [geoMessage, setGeoMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [createdTicketRef, setCreatedTicketRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const snValid = /^[A-Z0-9]{16}$/.test(sn);
  const snCharsLeft = 16 - sn.length;

  const handleSubmit = async () => {
    if (!snValid) {
      setSubmitError('Le numero de serie doit contenir exactement 16 caracteres majuscules/chiffres.');
      return;
    }

    const mappedType = problemTypeToApiValue[selectedType];
    if (!mappedType) {
      setSubmitError('Type de probleme invalide.');
      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      const response = await apiRequest<{ ticket?: { ticketRef?: string } }>('/api/client/ticket', {
        method: 'POST',
        body: {
          sn,
          typeProbleme: mappedType,
          description: description.trim() || undefined,
          localisation: {
            lat: location.lat,
            lng: location.lng,
          },
        },
      });

      setCreatedTicketRef(response?.ticket?.ticketRef || 'Ticket cree');
      setSubmitted(true);
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Impossible de creer le ticket'));
    } finally {
      setLoading(false);
    }
  };

  const requestCurrentPosition = () => {
    if (!navigator.geolocation) {
      setGeoState('error');
      setGeoMessage('La geolocalisation n est pas disponible sur ce navigateur.');
      return;
    }

    setGeoState('loading');
    setGeoMessage('Localisation en cours...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoState('success');
        setGeoMessage('Position actuelle mise a jour.');
      },
      (error) => {
        setGeoState('error');
        if (error.code === error.PERMISSION_DENIED) {
          setGeoMessage('Autorisez la localisation dans le navigateur puis reessayez.');
          return;
        }
        if (error.code === error.TIMEOUT) {
          setGeoMessage('Le delai de localisation est depasse.');
          return;
        }
        setGeoMessage('Impossible de recuperer votre position actuelle.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  if (submitted) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh',
      }}>
        <div style={{
          background: 'white', borderRadius: 24, padding: '56px 48px',
          textAlign: 'center', maxWidth: 420,
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          border: '1px solid #e8ecf0',
        }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 0 0 12px rgba(76,175,80,0.08)',
          }}>
            <CheckCircle2 size={44} color="#4caf50" />
          </div>
          <h2 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 800, color: '#1a237e' }}>Ticket créé avec succès !</h2>
          <p style={{ margin: '0 0 8px', color: '#555', fontSize: 14, lineHeight: 1.6 }}>
            Votre ticket <strong style={{ color: '#1a237e' }}>{createdTicketRef || 'TT-'}</strong> a été créé et assigné automatiquement.
          </p>
          <Link to="/client/tickets" style={{
            display: 'block', padding: '13px', borderRadius: 10,
            background: 'linear-gradient(135deg, #1a237e, #1565c0)',
            color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 700,
            marginTop: 8,
          }}>
            Voir mes tickets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Nouveau Ticket</h1>
        <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Signalez une panne fibre optique. L'assignation est automatique.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Form */}
        <div style={{
          background: 'white', borderRadius: 16, padding: '28px',
          border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        }}>
          <h2 style={{ margin: '0 0 24px', fontSize: 16, fontWeight: 700, color: '#1a237e', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#e8eaf6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#1a237e' }}>1</span>
            Informations du ticket
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* SN Field */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#333', display: 'block', marginBottom: 6 }}>
                Numéro de série (SN) *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  value={sn}
                  onChange={e => setSn(e.target.value.toUpperCase().slice(0, 16))}
                  placeholder="Ex: AB12CD34EF56GH78"
                  style={{
                    width: '100%', padding: '12px 48px 12px 14px',
                    borderRadius: 10, border: `1.5px solid ${sn.length === 0 ? '#e0e0e0' : snValid ? '#4caf50' : sn.length > 0 ? '#ff9800' : '#e0e0e0'}`,
                    fontSize: 14, fontFamily: 'monospace', letterSpacing: 2,
                    textTransform: 'uppercase', outline: 'none', boxSizing: 'border-box',
                    background: snValid ? '#f1f8f1' : '#fafafa',
                  }}
                />
                {sn.length > 0 && (
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                    {snValid
                      ? <CheckCircle2 size={18} color="#4caf50" />
                      : <AlertCircle size={18} color="#ff9800" />}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 11, color: snValid ? '#4caf50' : '#888' }}>
                  {snValid ? '✓ Format valide (16 caractères alphanumériques majuscules)' : `Exactement 16 caractères requis`}
                </span>
                <span style={{ fontSize: 11, color: snCharsLeft === 0 ? '#4caf50' : '#888' }}>
                  {sn.length}/16
                </span>
              </div>
            </div>

            {/* Problem type */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#333', display: 'block', marginBottom: 6 }}>
                Type de problème *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {problemTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    style={{
                      padding: '10px 12px', borderRadius: 9, border: '1.5px solid',
                      borderColor: selectedType === type ? '#1a237e' : '#e0e0e0',
                      background: selectedType === type ? '#e8eaf6' : 'white',
                      color: selectedType === type ? '#1a237e' : '#555',
                      fontSize: 12, fontWeight: selectedType === type ? 700 : 400,
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: selectedType === type ? '#1a237e' : '#ccc',
                    }} />
                    {type}
                  </button>
                ))}
              </div>

              {/* Category info */}
              {(selectedType === 'Configuration modem' || selectedType === 'Débit faible') ? (
                <div style={{
                  marginTop: 10, padding: '8px 12px', borderRadius: 8,
                  background: '#e8eaf6', border: '1px solid #c5cae9', fontSize: 12, color: '#283593',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontWeight: 700 }}>🔧 UGS</span> — Unité Gestion Service
                </div>
              ) : (
                <div style={{
                  marginTop: 10, padding: '8px 12px', borderRadius: 8,
                  background: '#e0f7fa', border: '1px solid #80deea', fontSize: 12, color: '#006064',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontWeight: 700 }}>🔧 ULS</span> — Unité Livraison Service
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#333', display: 'block', marginBottom: 6 }}>
                Description (optionnel)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={descriptionPlaceholders[selectedType]}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #e0e0e0',
                  fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                  background: '#fafafa', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>

        {/* Map */}
        <div style={{
          background: 'white', borderRadius: 16, padding: '28px',
          border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#1a237e', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#e8eaf6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#1a237e' }}>2</span>
            Localisation *
          </h2>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888' }}>
            <MapPin size={13} style={{ verticalAlign: 'middle' }} /> Déplacez le marqueur pour indiquer votre position exacte
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button
              onClick={requestCurrentPosition}
              style={{
                padding: '8px 12px', borderRadius: 8, border: '1.5px solid #1a237e',
                background: 'white', color: '#1a237e', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <LocateFixed size={14} />
              {geoState === 'loading' ? 'Localisation...' : 'Position actuelle'}
            </button>
            <div style={{
              flex: 1, minHeight: 34, borderRadius: 8, border: '1px solid #e0e0e0',
              background: '#fafafa', padding: '8px 10px', fontSize: 12,
              color: geoState === 'error' ? '#c62828' : geoState === 'success' ? '#2e7d32' : '#666',
              display: 'flex', alignItems: 'center',
            }}>
              {geoMessage || 'Astuce: glissez le marqueur sur la carte ou utilisez votre position actuelle.'}
            </div>
          </div>

          <MapPlaceholder
            height={320}
            showPolygon={false}
            draggableMarker
            onMarkerChange={({ lat, lng }) => {
              setLocation({ lat, lng });
              setGeoState('idle');
              setGeoMessage('Position ajustee manuellement sur la carte.');
            }}
            markers={[
              { x: 52, y: 47, lat: location.lat, lng: location.lng, label: 'Votre position', color: '#1a237e', type: 'ticket' },
            ]}
            center={[location.lat, location.lng]}
            zoom={15}
          />

          {/* Auto-assign info */}
          <div style={{
            marginTop: 14, padding: '12px 14px', borderRadius: 10,
            background: '#fff3e0', border: '1px solid #ffcc80',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <AlertCircle size={16} color="#ff9800" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: '#bf360c', lineHeight: 1.5 }}>
              <strong>Assignation automatique :</strong> Votre ticket sera assigné à l'admin responsable de votre localisation.
            </div>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div style={{
        marginTop: 20, background: 'white', borderRadius: 16, padding: '20px 28px',
        border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 13, color: '#666' }}>
            <strong style={{ color: '#1a237e' }}>Résumé :</strong> SN <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{sn || '—'}</code> · {selectedType}
          </div>
          {submitError && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#b71c1c', fontWeight: 600 }}>
              {submitError}
            </div>
          )}
        </div>
        <div style={{ display: 'flex' }}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '12px 28px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #1a237e, #1565c0)',
              color: 'white', cursor: loading ? 'wait' : 'pointer', fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 6px 16px rgba(26,35,126,0.3)', fontFamily: 'inherit',
              opacity: loading ? 0.85 : 1,
            }}
          >
            <Send size={16} /> {loading ? 'Soumission...' : 'Soumettre le ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}
