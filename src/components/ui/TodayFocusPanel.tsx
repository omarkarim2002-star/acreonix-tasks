'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, Loader2, ChevronRight, CheckCircle2, X, RefreshCw } from 'lucide-react'

type Task = {
  id: string
  title: string
  priority: string
  deadline: string | null
  estimated_minutes: number | null
  project?: { name: string; colour: string } | null
}

type RankedTask = {
  id: string
  reason: string
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: '#dc2626', high: '#ea580c', medium: '#3b82f6', low: '#9ca3af',
}

function fmtDeadline(iso: string | null): string {
  if (!iso) return ''
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff <= 6) return `${diff}d`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
function deadlineColor(iso: string | null): string {
  if (!iso) return '#bbb'
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  if (diff < 0) return '#dc2626'
  if (diff <= 1) return '#ea580c'
  if (diff <= 3) return '#d97706'
  return '#888'
}

type Props = {
  tasks: Task[]
}

export function TodayFocusPanel({ tasks }: Props) {
  const [loading, setLoading] = useState(false)
  const [ranked, setRanked] = useState<RankedTask[]>([])
  const [tip, setTip] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Build a map of task data by id
  const taskMap = Object.fromEntries(tasks.map(t => [t.id, t]))

  async function getRanking() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/prioritise-today', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setRanked(data.ranked ?? [])
      setTip(data.tip ?? '')
    } catch (e: any) {
      setError('Could not generate ranking — please try again')
    } finally {
      setLoading(false)
    }
  }

  function dismissTask(id: string) {
    setDismissed(prev => new Set([...prev, id]))
  }

  const visibleRanked = ranked.filter(r => !dismissed.has(r.id) && taskMap[r.id])

  // ── Not yet generated ──
  if (ranked.length === 0) {
    return (
      <div style={{
        background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 12, overflow: 'hidden',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 2 }}>
              What should I work on today?
            </p>
            <p style={{ fontSize: 11.5, color: '#aaa', lineHeight: 1.5 }}>
              AI reads your deadlines, priorities and task types — then tells you the exact order. No calendar needed.
            </p>
          </div>
        </div>

        {/* Task preview — first 3 unranked */}
        <div style={{ padding: '10px 18px' }}>
          {tasks.slice(0, 4).map((task, i) => (
            <div key={task.id} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 0',
              borderBottom: i < 3 ? '1px solid rgba(0,0,0,0.04)' : 'none',
              opacity: 1 - i * 0.18,
            }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #e0e0dd', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 9, color: '#ccc', fontWeight: 700 }}>{i + 1}</span>
              </div>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: PRIORITY_DOT[task.priority] ?? '#ccc', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12.5, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.title}
              </span>
              {task.deadline && (
                <span style={{ fontSize: 10.5, color: deadlineColor(task.deadline), flexShrink: 0 }}>
                  {fmtDeadline(task.deadline)}
                </span>
              )}
            </div>
          ))}
          {tasks.length > 4 && (
            <p style={{ fontSize: 11, color: '#ccc', padding: '6px 0 2px', textAlign: 'center' }}>
              +{tasks.length - 4} more tasks
            </p>
          )}
        </div>

        {/* CTA */}
        <div style={{ padding: '12px 18px 16px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          {error && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>{error}</p>}
          <button
            onClick={getRanking}
            disabled={loading || tasks.length === 0}
            style={{
              width: '100%', padding: '11px 0',
              background: loading ? '#e8e8e5' : '#2d7a4f',
              color: loading ? '#aaa' : '#fff',
              border: 'none', borderRadius: 9, cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 13.5, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              fontFamily: 'DM Sans, sans-serif',
              transition: 'all 0.15s',
              boxShadow: loading ? 'none' : '0 2px 8px rgba(45,122,79,0.25)',
            }}
          >
            {loading
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Thinking…</>
              : <><Sparkles size={14} />Show me the best order</>
            }
          </button>
          {tasks.length === 0 && (
            <p style={{ fontSize: 11, color: '#bbb', textAlign: 'center', marginTop: 8 }}>Add tasks first to get a ranking</p>
          )}
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // ── Ranked result ──
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(45,122,79,0.2)',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 18px 10px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#f9fdf9',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Sparkles size={13} style={{ color: '#2d7a4f' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1f5537' }}>
            Best order for today
          </span>
          <span style={{ fontSize: 10, color: '#2d7a4f', background: 'rgba(45,122,79,0.08)', padding: '2px 7px', borderRadius: 5, fontWeight: 500 }}>
            AI ranked
          </span>
        </div>
        <button
          onClick={getRanking}
          title="Re-rank"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: 4, display: 'flex' }}
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Coaching tip */}
      {tip && (
        <div style={{
          padding: '9px 18px',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          background: '#fdf8ee',
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <span style={{ fontSize: 13, flexShrink: 0 }}>💡</span>
          <p style={{ fontSize: 12, color: '#7a5e1a', lineHeight: 1.5, margin: 0 }}>{tip}</p>
        </div>
      )}

      {/* Ranked tasks */}
      <div style={{ padding: '6px 0' }}>
        {visibleRanked.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <CheckCircle2 size={28} style={{ color: '#c6e6d4', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: '#bbb' }}>All done for today!</p>
          </div>
        )}
        {visibleRanked.map((item, idx) => {
          const task = taskMap[item.id]
          if (!task) return null
          const isFirst = idx === 0

          return (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: isFirst ? '11px 18px' : '9px 18px',
                borderBottom: idx < visibleRanked.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                background: isFirst ? 'rgba(45,122,79,0.03)' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              {/* Rank number */}
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                background: isFirst ? '#2d7a4f' : '#f3f3f1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: isFirst ? '#fff' : '#aaa' }}>
                  {idx + 1}
                </span>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: PRIORITY_DOT[task.priority] ?? '#aaa', flexShrink: 0 }} />
                  <Link
                    href={`/dashboard/tasks/${task.id}`}
                    style={{
                      fontSize: isFirst ? 13.5 : 13, fontWeight: isFirst ? 600 : 400,
                      color: '#1a1a1a', textDecoration: 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {task.title}
                  </Link>
                  {task.deadline && (
                    <span style={{ fontSize: 10.5, color: deadlineColor(task.deadline), flexShrink: 0, fontWeight: 500 }}>
                      {fmtDeadline(task.deadline)}
                    </span>
                  )}
                </div>
                {/* AI reason */}
                <p style={{
                  fontSize: 11, color: isFirst ? '#2d7a4f' : '#aaa',
                  margin: 0, lineHeight: 1.4, paddingLeft: 11,
                  fontStyle: 'italic',
                }}>
                  {item.reason}
                </p>
              </div>

              {/* Dismiss */}
              <button
                onClick={() => dismissTask(item.id)}
                title="Remove from list"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e0e0dd', padding: 2, flexShrink: 0, marginTop: 2 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#aaa'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#e0e0dd'}
              >
                <X size={12} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer actions */}
      <div style={{
        padding: '10px 18px 14px',
        borderTop: '1px solid rgba(0,0,0,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <p style={{ fontSize: 11, color: '#bbb' }}>
          {visibleRanked.length} task{visibleRanked.length !== 1 ? 's' : ''} · tap title to open
        </p>
        <Link
          href="/dashboard/calendar"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, color: '#2d7a4f', textDecoration: 'none', fontWeight: 500,
          }}
        >
          Schedule these <ChevronRight size={12} />
        </Link>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
