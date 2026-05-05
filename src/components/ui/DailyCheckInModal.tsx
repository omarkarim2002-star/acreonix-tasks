'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, Clock, ChevronRight, Loader2, X, Sparkles } from 'lucide-react'

type CheckInTask = {
  id: string
  title: string
  priority: string
  project?: string | null
}

type TaskState = {
  done: boolean
  minutesSpent: number | null
  showTime: boolean
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: '#dc2626', high: '#ea580c', medium: '#3b82f6', low: '#9ca3af',
}

const TIME_PRESETS = [15, 30, 45, 60, 90, 120]

const LAST_SHOWN_KEY = 'acreonix_checkin_last'

function shouldShowToday(): boolean {
  try {
    const last = localStorage.getItem(LAST_SHOWN_KEY)
    if (!last) return true
    const lastDate = new Date(last).toDateString()
    const today = new Date().toDateString()
    return lastDate !== today
  } catch {
    return true
  }
}

function markShownToday() {
  try {
    localStorage.setItem(LAST_SHOWN_KEY, new Date().toISOString())
  } catch {}
}

export function DailyCheckInModal() {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [tasks, setTasks] = useState<CheckInTask[]>([])
  const [states, setStates] = useState<Record<string, TaskState>>({})
  const [scheduledCount, setScheduledCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)

  useEffect(() => {
    // Only show once per day, after a short delay so dashboard loads first
    if (!shouldShowToday()) return

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/daily-checkin')
        const data = await res.json()
        if (!data.tasks?.length) return // Nothing to check in about

        setTasks(data.tasks)
        setGreeting(data.greeting ?? '')
        setScheduledCount(data.scheduledCount ?? 0)
        setCompletedCount(data.completedCount ?? 0)

        // Default all tasks to not-done
        const initialStates: Record<string, TaskState> = {}
        for (const t of data.tasks) {
          initialStates[t.id] = { done: false, minutesSpent: null, showTime: false }
        }
        setStates(initialStates)
        setLoading(false)
        setVisible(true)
        markShownToday()
      } catch {
        // Silent fail — check-in is optional
      }
    }, 1800) // 1.8s delay after page load

    return () => clearTimeout(timer)
  }, [])

  function toggleTask(id: string) {
    setStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        done: !prev[id].done,
        showTime: !prev[id].done, // show time input when marking done
      },
    }))
  }

  function setTime(id: string, mins: number | null) {
    setStates(prev => ({ ...prev, [id]: { ...prev[id], minutesSpent: mins } }))
  }

  function dismiss() {
    setVisible(false)
  }

  async function submit() {
    setSubmitting(true)
    try {
      const completions = tasks.map(t => ({
        taskId: t.id,
        done: states[t.id]?.done ?? false,
        minutesSpent: states[t.id]?.minutesSpent ?? null,
      }))

      await fetch('/api/daily-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completions }),
      })

      setDone(true)
      setTimeout(() => setVisible(false), 2200)
    } catch {
      setVisible(false)
    } finally {
      setSubmitting(false)
    }
  }

  const doneCount = Object.values(states).filter(s => s.done).length

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(15,23,42,0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, fontFamily: 'DM Sans, sans-serif',
        animation: 'fadeIn 0.25s ease',
      }}
      onClick={dismiss}
    >
      <div
        style={{
          background: '#fff', borderRadius: 18,
          width: '100%', maxWidth: 460,
          boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
          overflow: 'hidden',
          animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '20px 22px 16px',
          background: 'linear-gradient(135deg, #f0faf4 0%, #f9fdf9 100%)',
          borderBottom: '1px solid rgba(45,122,79,0.1)',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: '#2d7a4f', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={18} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#2d7a4f', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                Daily check-in
              </p>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Loader2 size={14} style={{ color: '#2d7a4f', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13, color: '#aaa' }}>One moment…</span>
                </div>
              ) : (
                <p style={{ fontSize: 14, color: '#1a1a1a', lineHeight: 1.55, fontWeight: 400 }}>
                  {greeting}
                </p>
              )}
            </div>
            <button
              onClick={dismiss}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 2, flexShrink: 0, marginTop: 2 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Progress bar */}
          {!loading && scheduledCount > 0 && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 4, background: 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.round(((completedCount + doneCount) / scheduledCount) * 100)}%`,
                  background: '#2d7a4f', borderRadius: 2,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{ fontSize: 11, color: '#888', flexShrink: 0 }}>
                {completedCount + doneCount}/{scheduledCount} done
              </span>
            </div>
          )}
        </div>

        {/* ── Done state ── */}
        {done && (
          <div style={{ padding: '32px 22px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <CheckCircle2 size={26} style={{ color: '#2d7a4f' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>
              {doneCount === tasks.length ? 'All caught up! 🎉' : 'Got it, noted.'}
            </p>
            <p style={{ fontSize: 13, color: '#aaa', lineHeight: 1.5 }}>
              {doneCount > 0
                ? `${doneCount} task${doneCount > 1 ? 's' : ''} marked done. Your schedule is up to date.`
                : "I'll carry those forward and factor them into today's plan."}
            </p>
          </div>
        )}

        {/* ── Task list ── */}
        {!loading && !done && (
          <>
            <div style={{ maxHeight: 340, overflowY: 'auto', padding: '8px 0' }}>
              {tasks.map((task, idx) => {
                const state = states[task.id] ?? { done: false, minutesSpent: null, showTime: false }
                return (
                  <div
                    key={task.id}
                    style={{
                      padding: '10px 22px',
                      borderBottom: idx < tasks.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                      background: state.done ? 'rgba(45,122,79,0.03)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Task row */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                      onClick={() => toggleTask(task.id)}
                    >
                      {state.done
                        ? <CheckCircle2 size={20} style={{ color: '#2d7a4f', flexShrink: 0 }} />
                        : <Circle size={20} style={{ color: '#ddd', flexShrink: 0 }} />
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13.5, color: state.done ? '#888' : '#1a1a1a',
                          fontWeight: state.done ? 400 : 500,
                          textDecoration: state.done ? 'line-through' : 'none',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          marginBottom: 1, transition: 'all 0.15s',
                        }}>
                          {task.title}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: PRIORITY_DOT[task.priority] ?? '#aaa', flexShrink: 0 }} />
                          {task.project && <span style={{ fontSize: 10.5, color: '#bbb' }}>{task.project}</span>}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11.5, fontWeight: 500,
                        color: state.done ? '#2d7a4f' : '#ccc',
                        flexShrink: 0,
                      }}>
                        {state.done ? 'Done' : 'Tap to mark done'}
                      </span>
                    </div>

                    {/* Time logging — shown when task marked done */}
                    {state.done && (
                      <div style={{
                        marginTop: 10, marginLeft: 30,
                        animation: 'fadeIn 0.2s ease',
                      }}>
                        <p style={{ fontSize: 11, color: '#aaa', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Clock size={11} />
                          How long did this take?
                        </p>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {TIME_PRESETS.map(mins => (
                            <button
                              key={mins}
                              onClick={() => setTime(task.id, state.minutesSpent === mins ? null : mins)}
                              style={{
                                padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
                                border: `1px solid ${state.minutesSpent === mins ? 'rgba(45,122,79,0.4)' : 'rgba(0,0,0,0.1)'}`,
                                background: state.minutesSpent === mins ? '#f0faf4' : '#fff',
                                color: state.minutesSpent === mins ? '#1f5537' : '#666',
                                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                                transition: 'all 0.1s',
                              }}
                            >
                              {mins >= 60 ? `${mins/60}h` : `${mins}m`}
                            </button>
                          ))}
                          <button
                            onClick={() => setTime(task.id, null)}
                            style={{
                              padding: '4px 10px', borderRadius: 6, fontSize: 11.5,
                              border: '1px solid rgba(0,0,0,0.08)',
                              background: state.minutesSpent === null ? '#f9f9f7' : '#fff',
                              color: '#bbb', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                            }}
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── Footer ── */}
            <div style={{
              padding: '14px 22px 18px',
              borderTop: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <button
                onClick={dismiss}
                style={{
                  padding: '9px 16px', borderRadius: 8, fontSize: 13,
                  border: '1px solid rgba(0,0,0,0.1)', background: '#fff',
                  color: '#888', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Later
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 9, fontSize: 13.5, fontWeight: 600,
                  background: submitting ? '#e8e8e5' : '#2d7a4f',
                  color: submitting ? '#aaa' : '#fff',
                  border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'background 0.15s',
                  boxShadow: submitting ? 'none' : '0 2px 8px rgba(45,122,79,0.25)',
                }}
              >
                {submitting
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Saving…</>
                  : <>{doneCount > 0 ? `Save — ${doneCount} done` : 'Nothing done yet'} <ChevronRight size={14} /></>
                }
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97) } to { opacity: 1; transform: none } }
        @keyframes spin    { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
