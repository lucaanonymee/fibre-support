import { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { Search, Ticket, Calendar, ArrowUpDown } from 'lucide-react';
import { ApiError, apiRequest, getErrorMessage } from '../../utils/httpApi';
import { formatDateFr, toProblemTypeLabel, toStatusLabel } from '../../utils/backendMappers';

interface BackendUserRef {
  nom?: string;
}

interface BackendClientTicket {
  _id: string;
  ticketRef?: string;
  sn: string;
  typeProbleme: string;
  statut: 'OUVERT' | 'EN_COURS' | 'CLOTURE';
  creationDate?: string;
  adminId?: BackendUserRef | null;
  technicienId?: BackendUserRef | null;
}

interface UiTicket {
  id: string;
  sn: string;
  type: string;
  status: 'OUVERT' | 'EN_COURS' | 'CLOTURE';
  date: string;
  admin: string;
  tech: string;
}

const PAGE_SIZE = 10;

export default function ClientTicketsPage() {
  const [tickets, setTickets] = useState<UiTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [filter, setFilter] = useState<'OUVERT' | 'EN_COURS' | 'CLOTURE'>('OUVERT');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('TOUS_TYPES');
  const [sortBy, setSortBy] = useState('DATE_DESC');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadClientTickets = async () => {
      setLoading(true);
      setFetchError(null);

      try {
        const response = await apiRequest<BackendClientTicket[]>('/api/client/tickets', {
          method: 'GET',
        });

        const mapped = response.map((ticket) => ({
          id: ticket.ticketRef || ticket._id,
          sn: ticket.sn,
          type: toProblemTypeLabel(ticket.typeProbleme),
          status: ticket.statut,
          date: formatDateFr(ticket.creationDate),
          admin: ticket.adminId?.nom || '—',
          tech: ticket.technicienId?.nom || '—',
        }));

        setTickets(mapped);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          setTickets([]);
          setFetchError(null);
        } else {
          setFetchError(getErrorMessage(error, 'Impossible de charger vos tickets.'));
          setTickets([]);
        }
      } finally {
        setLoading(false);
      }
    };

    void loadClientTickets();
  }, []);

  const statFilters: Array<'OUVERT' | 'EN_COURS' | 'CLOTURE'> = ['OUVERT', 'EN_COURS', 'CLOTURE'];

  const counts = {
    OUVERT: tickets.filter(t => t.status === 'OUVERT').length,
    EN_COURS: tickets.filter(t => t.status === 'EN_COURS').length,
    CLOTURE: tickets.filter(t => t.status === 'CLOTURE').length,
  };

  const parseDate = (date: string) => {
    const [day, month, year] = date.split('/').map(Number);
    return new Date(year, month - 1, day).getTime();
  };

  const filtered = tickets.filter((t) => {
    const matchStatus = t.status === filter;
    const needle = search.toLowerCase();
    const matchSearch = !needle || t.sn.includes(search.toUpperCase()) || t.type.toLowerCase().includes(needle) || t.id.toLowerCase().includes(needle);
    const matchType = typeFilter === 'TOUS_TYPES' || t.type === typeFilter;
    return matchStatus && matchSearch && matchType;
  });

  const sortedTickets = [...filtered].sort((a, b) => {
    if (sortBy === 'DATE_ASC') return parseDate(a.date) - parseDate(b.date);
    if (sortBy === 'TYPE_ASC') return a.type.localeCompare(b.type, 'fr');
    if (sortBy === 'TYPE_DESC') return b.type.localeCompare(a.type, 'fr');
    return parseDate(b.date) - parseDate(a.date);
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

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Mes Tickets</h1>
        <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Historique de vos demandes d'intervention fibre optique</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total', val: tickets.length, color: '#1a237e', bg: '#e8eaf6' },
          { label: 'Ouverts', val: counts['OUVERT'], color: '#bf360c', bg: '#fff3e0' },
          { label: 'En cours', val: counts['EN_COURS'], color: '#0d47a1', bg: '#e3f2fd' },
          { label: 'Clôturés', val: counts['CLOTURE'], color: '#1b5e20', bg: '#e8f5e9' },
        ].map((c, i) => (
          <div key={i} style={{
            background: 'white', borderRadius: 14, padding: '18px 20px',
            border: '1px solid #e8ecf0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: c.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Ticket size={22} color={c.color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.val}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
        {/* Toolbar */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          {/* Filter buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            {statFilters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: '1.5px solid',
                  borderColor: filter === f ? '#1a237e' : '#e0e0e0',
                  background: filter === f ? '#e8eaf6' : 'white',
                  color: filter === f ? '#1a237e' : '#666',
                  fontSize: 12, fontWeight: filter === f ? 700 : 500, cursor: 'pointer',
                }}
              >
                {toStatusLabel(f)} <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.8 }}>({counts[f] ?? filtered.length})</span>
              </button>
            ))}
          </div>

          {/* Search + filter + sort */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#aaa" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher SN, type..."
                style={{
                  padding: '8px 12px 8px 30px', borderRadius: 8, border: '1px solid #e0e0e0',
                  fontSize: 13, outline: 'none', background: '#fafafa', width: 220, fontFamily: 'inherit',
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
                <option value="DATE_DESC">Date décroissante</option>
                <option value="DATE_ASC">Date croissante</option>
                <option value="TYPE_ASC">Type A-Z</option>
                <option value="TYPE_DESC">Type Z-A</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8faff' }}>
                {['ID Ticket', 'Numéro de série (SN)', 'Type de problème', 'Statut', 'Date de création'].map((h, i) => (
                  <th key={i} style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: 11,
                    fontWeight: 700, color: '#666', textTransform: 'uppercase',
                    letterSpacing: 0.5, borderBottom: '1px solid #e8ecf0', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedTickets.map((t, i) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f5f5f5', background: i % 2 === 0 ? 'white' : '#fafbff' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1a237e', fontSize: 13 }}>{t.id}</td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: '#444', letterSpacing: 1 }}>{t.sn}</td>
                  <td style={{ padding: '14px 16px', color: '#333' }}>{t.type}</td>
                  <td style={{ padding: '14px 16px' }}><StatusBadge status={toStatusLabel(t.status)} /></td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={12} color="#aaa" />
                      <span style={{ color: '#888', fontSize: 12 }}>{t.date}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <div style={{ padding: '28px', textAlign: 'center', color: '#888' }}>
              Chargement des tickets...
            </div>
          )}
          {!loading && fetchError && (
            <div style={{ padding: '16px 20px', color: '#b71c1c', fontSize: 13, fontWeight: 600 }}>
              {fetchError}
            </div>
          )}
          {sortedTickets.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: '#aaa' }}>
              <Ticket size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ margin: 0 }}>Aucun ticket trouvé</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: '#888' }}>{sortedTickets.length} ticket(s)</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage <= 1}
              style={{
                width: 30, height: 30, borderRadius: 6, border: '1px solid #e0e0e0',
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
                width: 30, height: 30, borderRadius: 6, border: '1px solid #e0e0e0',
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
