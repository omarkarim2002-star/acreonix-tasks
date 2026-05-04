'use client'

import { useState, useEffect, useRef } from 'react'
import { Timer, X, Play, Square, ChevronRight, Loader2, ChevronDown } from 'lucide-react'
import Link from 'next/link'

type Project = { id: string; name: string; colour: string; icon: string }
type Task = { id: string; title: string; project_id: string }

export function FloatingTimer() {
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [running, setRunning] = useState(false)
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [projectOpen, setProjectOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load projects on open
  useEffect(() => {
    if (!open || projects.length > 0) return
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [open, projects.length])

  // Load tasks when project selected
  useEffect(() => {
    if (!selectedProjectId) { setTasks([]); setSelectedTaskId(''); return }
    fetch(`/api/tasks?project_id=${selectedProjectId}`)
      .then(r => r.json())
      .then(d => setTasks(Array.isArray(d) ? d.filter((t: any) => t.status !== 'done') : []))
      .catch(() => setTasks([]))
    setSelectedTaskId('')
  }, [selectedProjectId])

  // Timer tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  function fmt(s: number) {
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
      setTimeout(() => { setSaved(false); setSelectedProjectId(''); setSelectedTaskId('') }, 3000)
    } finally {
      setSaving(false)
      setStartedAt(null)
      setElapsed(0)
    }
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const selectedTask = tasks.find(t => t.id === selectedTaskId)

  return (
    <>
      {/* Floating button */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 200 }}>
        {/* Running badge */}
        {running && !open && (
          <div style={{
            position: 'absolute', bottom: 56, right: 0,
            background: '#1a1a1a', color: '#fff',
            borderRadius: 20, padding: '5px 13px',
            fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            fontFamily: 'monospace',
            animation: 'fadeUp 0.2s ease forwards',
          }}>
            ⏱ {fmt(elapsed)}
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
          width: 292, background: '#fff',
          borderRadius: 14, border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          fontFamily: 'DM Sans, sans-serif',
          animation: 'scaleIn 0.18s cubic-bezier(0.4,0,0.2,1) forwards',
          transformOrigin: 'bottom right',
          overflow: 'visible',
        }}>

          {/* Header */}
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Quick timer</span>
              {running && (
                <span style={{ fontSize: 16, fontWeight: 700, color: '#2d7a4f', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
                  {fmt(elapsed)}
                </span>
              )}
            </div>
            {running && selectedProject && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <span style={{ fontSize: 12 }}>{selectedProject.icon}</span>
                <span style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedProject.name}{selectedTask ? ` · ${selectedTask.title}` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Selectors — only show when not running */}
          {!running && (
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* Project picker */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Project
                </label>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => { setProjectOpen(o => !o); setTaskOpen(false) }}
                    style={{
                      width: '100%', padding: '7px 10px',
                      border: '1px solid rgba(0,0,0,0.12)', borderRadius: 7,
                      background: '#fff', cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 7,
                      fontSize: 12.5, color: selectedProject ? '#1a1a1a' : '#aaa',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {selectedProject ? (
                      <>
                        <span>{selectedProject.icon}</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedProject.name}</span>
                      </>
                    ) : (
                      <span style={{ flex: 1 }}>No project selected</span>
                    )}
                    <ChevronDown size={12} style={{ color: '#ccc', flexShrink: 0, transform: projectOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                  </button>

                  {projectOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
                      background: '#fff', border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                      marginTop: 3, maxHeight: 200, overflowY: 'auto',
                    }}>
                      <button
                        onClick={() => { setSelectedProjectId(''); setProjectOpen(false) }}
                        style={{
                          width: '100%', padding: '8px 12px', textAlign: 'left',
                          border: 'none', cursor: 'pointer', fontSize: 12.5,
                          color: '#888', fontFamily: 'DM Sans, sans-serif',
                          background: !selectedProjectId ? '#f9f9f7' : 'transparent',
                        }}
                      >
                        No project
                      </button>
                      {projects.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedProjectId(p.id); setProjectOpen(false) }}
                          style={{
                            width: '100%', padding: '8px 12px', textAlign: 'left',
                            border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            fontSize: 12.5, color: '#1a1a1a', fontFamily: 'DM Sans, sans-serif',
                            background: selectedProjectId === p.id ? '#f0faf4' : 'transparent',
                            borderLeft: selectedProjectId === p.id ? `3px solid ${p.colour ?? '#2d7a4f'}` : '3px solid transparent',
                          }}
                          onMouseEnter={e => { if (selectedProjectId !== p.id) (e.currentTarget as HTMLElement).style.background = '#f9f9f7' }}
                          onMouseLeave={e => { if (selectedProjectId !== p.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                        >
                          <span>{p.icon}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Task picker — only shown if project selected */}
              {selectedProjectId && (
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Task
                  </label>
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => { setTaskOpen(o => !o); setProjectOpen(false) }}
                      style={{
                        width: '100%', padding: '7px 10px',
                        border: '1px solid rgba(0,0,0,0.12)', borderRadius: 7,
                        background: '#fff', cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: 7,
                        fontSize: 12.5, color: selectedTask ? '#1a1a1a' : '#aaa',
                        fontFamily: 'DM Sans, sans-serif',
                      }}
                    >
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedTask ? selectedTask.title : 'No task selected'}
                      </span>
                      <ChevronDown size={12} style={{ color: '#ccc', flexShrink: 0, transform: taskOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                    </button>

                    {taskOpen && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
                        background: '#fff', border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                        marginTop: 3, maxHeight: 180, overflowY: 'auto',
                      }}>
                        <button
                          onClick={() => { setSelectedTaskId(''); setTaskOpen(false) }}
                          style={{
                            width: '100%', padding: '8px 12px', textAlign: 'left',
                            border: 'none', cursor: 'pointer', fontSize: 12.5,
                            color: '#888', fontFamily: 'DM Sans, sans-serif',
                            background: !selectedTaskId ? '#f9f9f7' : 'transparent',
                          }}
                        >
                          No specific task
                        </button>
                        {tasks.length === 0 && (
                          <div style={{ padding: '8px 12px', fontSize: 12, color: '#bbb' }}>No pending tasks in this project</div>
                        )}
                        {tasks.map(t => (
                          <button
                            key={t.id}
                            onClick={() => { setSelectedTaskId(t.id); setTaskOpen(false) }}
                            style={{
                              width: '100%', padding: '8px 12px', textAlign: 'left',
                              border: 'none', cursor: 'pointer',
                              fontSize: 12.5, color: '#1a1a1a', fontFamily: 'DM Sans, sans-serif',
                              background: selectedTaskId === t.id ? '#f0faf4' : 'transparent',
                            }}
                            onMouseEnter={e => { if (selectedTaskId !== t.id) (e.currentTarget as HTMLElement).style.background = '#f9f9f7' }}
                            onMouseLeave={e => { if (selectedTaskId !== t.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{t.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                  width: '100%', padding: '10px 0',
                  background: running ? '#dc2626' : '#2d7a4f',
                  color: '#fff', border: 'none', borderRadius: 8,
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'all 0.15s', opacity: saving ? 0.7 : 1,
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {saving
                  ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  : running ? <Square size={14} /> : <Play size={14} />
                }
                {saving ? 'Saving…' : running ? 'Stop & save' : 'Start timer'}
              </button>
            )}
          </div>

          {/* Footer */}
          <Link
            href="/dashboard/tracker"
            onClick={() => setOpen(false)}
            style={{
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

      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.94) translateY(6px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </>
  )
}
