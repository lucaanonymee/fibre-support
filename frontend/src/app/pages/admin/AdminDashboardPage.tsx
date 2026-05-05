import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Ticket, Users, Wrench } from 'lucide-react';
import {
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
import { ChartTooltip } from '../../components/dashboard/ChartTooltip';
import { DashboardPanel } from '../../components/dashboard/DashboardPanel';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { toTicketCategory } from '../../utils/backendMappers';
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
  assignationDate?: string;
  clientId?: BackendUserRef | null;
  technicienId?: BackendUserRef | null;
}

interface BackendAdminTechnician {
  _id: string;
  nom?: string;
  presentAujourdhui?: boolean;
}

interface AssignmentPoint {
  label: string;
  count: number;
}

interface ZoneSplitPoint {
  name: 'UGS' | 'ULS';
  value: number;
  color: string;
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

const AUTO_REFRESH_MS = 30000;
const dayMs = 24 * 60 * 60 * 1000;
const pad = (value: number): string => value.toString().padStart(2, '0');

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

const toDayKey = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatShortDate = (date: Date): string => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;

const formatFullDate = (date: Date): string => `${formatShortDate(date)}/${date.getFullYear()}`;

const parseDateInput = (value: string): Date | null => {
  if (!value) {
    return null;
  }

  const parts = value.split('-').map((item) => Number(item));
  if (parts.length !== 3 || parts.some((item) => Number.isNaN(item))) {
    return null;
  }

  const [year, month, day] = parts;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
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

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>('30j');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

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
    const startInput = parseDateInput(rangeStart);
    const endInput = parseDateInput(rangeEnd);

    if (startInput && endInput && startInput <= endInput) {
      const start = startOfDay(startInput);
      const end = endOfDay(endInput);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / dayMs) + 1);
      return { start, end, days, label: `${formatFullDate(start)} - ${formatFullDate(end)}` };
    }

    const days = getPeriodDays(period);
    const end = endOfDay(new Date());
    const start = startOfDay(addDays(end, -(days - 1)));
    return { start, end, days, label: periodLabels[period] };
  }, [period, rangeEnd, rangeStart]);

  const periodTickets = useMemo(
    () => tickets.filter((ticket) => {
      const createdAt = toDate(ticket.creationDate);
      return createdAt ? isWithinRange(createdAt, periodRange.start, periodRange.end) : false;
    }),
    [periodRange.end, periodRange.start, tickets],
  );

  const statusTotals = useMemo(() => {
    const totals = countStatusesForRange(periodTickets, periodRange.start, periodRange.end);

    return [
      { name: 'Ouverts', key: 'OUVERT', value: totals.ouverts, color: '#f44336' },
      { name: 'En cours', key: 'EN_COURS', value: totals.enCours, color: '#ff9800' },
      { name: 'Clotures', key: 'CLOTURE', value: totals.clotures, color: '#4caf50' },
    ];
  }, [periodRange.end, periodRange.start, periodTickets]);

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

  const assignmentSeries = useMemo(() => {
    const rows: AssignmentPoint[] = Array.from({ length: periodRange.days }, (_, index) => {
      const day = addDays(periodRange.start, index);
      return {
        label: formatShortDate(day),
        count: 0,
      };
    });

    const indexByKey = new Map<string, number>(
      rows.map((_, index) => [toDayKey(addDays(periodRange.start, index)), index]),
    );

    tickets.forEach((ticket) => {
      const assignedAt = toDate(ticket.assignationDate);
      if (!assignedAt || !isWithinRange(assignedAt, periodRange.start, periodRange.end)) {
        return;
      }

      const index = indexByKey.get(toDayKey(assignedAt));
      if (index === undefined) {
        return;
      }

      rows[index].count += 1;
    });

    return rows;
  }, [periodRange.days, periodRange.end, periodRange.start, tickets]);

  const kpis = useMemo(() => {
    const ouverts = statusTotals.find((item) => item.key === 'OUVERT')?.value ?? 0;
    const enCours = statusTotals.find((item) => item.key === 'EN_COURS')?.value ?? 0;
    const clotures = statusTotals.find((item) => item.key === 'CLOTURE')?.value ?? 0;
    const activeTechs = technicians.length;

    return {
      ouverts,
      enCours,
      clotures,
      activeTechs,
    };
  }, [statusTotals, technicians.length]);

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

          <input
            type="date"
            value={rangeStart}
            onChange={(event) => setRangeStart(event.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid #dfe5eb',
              background: 'white',
              fontFamily: 'inherit',
              fontSize: 13,
              color: '#333',
            }}
          />

          <input
            type="date"
            value={rangeEnd}
            onChange={(event) => setRangeEnd(event.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid #dfe5eb',
              background: 'white',
              fontFamily: 'inherit',
              fontSize: 13,
              color: '#333',
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
        Periode active: {periodRange.label}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        <KpiCard
          label="Tickets ouverts"
          value={kpis.ouverts}
          icon={Ticket}
          color="#f44336"
          bg="#ffebee"
        />
        <KpiCard
          label="En cours"
          value={kpis.enCours}
          icon={Clock3}
          color="#ff9800"
          bg="#fff3e0"
        />
        <KpiCard
          label="Clotures"
          value={kpis.clotures}
          icon={CheckCircle2}
          color="#4caf50"
          bg="#e8f5e9"
        />
        <KpiCard
          label="Techniciens actifs"
          value={kpis.activeTechs}
          icon={Users}
          color="#1a237e"
          bg="#e8eaf6"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 20 }}>
        <DashboardPanel
          title="Tickets par statut"
          subtitle="Repartition des tickets"
          icon={<AlertTriangle size={16} color="#ff9800" />}
        >
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusTotals}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={86}
                  paddingAngle={2}
                >
                  {statusTotals.map((item) => (
                    <Cell key={item.key} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Tickets assignes par jour" subtitle="Charge de travail" icon={<Ticket size={16} color="#1a237e" />}>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={assignmentSeries} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#666', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Assignes" fill="#1a237e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Repartition UGS / ULS" subtitle="Nombre de tickets" icon={<Wrench size={16} color="#3f51b5" />}>
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
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: '#888' }}>
        Donnees live backend: tickets admin, statuts, repartition UGS/ULS et assignations.
      </div>
    </div>
  );
}
