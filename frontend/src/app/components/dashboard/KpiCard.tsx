import { type LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bg: string;
  delta?: string;
  deltaPositive?: boolean;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  delta,
  deltaPositive = true,
}: KpiCardProps) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 14,
        padding: 18,
        border: '1px solid #e8ecf0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={22} color={color} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#1a237e', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#888', fontWeight: 500, marginTop: 4 }}>{label}</div>
        {delta ? (
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              marginTop: 6,
              color: deltaPositive ? '#2e7d32' : '#c62828',
            }}
          >
            {delta}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default KpiCard;