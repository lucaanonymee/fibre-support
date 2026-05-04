type TooltipValue = string | number;

interface TooltipPayloadEntry {
  name?: string;
  value?: TooltipValue;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  valueFormatter?: (value: TooltipValue, name: string) => string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e8ecf0',
        borderRadius: 10,
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
        padding: '10px 12px',
      }}
    >
      {label !== undefined ? (
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1a237e', marginBottom: 6 }}>{label}</div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {payload.map((item, index) => {
          const name = item.name ?? 'Valeur';
          const value = item.value ?? 0;
          return (
            <div key={`${name}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: item.color ?? '#1a237e',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: 12, color: '#666' }}>{name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#333', marginLeft: 'auto' }}>
                {valueFormatter ? valueFormatter(value, name) : value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ChartTooltip;