import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Ticket, Users, Wrench } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StatusBadge } from '../../components/StatusBadge';
import { ChartTooltip } from '../../components/dashboard/ChartTooltip';
import { DashboardPanel } from '../../components/dashboard/DashboardPanel';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { formatDateFr, toPriorityLabel, toProblemTypeLabel, toTicketCategory } from '../../utils/backendMappers';
import { ApiError, apiRequest, getErrorMessage } from '../../utils/httpApi';

type PeriodKey = '7j' | '30j' | '90j';
type TicketStatus = 'OUVERT' | 'EN_COURS' | 'CLOTURE';

interface BackendUserRef {
  _id?: string;
  nom?: string;
}

interface BackendAdminTicket {
  _id: string;
  ticketRef?: string;
  typeProbleme?: string;
  statut?: TicketStatus;
  priorite?: string;
  creationDate?: string;
  clientId?: BackendUserRef | null;
  technicienId?: BackendUserRef | null;
}

interface BackendAdminTechnician {
  _id: string;
  nom?: string;
  presentAujourdhui?: boolean;
}

interface TrendPoint {
  label: string;
  ouverts: number;
  enCours: number;
  clotures: number;
}

interface TicketTypePoint {
  name: string;
  total: number;
}

interface ZoneSplitPoint {
  name: 'UGS' | 'ULS';
  value: number;
  color: string;
}

interface TechLoadPoint {
  name: string;
  tickets: number;
  resolus: number;
}

interface TicketRow {
  id: string;
  client: string;
  type: string;
  priority: string | null;
  status: TicketStatus;
  zone: 'UGS' | 'ULS';
  date: string;
}

interface StatusCounts {
  ouverts: number;
  enCours: number;
  clotures: number;
}

const periodLabels: Record<PeriodKey, string> = {
  '7j': '7 derniers jours',
  '30j': '30 derniers jours',
  '90j': '90 derniers jours',
};

const monthLabels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
const weekdayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const dayMs = 24 * 60 * 60 * 1000;
const AUTO_REFRESH_MS = 30000;

const toDate = (value?: string): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getPeriodDays = (period: PeriodKey): number => {
  if (period === '7j') {
    return 7;
  }
  if (period === '30j') {
    return 30;
  }
  return 90;
};

const isWithinRange = (date: Date, start: Date, end: Date): boolean => date >= start && date <= end;

const countStatusesForRange = (tickets: BackendAdminTicket[], start: Date, end: Date): StatusCounts => {
  const counts: StatusCounts = { ouverts: 0, enCours: 0, clotures: 0 };

  tickets.forEach((ticket) => {
    const createdAt = toDate(ticket.creationDate);
    if (!createdAt || !isWithinRange(createdAt, start, end)) {
      return;
    }

    if (ticket.statut === 'OUVERT') {
      counts.ouverts += 1;
      return;
    }

    if (ticket.statut === 'EN_COURS') {
      counts.enCours += 1;
      return;
    }

    if (ticket.statut === 'CLOTURE') {
      counts.clotures += 1;
    }
  });

  return counts;
};

const formatDelta = (current: number, previous: number): { label: string; positive: boolean } => {
  if (previous <= 0) {
    if (current <= 0) {
      return { label: '0%', positive: true };
    }
    return { label: '+100%', positive: true };
  }

  const ratio = ((current - previous) / previous) * 100;
  const rounded = Math.round(ratio);
  const prefix = rounded > 0 ? '+' : '';

  return {
    label: `${prefix}${rounded}%`,
    positive: rounded >= 0,
  };
};

