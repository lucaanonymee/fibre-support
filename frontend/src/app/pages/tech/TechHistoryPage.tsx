import { useMemo, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { Search, History, Calendar, User, Wrench, AlertCircle, TrendingDown, ArrowUpDown, Ticket } from 'lucide-react';
import { ApiError, apiRequest, getErrorMessage } from '../../utils/httpApi';
import { formatDateFr, formatDurationFromMillis, toProblemTypeLabel } from '../../utils/backendMappers';

interface BackendUserRef {
  nom?: string;
  email?: string;
  numTelephone?: string;
}

interface BackendHistoryTicket {
  _id: string;
  ticketRef?: string;
  typeProbleme: string;
  statut: 'OUVERT' | 'EN_COURS' | 'CLOTURE';
  creationDate?: string;
  clotureDate?: string;
  clientId?: BackendUserRef | null;
  technicienId?: BackendUserRef | null;
}

interface BackendHistoryResponse {
  sn: string;
  totalTickets: number;
  tickets: BackendHistoryTicket[];
}

interface UiHistoryTicket {
  id: string;
  type: string;
  date: string;
  dateEpoch: number;
  closed: string;
  status: 'OUVERT' | 'EN_COURS' | 'CLOTURE';
  tech: string;
  duration: string;
}

interface HistoryResult {
  sn: string;
  client: string;
  totalTickets: number;
  latestDate: string;
  tickets: UiHistoryTicket[];
}

const toEpoch = (value?: string): number => {
  if (!value) {
    return 0;
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDuration = (creationDate?: string, clotureDate?: string): string => {
  const start = toEpoch(creationDate);
  if (!start) {
    return '--';
  }

  if (clotureDate) {
    const end = toEpoch(clotureDate);
    if (!end || end < start) {
      return '--';
    }
    return formatDurationFromMillis(end - start);
  }

  return 'En cours';
};

export default function TechHistoryPage() {
  const [query, setQuery] = useState('');
  const [searchedSn, setSearchedSn] = useState('');
  const [result, setResult] = useState<HistoryResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [ticketSearch, setTicketSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TOUS');
  const [sortBy, setSortBy] = useState('DATE_DESC');

  const handleSearch = async () => {
    const normalizedSn = query.trim().toUpperCase();

    setHasSearched(true);
    setSearchedSn(normalizedSn);
    setFetchError(null);
    setResult(null);

    if (!normalizedSn) {
      setFetchError('Le numero de serie est obligatoire.');
      return;
    }

    setLoading(true);

    try {
      const payload = await apiRequest<BackendHistoryResponse>(`/api/technicien/historique/${encodeURIComponent(normalizedSn)}`, {
        method: 'GET',
      });

      const mappedTickets: UiHistoryTicket[] = payload.tickets.map((ticket) => {
        const creationEpoch = toEpoch(ticket.creationDate);

        return {
          id: ticket.ticketRef || ticket._id,
          type: toProblemTypeLabel(ticket.typeProbleme),
          date: formatDateFr(ticket.creationDate),
          dateEpoch: creationEpoch,
          closed: ticket.clotureDate ? formatDateFr(ticket.clotureDate) : '--',
          status: ticket.statut,
          tech: ticket.technicienId?.nom || 'Non assigne',
          duration: toDuration(ticket.creationDate, ticket.clotureDate),
        };
      });

      const sortedByDateDesc = [...mappedTickets].sort((a, b) => b.dateEpoch - a.dateEpoch);

      setResult({
        sn: payload.sn || normalizedSn,
        client: payload.tickets[0]?.clientId?.nom || 'Client inconnu',
        totalTickets: payload.totalTickets ?? mappedTickets.length,
        latestDate: sortedByDateDesc[0]?.date || '--',
        tickets: mappedTickets,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setResult(null);
        setFetchError(null);
      } else {
        setResult(null);
        setFetchError(getErrorMessage(error, 'Impossible de recuperer l\'historique pour ce SN.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const visibleHistory = useMemo(() => {
    if (!result) {
      return [];
    }

    return [...result.tickets]
      .filter((ticket) => {
        const matchStatus = statusFilter === 'TOUS' || ticket.status === statusFilter;
        const needle = ticketSearch.toLowerCase();
        const matchSearch = !needle
          || ticket.id.toLowerCase().includes(needle)
          || ticket.type.toLowerCase().includes(needle)
          || ticket.tech.toLowerCase().includes(needle);
        return matchStatus && matchSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'DATE_ASC') {
          return a.dateEpoch - b.dateEpoch;
        }
        if (sortBy === 'TYPE_ASC') {
          return a.type.localeCompare(b.type, 'fr');
        }
        if (sortBy === 'TYPE_DESC') {
          return b.type.localeCompare(a.type, 'fr');
        }
        return b.dateEpoch - a.dateEpoch;
      });
  }, [result, sortBy, statusFilter, ticketSearch]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Historique des pannes</h1>
        <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Consultez les pannes d'un equipement par numero de serie</p>
      </div>

      <div style={{
        background: 'white', borderRadius: 16, padding: '24px',
        border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#444', display: 'block', marginBottom: 8 }}>
              Numero de serie (SN) - 16 caracteres alphanumeriques
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#aaa" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value.toUpperCase())}
                placeholder="Ex: AB12CD34EF56GH78"
                style={{
                  width: '100%', padding: '13px 14px 13px 40px',
                  borderRadius: 10, border: '1.5px solid #e0e0e0',
                  fontSize: 15, fontFamily: 'monospace', letterSpacing: 2,
                  textTransform: 'uppercase', outline: 'none', boxSizing: 'border-box', background: '#fafafa',
                }}
              />
            </div>
          </div>
          <button
            onClick={() => void handleSearch()}
            disabled={loading}
            style={{
              padding: '13px 28px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #1a237e, #1565c0)',
              color: 'white', cursor: loading ? 'wait' : 'pointer', fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
              boxShadow: '0 6px 16px rgba(26,35,126,0.3)',
              opacity: loading ? 0.8 : 1,
            }}
          >
            <Search size={16} /> {loading ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>
      </div>

      {fetchError && (
        <div style={{
          marginBottom: 16,
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

      {hasSearched && !loading && !fetchError && !result && (
        <div style={{
          background: 'white', borderRadius: 16, padding: '48px',
          border: '1px solid #e8ecf0', textAlign: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        }}>
          <AlertCircle size={48} color="#e0e0e0" style={{ marginBottom: 16 }} />
          <h3 style={{ margin: '0 0 8px', color: '#999', fontSize: 18 }}>Aucun resultat trouve</h3>
          <p style={{ margin: 0, color: '#bbb', fontSize: 14 }}>
            Le numero de serie
            <span style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '2px 6px', borderRadius: 4, marginLeft: 6, marginRight: 6 }}>
              {searchedSn || '---'}
            </span>
            n'a aucun historique.
          </p>
        </div>
      )}

      {result && (
        <div>
          <div style={{
            background: 'white', borderRadius: 16, padding: '22px 24px',
            border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', marginBottom: 20,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20 }}>
              {[
                { icon: <Ticket size={16} color="#42a5f5" />, label: 'Numero de serie', value: result.sn, mono: true },
                { icon: <User size={16} color="#42a5f5" />, label: 'Client', value: result.client },
              ].map((field, index) => (
                <div key={index} style={{
                  padding: '14px 16px', borderRadius: 10, background: '#f8faff', border: '1px solid #e3f2fd',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {field.icon}
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>{field.label}</span>
                  </div>
                  <div style={{
                    fontSize: field.mono ? 13 : 14,
                    fontWeight: 700,
                    color: '#1a237e',
                    fontFamily: field.mono ? 'monospace' : 'inherit',
                    letterSpacing: field.mono ? 1 : 0,
                  }}>
                    {field.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 8,
              background: '#fff8e1', border: '1px solid #ffe082',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e65100',
            }}>
              <TrendingDown size={16} />
              <span>
                <strong>{result.totalTickets} pannes</strong> enregistrees pour cet equipement. Derniere panne : {result.latestDate}.
              </span>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <History size={18} color="#1a237e" />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a237e' }}>
                  Historique des pannes - {visibleHistory.length} ticket{visibleHistory.length > 1 ? 's' : ''}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={13} color="#aaa" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    value={ticketSearch}
                    onChange={(event) => setTicketSearch(event.target.value)}
                    placeholder="Ticket, panne, technicien..."
                    style={{
                      padding: '7px 10px 7px 26px', borderRadius: 8, border: '1px solid #e0e0e0',
                      fontSize: 12, background: '#fafafa', fontFamily: 'inherit', outline: 'none', width: 210,
                    }}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  style={{
                    padding: '7px 10px', borderRadius: 8, border: '1px solid #e0e0e0',
                    fontSize: 12, background: '#fafafa', fontFamily: 'inherit', outline: 'none',
                  }}
                >
                  <option value="TOUS">Tous statuts</option>
                  <option value="OUVERT">OUVERT</option>
                  <option value="EN_COURS">EN_COURS</option>
                  <option value="CLOTURE">CLOTURE</option>
                </select>

                <div style={{ position: 'relative' }}>
                  <ArrowUpDown size={13} color="#888" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    style={{
                      padding: '7px 10px 7px 26px', borderRadius: 8, border: '1px solid #e0e0e0',
                      fontSize: 12, background: '#fafafa', fontFamily: 'inherit', outline: 'none',
                    }}
                  >
                    <option value="DATE_DESC">Date decroissante</option>
                    <option value="DATE_ASC">Date croissante</option>
                    <option value="TYPE_ASC">Panne A-Z</option>
                    <option value="TYPE_DESC">Panne Z-A</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8faff' }}>
                    {['Ticket', 'Type de panne', 'Date ouverture', 'Date cloture', 'Statut', 'Technicien', 'Duree'].map((header, index) => (
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
                  {visibleHistory.map((ticket, index) => (
                    <tr key={`${ticket.id}-${ticket.dateEpoch}-${index}`} style={{ borderBottom: '1px solid #f5f5f5', background: index % 2 === 0 ? 'white' : '#fafbff' }}>
                      <td style={{ padding: '13px 16px', fontWeight: 700, color: '#1a237e', fontSize: 12 }}>{ticket.id}</td>
                      <td style={{ padding: '13px 16px', color: '#444' }}>{ticket.type}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Calendar size={12} color="#aaa" />
                          <span style={{ color: '#555', fontSize: 12 }}>{ticket.date}</span>
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px', color: ticket.closed === '--' ? '#bbb' : '#555', fontSize: 12 }}>
                        {ticket.closed === '--' ? '--' : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Calendar size={12} color="#aaa" />
                            <span>{ticket.closed}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Wrench size={12} color="#888" />
                          <span style={{ color: '#555', fontSize: 12 }}>{ticket.tech}</span>
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: ticket.duration === 'En cours' ? '#1565c0' : '#555',
                        }}>
                          {ticket.duration}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {visibleHistory.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#999', fontSize: 13 }}>
                Aucun ticket ne correspond aux filtres de l'historique.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
