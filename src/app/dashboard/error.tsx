'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', padding: 24,
      fontFamily: 'DM Sans, system-ui, sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 14,
        border: '1px solid rgba(0,0,0,0.08)',
        padding: '32px 28px', maxWidth: 380, width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: '#fff5f5', border: '1px solid #fecaca',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, margin: '0 auto 16px',
        }}>
          ⚠️
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 8 }}>
          This page couldn't load
        </h2>
        <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 22 }}>
          Something went wrong loading this section. Your data is safe.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              padding: '8px 18px', background: '#2d7a4f', color: '#fff',
              border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Retry
          </button>
          <a href="/dashboard" style={{
            padding: '8px 18px', background: '#f3f3f1', color: '#444',
            borderRadius: 7, fontSize: 13, fontWeight: 500,
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
          }}>
            Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
