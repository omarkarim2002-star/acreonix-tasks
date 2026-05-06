export default function DeleteAccountPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#07080D',
      color: '#E2E8F0',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#F8FAFC', marginBottom: 8 }}>
            Delete your account
          </h1>
          <p style={{ color: '#94A3B8', lineHeight: 1.6 }}>
            You can permanently delete your Acreonix Tasks account and all associated data.
            This action cannot be undone.
          </p>
        </div>

        <div style={{
          background: '#0D0F18',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12,
          padding: '24px',
          marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#F8FAFC', marginBottom: 12 }}>
            What gets deleted
          </h2>
          <ul style={{ color: '#94A3B8', lineHeight: 2, paddingLeft: 20 }}>
            <li>Your account and profile</li>
            <li>All tasks and projects</li>
            <li>Calendar events and scheduling data</li>
            <li>Insights and behaviour history</li>
            <li>Comments and notes</li>
            <li>Billing records (subscription cancelled immediately)</li>
          </ul>
        </div>

        <div style={{
          background: 'rgba(196,30,58,0.08)',
          border: '1px solid rgba(196,30,58,0.2)',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 32,
          color: '#fca5a5',
          fontSize: 14,
          lineHeight: 1.6,
        }}>
          ⚠ Deletion is permanent and irreversible. Your data cannot be recovered after this process is complete.
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#F8FAFC', marginBottom: 16 }}>
          How to delete your account
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
          {[
            { step: '1', text: 'Open the Acreonix Tasks app on your device' },
            { step: '2', text: 'Tap the More tab (bottom right)' },
            { step: '3', text: 'Tap Account settings' },
            { step: '4', text: 'Scroll to the bottom and tap Delete account' },
            { step: '5', text: 'Confirm deletion — your account will be permanently removed within 30 days' },
          ].map(item => (
            <div key={item.step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(201,168,76,0.15)',
                border: '1px solid rgba(201,168,76,0.3)',
                color: '#c9a84c', fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {item.step}
              </div>
              <p style={{ color: '#94A3B8', lineHeight: 1.6, margin: 0, paddingTop: 4 }}>{item.text}</p>
            </div>
          ))}
        </div>

        <p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.7 }}>
          Alternatively, email us at{' '}
          <a href="mailto:hello@acreonix.co.uk" style={{ color: '#c9a84c' }}>
            hello@acreonix.co.uk
          </a>{' '}
          with the subject "Delete my account" and we will process your request within 30 days
          in accordance with UK GDPR Article 17 (right to erasure).
        </p>
      </div>
    </main>
  )
}
