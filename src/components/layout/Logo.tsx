import Link from 'next/link'

export function Logo({ size = 'default' }: { size?: 'default' | 'small' | 'large' }) {
  const imgSize = size === 'small' ? 24 : size === 'large' ? 40 : 32
  const nameSize = size === 'small' ? '12px' : size === 'large' ? '19px' : '15px'
  const tagSize  = size === 'small' ? '7.5px' : size === 'large' ? '10px' : '8.5px'

  return (
    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Acreonix"
        width={imgSize}
        height={imgSize}
        style={{ objectFit: 'contain', flexShrink: 0 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        {/* Bold black-weight sans — matches "Acreonix" in the AI Lead Agent branding */}
        <span style={{
          fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif',
          fontSize: nameSize,
          fontWeight: 900,
          color: '#1a1a1a',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight: 1.2,
        }}>
          Acreonix
        </span>
        {/* Gold spaced small-caps subtitle — matches "AI LEAD AGENT" treatment */}
        <span style={{
          fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif',
          fontSize: tagSize,
          fontWeight: 600,
          color: '#c9a84c',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          lineHeight: 1.4,
        }}>
          Tasks
        </span>
      </div>
    </Link>
  )
}
