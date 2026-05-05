import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ticket, UserCheck, Users } from 'lucide-react';
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
import { apiRequest, getErrorMessage } from '../../utils/httpApi';

type PeriodKey = '7j' | '30j' | '90j';
type TicketStatus = 'OUVERT' | 'EN_COURS' | 'CLOTURE';

interface BackendZoneIntervention {
  type?: 'Polygon';
  coordinates?: number[][][];
}

interface BackendUser {
  _id: string;
  nom?: string;
  email?: string;
  role?: 'ADMIN' | 'CLIENT' | 'TECHNICIEN';
  isActive?: boolean;
  zoneIntervention?: BackendZoneIntervention | null;
  createdAt?: string;
}

interface ListUsersResponse {
  total?: number;
  users?: BackendUser[];
}

interface TicketsSummaryResponse {
  total?: number;
  status?: Partial<Record<TicketStatus, number>>;
}

interface AdminRecord {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: Date | null;
  zoneAreaKm2: number;
}

interface AdminLoadPoint {
  name: string;
  espace: number;
  anciennete: number;
}

interface AdminStatusPoint {
  name: string;
  value: number;
  color: string;
}

const periodLabels: Record<PeriodKey, string> = {
  '7j': '7 derniers jours',
  '30j': '30 derniers jours',
  '90j': '90 derniers jours',
};

const dayMs = 24 * 60 * 60 * 1000;
const pad = (value: number): string => value.toString().padStart(2, '0');
const EARTH_RADIUS_METERS = 6371000;

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

const toRadians = (value: number): number => (value * Math.PI) / 180;

const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const getPolygonAreaSquareMeters = (zone?: BackendZoneIntervention | null): number => {
  const ring = zone?.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 3) {
    return 0;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  const isClosed = Array.isArray(first)
    && Array.isArray(last)
    && first.length >= 2
    && last.length >= 2
    && first[0] === last[0]
    && first[1] === last[1];

  const points = isClosed ? ring : [...ring, ring[0]];
  const latAverage = points.reduce((sum, point) => sum + toRadians(point[1]), 0) / points.length;
  const cosLat = Math.cos(latAverage);

  let area = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [lng1, lat1] = points[i];
    const [lng2, lat2] = points[i + 1];

    const x1 = EARTH_RADIUS_METERS * toRadians(lng1) * cosLat;
    const y1 = EARTH_RADIUS_METERS * toRadians(lat1);
    const x2 = EARTH_RADIUS_METERS * toRadians(lng2) * cosLat;
    const y2 = EARTH_RADIUS_METERS * toRadians(lat2);

    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) / 2;
};

const getPolygonAreaKm2 = (zone?: BackendZoneIntervention | null): number => {
  const areaMeters = getPolygonAreaSquareMeters(zone);
  return roundTo(areaMeters / 1_000_000, 2);
};

