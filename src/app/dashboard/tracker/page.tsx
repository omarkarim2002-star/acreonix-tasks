'use client'

import { useState, useEffect } from 'react'
import { Clock, Play, Square, Plus, Loader2, CheckCircle2, Sparkles, AlertCircle, Timer } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type TimeLog = {
  id: string
  task_id: string | null
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  note: string | null
  task?: { title: string; project?: { name: string; colour: string } }
}

type Task = { id: string; title: string; project?: { name: string; colour: string } }

export default function TrackerPage() {
  const [logs, setLogs] = useState<TimeLog[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTimer, setActiveTimer] = useState<{ taskId: string; title: string; startedAt: Date } | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [naturalInput, setNaturalInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [selectedTask, setSelectedTask] = useState('')
  const [tab, setTab] = useState<'timer' | 'log' | 'natural'>('timer')

  useEffect(() => {
    Promise.all([
      fetch('/api/time-logs?days=7').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
    ]).then(([l, t]) => {
      setLogs(l)
      setTasks(t.filter((t: any) => t.status !== 'done'))
      setLoading(false)
    })
  }, [])

  // Live timer tick
  useEffect(() => {
    if (!activeTimer) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeTimer.startedAt.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [activeTimer])

  function formatElapsed(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  async function startTimer() {
    if (!selectedTask) return
    const task = tasks.find(t => t.id === selectedTask)
    setActiveTimer({ taskId: selectedTask, title: task?.title ?? 'Task', startedAt: new Date() })
    setElapsed(0)
  }

  async function stopTimer() {
    if (!activeTimer) return
    setSubmitting(true)
    const res = await fetch('/api/time-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id: activeTimer.taskId,
        started_at: activeTimer.startedAt.toISOString(),
        ended_at: new Date().toISOString(),
      }),
    })
    const log = await res.json()
    setLogs(prev => [log, ...prev])
    setActiveTimer(null)
    setElapsed(0)
    setSubmitting(false)
    setSuccess(`Logged ${Math.floor(elapsed / 60)} minutes on "${activeTimer.title}"`)
    setTimeout(() => setSuccess(''), 3000)
  }

  async function submitNatural() {
    if (!naturalInput.trim()) return
    setSubmitting(true)
    const res = await fetch('/api/time-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ natural: naturalInput, task_id: selectedTask || null }),
    })
    const log = await res.json()
    if (!log.error) {
      setLogs(prev => [log, ...prev])
      setNaturalInput('')
      setSuccess('Time logged!')
      setTimeout(() => setSuccess(''), 3000)
    }
    setSubmitting(false)
  }

  const totalMinutesToday = logs
    .filter(l => l.started_at && new Date(l.started_at).toDateString() === new Date().toDateString())
    .reduce((a, l) => a + (l.duration_minutes ?? 0), 0)

  const totalMinutesWeek = logs.reduce((a, l) => a + (l.duration_minutes ?? 0), 0)

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 gold-underline" style={{ fontFamily: 'Georgia, serif' }}>Time tracker</h1>
        <p className="text-gray-400 text-sm mt-3">Log real time spent on tasks. The more you log, the smarter the AI scheduling gets.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#e8f5ee] rounded-xl px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Today</p>
          <p className="text-xl font-bold text-gray-900">{Math.floor(totalMinutesToday / 60)}h {totalMinutesToday % 60}m</p>
        </div>
        <div className="bg-[#faf5e8] rounded-xl px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">This week</p>
          <p className="text-xl font-bold text-gray-900">{Math.floor(totalMinutesWeek / 60)}h {totalMinutesWeek % 60}m</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Sessions</p>
          <p className="text-xl font-bold text-gray-900">{logs.length}</p>
        </div>
      </div>

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-2 bg-[#e8f5ee] border border-[#a8d5bc] rounded-xl px-4 py-3 mb-4">
          <CheckCircle2 size={16} className="text-[#2d7a4f]" />
          <span className="text-sm text-[#2d7a4f] font-medium">{success}</span>
        </div>
      )}

      {/* Active timer banner */}
      {activeTimer && (
        <div className="bg-[#2d7a4f] text-white rounded-2xl px-5 py-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <div>
              <p className="text-sm font-semibold">{activeTimer.title}</p>
              <p className="text-xs text-white/70">Timer running</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-mono font-bold tabular-nums">{formatElapsed(elapsed)}</span>
            <button
              onClick={stopTimer}
              disabled={submitting}
              className="flex items-center gap-2 bg-white text-[#2d7a4f] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-white/90 transition-colors"
            >
              <Square size={14} />Stop
            </button>
          </div>
        </div>
      )}

      {/* Input tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6 shadow-sm">
        <div className="flex border-b border-gray-100">
          {[
            { key: 'timer', label: 'Live timer', icon: Timer },
            { key: 'natural', label: 'Natural language', icon: Sparkles },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={cn('flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors', tab === key ? 'text-[#2d7a4f] bg-[#e8f5ee]' : 'text-gray-500 hover:bg-gray-50')}
            >
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Task selector — shared */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 block mb-2">Task</label>
            <select
              value={selectedTask}
              onChange={e => setSelectedTask(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#2d7a4f] bg-white"
            >
              <option value="">Select a task (optional)</option>
              {tasks.map(t => (
                <option key={t.id} value={t.id}>
                  {(t as any).project?.name ? `[${(t as any).project.name}] ` : ''}{t.title}
                </option>
              ))}
            </select>
          </div>

          {tab === 'timer' && (
            <button
              onClick={activeTimer ? stopTimer : startTimer}
              disabled={submitting || (!activeTimer && !selectedTask)}
              className={cn(
                'w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl transition-all disabled:opacity-50',
                activeTimer ? 'bg-red-500 text-white hover:bg-red-600' : 'text-white hover:opacity-90'
              )}
              style={activeTimer ? {} : { background: '#2d7a4f' }}
            >
              {activeTimer ? <><Square size={15} />Stop timer</> : <><Play size={15} />Start timer</>}
            </button>
          )}

          {tab === 'natural' && (
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-2">Describe what you worked on</label>
              <textarea
                value={naturalInput}
                onChange={e => setNaturalInput(e.target.value)}
                placeholder='e.g. "worked on the proposal from 9am to 10:30" or "spent about 45 mins on client emails just now"'
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#2d7a4f] resize-none mb-3"
              />
              <button
                onClick={submitNatural}
                disabled={!naturalInput.trim() || submitting}
                className="w-full flex items-center justify-center gap-2 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-colors"
                style={{ background: '#2d7a4f' }}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {submitting ? 'Logging…' : 'Log time with AI'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent logs */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent sessions</h2>
        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No time logged yet — start a timer or log time above</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => {
              const start = new Date(log.started_at)
              const isToday = start.toDateString() === new Date().toDateString()
              return (
                <div key={log.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                  <div className="w-1 h-10 rounded-full shrink-0" style={{ background: log.task?.project?.colour ?? '#2d7a4f' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{log.task?.title ?? 'General work'}</p>
                    <p className="text-xs text-gray-400">
                      {isToday ? 'Today' : start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ·{' '}
                      {start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      {log.ended_at ? ` → ${new Date(log.ended_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ' → ongoing'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {log.duration_minutes ? (
                      <span className="text-sm font-semibold text-gray-700">
                        {log.duration_minutes >= 60
                          ? `${Math.floor(log.duration_minutes / 60)}h ${log.duration_minutes % 60}m`
                          : `${log.duration_minutes}m`}
                      </span>
                    ) : (
                      <span className="text-xs text-[#2d7a4f] animate-pulse font-medium">Running</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
