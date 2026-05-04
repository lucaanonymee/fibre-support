import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck, UserCheck, UserCog, Users } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
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
import { formatDateFr } from '../../utils/backendMappers';
import { apiRequest, getErrorMessage } from '../../utils/httpApi';

type PeriodKey = '30j' | '90j' | '12m';

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

interface BackendAction {
  _id: string;
  actionType?: 'CREATION' | 'DESACTIVATION' | 'REACTIVATION';
  targetName?: string;
  targetRole?: 'ADMIN' | 'CLIENT' | 'TECHNICIEN';
  createdAt?: string;
}

interface ListActionsResponse {
  total?: number;
  actions?: BackendAction[];
}

interface AdminRecord {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: Date | null;
  createdEpoch: number;
  zonePoints: number;
}

interface TimeBucket {
  label: string;
  start: Date;
  end: Date;
}

interface GovernancePoint {
  label: string;
  creations: number;
  inactifs: number;
  cumule: number;
}

interface AdminLoadPoint {
  name: string;
  zonePoints: number;
  anciennete: number;
}

interface AdminStatusPoint {
  name: 'ACTIF' | 'INACTIF';
  value: number;
  color: string;
}

interface ZoneHealthPoint {
  label: string;
  couverture: number;
  geometrie: number;
}

interface EventRow {
  id: string;
  action: string;
  target: string;
  date: string;
  createdEpoch: number;
}

const periodLabels: Record<PeriodKey, string> = {
  '30j': '30 derniers jours',
  '90j': '90 derniers jours',
  '12m': '12 derniers mois',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  CLIENT: 'Client',
  TECHNICIEN: 'Technicien',
};

const ACTION_LABELS: Record<string, string> = {
  CREATION: 'Creation',
  DESACTIVATION: 'Desactivation',
  REACTIVATION: 'Reactivation',
};

const monthLabels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayMs = 24 * 60 * 60 * 1000;

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

const isWithinRange = (date: Date, start: Date, end: Date): boolean => date >= start && date <= end;

const getPeriodDays = (period: PeriodKey): number => {
  if (period === '30j') {
    return 30;
  }
  if (period === '90j') {
    return 90;
  }
  return 365;
};

const getPolygonPointCount = (zone?: BackendZoneIntervention | null): number => {
  const ring = zone?.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length === 0) {
    return 0;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];

  const looksClosed = Array.isArray(first)
    && Array.isArray(last)
    && first.length >= 2
    && last.length >= 2
    && first[0] === last[0]
    && first[1] === last[1];

  if (looksClosed) {
    return Math.max(0, ring.length - 1);
  }

  return ring.length;
};

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

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

const computeCoverage = (admins: AdminRecord[]): number => {
  if (admins.length === 0) {
    return 0;
  }

  const validCount = admins.filter((admin) => admin.zonePoints >= 3).length;
  return clampPercent((validCount / admins.length) * 100);
};

const computeGeometryScore = (admins: AdminRecord[]): number => {
  if (admins.length === 0) {
    return 0;
  }

  const total = admins.reduce((sum, admin) => {
    const normalized = clampPercent((admin.zonePoints / 8) * 100);
    return sum + normalized;
  }, 0);

  return clampPercent(total / admins.length);
};

const buildBuckets = (period: PeriodKey, start: Date, end: Date): TimeBucket[] => {
  const bucketCount = period === '30j' ? 4 : period === '90j' ? 3 : 6;

  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / dayMs) + 1);
  const baseSize = Math.floor(totalDays / bucketCount);
  const remainder = totalDays % bucketCount;

  const buckets: TimeBucket[] = [];
  let cursor = start;

  for (let index = 0; index < bucketCount; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0);
    const bucketStart = cursor;
    const bucketEnd = index === bucketCount - 1 ? end : endOfDay(addDays(bucketStart, size - 1));

    const label = period === '30j'
      ? `S${index + 1}`
      : monthLabels[bucketStart.getMonth()];

    buckets.push({
      label,
      start: bucketStart,
      end: bucketEnd,
    });

    cursor = startOfDay(addDays(bucketEnd, 1));
  }

  return buckets;
};

