import { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { Users, UserCheck, UserMinus, Power, Search, ArrowUpDown, CalendarClock } from 'lucide-react';
import { Link } from 'react-router';
import { apiRequest, getErrorMessage } from '../../utils/httpApi';
import { formatDateFr } from '../../utils/backendMappers';
import { resolvePhotoUrl } from '../../utils/profileApi';

type ManagedRole = 'ADMIN' | 'CLIENT' | 'TECHNICIEN';

interface BackendUser {
  _id: string;
  nom: string;
  email: string;
  role: ManagedRole;
  isActive?: boolean;
  photoUrl?: string | null;
  createdAt?: string;
}

interface ListUsersResponse {
  total?: number;
  users?: BackendUser[];
}

interface ToggleUserResponse {
  message?: string;
  role?: ManagedRole;
  techniciensTransferes?: number;
  ticketsOuvertsTransferes?: number;
  ticketsEnCoursTransferes?: number;
  ticketsRouverts?: number;
  ticketsClotures?: number;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: ManagedRole;
  active: boolean;
  photoUrl: string | null;
  createdAt: string;
  createdEpoch: number;
}

const ROLE_LABELS: Record<ManagedRole, string> = {
  ADMIN: 'Admin',
  CLIENT: 'Client',
  TECHNICIEN: 'Technicien',
};

const getInitials = (value: string): string => {
  return value
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const toEpoch = (value?: string): number => {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function SuperAdminUsersPage() {
  const [usersList, setUsersList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deactivationPendingUserId, setDeactivationPendingUserId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TOUS');
  const [roleFilter, setRoleFilter] = useState<'TOUS' | ManagedRole>('TOUS');
  const [sortBy, setSortBy] = useState('NOM_ASC');

  const loadUsers = async () => {
    setLoading(true);
    setFetchError(null);
    setActionError(null);

    try {
      const response = await apiRequest<ListUsersResponse>('/api/superadmin/utilisateurs', {
        method: 'GET',
      });

      const mapped = (response.users || []).map((user) => {
        const createdEpoch = toEpoch(user.createdAt);

        return {
          id: user._id,
          name: user.nom,
          email: user.email,
          role: user.role,
          active: user.isActive !== false,
          photoUrl: resolvePhotoUrl(user.photoUrl),
          createdAt: formatDateFr(user.createdAt),
          createdEpoch,
        } satisfies UserRow;
      });

      setUsersList(mapped);
    } catch (error) {
      setUsersList([]);
      setFetchError(getErrorMessage(error, 'Impossible de charger la liste des utilisateurs.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const reactivateUser = async (id: string) => {
    setActionLoadingId(id);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await apiRequest<ToggleUserResponse>(`/api/superadmin/reactiver/${id}`, {
        method: 'PUT',
      });

      setUsersList((prev) => prev.map((user) => {
        if (user.id !== id) {
          return user;
        }
        return { ...user, active: true };
      }));

      setActionMessage(response.message || 'Utilisateur reactive avec succes.');
    } catch (error) {
      setActionError(getErrorMessage(error, 'Impossible de reactiver cet utilisateur.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const confirmDeactivateUser = async (id: string) => {
    setActionLoadingId(id);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await apiRequest<ToggleUserResponse>(`/api/superadmin/desactiver/${id}`, {
        method: 'PUT',
      });

      setUsersList((prev) => prev.map((user) => {
        if (user.id !== id) {
          return user;
        }
        return { ...user, active: false };
      }));

      const role = response.role;
      if (role === 'ADMIN') {
        const transfers = [
          response.techniciensTransferes || 0,
          response.ticketsOuvertsTransferes || 0,
          response.ticketsEnCoursTransferes || 0,
        ].reduce((sum, current) => sum + current, 0);

        if (transfers > 0) {
          setActionMessage(`${response.message || 'Admin desactive.'} ${transfers} element(s) transferes.`);
        } else {
          setActionMessage(response.message || 'Admin desactive avec succes.');
        }
      } else if (role === 'TECHNICIEN') {
        const reopened = response.ticketsRouverts || 0;
        if (reopened > 0) {
          setActionMessage(`${response.message || 'Technicien desactive.'} ${reopened} ticket(s) remis en OUVERT.`);
        } else {
          setActionMessage(response.message || 'Technicien desactive avec succes.');
        }
      } else if (role === 'CLIENT') {
        const closed = response.ticketsClotures || 0;
        if (closed > 0) {
          setActionMessage(`${response.message || 'Client desactive.'} ${closed} ticket(s) EN_COURS cloture(s).`);
        } else {
          setActionMessage(response.message || 'Client desactive avec succes.');
        }
      } else {
        setActionMessage(response.message || 'Utilisateur desactive avec succes.');
      }
    } catch (error) {
      setActionError(getErrorMessage(error, 'Impossible de desactiver cet utilisateur.'));
    } finally {
      setActionLoadingId(null);
      setDeactivationPendingUserId(null);
    }
  };

  const toggleActive = (id: string) => {
    const user = usersList.find((item) => item.id === id);
    if (!user || actionLoadingId) {
      return;
    }

    if (user.active) {
      setDeactivationPendingUserId(id);
      return;
    }

    setDeactivationPendingUserId(null);
    void reactivateUser(id);
  };

  const filtered = useMemo(() => {
    return [...usersList]
      .filter((user) => {
        const needle = search.toLowerCase().trim();
        const roleLabel = ROLE_LABELS[user.role].toLowerCase();
        const matchSearch = !needle
          || user.name.toLowerCase().includes(needle)
          || user.email.toLowerCase().includes(needle)
          || roleLabel.includes(needle);
        const matchStatus = statusFilter === 'TOUS' || (statusFilter === 'ACTIF' ? user.active : !user.active);
        const matchRole = roleFilter === 'TOUS' || roleFilter === user.role;
        return matchSearch && matchStatus && matchRole;
      })
      .sort((a, b) => {
        if (sortBy === 'NOM_DESC') {
          return b.name.localeCompare(a.name, 'fr');
        }

        if (sortBy === 'DATE_DESC') {
          return b.createdEpoch - a.createdEpoch;
        }

        if (sortBy === 'DATE_ASC') {
          return a.createdEpoch - b.createdEpoch;
        }

        return a.name.localeCompare(b.name, 'fr');
      });
  }, [usersList, search, statusFilter, roleFilter, sortBy]);

  const totalStats = {
    total: usersList.length,
    active: usersList.filter((user) => user.active).length,
    inactive: usersList.filter((user) => !user.active).length,
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Gestion des Utilisateurs</h1>
        <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Gestion globale des comptes </p>
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
          background: '#ffebee',
          border: '1px solid #ffcdd2',
          color: '#b71c1c',
          fontSize: 12,
          fontWeight: 700,
        }}>
          {actionError}
        </div>
      )}

      {actionMessage && (
        <div style={{
          marginBottom: 12,
          padding: '10px 12px',
          borderRadius: 8,
          background: '#e8f5e9',
          border: '1px solid #a5d6a7',
          color: '#2e7d32',
          fontSize: 12,
          fontWeight: 700,
        }}>
          {actionMessage}
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
          Chargement des utilisateurs...
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total utilisateurs', val: totalStats.total, icon: Users, color: '#1a237e', bg: '#e8eaf6' },
          { label: 'Comptes actifs', val: totalStats.active, icon: UserCheck, color: '#2e7d32', bg: '#e8f5e9' },
          { label: 'Comptes inactifs', val: totalStats.inactive, icon: UserMinus, color: '#c62828', bg: '#ffebee' },
        ].map((stat, index) => (
          <div key={index} style={{
            background: 'white', borderRadius: 14, padding: '18px 20px',
            border: '1px solid #e8ecf0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: stat.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <stat.icon size={22} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.val}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#aaa" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un utilisateur..."
                style={{
                  padding: '8px 12px 8px 30px', borderRadius: 8, border: '1px solid #e0e0e0',
                  fontSize: 13, outline: 'none', width: 240, fontFamily: 'inherit', background: '#fafafa',
                }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{
                padding: '8px 10px', borderRadius: 8, border: '1px solid #e0e0e0',
                fontSize: 12, background: '#fafafa', fontFamily: 'inherit', outline: 'none',
              }}
            >
              <option value="TOUS">Tous statuts</option>
              <option value="ACTIF">ACTIF</option>
              <option value="INACTIF">INACTIF</option>
            </select>

            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as 'TOUS' | ManagedRole)}
              style={{
                padding: '8px 10px', borderRadius: 8, border: '1px solid #e0e0e0',
                fontSize: 12, background: '#fafafa', fontFamily: 'inherit', outline: 'none',
              }}
            >
              <option value="TOUS">Tous roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="CLIENT">CLIENT</option>
              <option value="TECHNICIEN">TECHNICIEN</option>
            </select>

            <div style={{ position: 'relative' }}>
              <ArrowUpDown size={13} color="#888" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                style={{
                  padding: '8px 10px 8px 26px', borderRadius: 8, border: '1px solid #e0e0e0',
                  fontSize: 12, background: '#fafafa', fontFamily: 'inherit', outline: 'none',
                }}
              >
                <option value="NOM_ASC">Nom A-Z</option>
                <option value="NOM_DESC">Nom Z-A</option>
                <option value="DATE_DESC">Creation recente</option>
                <option value="DATE_ASC">Creation ancienne</option>
              </select>
            </div>
          </div>

          <Link to="/superadmin/creer-admin" style={{
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #1a237e, #1565c0)',
            color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            + Creer un admin
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8faff' }}>
                {['Nom', 'Role', 'Email', 'Cree le', 'Statut', 'Actions'].map((header, index) => (
                  <th key={index} style={{
                    padding: '11px 16px', textAlign: 'left', fontSize: 10,
                    fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5,
                    borderBottom: '1px solid #e8ecf0', whiteSpace: 'nowrap',
                  }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, index) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f5f5f5', background: index % 2 === 0 ? 'white' : '#fafbff', opacity: user.active ? 1 : 0.65 }}>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                        background: user.active ? 'linear-gradient(135deg, #1a237e, #42a5f5)' : '#e0e0e0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: 12, fontWeight: 700, overflow: 'hidden',
                      }}>
                        {user.photoUrl ? (
                          <img src={user.photoUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          getInitials(user.name)
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#1a237e', fontSize: 13 }}>{user.name}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>{ROLE_LABELS[user.role]}</div>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '13px 16px', color: '#555', fontSize: 12 }}>{ROLE_LABELS[user.role]}</td>

                  <td style={{ padding: '13px 16px', color: '#555', fontSize: 12 }}>{user.email}</td>

                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CalendarClock size={13} color="#888" />
                      <span style={{ color: '#555', fontSize: 12 }}>{user.createdAt}</span>
                    </div>
                  </td>

                  <td style={{ padding: '13px 16px' }}>
                    <StatusBadge status={user.active ? 'ACTIF' : 'INACTIF'} />
                  </td>

                  <td style={{ padding: '13px 16px' }}>
                    {deactivationPendingUserId === user.id ? (
                      <div style={{
                        padding: '10px 12px', borderRadius: 10,
                        background: '#fff8e1', border: '1px solid #ffd54f',
                        minWidth: 230,
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#f57f17', marginBottom: 8 }}>
                          Confirmer la desactivation ?
                        </div>
                        <p style={{ margin: '0 0 10px', fontSize: 11, color: '#555', lineHeight: 1.4 }}>
                          Le compte passera en INACTIF avec application automatique des regles metier.
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => setDeactivationPendingUserId(null)}
                            disabled={actionLoadingId === user.id}
                            style={{
                              padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e0e0e0',
                              background: 'white', color: '#666', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                            }}
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => void confirmDeactivateUser(user.id)}
                            disabled={actionLoadingId === user.id}
                            style={{
                              padding: '6px 12px', borderRadius: 8, border: 'none',
                              background: '#d32f2f', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                              display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', opacity: actionLoadingId === user.id ? 0.8 : 1,
                            }}
                          >
                            <Power size={12} /> {actionLoadingId === user.id ? 'Traitement...' : 'Confirmer'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleActive(user.id)}
                        disabled={!!actionLoadingId}
                        style={{
                          padding: '6px 12px', borderRadius: 8, border: '1.5px solid',
                          borderColor: user.active ? '#ef9a9a' : '#a5d6a7',
                          background: user.active ? '#ffebee' : '#e8f5e9',
                          color: user.active ? '#c62828' : '#2e7d32',
                          cursor: 'pointer', fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
                          opacity: actionLoadingId ? 0.8 : 1,
                        }}
                      >
                        <Power size={13} />
                        {user.active ? 'Desactiver' : 'Reactiver'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0', fontSize: 12, color: '#888' }}>
          {filtered.length} utilisateur{filtered.length > 1 ? 's' : ''} affiche{filtered.length > 1 ? 's' : ''} · {totalStats.active} actif{totalStats.active > 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}