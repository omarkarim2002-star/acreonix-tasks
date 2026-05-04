import { ReactNode } from 'react'

type Props = {
  icon: string
  title: string
  description: string
  action?: ReactNode
  compact?: boolean
}

export function EmptyState({ icon, title, description, action, compact }: Props) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: compact ? '32px 20px' : '64px 20px',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{
        width: compact ? 44 : 56, height: compact ? 44 : 56,
        borderRadius: 16, background: '#e8f4ee', border: '1px solid #a8d5bc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: compact ? 20 : 26, marginBottom: 16,
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: compact ? 14 : 15, fontWeight: 600, color: '#141b2d', marginBottom: 6, margin: '0 0 6px' }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, color: '#9aa3b4', lineHeight: 1.55, maxWidth: 280, margin: '0 0 20px' }}>
        {description}
      </p>
      {action}
    </div>
  )
}