const buildTrendData = (period: PeriodKey, tickets: BackendAdminTicket[], start: Date): TrendPoint[] => {
  if (period === '7j') {
    const rows: TrendPoint[] = Array.from({ length: 7 }, (_, index) => {
      const day = addDays(start, index);
      return {
        label: weekdayLabels[day.getDay()],
        ouverts: 0,
        enCours: 0,
        clotures: 0,
      };
    });

    tickets.forEach((ticket) => {
      const createdAt = toDate(ticket.creationDate);
      if (!createdAt) {
        return;
      }

      const diff = Math.floor((startOfDay(createdAt).getTime() - start.getTime()) / dayMs);
      if (diff < 0 || diff >= rows.length) {
        return;
      }

      if (ticket.statut === 'OUVERT') {
        rows[diff].ouverts += 1;
      } else if (ticket.statut === 'EN_COURS') {
        rows[diff].enCours += 1;
      } else if (ticket.statut === 'CLOTURE') {
        rows[diff].clotures += 1;
      }
    });

    return rows;
  }

  if (period === '30j') {
    const rows: TrendPoint[] = Array.from({ length: 4 }, (_, index) => ({
      label: `S${index + 1}`,
      ouverts: 0,
      enCours: 0,
      clotures: 0,
    }));

    tickets.forEach((ticket) => {
      const createdAt = toDate(ticket.creationDate);
      if (!createdAt) {
        return;
      }

      const diff = Math.floor((startOfDay(createdAt).getTime() - start.getTime()) / dayMs);
      if (diff < 0 || diff >= 30) {
        return;
      }

      const index = diff < 7 ? 0 : diff < 14 ? 1 : diff < 21 ? 2 : 3;

      if (ticket.statut === 'OUVERT') {
        rows[index].ouverts += 1;
      } else if (ticket.statut === 'EN_COURS') {
        rows[index].enCours += 1;
      } else if (ticket.statut === 'CLOTURE') {
        rows[index].clotures += 1;
      }
    });

    return rows;
  }

  const now = new Date();
  const months = [2, 1, 0].map((offset) => {
    const bucketDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return {
      key: `${bucketDate.getFullYear()}-${bucketDate.getMonth()}`,
      label: monthLabels[bucketDate.getMonth()],
    };
  });

  const indexByMonth = new Map(months.map((item, index) => [item.key, index]));

  const rows: TrendPoint[] = months.map((item) => ({
    label: item.label,
    ouverts: 0,
    enCours: 0,
    clotures: 0,
  }));

  tickets.forEach((ticket) => {
    const createdAt = toDate(ticket.creationDate);
    if (!createdAt) {
      return;
    }

    const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
    const index = indexByMonth.get(key);
    if (index === undefined) {
      return;
    }

    if (ticket.statut === 'OUVERT') {
      rows[index].ouverts += 1;
    } else if (ticket.statut === 'EN_COURS') {
      rows[index].enCours += 1;
    } else if (ticket.statut === 'CLOTURE') {
      rows[index].clotures += 1;
    }
  });

  return rows;
};

const getTechnicianName = (value?: BackendUserRef | null): string => {
  if (value?.nom && value.nom.trim().length > 0) {
    return value.nom;
  }
  return 'Technicien inconnu';
};

