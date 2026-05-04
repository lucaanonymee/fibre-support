import { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { Search, Clock, Wrench, ArrowUpDown } from 'lucide-react';
import { ApiError, apiRequest, getErrorMessage } from '../../utils/httpApi';
import { resolvePhotoUrl } from '../../utils/profileApi';
import {
  formatDateTimeFr,
  formatDurationFromHours,
  formatDurationFromMillis,
  toNumber,
  toPriorityLabel,
  toProblemTypeLabel,
  toStatusLabel,
} from '../../utils/backendMappers';

interface BackendUserRef {
  nom?: string;
  photoUrl?: string | null;
}

interface BackendAdminTicket {
  _id: string;
  ticketRef?: string;
  sn: string;
  typeProbleme: string;
  statut: 'OUVERT' | 'EN_COURS' | 'CLOTURE';
  priorite?: string;
  aiScore?: number;
  tempsReponsePrevu?: number;
  creationDate?: string;
  assignationDate?: string;
  clotureDate?: string;
  clientId?: BackendUserRef | null;
  technicienId?: BackendUserRef | null;
}

interface UiAdminTicket {
  id: string;
  sn: string;
  client: string;
  clientPhotoUrl: string | null;
  type: string;
  status: 'OUVERT' | 'EN_COURS' | 'CLOTURE';
  priority: string | null;
  aiTime: string;
  tech: string;
  date: string;
  score: number | null;
}

const AUTO_REFRESH_MS = 30000;
const PAGE_SIZE = 10;

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<UiAdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [filter, setFilter] = useState<'OUVERT' | 'EN_COURS' | 'CLOTURE'>('OUVERT');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('TOUS_TYPES');
  const [sortBy, setSortBy] = useState('SCORE_DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const statusFilters: Array<'OUVERT' | 'EN_COURS' | 'CLOTURE'> = ['OUVERT', 'EN_COURS', 'CLOTURE'];

  const loadAdminTickets = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    setFetchError(null);

    try {
      const response = await apiRequest<BackendAdminTicket[]>('/api/admin/tickets', {
        method: 'GET',
      });

      const mapped = response.map((ticket) => {
        const status = ticket.statut;
        const isClosed = status === 'CLOTURE';
        const createdAt = ticket.creationDate ? new Date(ticket.creationDate) : null;
        const assignedAt = ticket.assignationDate ? new Date(ticket.assignationDate) : null;
        const closedAt = ticket.clotureDate ? new Date(ticket.clotureDate) : null;

        let aiTime = formatDurationFromHours(ticket.tempsReponsePrevu);
        if (status === 'EN_COURS' && assignedAt && !Number.isNaN(assignedAt.getTime())) {
          aiTime = formatDurationFromMillis(Date.now() - assignedAt.getTime());
        }
        if (status === 'CLOTURE' && createdAt && closedAt && !Number.isNaN(createdAt.getTime()) && !Number.isNaN(closedAt.getTime())) {
          aiTime = formatDurationFromMillis(closedAt.getTime() - createdAt.getTime());
        }

        return {
          id: ticket.ticketRef || ticket._id,
          sn: ticket.sn,
          client: ticket.clientId?.nom || '—',
          clientPhotoUrl: resolvePhotoUrl(ticket.clientId?.photoUrl),
          type: toProblemTypeLabel(ticket.typeProbleme),
          status,
          priority: isClosed ? null : toPriorityLabel(ticket.priorite),
          aiTime,
          tech: ticket.technicienId?.nom || '—',
          date: formatDateTimeFr(ticket.creationDate),
          score: isClosed ? null : Math.max(0, Math.round(toNumber(ticket.aiScore, 0))),
        } satisfies UiAdminTicket;
      });

      setTickets(mapped);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setTickets([]);
        setFetchError(null);
      } else {
        if (!silent) {
          setTickets([]);
        }
        setFetchError(getErrorMessage(error, 'Impossible de charger les tickets admin.'));
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadAdminTickets();

    const intervalId = window.setInterval(() => {
      void loadAdminTickets({ silent: true });
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [loadAdminTickets]);

  useEffect(() => {
    if (
      filter === 'CLOTURE'
      && (sortBy === 'SCORE_DESC' || sortBy === 'SCORE_ASC' || sortBy === 'PRIORITY_DESC' || sortBy === 'PRIORITY_ASC')
    ) {
      setSortBy('DATE_DESC');
    }
  }, [filter, sortBy]);

  const counts = {
    OUVERT: tickets.filter(t => t.status === 'OUVERT').length,
    EN_COURS: tickets.filter(t => t.status === 'EN_COURS').length,
    CLOTURE: tickets.filter(t => t.status === 'CLOTURE').length,
  };

  const parseDateTime = (value: string) => {
    if (value === '--') {
      return 0;
    }

    const [date, time] = value.split(' ');
    if (!date || !time) {
      return 0;
    }

    const [day, month, year] = date.split('/').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const parsed = new Date(year, month - 1, day, hours, minutes).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const filtered = tickets.filter(t => {
    const matchStatus = t.status === filter;
    const needle = search.toLowerCase();
    const matchSearch = !needle || t.sn.includes(search.toUpperCase()) || t.client.toLowerCase().includes(needle) || t.id.toLowerCase().includes(needle);
    const matchType = typeFilter === 'TOUS_TYPES' || t.type === typeFilter;
    return matchStatus && matchSearch && matchType;
  });

  const sortedTickets = [...filtered].sort((a, b) => {
    if (sortBy === 'DATE_ASC') return parseDateTime(a.date) - parseDateTime(b.date);
    if (sortBy === 'DATE_DESC') return parseDateTime(b.date) - parseDateTime(a.date);
    if (sortBy === 'SCORE_ASC') return (a.score ?? -1) - (b.score ?? -1);
    if (sortBy === 'PRIORITY_ASC') {
      const weights: Record<string, number> = { BASSE: 1, MOYENNE: 2, ELEVEE: 3, HAUTE: 3, TRES_ELEVEE: 4 };
      return (weights[a.priority || ''] ?? -1) - (weights[b.priority || ''] ?? -1);
    }
    if (sortBy === 'PRIORITY_DESC') {
      const weights: Record<string, number> = { BASSE: 1, MOYENNE: 2, ELEVEE: 3, HAUTE: 3, TRES_ELEVEE: 4 };
      return (weights[b.priority || ''] ?? -1) - (weights[a.priority || ''] ?? -1);
    }
    return (b.score ?? -1) - (a.score ?? -1);
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search, typeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedTickets.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedTickets = sortedTickets.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );

  const typeOptions = useMemo(() => Array.from(new Set(tickets.map((t) => t.type))), [tickets]);

  const timeColumnLabel = filter === 'CLOTURE'
    ? 'Temps de résolution'
    : filter === 'EN_COURS'
      ? 'Temps en cours'
      : 'Temps prévu';

  const showTechnicianColumn = filter !== 'OUVERT';
  const showAiMetricsColumns = filter !== 'CLOTURE';

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Gestion des Tickets</h1>
        <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Priorisés par intelligence artificielle</p>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {statusFilters.map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 14px', borderRadius: 8, border: '1.5px solid',
                borderColor: filter === f ? '#1a237e' : '#e0e0e0',
                background: filter === f ? '#e8eaf6' : 'white',
                color: filter === f ? '#1a237e' : '#666',
                fontSize: 12, fontWeight: filter === f ? 700 : 500, cursor: 'pointer',
              }}>
                {toStatusLabel(f)} ({counts[f]})
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#aaa" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="SN, client, ID..."
                style={{
                  padding: '8px 12px 8px 30px', borderRadius: 8, border: '1px solid #e0e0e0',
                  fontSize: 13, outline: 'none', width: 220, fontFamily: 'inherit', background: '#fafafa',
                }}
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                padding: '8px 10px', borderRadius: 8, border: '1px solid #e0e0e0',
                fontSize: 12, background: '#fafafa', fontFamily: 'inherit', outline: 'none',
              }}
            >
              <option value="TOUS_TYPES">Tous types</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <div style={{ position: 'relative' }}>
              <ArrowUpDown size={13} color="#888" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '8px 10px 8px 26px', borderRadius: 8, border: '1px solid #e0e0e0',
                  fontSize: 12, background: '#fafafa', fontFamily: 'inherit', outline: 'none',
                }}
              >
                {showAiMetricsColumns && <option value="SCORE_DESC">Score IA décroissant</option>}
                {showAiMetricsColumns && <option value="SCORE_ASC">Score IA croissant</option>}
                {showAiMetricsColumns && <option value="PRIORITY_DESC">Priorité haute à basse</option>}
                {showAiMetricsColumns && <option value="PRIORITY_ASC">Priorité basse à haute</option>}
                <option value="DATE_DESC">Date décroissante</option>
                <option value="DATE_ASC">Date croissante</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8faff' }}>
                {[
                  'Ticket ID',
                  'SN',
                  'Client',
                  'Type',
                  'Statut',
                  ...(showAiMetricsColumns ? ['Score IA', 'Priorité'] : []),
                  timeColumnLabel,
                  ...(showTechnicianColumn ? ['Technicien'] : []),
                  'Date',
                ].map((h, i) => (
                  <th key={i} style={{
                    padding: '11px 14px', textAlign: 'left', fontSize: 10,
                    fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5,
                    borderBottom: '1px solid #e8ecf0', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedTickets.map((t, i) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f5f5f5', background: i % 2 === 0 ? 'white' : '#fafbff' }}>
                  <td style={{ padding: '13px 14px', fontWeight: 700, color: '#1a237e', fontSize: 12 }}>{t.id}</td>
                  <td style={{ padding: '13px 14px', fontFamily: 'monospace', fontSize: 11, color: '#555', letterSpacing: 1 }}>{t.sn}</td>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: '#e8eaf6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#1a237e', overflow: 'hidden',
                      }}>
                        {t.clientPhotoUrl ? (
                          <img src={t.clientPhotoUrl} alt={t.client} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          t.client.split(' ').map(n => n[0]).join('')
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: '#333', whiteSpace: 'nowrap' }}>{t.client}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 14px', color: '#444', whiteSpace: 'nowrap', fontSize: 12 }}>{t.type}</td>
                  <td style={{ padding: '13px 14px' }}><StatusBadge status={toStatusLabel(t.status)} /></td>
                  {showAiMetricsColumns && (
                    <td style={{ padding: '13px 14px' }}>
                      {typeof t.score === 'number' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 40, height: 6, borderRadius: 3, background: '#e0e0e0', overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%', borderRadius: 3,
                              width: `${t.score}%`,
                              background: t.score > 75 ? '#f44336' : t.score > 50 ? '#ff9800' : '#4caf50',
                            }} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: 12, color: t.score > 75 ? '#c62828' : t.score > 50 ? '#e65100' : '#2e7d32' }}>{t.score}</span>
                        </div>
                      ) : (
                        <span style={{ color: '#bbb', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  )}
                  {showAiMetricsColumns && (
                    <td style={{ padding: '13px 14px' }}>
                      {t.priority ? <StatusBadge status={t.priority} /> : <span style={{ color: '#bbb', fontSize: 12 }}>—</span>}
                    </td>
                  )}
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={12} color="#aaa" />
                      <span style={{ color: '#555', fontSize: 12, whiteSpace: 'nowrap' }}>{t.aiTime}</span>
                    </div>
                  </td>
                  {showTechnicianColumn && (
                    <td style={{ padding: '13px 14px' }}>
                      {t.tech === '—' ? (
                        <span style={{ color: '#bbb', fontSize: 12 }}>Non assigné</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Wrench size={12} color="#888" />
                          <span style={{ color: '#555', fontSize: 12 }}>{t.tech}</span>
                        </div>
                      )}
                    </td>
                  )}
                  <td style={{ padding: '13px 14px', color: '#888', fontSize: 11, whiteSpace: 'nowrap' }}>{t.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#888', fontSize: 13 }}>
            Chargement des tickets...
          </div>
        )}

        {!loading && fetchError && (
          <div style={{ padding: '16px 20px', color: '#b71c1c', fontSize: 13, fontWeight: 600 }}>
            {fetchError}
          </div>
        )}

        <div style={{
          padding: '12px 20px', borderTop: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: '#888' }}>{sortedTickets.length} ticket(s)</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage <= 1}
              style={{
                width: 28, height: 28, borderRadius: 6, border: '1px solid #e0e0e0',
                background: 'white', color: '#666',
                cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: safeCurrentPage <= 1 ? 0.5 : 1,
              }}
            >←</button>
            <span style={{ fontSize: 12, color: '#555', fontWeight: 700, minWidth: 86, textAlign: 'center', alignSelf: 'center' }}>
              Page {safeCurrentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage >= totalPages}
              style={{
                width: 28, height: 28, borderRadius: 6, border: '1px solid #e0e0e0',
                background: 'white', color: '#666',
                cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: safeCurrentPage >= totalPages ? 0.5 : 1,
              }}
            >→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
