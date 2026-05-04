'use client'

import { useState, useEffect, useRef } from 'react'
import { Timer, X, Play, Square, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

type Task = { id: string; title: string; project?: { name: string; colour: string } }

export function FloatingTimer() {
  const [open, setOpen] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [running, setRunning] = useState(false)
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (open && tasks.length === 0) {
      fetch('/api/tasks')
        .then(r => r.json())
        .then(d => setTasks(Array.isArray(d) ? d.filter((t: any) => t.status !== 'done').slice(0, 20) : []))
        .catch(() => {})
    }
  }, [open, tasks.length])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(s => s + 1)
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  function formatElapsed(s: number) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  function startTimer() {
    setStartedAt(new Date())
    setElapsed(0)
    setRunning(true)
    setSaved(false)
  }

  async function stopTimer() {
    if (!startedAt) return
    setRunning(false)
    setSaving(true)
    try {
      await fetch('/api/time-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: selectedTaskId || null,
          started_at: startedAt.toISOString(),
          ended_at: new Date().toISOString(),
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
      setStartedAt(null)
      setElapsed(0)
    }
  }

  const selectedTask = tasks.find(t => t.id === selectedTaskId)

  return (
    <>
      {/* Floating button */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 200 }}>
        {/* Mini timer badge when running */}
        {running && !open && (
          <div style={{
            position: 'absolute', bottom: 52, right: 0,
            background: '#1a1a1a', color: '#fff',
            borderRadius: 20, padding: '4px 12px',
            fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            animation: 'fadeUp 0.2s ease forwards',
            fontFamily: 'DM Mono, monospace',
          }}>
            ⏱ {formatElapsed(elapsed)}
          </div>
        )}

        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: running ? '#2d7a4f' : '#1a1a1a',
            color: '#fff', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
            transform: open ? 'rotate(180deg) scale(0.95)' : 'none',
          }}
          title="Quick timer"
        >
          {open ? <X size={18} /> : <Timer size={20} />}
        </button>
      </div>

      {/* Timer panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 84, right: 24, zIndex: 199,
          width: 280, background: '#fff',
          borderRadius: 14, border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04)',
          fontFamily: 'DM Sans, sans-serif',
          animation: 'scaleIn 0.18s cubic-bezier(0.4,0,0.2,1) forwards',
          transformOrigin: 'bottom right',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Quick timer</span>
              {running && (
                <span style={{
                  fontSize: 16, fontWeight: 700, color: '#2d7a4f',
                  fontFamily: 'DM Mono, monospace', letterSpacing: '-0.02em',
                }}>
                  {formatElapsed(elapsed)}
                </span>
              )}
            </div>
            {running && selectedTask && (
              <p style={{ fontSize: 11, color: '#888', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedTask.title}
              </p>
            )}
          </div>

          {/* Task selector */}
          {!running && (
            <div style={{ padding: '10px 14px' }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: '#aaa', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Task (optional)</label>
              <select
                value={selectedTaskId}
                onChange={e => setSelectedTaskId(e.target.value)}
                style={{
                  width: '100%', padding: '7px 28px 7px 10px',
                  border: '1px solid rgba(0,0,0,0.1)', borderRadius: 7,
                  fontSize: 12.5, color: '#1a1a1a', background: '#fff',
                  appearance: 'none',
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23aaa' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
                  outline: 'none',
                }}
              >
                <option value="">No task selected</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Action */}
          <div style={{ padding: '4px 14px 14px' }}>
            {saved ? (
              <div style={{
                padding: '9px 14px', borderRadius: 8, background: '#f0faf4',
                fontSize: 13, color: '#1f5537', textAlign: 'center', fontWeight: 500,
              }}>
                ✓ Time logged!
              </div>
            ) : (
              <button
                onClick={running ? stopTimer : startTimer}
                disabled={saving}
                style={{
                  width: '100%', padding: '9px 0',
                  background: running ? '#dc2626' : '#2d7a4f',
                  color: '#fff', border: 'none', borderRadius: 8,
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'all 0.15s', opacity: saving ? 0.7 : 1,
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {saving ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : running ? (
                  <Square size={14} />
                ) : (
                  <Play size={14} />
                )}
                {saving ? 'Saving…' : running ? 'Stop & save' : 'Start timer'}
              </button>
            )}
          </div>

          {/* Footer link */}
          <Link href="/dashboard/tracker" onClick={() => setOpen(false)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 14px', borderTop: '1px solid rgba(0,0,0,0.06)',
            textDecoration: 'none', transition: 'background 0.12s',
          }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f7f7f5'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <span style={{ fontSize: 12, color: '#888' }}>Full time tracker</span>
            <ChevronRight size={13} style={{ color: '#ccc' }} />
          </Link>
        </div>
      )}
    </>
  )
}
