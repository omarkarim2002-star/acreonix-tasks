import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Acreonix Tasks — AI that organises your work'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px 100px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Green accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 6, background: '#2d7a4f',
          display: 'flex',
        }} />

        {/* Logo + brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: '#f0faf4', border: '2px solid #c6e6d4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }}>
            ✦
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#111', letterSpacing: '-0.02em' }}>Acreonix</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#c9a84c', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Tasks</span>
          </div>
        </div>

        {/* Main headline */}
        <div style={{
          fontSize: 72, fontWeight: 700,
          color: '#111', lineHeight: 1.05,
          letterSpacing: '-0.04em',
          marginBottom: 24,
          display: 'flex', flexDirection: 'column',
        }}>
          <span>Your work,</span>
          <span style={{ color: '#2d7a4f', fontStyle: 'italic', fontWeight: 300 }}>finally organised.</span>
        </div>

        {/* Sub */}
        <p style={{
          fontSize: 26, fontWeight: 300, color: '#666',
          lineHeight: 1.5, maxWidth: 640, margin: '0 0 56px',
        }}>
          Paste anything. AI structures your tasks, schedules your week, and tells you what to do next.
        </p>

        {/* Pills */}
        <div style={{ display: 'flex', gap: 12 }}>
          {['Free to start', 'No credit card', '60 seconds'].map(label => (
            <div key={label} style={{
              background: '#f0faf4', border: '1px solid #c6e6d4',
              borderRadius: 20, padding: '8px 18px',
              fontSize: 16, fontWeight: 500, color: '#2d7a4f',
              display: 'flex',
            }}>
              {label}
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{
          position: 'absolute', bottom: 48, right: 100,
          fontSize: 18, color: '#bbb', fontWeight: 400,
          display: 'flex',
        }}>
          tasks.acreonix.co.uk
        </div>
      </div>
    ),
    { ...size }
  )
}
