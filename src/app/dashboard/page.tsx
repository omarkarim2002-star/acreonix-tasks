import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { Sparkles, ArrowRight, Clock, AlertCircle, CheckCircle2, GitFork, Calendar, ChevronRight } from 'lucide-react'

function formatDeadline(d: string): string {
  const date = new Date(d)
  const diff = Math.ceil((date.getTime() - Date.now()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 7) return `${diff}d`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function deadlineColor(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (diff < 0) return '#dc2626'
  if (diff <= 1) return '#ea580c'
  return '#888'
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: '#dc2626', high: '#ea580c', medium: '#3b82f6', low: '#aaa',
}

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) return null

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const [projectsRes, tasksRes, allTasksRes] = await Promise.all([
    supabaseAdmin.from('projects').select('*').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('tasks').select('*, project:projects(name,colour)').eq('user_id', userId).neq('status', 'done').order('deadline', { ascending: true, nullsFirst: false }).limit(8),
    supabaseAdmin.from('tasks').select('id,status,project_id').eq('user_id', userId),
  ])

  const projects = projectsRes.data ?? []
  const tasks = tasksRes.data ?? []
  const allTasks = allTasksRes.data ?? []

  const todayCount = tasks.filter(t => t.deadline && new Date(t.deadline).toDateString() === now.toDateString()).length
  const overdueCount = tasks.filter(t => t.deadline && new Date(t.deadline) < now).length
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length

  const projectsWithStats = projects.map(p => ({
    ...p,
    total: allTasks.filter(t => t.project_id === p.id).length,
    done:  allTasks.filter(t => t.project_id === p.id && t.status === 'done').length,
  }))

  const isEmpty = tasks.length === 0 && projects.length === 0

  return (
    <div style={{ padding: '32px 40px 48px', maxWidth: 1100, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div className="fade-up-1" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.03em', lineHeight: 1.2 }} className="gold-line">
          {greeting}
        </h1>
        <p style={{ fontSize: 13, color: '#aaa', marginTop: 10 }}>{dateStr}</p>
      </div>

      {/* Quick actions */}
      <div className="fade-up-2" style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
        <Link href="/dashboard/calendar" style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '8px 16px', borderRadius: 8,
          border: '1px solid rgba(45,122,79,0.25)', background: '#f0faf4',
          fontSize: 13, fontWeight: 500, color: '#1f5537',
          transition: 'all 0.15s', textDecoration: 'none',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#e6f6ed'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f0faf4'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
        >
          <Calendar size={14} />Schedule my day
        </Link>
        <Link href="/dashboard/mindmap" style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '8px 16px', borderRadius: 8,
          border: '1px solid rgba(0,0,0,0.09)', background: '#fff',
          fontSize: 13, fontWeight: 500, color: '#4a4a4a',
          transition: 'all 0.15s', textDecoration: 'none',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f7f7f5'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
        >
          <GitFork size={14} />All projects map
        </Link>
        <Link href="/dashboard/extract" style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '8px 16px', borderRadius: 8,
          background: '#2d7a4f', color: '#fff', border: 'none',
          fontSize: 13, fontWeight: 500,
          transition: 'all 0.15s', textDecoration: 'none',
          boxShadow: '0 1px 3px rgba(45,122,79,0.3)', marginLeft: 'auto',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#3a8f5e'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#2d7a4f'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
        >
          <Sparkles size={14} />Add tasks with AI
        </Link>
      </div>

      {/* Stats row */}
      <div className="fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Due today',   value: todayCount,    bg: '#fdf8ee', border: '#e8d5a0', icon: Clock,         iconColor: '#c9a84c', numColor: '#7a5e1a' },
          { label: 'Overdue',     value: overdueCount,  bg: '#fff5f5', border: '#fecaca', icon: AlertCircle,   iconColor: '#ef4444', numColor: '#b91c1c' },
          { label: 'In progress', value: inProgressCount, bg: '#f0faf4', border: '#c6e6d4', icon: CheckCircle2, iconColor: '#2d7a4f', numColor: '#1f5537' },
        ].map(({ label, value, bg, border, icon: Icon, iconColor, numColor }) => (
          <div key={label} style={{
            background: bg, border: `1px solid ${border}`,
            borderRadius: 10, padding: '16px 20px',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.07)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Icon size={13} style={{ color: iconColor }} />
              <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>{label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, color: numColor, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="fade-up-3" style={{
          background: 'linear-gradient(135deg, #f0faf4, #fdf8ee)',
          border: '1px solid rgba(45,122,79,0.12)',
          borderRadius: 12, padding: '28px 28px',
          display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#2d7a4f',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 5 }}>Start by adding your tasks</h3>
            <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 14 }}>
              Paste a brain dump, email, or notes — AI extracts tasks, groups them into projects, and sets priorities in seconds.
            </p>
            <Link href="/dashboard/extract" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#2d7a4f', color: '#fff', padding: '8px 16px',
              borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none',
              transition: 'background 0.15s',
            }}>
              <Sparkles size={13} />Add tasks with AI
            </Link>
          </div>
        </div>
      )}

      {/* Main grid */}
      {!isEmpty && (
        <div className="fade-up-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Upcoming tasks */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Upcoming tasks</span>
              <Link href="/dashboard/tasks" style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, color: '#2d7a4f', textDecoration: 'none', fontWeight: 500 }}>
                View all <ChevronRight size={12} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {tasks.slice(0, 6).map(task => (
                <Link key={task.id} href={`/dashboard/tasks/${task.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8,
                  background: '#fff', border: '1px solid rgba(0,0,0,0.07)',
                  textDecoration: 'none', transition: 'all 0.12s',
                }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(0,0,0,0.14)'; el.style.transform = 'translateY(-1px)'; el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(0,0,0,0.07)'; el.style.transform = 'none'; el.style.boxShadow = 'none' }}
                >
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITY_DOT[task.priority] ?? '#aaa', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#1a1a1a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.title}
                  </span>
                  {task.deadline && (
                    <span style={{ fontSize: 11, color: deadlineColor(task.deadline), flexShrink: 0, fontWeight: 500 }}>
                      {formatDeadline(task.deadline)}
                    </span>
                  )}
                </Link>
              ))}
              {tasks.length === 0 && (
                <div style={{ padding: '24px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#bbb' }}>No pending tasks</p>
                </div>
              )}
            </div>
          </div>

          {/* Projects */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Projects</span>
              <Link href="/dashboard/projects" style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, color: '#2d7a4f', textDecoration: 'none', fontWeight: 500 }}>
                View all <ChevronRight size={12} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {projectsWithStats.map(p => {
                const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
                return (
                  <div key={p.id} style={{
                    background: '#fff', border: '1px solid rgba(0,0,0,0.07)',
                    borderRadius: 8, padding: '10px 12px',
                    transition: 'all 0.12s',
                  }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(0,0,0,0.14)'; el.style.transform = 'translateY(-1px)'; el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(0,0,0,0.07)'; el.style.transform = 'none'; el.style.boxShadow = 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Link href={`/dashboard/projects/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0, textDecoration: 'none' }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                          background: (p.colour ?? '#2d7a4f') + '18',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                        }}>
                          {p.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <div style={{ flex: 1, height: 3, background: 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: p.colour ?? '#2d7a4f', borderRadius: 2, transition: 'width 0.5s ease' }} />
                            </div>
                            <span style={{ fontSize: 11, color: '#bbb', flexShrink: 0 }}>{pct}%</span>
                          </div>
                        </div>
                      </Link>
                      <Link href={`/dashboard/projects/${p.id}/mindmap`} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 11, color: '#bbb', padding: '4px 8px', borderRadius: 5,
                        textDecoration: 'none', flexShrink: 0, transition: 'all 0.12s',
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#2d7a4f'; (e.currentTarget as HTMLElement).style.background = '#f0faf4' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#bbb'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        <GitFork size={11} />map
                      </Link>
                    </div>
                  </div>
                )
              })}
              {projects.length === 0 && (
                <div style={{ padding: '24px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#bbb' }}>No projects yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
