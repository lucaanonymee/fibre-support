import { type CSSProperties, type ReactNode } from 'react';

interface DashboardPanelProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  rightSlot?: ReactNode;
  children: ReactNode;
  contentStyle?: CSSProperties;
}

export function DashboardPanel({
  title,
  subtitle,
  icon,
  rightSlot,
  children,
  contentStyle,
}: DashboardPanelProps) {
  return (
    <section
      style={{
        background: 'white',
        borderRadius: 14,
        border: '1px solid #e8ecf0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        padding: 20,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: '#1a237e',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {icon}
            {title}
          </h2>
          {subtitle ? (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>{subtitle}</p>
          ) : null}
        </div>
        {rightSlot}
      </div>

      <div style={contentStyle}>{children}</div>
    </section>
  );
}

export default DashboardPanel;