const getClientName = (value?: BackendUserRef | null): string => {
  if (value?.nom && value.nom.trim().length > 0) {
    return value.nom;
  }
  return 'Client inconnu';
};

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>('30j');
  const [statusFilter, setStatusFilter] = useState<'TOUS' | TicketStatus>('TOUS');
  const [search, setSearch] = useState('');

  const [tickets, setTickets] = useState<BackendAdminTicket[]>([]);
  const [technicians, setTechnicians] = useState<BackendAdminTechnician[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    setFetchError(null);

    const errors: string[] = [];
    let loadedTickets: BackendAdminTicket[] = [];
    let loadedTechnicians: BackendAdminTechnician[] = [];

    try {
      loadedTickets = await apiRequest<BackendAdminTicket[]>('/api/admin/tickets', {
        method: 'GET',
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        loadedTickets = [];
      } else {
        errors.push(getErrorMessage(error, 'Impossible de charger les tickets admin.'));
      }
    }

    try {
      loadedTechnicians = await apiRequest<BackendAdminTechnician[]>('/api/admin/techniciens', {
        method: 'GET',
      });
    } catch (error) {
      errors.push(getErrorMessage(error, 'Impossible de charger les techniciens admin.'));
    }

    setTickets(loadedTickets);
    setTechnicians(loadedTechnicians);
    setFetchError(errors.length > 0 ? errors.join(' ') : null);

    if (!silent) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData();

    const intervalId = window.setInterval(() => {
      void loadDashboardData({ silent: true });
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [loadDashboardData]);

  const periodRange = useMemo(() => {
    const days = getPeriodDays(period);
    const end = endOfDay(new Date());
    const start = startOfDay(addDays(end, -(days - 1)));
    return { start, end, days };
  }, [period]);

  const previousRange = useMemo(() => {
    const end = new Date(periodRange.start.getTime() - 1);
    const start = startOfDay(addDays(periodRange.start, -periodRange.days));
    return { start, end };
  }, [periodRange]);

  const periodTickets = useMemo(
    () => tickets.filter((ticket) => {
      const createdAt = toDate(ticket.creationDate);
      return createdAt ? isWithinRange(createdAt, periodRange.start, periodRange.end) : false;
    }),
    [periodRange.end, periodRange.start, tickets],
  );

  const trendData = useMemo(
    () => buildTrendData(period, periodTickets, periodRange.start),
    [period, periodRange.start, periodTickets],
  );

  const statusTotals = useMemo(() => {
    const totals = countStatusesForRange(periodTickets, periodRange.start, periodRange.end);

    return [
      { name: 'Ouverts', key: 'OUVERT', value: totals.ouverts, color: '#f44336' },
      { name: 'En cours', key: 'EN_COURS', value: totals.enCours, color: '#ff9800' },
      { name: 'Clotures', key: 'CLOTURE', value: totals.clotures, color: '#4caf50' },
    ];
  }, [periodRange.end, periodRange.start, periodTickets]);

  const previousTotals = useMemo(
    () => countStatusesForRange(tickets, previousRange.start, previousRange.end),
    [previousRange.end, previousRange.start, tickets],
  );

  const ticketTypes = useMemo(() => {
    const countByType = new Map<string, number>();

    periodTickets.forEach((ticket) => {
      const label = toProblemTypeLabel(ticket.typeProbleme);
      countByType.set(label, (countByType.get(label) ?? 0) + 1);
    });

    return Array.from(countByType.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6) satisfies TicketTypePoint[];
  }, [periodTickets]);

  const zoneSplit = useMemo(() => {
    let ugs = 0;
    let uls = 0;

    periodTickets.forEach((ticket) => {
      if (toTicketCategory(ticket.typeProbleme) === 'UGS') {
        ugs += 1;
      } else {
        uls += 1;
      }
    });

    return [
      { name: 'UGS', value: ugs, color: '#3f51b5' },
      { name: 'ULS', value: uls, color: '#00acc1' },
    ] satisfies ZoneSplitPoint[];
  }, [periodTickets]);

  const technicianLoad = useMemo(() => {
    const map = new Map<string, TechLoadPoint>();

    technicians.forEach((tech) => {
      const key = tech._id;
      const name = tech.nom && tech.nom.trim().length > 0 ? tech.nom : `Technicien ${key.slice(-4).toUpperCase()}`;

      map.set(key, {
        name,
        tickets: 0,
        resolus: 0,
      });
    });

    periodTickets.forEach((ticket) => {
      if (!ticket.technicienId) {
        return;
      }

      const key = ticket.technicienId._id || `nom:${(ticket.technicienId.nom || 'inconnu').toLowerCase()}`;
      const name = getTechnicianName(ticket.technicienId);
      const current = map.get(key) ?? { name, tickets: 0, resolus: 0 };

      if (ticket.statut === 'CLOTURE') {
        current.resolus += 1;
      } else {
        current.tickets += 1;
      }

      map.set(key, current);
    });

    const sorted = Array.from(map.values()).sort((a, b) => {
      if (b.tickets !== a.tickets) {
        return b.tickets - a.tickets;
      }
      if (b.resolus !== a.resolus) {
        return b.resolus - a.resolus;
      }
      return a.name.localeCompare(b.name, 'fr');
    });

    const withActivity = sorted.filter((item) => item.tickets > 0 || item.resolus > 0);
    return (withActivity.length > 0 ? withActivity : sorted).slice(0, 8);
  }, [periodTickets, technicians]);

  const kpis = useMemo(() => {
    const ouverts = statusTotals.find((item) => item.key === 'OUVERT')?.value ?? 0;
    const enCours = statusTotals.find((item) => item.key === 'EN_COURS')?.value ?? 0;
    const clotures = statusTotals.find((item) => item.key === 'CLOTURE')?.value ?? 0;

    const total = ouverts + enCours + clotures;
    const resolutionRate = total > 0 ? Math.round((clotures / total) * 100) : 0;

    const presentTechs = technicians.filter((tech) => tech.presentAujourdhui).length;
    let activeTechs = technicianLoad.filter((item) => item.tickets > 0).length;
    if (activeTechs === 0) {
      activeTechs = presentTechs;
    }

    return {
      ouverts,
      enCours,
      clotures,
      resolutionRate,
      activeTechs,
      presentTechs,
      totalTechs: technicians.length,
    };
  }, [statusTotals, technicianLoad, technicians]);

  const deltas = useMemo(() => {
    const openDelta = formatDelta(kpis.ouverts, previousTotals.ouverts);
    const progressDelta = formatDelta(kpis.enCours, previousTotals.enCours);
    const closedDelta = formatDelta(kpis.clotures, previousTotals.clotures);

    return {
      open: openDelta.label,
      openPositive: kpis.ouverts <= previousTotals.ouverts,
      progress: progressDelta.label,
      progressPositive: kpis.enCours <= previousTotals.enCours,
      closed: closedDelta.label,
      closedPositive: closedDelta.positive,
      techs: kpis.totalTechs > 0
        ? `${kpis.presentTechs} presents (total ${kpis.totalTechs})`
        : 'Aucun technicien',
    };
  }, [kpis, previousTotals]);

  const ticketRows = useMemo(() => {
    const sorted = [...periodTickets].sort((a, b) => {
      const aTime = toDate(a.creationDate)?.getTime() ?? 0;
      const bTime = toDate(b.creationDate)?.getTime() ?? 0;
      return bTime - aTime;
    });

    return sorted.map((ticket) => ({
      id: ticket.ticketRef || ticket._id,
      client: getClientName(ticket.clientId),
      type: toProblemTypeLabel(ticket.typeProbleme),
      priority: ticket.statut === 'CLOTURE' ? null : toPriorityLabel(ticket.priorite),
      status: ticket.statut || 'OUVERT',
      zone: toTicketCategory(ticket.typeProbleme),
      date: formatDateFr(ticket.creationDate),
    })) satisfies TicketRow[];
  }, [periodTickets]);

  const filteredTickets = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return ticketRows.filter((ticket) => {
      const statusMatch = statusFilter === 'TOUS' || ticket.status === statusFilter;
      const searchMatch =
        needle.length === 0
        || ticket.id.toLowerCase().includes(needle)
        || ticket.client.toLowerCase().includes(needle)
        || ticket.type.toLowerCase().includes(needle);

      return statusMatch && searchMatch;
    });
  }, [search, statusFilter, ticketRows]);

  return (
    <div>
      <div
        style={{
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Dashboard Admin</h1>
          <p style={{ margin: 0, color: '#888', fontSize: 14 }}>
            Pilotage tickets, performances equipe et repartition UGS/ULS
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as PeriodKey)}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid #dfe5eb',
              background: 'white',
              fontFamily: 'inherit',
              fontSize: 13,
              color: '#333',
            }}
          >
            <option value="7j">7 jours</option>
            <option value="30j">30 jours</option>
            <option value="90j">90 jours</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'TOUS' | TicketStatus)}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid #dfe5eb',
              background: 'white',
              fontFamily: 'inherit',
              fontSize: 13,
              color: '#333',
            }}
          >
            <option value="TOUS">Tous statuts</option>
            <option value="OUVERT">Ouvert</option>
            <option value="EN_COURS">En cours</option>
            <option value="CLOTURE">Cloture</option>
          </select>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher ticket/client"
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid #dfe5eb',
              background: 'white',
              fontFamily: 'inherit',
              fontSize: 13,
              color: '#333',
              minWidth: 190,
            }}
          />
        </div>
      </div>

      {loading ? (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#f8faff',
            border: '1px solid #e3f2fd',
            color: '#1a237e',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Chargement des indicateurs admin...
        </div>
      ) : null}

      {fetchError ? (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#ffebee',
            border: '1px solid #ffcdd2',
            color: '#b71c1c',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {fetchError}
        </div>
      ) : null}

      <p style={{ margin: '0 0 16px', color: '#888', fontSize: 12 }}>
        Periode active: {periodLabels[period]}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        <KpiCard
          label="Tickets ouverts"
          value={kpis.ouverts}
          icon={Ticket}
          color="#f44336"
          bg="#ffebee"
          delta={deltas.open}
          deltaPositive={deltas.openPositive}
        />
        <KpiCard
          label="En cours"
          value={kpis.enCours}
          icon={Clock3}
          color="#ff9800"
          bg="#fff3e0"
          delta={deltas.progress}
          deltaPositive={deltas.progressPositive}
        />
        <KpiCard
          label="Clotures"
          value={kpis.clotures}
          icon={CheckCircle2}
          color="#4caf50"
          bg="#e8f5e9"
          delta={deltas.closed}
          deltaPositive={deltas.closedPositive}
        />
        <KpiCard
          label="Techniciens actifs"
          value={kpis.activeTechs}
          icon={Users}
          color="#1a237e"
          bg="#e8eaf6"
          delta={deltas.techs}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 20 }}>
        <DashboardPanel title="Tendance des tickets" subtitle="Ouverts, en cours et clotures" icon={<Ticket size={16} color="#1a237e" />}>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={trendData} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="openedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f44336" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#f44336" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff9800" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ff9800" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="closedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4caf50" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4caf50" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="ouverts" name="Ouverts" stroke="#f44336" fill="url(#openedFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="enCours" name="En cours" stroke="#ff9800" fill="url(#progressFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="clotures" name="Clotures" stroke="#4caf50" fill="url(#closedFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Tickets par statut"
          subtitle={`Taux de resolution: ${kpis.resolutionRate}%`}
          icon={<AlertTriangle size={16} color="#ff9800" />}
        >
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={statusTotals} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Tickets" radius={[6, 6, 0, 0]}>
                  {statusTotals.map((item) => (
                    <Cell key={item.key} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Repartition UGS / ULS" subtitle="Volume de tickets par zone" icon={<Wrench size={16} color="#3f51b5" />}>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={zoneSplit}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={86}
                  paddingAngle={2}
                >
                  {zoneSplit.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Charge des techniciens" subtitle="Tickets actifs vs resolus" icon={<Users size={16} color="#1a237e" />}>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={technicianLoad} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="tickets" name="Actifs" fill="#1a237e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolus" name="Resolus" fill="#66bb6a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>
      </div>

      <div style={{ marginTop: 20 }}>
        <DashboardPanel
          title="Tickets recents"
          subtitle={`${filteredTickets.length} ticket(s) affiche(s)`}
          icon={<AlertTriangle size={16} color="#ff9800" />}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr style={{ background: '#f8faff' }}>
                  {['Ticket', 'Client', 'Type', 'Priorite', 'Statut', 'Zone', 'Date'].map((header) => (
                    <th
                      key={header}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderBottom: '1px solid #e8ecf0',
                        fontSize: 11,
                        color: '#666',
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket, index) => (
                  <tr key={ticket.id} style={{ background: index % 2 === 0 ? 'white' : '#fafcff' }}>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #f1f3f5', fontWeight: 700, color: '#1a237e' }}>{ticket.id}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #f1f3f5', color: '#333', fontSize: 13 }}>{ticket.client}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #f1f3f5', color: '#555', fontSize: 13 }}>{ticket.type}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #f1f3f5' }}>
                      {ticket.priority ? <StatusBadge status={ticket.priority} /> : <span style={{ color: '#bbb', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #f1f3f5' }}>
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #f1f3f5' }}>
                      <StatusBadge status={ticket.zone} />
                    </td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #f1f3f5', color: '#888', fontSize: 12 }}>{ticket.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredTickets.length === 0 ? (
              <div
                style={{
                  padding: '18px 12px',
                  textAlign: 'center',
                  color: '#888',
                  fontSize: 13,
                }}
              >
                Aucun ticket ne correspond aux filtres.
              </div>
            ) : null}
          </div>
        </DashboardPanel>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: '#888' }}>
        Donnees live backend: tickets admin, statut, repartition UGS/ULS et charge techniciens.
      </div>
    </div>
  );
}
