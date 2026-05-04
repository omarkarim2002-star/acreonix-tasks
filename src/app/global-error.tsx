'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to console in dev, could send to Sentry here later
    console.error('App error:', error)
  }, [error])

  return (
    <html>
      <body style={{
        margin: 0, fontFamily: 'DM Sans, system-ui, sans-serif',
        background: '#f7f7f5', minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid rgba(0,0,0,0.08)',
          padding: '40px 36px', maxWidth: 440, width: '100%',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: '#fff5f5', border: '1px solid #fecaca',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, margin: '0 auto 20px',
          }}>
            ⚠️
          </div>
          <h1 style={{
            fontSize: 18, fontWeight: 600, color: '#111',
            letterSpacing: '-0.02em', marginBottom: 10,
          }}>
            Something went wrong
          </h1>
          <p style={{
            fontSize: 14, color: '#888', lineHeight: 1.65,
            marginBottom: 28,
          }}>
            An unexpected error occurred. Your data is safe — this is a display issue, not a data issue.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                padding: '9px 20px', background: '#2d7a4f', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Try again
            </button>
            <a
              href="/dashboard"
              style={{
                padding: '9px 20px', background: '#f3f3f1', color: '#444',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
                cursor: 'pointer', textDecoration: 'none', display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Go to dashboard
            </a>
          </div>
          {error.digest && (
            <p style={{ fontSize: 11, color: '#ccc', marginTop: 20, fontFamily: 'monospace' }}>
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