export default function SuperAdminDashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>('30j');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  const [rawUsers, setRawUsers] = useState<BackendUser[]>([]);
  const [ticketSummary, setTicketSummary] = useState<TicketsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setFetchError(null);

      try {
        const [usersResponse, ticketsResponse] = await Promise.all([
          apiRequest<ListUsersResponse>('/api/superadmin/utilisateurs', { method: 'GET' }),
          apiRequest<TicketsSummaryResponse>('/api/superadmin/tickets/summary', { method: 'GET' }),
        ]);

        setRawUsers(usersResponse.users || []);
        setTicketSummary(ticketsResponse);
      } catch (error) {
        setRawUsers([]);
        setTicketSummary(null);
        setFetchError(getErrorMessage(error, 'Impossible de charger les indicateurs superadmin.'));
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

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

  const admins = useMemo(() => {
    return rawUsers
      .filter((user) => user.role === 'ADMIN')
      .map((admin) => {
        const createdAt = toDate(admin.createdAt);

        return {
          id: admin._id,
          name: admin.nom && admin.nom.trim().length > 0 ? admin.nom : `Admin ${admin._id.slice(-4).toUpperCase()}`,
          email: admin.email || '',
          active: admin.isActive !== false,
          createdAt,
          zoneAreaKm2: getPolygonAreaKm2(admin.zoneIntervention),
        } satisfies AdminRecord;
      });
  }, [rawUsers]);

  const adminsInRange = useMemo(() => {
    return admins.filter((admin) => admin.createdAt && isWithinRange(admin.createdAt, periodRange.start, periodRange.end));
  }, [admins, periodRange.end, periodRange.start]);

  const adminLoad = useMemo(() => {
    return [...adminsInRange]
      .map((admin) => {
        const ageDays = admin.createdAt
          ? Math.max(1, Math.floor((Date.now() - admin.createdAt.getTime()) / dayMs))
          : 0;

        return {
          name: admin.name,
          espace: admin.zoneAreaKm2,
          anciennete: ageDays,
        } satisfies AdminLoadPoint;
      })
      .sort((a, b) => {
        if (b.espace !== a.espace) {
          return b.espace - a.espace;
        }
        if (b.anciennete !== a.anciennete) {
          return b.anciennete - a.anciennete;
        }
        return a.name.localeCompare(b.name, 'fr');
      })
      .slice(0, 8);
  }, [adminsInRange]);

  const adminStatus = useMemo(() => {
    const active = adminsInRange.filter((admin) => admin.active).length;
    const inactive = adminsInRange.length - active;

    return [
      { name: 'Actifs', value: active, color: '#43a047' },
      { name: 'Inactifs', value: inactive, color: '#90a4ae' },
    ] satisfies AdminStatusPoint[];
  }, [adminsInRange]);

  const ticketStatusTotals = useMemo(() => {
    const status = ticketSummary?.status ?? {};
    const ouverts = status.OUVERT ?? 0;
    const enCours = status.EN_COURS ?? 0;
    const clotures = status.CLOTURE ?? 0;
    const total = ticketSummary?.total ?? ouverts + enCours + clotures;

    return {
      ouverts,
      enCours,
      clotures,
      total,
    };
  }, [ticketSummary]);

  const ticketStatusChart = useMemo(() => {
    return [
      { name: 'Ouverts', key: 'OUVERT', value: ticketStatusTotals.ouverts, color: '#f44336' },
      { name: 'En cours', key: 'EN_COURS', value: ticketStatusTotals.enCours, color: '#ff9800' },
      { name: 'Clotures', key: 'CLOTURE', value: ticketStatusTotals.clotures, color: '#4caf50' },
    ];
  }, [ticketStatusTotals]);

  const kpis = useMemo(() => {
    return {
      totalUsers: rawUsers.length,
      totalAdmins: admins.length,
      totalTickets: ticketStatusTotals.total,
    };
  }, [admins.length, rawUsers.length, ticketStatusTotals.total]);

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
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Dashboard SuperAdmin</h1>
          <p style={{ margin: 0, color: '#888', fontSize: 14 }}>
            Vue globale utilisateurs, admins et tickets
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
          Chargement des indicateurs superadmin...
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
          label="Utilisateurs"
          value={kpis.totalUsers}
          icon={Users}
          color="#1a237e"
          bg="#e8eaf6"
        />
        <KpiCard
          label="Admins"
          value={kpis.totalAdmins}
          icon={UserCheck}
          color="#2e7d32"
          bg="#e8f5e9"
        />
        <KpiCard
          label="Tickets"
          value={kpis.totalTickets}
          icon={Ticket}
          color="#ef6c00"
          bg="#fff3e0"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 20 }}>
        <DashboardPanel title="Tickets globaux" subtitle="Ouverts, en cours, clotures" icon={<Ticket size={16} color="#ef6c00" />}>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={ticketStatusChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Tickets" radius={[6, 6, 0, 0]}>
                  {ticketStatusChart.map((item) => (
                    <Cell key={item.key} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Gestion des admins" subtitle="Actifs vs inactifs" icon={<UserCheck size={16} color="#43a047" />}>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={adminStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={86}
                  paddingAngle={2}
                >
                  {adminStatus.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Profil des administrateurs" subtitle="Espace couvert (km2) et anciennete (jours)" icon={<Users size={16} color="#4a148c" />}>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={adminLoad} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="espace" name="Espace couvert (km2)" fill="#4a148c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="anciennete" name="Anciennete (jours)" fill="#8e24aa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: '#888' }}>
        Donnees live backend: utilisateurs, admins et tickets globaux.
      </div>
    </div>
  );
}
