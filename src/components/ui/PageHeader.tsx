import { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  action?: ReactNode
  badge?: { label: string; colour?: string }
}

export function PageHeader({ title, subtitle, action, badge }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: subtitle ? 8 : 0 }}>
          <h1 style={{
            fontSize: 22, fontWeight: 600, color: '#141b2d',
            fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.02em', margin: 0,
            lineHeight: 1.2,
          }}>
            {title}
          </h1>
          {badge && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 8px',
              borderRadius: 20, background: badge.colour ? `${badge.colour}18` : '#e8f4ee',
              color: badge.colour ?? '#2d7a4f',
              border: `1px solid ${badge.colour ? `${badge.colour}30` : '#a8d5bc'}`,
              letterSpacing: '0.04em',
            }}>
              {badge.label}
            </span>
          )}
        </div>
        {subtitle && (
          <p style={{ fontSize: 13, color: '#9aa3b4', margin: 0, lineHeight: 1.5 }}>
            {subtitle}
          </p>
        )}
        <div style={{ width: 28, height: 2, background: '#c9a84c', borderRadius: 1, marginTop: 10 }} />
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}
