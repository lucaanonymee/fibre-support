import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { StatusBadge } from '../../components/StatusBadge';
import { Users, UserPlus, Check, X, Power, AlertTriangle, Search, ArrowUpDown } from 'lucide-react';
import { ApiError, apiRequest, getErrorMessage } from '../../utils/httpApi';
import { resolvePhotoUrl } from '../../utils/profileApi';

interface BackendUserRef {
  _id?: string;
}

interface BackendTicket {
  statut: 'OUVERT' | 'EN_COURS' | 'CLOTURE';
  technicienId?: BackendUserRef | null;
}

interface BackendTechnicien {
  _id: string;
  nom: string;
  email: string;
  categorie: 'UGS' | 'ULS';
  isActive?: boolean;
  presentAujourdhui?: boolean;
  photoUrl?: string | null;
}

interface TechnicianRow {
  id: string;
  name: string;
  email: string;
  cat: 'UGS' | 'ULS';
  presence: 'PRÉSENT' | 'ABSENT';
  active: boolean;
  tickets: number;
  max: number;
  photoUrl: string | null;
}

const getInitials = (value: string): string => {
  return value
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export default function AdminTechniciansPage() {
  const [techs, setTechs] = useState<TechnicianRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TOUTES');
  const [presenceFilter, setPresenceFilter] = useState('TOUTES');
  const [accountFilter, setAccountFilter] = useState('TOUS');
  const [sortBy, setSortBy] = useState('NOM_ASC');
  const [deactivationPendingTechId, setDeactivationPendingTechId] = useState<string | null>(null);

  const loadTechnicians = async () => {
    setLoading(true);
    setFetchError(null);
    setActionError(null);

    try {
      let tickets: BackendTicket[] = [];
      try {
        tickets = await apiRequest<BackendTicket[]>('/api/admin/tickets', { method: 'GET' });
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) {
          throw error;
        }
      }

      const technicians = await apiRequest<BackendTechnicien[]>('/api/admin/techniciens?includeInactive=true', { method: 'GET' });
      const activeCountByTechnician = new Map<string, number>();

      tickets.forEach((ticket) => {
        const techId = ticket.technicienId?._id;
        if (ticket.statut === 'EN_COURS' && techId) {
          activeCountByTechnician.set(techId, (activeCountByTechnician.get(techId) ?? 0) + 1);
        }
      });

      const mapped = technicians.map((tech) => ({
        id: tech._id,
        name: tech.nom,
        email: tech.email,
        cat: tech.categorie,
        presence: tech.isActive === false ? 'ABSENT' : (tech.presentAujourdhui ? 'PRÉSENT' : 'ABSENT'),
        active: tech.isActive ?? true,
        tickets: activeCountByTechnician.get(tech._id) ?? 0,
        max: tech.categorie === 'UGS' ? 10 : 5,
        photoUrl: resolvePhotoUrl(tech.photoUrl),
      }));

      setTechs(mapped);
    } catch (error) {
      setTechs([]);
      setFetchError(getErrorMessage(error, 'Impossible de charger les techniciens.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTechnicians();
  }, []);

  const togglePresence = async (id: string) => {
    const tech = techs.find((item) => item.id === id);
    if (!tech || !tech.active || actionLoadingId) {
      return;
    }

    const endpoint = tech.presence === 'PRÉSENT'
      ? `/api/admin/marquer-absent/${id}`
      : `/api/admin/marquer-present/${id}`;

    setActionLoadingId(id);
    setActionError(null);

    try {
      await apiRequest(endpoint, { method: 'PUT' });
      setTechs((prev) => prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        return {
          ...item,
          presence: item.presence === 'PRÉSENT' ? 'ABSENT' : 'PRÉSENT',
        };
      }));
    } catch (error) {
      setActionError(getErrorMessage(error, 'Impossible de changer la presence du technicien.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const reactivateTechnician = async (id: string) => {
    setActionLoadingId(id);
    setActionError(null);

    try {
      await apiRequest(`/api/admin/reactiver/${id}`, { method: 'PUT' });
      setTechs((prev) => prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        return {
          ...item,
          active: true,
          presence: 'ABSENT',
        };
      }));
    } catch (error) {
      setActionError(getErrorMessage(error, 'Impossible de reactiver ce technicien.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleActive = (id: string) => {
    const tech = techs.find((item) => item.id === id);
    if (!tech || actionLoadingId) {
      return;
    }

    if (tech.active) {
      setDeactivationPendingTechId(id);
      return;
    }

    setDeactivationPendingTechId(null);
    void reactivateTechnician(id);
  };

  const confirmDeactivateTech = async (id: string) => {
    if (actionLoadingId) {
      return;
    }

    setActionLoadingId(id);
    setActionError(null);

    try {
      await apiRequest(`/api/admin/desactiver/${id}`, { method: 'PUT' });
      setTechs((prev) => prev.map((item) => {
        if (item.id !== id) {
          return item;
        }

        return {
          ...item,
          active: false,
          presence: 'ABSENT',
          tickets: 0,
        };
      }));
    } catch (error) {
      setActionError(getErrorMessage(error, 'Impossible de desactiver ce technicien.'));
    } finally {
      setActionLoadingId(null);
    }

    setDeactivationPendingTechId(null);
  };

  const filtered = techs
    .filter(t => {
      const needle = search.toLowerCase();
      const matchSearch = !needle || t.name.toLowerCase().includes(needle) || t.email.toLowerCase().includes(needle);
      const matchCategory = categoryFilter === 'TOUTES' || t.cat === categoryFilter;
      const matchPresence = presenceFilter === 'TOUTES' || t.presence === presenceFilter;
      const matchAccount = accountFilter === 'TOUS' || (accountFilter === 'ACTIF' ? t.active : !t.active);
      return matchSearch && matchCategory && matchPresence && matchAccount;
    })
    .sort((a, b) => {
      if (sortBy === 'NOM_DESC') return b.name.localeCompare(a.name, 'fr');
      if (sortBy === 'CHARGE_DESC') return b.tickets / b.max - a.tickets / a.max;
      if (sortBy === 'CHARGE_ASC') return a.tickets / a.max - b.tickets / b.max;
      return a.name.localeCompare(b.name, 'fr');
    });

  const stats = {
    total: techs.length,
    present: techs.filter(t => t.presence === 'PRÉSENT' && t.active).length,
    ugs: techs.filter(t => t.cat === 'UGS' && t.active).length,
    uls: techs.filter(t => t.cat === 'ULS' && t.active).length,
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Gestion des Techniciens</h1>
        <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Présence quotidienne et charge de travail</p>
      </div>

      {fetchError && (
        <div style={{
          marginBottom: 12,
          padding: '12px 14px',
          borderRadius: 10,
          background: '#ffebee',
          border: '1px solid #ffcdd2',
          color: '#b71c1c',
          fontSize: 13,
          fontWeight: 600,
        }}>
          {fetchError}
        </div>
      )}

      {actionError && (
        <div style={{
          marginBottom: 12,
          padding: '10px 12px',
          borderRadius: 8,
          background: '#fff8e1',
          border: '1px solid #ffe082',
          color: '#8d6e63',
          fontSize: 12,
          fontWeight: 700,
        }}>
          {actionError}
        </div>
      )}

      {loading && (
        <div style={{
          marginBottom: 12,
          padding: '10px 12px',
          borderRadius: 8,
          background: '#f8faff',
          border: '1px solid #e3f2fd',
          color: '#1a237e',
          fontSize: 12,
          fontWeight: 700,
        }}>
          Chargement des techniciens...
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total techniciens', val: stats.total, color: '#1a237e', bg: '#e8eaf6' },
          { label: 'Techniciens UGS', val: stats.ugs, color: '#283593', bg: '#e8eaf6' },
          { label: 'Techniciens ULS', val: stats.uls, color: '#006064', bg: '#e0f7fa' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'white', borderRadius: 14, padding: '18px 20px',
            border: '1px solid #e8ecf0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: s.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Users size={22} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#aaa" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un technicien..."
                style={{
                  padding: '8px 12px 8px 30px', borderRadius: 8, border: '1px solid #e0e0e0',
                  fontSize: 13, outline: 'none', width: 240, fontFamily: 'inherit', background: '#fafafa',
                }}
              />
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 12, background: '#fafafa', fontFamily: 'inherit', outline: 'none' }}>
              <option value="TOUTES">Toutes catégories</option>
              <option value="UGS">UGS</option>
              <option value="ULS">ULS</option>
            </select>
            <select value={presenceFilter} onChange={(e) => setPresenceFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 12, background: '#fafafa', fontFamily: 'inherit', outline: 'none' }}>
              <option value="TOUTES">Toute présence</option>
              <option value="PRÉSENT">PRÉSENT</option>
              <option value="ABSENT">ABSENT</option>
            </select>
            <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 12, background: '#fafafa', fontFamily: 'inherit', outline: 'none' }}>
              <option value="TOUS">Tous comptes</option>
              <option value="ACTIF">ACTIF</option>
              <option value="INACTIF">INACTIF</option>
            </select>
            <div style={{ position: 'relative' }}>
              <ArrowUpDown size={13} color="#888" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '8px 10px 8px 26px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 12, background: '#fafafa', fontFamily: 'inherit', outline: 'none' }}>
                <option value="NOM_ASC">Nom A-Z</option>
                <option value="NOM_DESC">Nom Z-A</option>
                <option value="CHARGE_DESC">Charge élevée en premier</option>
                <option value="CHARGE_ASC">Charge faible en premier</option>
              </select>
            </div>
          </div>
            <Link to="/admin/creer-technicien" style={{
              padding: '9px 18px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #1a237e, #1565c0)',
              color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <UserPlus size={15} /> Créer un technicien
            </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8faff' }}>
                {['Technicien', 'Email', 'Catégorie', 'Présence', 'Charge de travail', 'Statut compte', 'Actions'].map((h, i) => (
                  <th key={i} style={{
                    padding: '11px 16px', textAlign: 'left', fontSize: 10,
                    fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5,
                    borderBottom: '1px solid #e8ecf0', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((tech, i) => (
                <tr key={tech.id} style={{ borderBottom: '1px solid #f5f5f5', background: i % 2 === 0 ? 'white' : '#fafbff', opacity: tech.active ? 1 : 0.6 }}>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: tech.active ? (tech.cat === 'UGS' ? '#e8eaf6' : '#e0f7fa') : '#f5f5f5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: '#555', overflow: 'hidden',
                      }}>
                        {tech.photoUrl ? (
                          <img src={tech.photoUrl} alt={tech.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          getInitials(tech.name)
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#1a237e', fontSize: 13 }}>{tech.name}</div>

                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', color: '#555', fontSize: 12 }}>{tech.email}</td>
                  <td style={{ padding: '13px 16px' }}><StatusBadge status={tech.cat} /></td>
                  <td style={{ padding: '13px 16px' }}>
                    <button
                      onClick={() => togglePresence(tech.id)}
                      disabled={!tech.active || actionLoadingId === tech.id}
                      title={!tech.active ? 'Compte inactif: présence forcée à ABSENT' : undefined}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 8, border: '1.5px solid',
                        borderColor: !tech.active ? '#e0e0e0' : (tech.presence === 'PRÉSENT' ? '#a5d6a7' : '#ef9a9a'),
                        background: !tech.active ? '#f5f5f5' : (tech.presence === 'PRÉSENT' ? '#e8f5e9' : '#ffebee'),
                        color: !tech.active ? '#9e9e9e' : (tech.presence === 'PRÉSENT' ? '#2e7d32' : '#c62828'),
                        cursor: tech.active ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                      }}
                    >
                      {tech.presence === 'PRÉSENT' ? <Check size={13} /> : <X size={13} />}
                      {tech.presence}
                    </button>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 70, height: 6, borderRadius: 3, background: '#e0e0e0', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          width: `${(tech.tickets / tech.max) * 100}%`,
                          background: tech.tickets >= tech.max ? '#f44336' : tech.tickets >= tech.max * 0.8 ? '#ff9800' : '#4caf50',
                        }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: tech.tickets >= tech.max ? '#f44336' : '#555' }}>
                        {tech.tickets} actifs (max {tech.max})
                      </span>
                      {tech.tickets >= tech.max && <AlertTriangle size={13} color="#f44336" />}
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <StatusBadge status={tech.active ? 'ACTIF' : 'INACTIF'} />
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    {deactivationPendingTechId === tech.id ? (
                      <div style={{
                        padding: '10px 12px', borderRadius: 10,
                        background: '#fff8e1', border: '1px solid #ffd54f',
                        minWidth: 250,
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#f57f17', marginBottom: 8 }}>
                          ⚠️ Confirmer la désactivation ?
                        </div>
                        <p style={{ margin: '0 0 10px', fontSize: 11, color: '#555', lineHeight: 1.4 }}>
                          Le compte passera en INACTIF et la présence en ABSENT.
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => setDeactivationPendingTechId(null)}
                            style={{
                              padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e0e0e0',
                              background: 'white', color: '#666', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                            }}
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => confirmDeactivateTech(tech.id)}
                            style={{
                              padding: '6px 12px', borderRadius: 8, border: 'none',
                              background: '#d32f2f', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                              display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
                            }}
                          >
                            <Power size={12} /> Confirmer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleActive(tech.id)}
                        disabled={actionLoadingId === tech.id}
                        style={{
                          padding: '6px 12px', borderRadius: 8, border: '1.5px solid',
                          borderColor: tech.active ? '#ef9a9a' : '#a5d6a7',
                          background: tech.active ? '#ffebee' : '#e8f5e9',
                          color: tech.active ? '#c62828' : '#2e7d32',
                          cursor: 'pointer', fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
                          opacity: actionLoadingId === tech.id ? 0.7 : 1,
                        }}
                      >
                        <Power size={13} /> {actionLoadingId === tech.id ? 'Traitement...' : (tech.active ? 'Désactiver' : 'Réactiver')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0', fontSize: 12, color: '#888' }}>
          {filtered.length} technicien{filtered.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Category rules info */}
      <div style={{
        marginTop: 20, background: 'white', borderRadius: 14, padding: '18px 22px',
        border: '1px solid #e8ecf0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <h4 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: '#1a237e' }}>Règles de catégorie</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { cat: 'UGS', max: 10, types: 'Configuration modem, Débit faible', mode: 'Unité Gestion Service', color: '#283593', bg: '#e8eaf6' },
            { cat: 'ULS', max: 5, types: 'Coupure totale, Qualité dégradée, Modem défectueux, Câble endommagé', mode: 'Unité Livraison Service', color: '#006064', bg: '#e0f7fa' },
          ].map((r, i) => (
            <div key={i} style={{ padding: '14px 16px', borderRadius: 10, background: r.bg, border: `1px solid ${r.color}30` }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: r.color, marginBottom: 4 }}>{r.cat}</div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>
                <strong>Max tickets simultanés :</strong> {r.max} tickets
              </div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
                <strong>Mode :</strong> {r.mode}
              </div>
              <div style={{ fontSize: 11, color: '#888' }}>
                <strong>Types traités :</strong> {r.types}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
