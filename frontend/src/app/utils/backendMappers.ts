const TYPE_LABELS: Record<string, string> = {
  COUPURE_TOTALE: 'Coupure totale',
  QUALITE_DEGRADEE: 'Qualite degradee',
  MODEM_DEFECTUEUX: 'Modem defectueux',
  CABLE_ENDOMMAGE: 'Cable endommage',
  CONFIG_MODEM: 'Configuration modem',
  DEBIT_FAIBLE: 'Debit faible',
};

const UGS_TYPES = new Set(['CONFIG_MODEM', 'DEBIT_FAIBLE']);

export const toProblemTypeLabel = (value?: string | null): string => {
  if (!value) {
    return 'Type inconnu';
  }
  return TYPE_LABELS[value] ?? value;
};

export const toTicketCategory = (problemType?: string | null): 'UGS' | 'ULS' => {
  if (!problemType) {
    return 'ULS';
  }
  return UGS_TYPES.has(problemType) ? 'UGS' : 'ULS';
};

export const toStatusLabel = (status?: string | null): string => {
  if (!status) {
    return 'INCONNU';
  }
  if (status === 'CLOTURE') {
    return 'CLOTURE';
  }
  return status;
};

export const toPriorityLabel = (priority?: string | null): string => {
  if (!priority) {
    return 'BASSE';
  }

  if (priority === 'TRES_ELEVEE') {
    return 'TRES_ELEVEE';
  }
  if (priority === 'ELEVEE') {
    return 'ELEVEE';
  }
  return priority;
};

const pad = (value: number) => value.toString().padStart(2, '0');

const parseDate = (value?: string | Date | null): Date | null => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

export const formatDateFr = (value?: string | Date | null): string => {
  const date = parseDate(value);
  if (!date) {
    return '--';
  }

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const formatDateTimeFr = (value?: string | Date | null): string => {
  const date = parseDate(value);
  if (!date) {
    return '--';
  }

  return `${formatDateFr(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatDurationFromHours = (hours?: number | null): string => {
  if (hours == null || Number.isNaN(hours) || hours < 0) {
    return '--';
  }

  const totalMinutes = Math.max(0, Math.round(hours * 60));
  return formatDurationFromMinutes(totalMinutes);
};

export const formatDurationFromMillis = (millis?: number | null): string => {
  if (millis == null || Number.isNaN(millis) || millis < 0) {
    return '--';
  }

  const totalMinutes = Math.max(0, Math.round(millis / 60000));
  return formatDurationFromMinutes(totalMinutes);
};

const formatDurationFromMinutes = (totalMinutes: number): string => {
  const safeTotal = Math.max(0, Math.floor(totalMinutes));

  if (safeTotal === 0) {
    return '0min';
  }

  const days = Math.floor(safeTotal / (24 * 60));
  const remainingAfterDays = safeTotal % (24 * 60);
  const hours = Math.floor(remainingAfterDays / 60);
  const minutes = remainingAfterDays % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}j`);
  }

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}min`);
  }

  return parts.join(' ');
};

export const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};
