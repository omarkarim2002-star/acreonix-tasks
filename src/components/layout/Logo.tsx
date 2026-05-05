import Link from 'next/link'

export function Logo({ size = 'default' }: { size?: 'default' | 'small' | 'large' }) {
  const imgSize = size === 'small' ? 22 : size === 'large' ? 36 : 28
  const textSize = size === 'small' ? '13px' : size === 'large' ? '20px' : '15px'

  return (
    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', opacity: 1 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Acreonix"
        width={imgSize}
        height={imgSize}
        style={{ objectFit: 'contain', flexShrink: 0 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{
          fontFamily: 'Georgia, serif',
          fontSize: textSize,
          fontWeight: 700,
          color: '#2d7a4f',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          Acreonix
        </span>
        <span style={{
          fontFamily: 'Georgia, serif',
          fontSize: '9px',
          color: '#c9a84c',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}>
          Tasks
        </span>
      </div>
    </Link>
  )
}
