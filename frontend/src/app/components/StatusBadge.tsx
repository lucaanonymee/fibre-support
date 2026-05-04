interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  OUVERT:    { bg: '#fff3e0', text: '#bf360c', border: '#ffcc80', dot: '#ff9800' },
  EN_COURS:  { bg: '#e3f2fd', text: '#0d47a1', border: '#90caf9', dot: '#2196f3' },
  CLÔTURÉ:   { bg: '#e8f5e9', text: '#1b5e20', border: '#a5d6a7', dot: '#4caf50' },
  CLOTURE:   { bg: '#e8f5e9', text: '#1b5e20', border: '#a5d6a7', dot: '#4caf50' },
  CLOTURÉ:   { bg: '#e8f5e9', text: '#1b5e20', border: '#a5d6a7', dot: '#4caf50' },
  HAUTE:     { bg: '#ffebee', text: '#b71c1c', border: '#ef9a9a', dot: '#f44336' },
  ELEVEE:    { bg: '#ffebee', text: '#b71c1c', border: '#ef9a9a', dot: '#f44336' },
  TRES_ELEVEE: { bg: '#fdecea', text: '#7f0000', border: '#e57373', dot: '#c62828' },
  MOYENNE:   { bg: '#fff8e1', text: '#e65100', border: '#ffe082', dot: '#ff9800' },
  BASSE:     { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7', dot: '#66bb6a' },
  PRÉSENT:   { bg: '#e8f5e9', text: '#1b5e20', border: '#a5d6a7', dot: '#4caf50' },
  PRESENT:   { bg: '#e8f5e9', text: '#1b5e20', border: '#a5d6a7', dot: '#4caf50' },
  ABSENT:    { bg: '#ffebee', text: '#b71c1c', border: '#ef9a9a', dot: '#f44336' },
  ACTIF:     { bg: '#e8f5e9', text: '#1b5e20', border: '#a5d6a7', dot: '#4caf50' },
  INACTIF:   { bg: '#f5f5f5', text: '#616161', border: '#e0e0e0', dot: '#9e9e9e' },
  UGS:       { bg: '#e8eaf6', text: '#283593', border: '#9fa8da', dot: '#3f51b5' },
  ULS:       { bg: '#e0f7fa', text: '#006064', border: '#80deea', dot: '#00bcd4' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const c = statusConfig[status] || { bg: '#f5f5f5', text: '#616161', border: '#e0e0e0', dot: '#9e9e9e' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: c.bg, color: c.text,
      border: `1px solid ${c.border}`,
      fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />
      {status}
    </span>
  );
}

export default StatusBadge;
