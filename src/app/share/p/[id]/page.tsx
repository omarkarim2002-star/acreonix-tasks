import { notFound } from 'next/navigation'
import Link from 'next/link'

const PRIORITY_COLOURS: Record<string, { bg: string; color: string }> = {
  urgent: { bg: '#fff0f0', color: '#dc2626' },
  high:   { bg: '#fff4ee', color: '#ea580c' },
  medium: { bg: '#eff6ff', color: '#2563eb' },
  low:    { bg: '#f3f3f1', color: '#888' },
}

function fmtDeadline(iso: string) {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  return `${diff}d left`
}

export default async function PublicProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/projects/${id}/public`, { cache: 'no-store' })
  if (!res.ok) notFound()
  const { project, tasks, stats } = await res.json()

  const S = { fontFamily: 'DM Sans, sans-serif' }

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf9', ...S }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Acreonix" width={24} height={24} style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Acreonix</span>
          <span style={{ fontSize: 9, fontWeight: 600, color: '#c9a84c', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: 1 }}>Tasks</span>
        </div>
        <Link href="/sign-up" style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', background: '#2d7a4f', padding: '7px 14px', borderRadius: 8, textDecoration: 'none' }}>
          Get started free
        </Link>
      </div>

      {/* Project card */}
      <div style={{ maxWidth: 680, margin: '32px auto', padding: '0 20px' }}>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)', padding: '24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: project.colour + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{project.icon}</div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.02em', margin: '0 0 3px' }}>{project.name}</h1>
              {project.description && <p style={{ fontSize: 13, color: '#888', margin: 0 }}>{project.description}</p>}
            </div>
          </div>
          {/* Progress */}
          <div style={{ height: 6, background: '#f0f0ee', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${stats.pct}%`, background: project.colour, borderRadius: 3 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aaa' }}>
            <span>{stats.done} of {stats.total} tasks done</span>
            <span>{stats.pct}%</span>
          </div>
        </div>

        {/* Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tasks.map((task: any) => {
            const ps = PRIORITY_COLOURS[task.priority] ?? PRIORITY_COLOURS.medium
            return (
              <div key={task.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.07)', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #ddd', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13.5, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: ps.bg, color: ps.color, flexShrink: 0, textTransform: 'capitalize' }}>{task.priority}</span>
                {task.deadline && <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>{fmtDeadline(task.deadline)}</span>}
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '32px 0 0' }}>
          <p style={{ fontSize: 13, color: '#aaa', marginBottom: 12 }}>Shared via Acreonix Tasks</p>
          <Link href="/sign-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 24px', borderRadius: 10, background: '#2d7a4f', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600, boxShadow: '0 4px 14px rgba(45,122,79,0.3)' }}>
            Manage your own projects free →
          </Link>
        </div>
      </div>
    </div>
  )
}