export default function SuperAdminDashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>('90j');

  const [rawUsers, setRawUsers] = useState<BackendUser[]>([]);
  const [rawActions, setRawActions] = useState<BackendAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setFetchError(null);

      try {
        const [usersResponse, actionsResponse] = await Promise.all([
          apiRequest<ListUsersResponse>('/api/superadmin/utilisateurs', { method: 'GET' }),
          apiRequest<ListActionsResponse>('/api/superadmin/actions?limit=120', { method: 'GET' }),
        ]);

        setRawUsers(usersResponse.users || []);
        setRawActions(actionsResponse.actions || []);
      } catch (error) {
        setRawUsers([]);
        setRawActions([]);
        setFetchError(getErrorMessage(error, 'Impossible de charger les indicateurs superadmin.'));
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const admins = useMemo(() => {
    return rawUsers
      .filter((user) => user.role === 'ADMIN')
      .map((admin) => {
      const createdAt = toDate(admin.createdAt);
      const createdEpoch = createdAt ? createdAt.getTime() : 0;

      return {
        id: admin._id,
        name: admin.nom && admin.nom.trim().length > 0 ? admin.nom : `Admin ${admin._id.slice(-4).toUpperCase()}`,
        email: admin.email || '',
        active: admin.isActive !== false,
        createdAt,
        createdEpoch,
        zonePoints: getPolygonPointCount(admin.zoneIntervention),
      } satisfies AdminRecord;
      });
  }, [rawUsers]);

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

  const buckets = useMemo(
    () => buildBuckets(period, periodRange.start, periodRange.end),
    [period, periodRange.end, periodRange.start],
  );

  const adminsInPeriod = useMemo(
    () => admins.filter((admin) => admin.createdAt && isWithinRange(admin.createdAt, periodRange.start, periodRange.end)),
    [admins, periodRange.end, periodRange.start],
  );

  const adminsInPreviousPeriod = useMemo(
    () => admins.filter((admin) => admin.createdAt && isWithinRange(admin.createdAt, previousRange.start, previousRange.end)),
    [admins, previousRange.end, previousRange.start],
  );

  const governanceData = useMemo(() => {
    const noDateAdmins = admins.filter((admin) => !admin.createdAt).length;

    return buckets.map((bucket) => {
      const createdInBucket = admins.filter((admin) => admin.createdAt && isWithinRange(admin.createdAt, bucket.start, bucket.end));
      const cumulative = noDateAdmins + admins.filter((admin) => admin.createdAt && admin.createdAt <= bucket.end).length;

      return {
        label: bucket.label,
        creations: createdInBucket.length,
        inactifs: createdInBucket.filter((admin) => !admin.active).length,
        cumule: cumulative,
      } satisfies GovernancePoint;
    });
  }, [admins, buckets]);

  const sourceForLoad = adminsInPeriod.length > 0 ? adminsInPeriod : admins;

  const adminLoad = useMemo(() => {
    return [...sourceForLoad]
      .map((admin) => {
        const ageDays = admin.createdAt
          ? Math.max(1, Math.floor((Date.now() - admin.createdAt.getTime()) / dayMs))
          : 0;

        return {
          name: admin.name,
          zonePoints: admin.zonePoints,
          anciennete: ageDays,
        } satisfies AdminLoadPoint;
      })
      .sort((a, b) => {
        if (b.zonePoints !== a.zonePoints) {
          return b.zonePoints - a.zonePoints;
        }
        if (b.anciennete !== a.anciennete) {
          return b.anciennete - a.anciennete;
        }
        return a.name.localeCompare(b.name, 'fr');
      })
      .slice(0, 8);
  }, [sourceForLoad]);

  const adminStatus = useMemo(() => {
    const active = admins.filter((admin) => admin.active).length;
    const inactive = admins.length - active;

    return [
      { name: 'ACTIF', value: active, color: '#43a047' },
      { name: 'INACTIF', value: inactive, color: '#90a4ae' },
    ] satisfies AdminStatusPoint[];
  }, [admins]);

  const zoneHealth = useMemo(() => {
    const fallbackCoverage = computeCoverage(admins);
    const fallbackGeometry = computeGeometryScore(admins);

    let lastCoverage = fallbackCoverage;
    let lastGeometry = fallbackGeometry;

    return buckets.map((bucket) => {
      const createdInBucket = admins.filter((admin) => admin.createdAt && isWithinRange(admin.createdAt, bucket.start, bucket.end));

      if (createdInBucket.length === 0) {
        return {
          label: bucket.label,
          couverture: lastCoverage,
          geometrie: lastGeometry,
        } satisfies ZoneHealthPoint;
      }

      const coverage = computeCoverage(createdInBucket);
      const geometry = computeGeometryScore(createdInBucket);

      lastCoverage = coverage;
      lastGeometry = geometry;

      return {
        label: bucket.label,
        couverture: coverage,
        geometrie: geometry,
      } satisfies ZoneHealthPoint;
    });
  }, [admins, buckets]);

  const actionEvents = useMemo(() => {
    return rawActions
      .map((action) => {
        const createdAt = toDate(action.createdAt);
        const createdEpoch = createdAt ? createdAt.getTime() : 0;
        const roleLabel = action.targetRole ? (ROLE_LABELS[action.targetRole] || 'Utilisateur') : 'Utilisateur';
        const actionLabel = action.actionType ? (ACTION_LABELS[action.actionType] || 'Action') : 'Action';
        const targetName = action.targetName && action.targetName.trim().length > 0
          ? action.targetName
          : `Utilisateur ${action._id.slice(-4).toUpperCase()}`;

        return {
          id: `EV-${action._id.slice(-6).toUpperCase()}`,
          action: `${actionLabel} ${roleLabel.toLowerCase()}`,
          target: targetName,
          date: formatDateFr(createdAt),
          createdEpoch,
        } satisfies EventRow;
      })
      .sort((a, b) => b.createdEpoch - a.createdEpoch);
  }, [rawActions]);

  const currentCoverage = useMemo(
    () => computeCoverage(adminsInPeriod.length > 0 ? adminsInPeriod : admins),
    [admins, adminsInPeriod],
  );

  const previousCoverage = useMemo(
    () => computeCoverage(adminsInPreviousPeriod),
    [adminsInPreviousPeriod],
  );

  const kpis = useMemo(() => {
    const totalAdmins = admins.length;
    const activeAdmins = admins.filter((admin) => admin.active).length;
    const pendingActions = admins.filter((admin) => !admin.active || admin.zonePoints < 3).length;
    const avgCoverage = computeCoverage(admins);

    const periodCreations = adminsInPeriod.length;
    const previousCreations = adminsInPreviousPeriod.length;
    const creationDelta = formatDelta(periodCreations, previousCreations);

    const coverageDelta = formatDelta(currentCoverage, previousCoverage);

    const activeRatio = totalAdmins > 0 ? clampPercent((activeAdmins / totalAdmins) * 100) : 0;

    return {
      totalAdmins,
      activeAdmins,
      pendingActions,
      avgCoverage,
      creationDelta,
      coverageDelta,
      activeRatio,
    };
  }, [admins, adminsInPeriod.length, adminsInPreviousPeriod.length, currentCoverage, previousCoverage]);

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
            Vue globale admins, sante des zones et actions de gouvernance
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
            <option value="30j">30 jours</option>
            <option value="90j">90 jours</option>
            <option value="12m">12 mois</option>
          </select>
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
        Periode active: {periodLabels[period]}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        <KpiCard
          label="Administrateurs"
          value={kpis.totalAdmins}
          icon={Users}
          color="#1a237e"
          bg="#e8eaf6"
          delta={`${kpis.creationDelta.label} creations periode`}
          deltaPositive={kpis.creationDelta.positive}
        />
        <KpiCard
          label="Admins actifs"
          value={kpis.activeAdmins}
          icon={UserCheck}
          color="#2e7d32"
          bg="#e8f5e9"
          delta={`${kpis.activeRatio}% actifs`}
        />
        <KpiCard
          label="Actions critiques"
          value={kpis.pendingActions}
          icon={AlertTriangle}
          color="#ef6c00"
          bg="#fff3e0"
          delta={kpis.pendingActions > 0 ? `${kpis.pendingActions} a traiter` : 'R.A.S'}
          deltaPositive={kpis.pendingActions === 0}
        />
        <KpiCard
          label="Couverture moyenne"
          value={`${kpis.avgCoverage}%`}
          icon={ShieldCheck}
          color="#1565c0"
          bg="#e3f2fd"
          delta={`${kpis.coverageDelta.label} vs periode prec.`}
          deltaPositive={kpis.coverageDelta.positive}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 20 }}>
        <DashboardPanel title="Gouvernance admins" subtitle="Creations, inactifs et total cumule" icon={<UserCog size={16} color="#1a237e" />}>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={governanceData} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="creations" name="Creations" stroke="#1565c0" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="inactifs" name="Inactifs" stroke="#ef5350" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="cumule" name="Total cumule" stroke="#7e57c2" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Profil des administrateurs" subtitle="Points de zone et anciennete (jours)" icon={<Users size={16} color="#4a148c" />}>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={adminLoad} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="zonePoints" name="Zone points" fill="#4a148c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="anciennete" name="Anciennete" fill="#8e24aa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Statut des administrateurs" subtitle="Actifs vs inactifs" icon={<UserCheck size={16} color="#43a047" />}>
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

        <DashboardPanel title="Qualite des zones" subtitle="Couverture polygones et score geometrie" icon={<CheckCircle2 size={16} color="#1565c0" />}>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={zoneHealth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="coverageFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1565c0" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#1565c0" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="geometryFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#42a5f5" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#42a5f5" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value}%`} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="couverture" name="Couverture" stroke="#1565c0" fill="url(#coverageFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="geometrie" name="Geometrie" stroke="#42a5f5" fill="url(#geometryFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>
      </div>

      <div style={{ marginTop: 20 }}>
        <DashboardPanel
          title="Journal des actions"
          subtitle={`${actionEvents.length} evenement(s) affiche(s)`}
          icon={<AlertTriangle size={16} color="#ef6c00" />}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr style={{ background: '#f8faff' }}>
                  {['Event', 'Action', 'Cible', 'Date'].map((header) => (
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
                {actionEvents.map((event, index) => (
                  <tr key={event.id} style={{ background: index % 2 === 0 ? 'white' : '#fafcff' }}>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #f1f3f5', fontWeight: 700, color: '#1a237e' }}>{event.id}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #f1f3f5', color: '#333', fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>{event.action}</div>
                    </td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #f1f3f5', color: '#555', fontSize: 13 }}>{event.target}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #f1f3f5', color: '#888', fontSize: 12 }}>{event.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {actionEvents.length === 0 ? (
              <div
                style={{
                  padding: '18px 12px',
                  textAlign: 'center',
                  color: '#888',
                  fontSize: 13,
                }}
              >
                Aucun evenement ne correspond aux filtres.
              </div>
            ) : null}
          </div>
        </DashboardPanel>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: '#888' }}>
        Donnees live backend: liste utilisateurs (admins filtres), etat actif/inactif, couverture geometrique et journal derive.
      </div>
    </div>
  );
}
