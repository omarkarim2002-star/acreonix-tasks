'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Sparkles, Loader2, Plus, X, Clock, Zap } from 'lucide-react'
import Link from 'next/link'

type CalEvent = {
  id: string
  task_id: string | null
  title: string
  description?: string
  start_time: string
  end_time: string
  colour: string
  type: string
  all_day: boolean
  task?: { title: string; status: string; priority: string }
}

type ViewMode = 'week' | 'day' | 'month'

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 7am–7pm
const PX_PER_HOUR = 64
const START_HOUR = 7
const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getWeekDays(date: Date): Date[] {
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = (first.getDay() + 6) % 7
  const days: (Date | null)[] = []
  for (let i = 0; i < startPad; i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function formatTime(t: string) {
  return new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function timeToMins(t: string) {
  const d = new Date(t)
  return d.getHours() * 60 + d.getMinutes()
}

// Compute non-overlapping columns for events in the same time slot
function layoutEvents(events: CalEvent[]) {
  const placed: Array<CalEvent & { col: number; totalCols: number }> = []

  // Sort by start time
  const sorted = [...events].sort((a, b) =>
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )

  for (const ev of sorted) {
    const evStart = new Date(ev.start_time).getTime()
    const evEnd = new Date(ev.end_time).getTime()

    // Find all events that overlap with this one
    const overlapping = placed.filter(p => {
      const pStart = new Date(p.start_time).getTime()
      const pEnd = new Date(p.end_time).getTime()
      return evStart < pEnd && evEnd > pStart
    })

    // Find first available column
    const usedCols = new Set(overlapping.map(p => p.col))
    let col = 0
    while (usedCols.has(col)) col++

    const totalCols = Math.max(col + 1, ...overlapping.map(p => p.totalCols), 1)

    // Update totalCols for all overlapping events
    for (const p of overlapping) p.totalCols = Math.max(p.totalCols, totalCols)
    for (const p of placed) {
      if (overlapping.find(o => o.id === p.id)) p.totalCols = Math.max(p.totalCols, totalCols)
    }

    placed.push({ ...ev, col, totalCols })
  }

  return placed
}

const PRIORITY_COLOURS: Record<string, string> = {
  urgent: '#dc2626', high: '#ea580c', medium: '#2563eb', low: '#6b7280',
}

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>('week')
  const [anchor, setAnchor] = useState(new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [scheduling, setScheduling] = useState(false)
  const [focusTip, setFocusTip] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null)
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: '', date: '', startTime: '09:00', endTime: '10:00', colour: '#2d7a4f' })
  const [dragConfirm, setDragConfirm] = useState<{ event: CalEvent; newStart: string; newEnd: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const weekDays = getWeekDays(anchor)
  const rangeStart = view === 'week' ? weekDays[0] : view === 'day' ? anchor : new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const rangeEnd   = view === 'week' ? weekDays[6] : view === 'day' ? anchor : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)

  useEffect(() => {
    setLoading(true)
    const s = rangeStart.toISOString().split('T')[0]
    const e = rangeEnd.toISOString().split('T')[0]
    fetch(`/api/calendar-events?start=${s}T00:00:00Z&end=${e}T23:59:59Z`)
      .then(r => r.json())
      .then(d => { setEvents(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [anchor, view]) // eslint-disable-line

  // Scroll to 8am on load
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (8 - START_HOUR) * PX_PER_HOUR - 10
    }
  }, [view, anchor])

  function navigate(dir: 1 | -1) {
    const d = new Date(anchor)
    if (view === 'day') d.setDate(d.getDate() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setAnchor(d)
  }

  async function generateSchedule() {
    setScheduling(true)
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: anchor.toISOString(), weekMode: view === 'week' }),
      })
      const data = await res.json()
      if (data.events) {
        setEvents(prev => [...prev.filter(e => e.type !== 'ai_generated'), ...data.events])
        setFocusTip(data.focusScore ?? '')
      }
    } finally {
      setScheduling(false)
    }
  }

  async function saveNewEvent() {
    if (!newEvent.title || !newEvent.date) return
    setSaving(true)
    const startISO = new Date(`${newEvent.date}T${newEvent.startTime}:00`).toISOString()
    const endISO   = new Date(`${newEvent.date}T${newEvent.endTime}:00`).toISOString()
    const res = await fetch('/api/calendar-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newEvent.title, start_time: startISO, end_time: endISO, colour: newEvent.colour, type: 'event' }),
    })
    const ev = await res.json()
    setEvents(prev => [...prev, ev])
    setShowNewEvent(false)
    setNewEvent({ title: '', date: '', startTime: '09:00', endTime: '10:00', colour: '#2d7a4f' })
    setSaving(false)
  }

  async function confirmDrop() {
    if (!dragConfirm) return
    const { event, newStart, newEnd } = dragConfirm
    await fetch(`/api/calendar-events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_time: newStart, end_time: newEnd }),
    })
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, start_time: newStart, end_time: newEnd } : e))
    setDragConfirm(null)
  }

  async function deleteEvent(id: string) {
    await fetch(`/api/calendar-events/${id}`, { method: 'DELETE' })
    setEvents(prev => prev.filter(e => e.id !== id))
    setSelectedEvent(null)
  }

  const headerLabel = view === 'day'
    ? anchor.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : view === 'week'
    ? `${weekDays[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8f9fa', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
        background: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginRight: 4 }}>Calendar</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => navigate(-1)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>
            <ChevronLeft size={14} style={{ color: '#6b7280' }} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', minWidth: 180, textAlign: 'center' }}>{headerLabel}</span>
          <button onClick={() => navigate(1)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>
            <ChevronRight size={14} style={{ color: '#6b7280' }} />
          </button>
          <button onClick={() => setAnchor(new Date())} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#374151', marginLeft: 4 }}>Today</button>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', background: '#f1f3f5', borderRadius: 6, padding: 2, gap: 1 }}>
          {(['week','day','month'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '4px 12px', fontSize: 12, fontWeight: view === v ? 500 : 400,
              borderRadius: 4, border: 'none', cursor: 'pointer', transition: 'all 0.1s', textTransform: 'capitalize',
              background: view === v ? '#fff' : 'transparent',
              color: view === v ? '#0f172a' : '#6b7280',
              boxShadow: view === v ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}>{v}</button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setShowNewEvent(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#374151' }}>
            <Plus size={13} />Add event
          </button>
          <button onClick={generateSchedule} disabled={scheduling} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 6, background: '#2d7a4f', color: '#fff', border: 'none', cursor: 'pointer', opacity: scheduling ? 0.7 : 1 }}>
            {scheduling ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
            {scheduling ? 'Scheduling…' : 'AI schedule'}
          </button>
        </div>
      </div>

      {/* Focus tip */}
      {focusTip && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 20px', background: '#fdf8ee', borderBottom: '1px solid #e8d5a0', flexShrink: 0 }}>
          <Zap size={13} style={{ color: '#c9a84c', flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: '#6b7280', flex: 1 }}>{focusTip}</p>
          <button onClick={() => setFocusTip('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={12} /></button>
        </div>
      )}

      {/* Calendar body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8 }}>
            <Loader2 size={16} style={{ color: '#2d7a4f', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13, color: '#6b7280' }}>Loading calendar…</span>
          </div>
        ) : view === 'month' ? (
          <MonthView
            days={getMonthDays(anchor.getFullYear(), anchor.getMonth())}
            events={events}
            onEventClick={setSelectedEvent}
            onDayClick={d => { setAnchor(d); setView('day') }}
          />
        ) : (
          <WeekDayView
            days={view === 'day' ? [anchor] : weekDays}
            events={events}
            scrollRef={scrollRef}
            onEventClick={setSelectedEvent}
            onDrop={(ev, ns, ne) => setDragConfirm({ event: ev, newStart: ns, newEnd: ne })}
            isToday={isToday}
          />
        )}
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <Modal onClose={() => setSelectedEvent(null)}>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: selectedEvent.colour, flexShrink: 0 }} />
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{selectedEvent.title}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}><X size={15} /></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
              <Clock size={13} style={{ color: '#9ca3af' }} />
              <span>{formatTime(selectedEvent.start_time)} – {formatTime(selectedEvent.end_time)}</span>
              <span style={{ color: '#d1d5db' }}>·</span>
              <span>{new Date(selectedEvent.start_time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
            {selectedEvent.description && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>{selectedEvent.description}</p>}
            {selectedEvent.task_id && (
              <Link href={`/dashboard/tasks/${selectedEvent.task_id}`} style={{ fontSize: 12, color: '#2d7a4f', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                View task →
              </Link>
            )}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f3f5', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => deleteEvent(selectedEvent.id)} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete event</button>
            </div>
          </div>
        </Modal>
      )}

      {/* New event modal */}
      {showNewEvent && (
        <Modal onClose={() => setShowNewEvent(false)}>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>New event</h3>
              <button onClick={() => setShowNewEvent(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={15} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Title</label>
                <input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} placeholder="Event title" style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, color: '#0f172a', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Date</label>
                <input type="date" value={newEvent.date} onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))} style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, color: '#0f172a', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Start</label>
                  <input type="time" value={newEvent.startTime} onChange={e => setNewEvent(p => ({ ...p, startTime: e.target.value }))} style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, color: '#0f172a', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>End</label>
                  <input type="time" value={newEvent.endTime} onChange={e => setNewEvent(p => ({ ...p, endTime: e.target.value }))} style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, color: '#0f172a', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Colour</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['#2d7a4f','#c9a84c','#3b82f6','#8b5cf6','#ec4899','#f97316','#ef4444'].map(c => (
                    <button key={c} onClick={() => setNewEvent(p => ({ ...p, colour: c }))} style={{
                      width: 22, height: 22, borderRadius: '50%', background: c, border: newEvent.colour === c ? '2px solid #0f172a' : '2px solid transparent', cursor: 'pointer', transition: 'transform 0.1s',
                    }} />
                  ))}
                </div>
              </div>
              <button onClick={saveNewEvent} disabled={!newEvent.title || !newEvent.date || saving} style={{ padding: '9px 0', background: '#2d7a4f', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: (!newEvent.title || !newEvent.date) ? 0.5 : 1 }}>
                {saving ? 'Saving…' : 'Save event'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Drag confirm */}
      {dragConfirm && (
        <Modal onClose={() => setDragConfirm(null)}>
          <div style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Move event?</h3>
            <p style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}><strong>{dragConfirm.event.title}</strong></p>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>
              {new Date(dragConfirm.newStart).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(dragConfirm.newStart)} – {formatTime(dragConfirm.newEnd)}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDragConfirm(null)} style={{ flex: 1, padding: '8px 0', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}>Cancel</button>
              <button onClick={confirmDrop} style={{ flex: 1, padding: '8px 0', background: '#2d7a4f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Move</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 360, margin: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function WeekDayView({ days, events, scrollRef, onEventClick, onDrop, isToday }: {
  days: Date[]
  events: CalEvent[]
  scrollRef: React.RefObject<HTMLDivElement>
  onEventClick: (e: CalEvent) => void
  onDrop: (event: CalEvent, newStart: string, newEnd: string) => void
  isToday: (d: Date) => boolean
}) {
  const [dragEvent, setDragEvent] = useState<CalEvent | null>(null)
  const TIME_GUTTER = 52

  function handleDragStart(e: React.DragEvent, event: CalEvent) {
    setDragEvent(event)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(e: React.DragEvent, date: Date, hour: number) {
    e.preventDefault()
    if (!dragEvent) return
    const dur = new Date(dragEvent.end_time).getTime() - new Date(dragEvent.start_time).getTime()
    const newStart = new Date(date)
    newStart.setHours(hour, 0, 0, 0)
    const newEnd = new Date(newStart.getTime() + dur)
    onDrop(dragEvent, newStart.toISOString(), newEnd.toISOString())
    setDragEvent(null)
  }

  const PRIORITY_DOT: Record<string, string> = {
    urgent: '#dc2626', high: '#ea580c', medium: '#2563eb', low: '#6b7280',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      {/* Day headers — OUTSIDE scroll area */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#fff', flexShrink: 0 }}>
        <div style={{ width: TIME_GUTTER, flexShrink: 0 }} />
        {days.map((day, di) => (
          <div key={di} style={{
            flex: 1, minWidth: 0, textAlign: 'center', padding: '8px 4px',
            background: isToday(day) ? '#f0faf4' : 'transparent',
            borderRight: di < days.length - 1 ? '1px solid #f1f3f5' : 'none',
          }}>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
              {DAY_NAMES_SHORT[(day.getDay() + 6) % 7]}
            </div>
            <div style={{
              fontSize: 15, fontWeight: 600,
              color: isToday(day) ? '#2d7a4f' : '#374151',
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
              background: isToday(day) ? '#d1f0e0' : 'transparent',
            }}>
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
        <div style={{ display: 'flex', position: 'relative' }}>
          {/* Time gutter */}
          <div style={{ width: TIME_GUTTER, flexShrink: 0, background: '#fff', borderRight: '1px solid #e5e7eb' }}>
            {HOURS.map(h => (
              <div key={h} style={{ height: PX_PER_HOUR, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 4 }}>
                <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                  {h === 12 ? '12pm' : h > 12 ? `${h-12}pm` : `${h}am`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const dateStr = day.toISOString().split('T')[0]
            const dayEvents = events.filter(e => e.start_time.split('T')[0] === dateStr)
            const laid = layoutEvents(dayEvents)

            return (
              <div key={di} style={{ flex: 1, minWidth: 0, position: 'relative', borderRight: di < days.length - 1 ? '1px solid #f1f3f5' : 'none', background: isToday(day) ? '#fafffe' : '#fff' }}>
                {/* Hour cells */}
                {HOURS.map(h => (
                  <div key={h} style={{ height: PX_PER_HOUR, borderBottom: '1px solid #f1f3f5', boxSizing: 'border-box' }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDrop(e, day, h)}
                  />
                ))}

                {/* Current time line */}
                {isToday(day) && (() => {
                  const now = new Date()
                  const topPx = (now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) * (PX_PER_HOUR / 60)
                  return topPx >= 0 ? (
                    <div style={{ position: 'absolute', left: 0, right: 0, top: topPx, display: 'flex', alignItems: 'center', zIndex: 20, pointerEvents: 'none' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', marginLeft: -3.5, flexShrink: 0 }} />
                      <div style={{ flex: 1, height: 1, background: '#ef4444', opacity: 0.6 }} />
                    </div>
                  ) : null
                })()}

                {/* Events — non-overlapping */}
                {laid.map(event => {
                  const startMins = timeToMins(event.start_time) - START_HOUR * 60
                  const endMins   = timeToMins(event.end_time)   - START_HOUR * 60
                  const top    = Math.max(0, startMins) * (PX_PER_HOUR / 60)
                  const height = Math.max(Math.min(endMins, HOURS.length * 60) - Math.max(startMins, 0), 0) * (PX_PER_HOUR / 60) - 2

                  if (height <= 0) return null

                  const isBreak = event.type === 'break' || event.type === 'lunch'
                  const colWidth = 100 / event.totalCols
                  const leftPct  = event.col * colWidth
                  const priority = event.task?.priority ?? ''
                  const durationMins = timeToMins(event.end_time) - timeToMins(event.start_time)

                  return (
                    <div
                      key={event.id}
                      draggable
                      onDragStart={e => handleDragStart(e, event)}
                      onClick={() => onEventClick(event)}
                      style={{
                        position: 'absolute',
                        top: top + 1,
                        height: height,
                        left: `calc(${leftPct}% + 2px)`,
                        width: `calc(${colWidth}% - 4px)`,
                        borderRadius: 5,
                        borderLeft: `3px solid ${isBreak ? '#d1d5db' : event.colour}`,
                        background: isBreak ? '#f8f9fa' : event.colour + '14',
                        padding: '3px 5px',
                        cursor: 'pointer',
                        zIndex: 10,
                        overflow: 'hidden',
                        boxSizing: 'border-box',
                        transition: 'opacity 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.85'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                    >
                      <div style={{ fontSize: 11, fontWeight: 500, color: isBreak ? '#9ca3af' : event.colour, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {event.title}
                      </div>
                      {durationMins >= 30 && (
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
                          {formatTime(event.start_time)}
                          {durationMins >= 45 ? ` – ${formatTime(event.end_time)}` : ''}
                        </div>
                      )}
                      {durationMins >= 45 && priority && PRIORITY_COLOURS[priority] && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: PRIORITY_COLOURS[priority] }} />
                          <span style={{ fontSize: 10, color: '#9ca3af', textTransform: 'capitalize' }}>{priority}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MonthView({ days, events, onEventClick, onDayClick }: {
  days: (Date | null)[]
  events: CalEvent[]
  onEventClick: (e: CalEvent) => void
  onDayClick: (d: Date) => void
}) {
  return (
    <div style={{ padding: 16, flex: 1, overflow: 'auto', minHeight: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {DAY_NAMES_SHORT.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#9ca3af', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        {days.map((day, i) => {
          const dayEvents = day ? events.filter(e => e.start_time.split('T')[0] === day.toISOString().split('T')[0]) : []
          const today = day?.toDateString() === new Date().toDateString()
          return (
            <div key={i} style={{
              background: day ? '#fff' : '#f8f9fa', minHeight: 90, padding: 6, cursor: day ? 'pointer' : 'default',
              transition: 'background 0.1s',
            }}
              onClick={() => day && onDayClick(day)}
              onMouseEnter={e => { if (day) (e.currentTarget as HTMLElement).style.background = '#f8fffe' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = day ? '#fff' : '#f8f9fa' }}
            >
              {day && (
                <>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 500, marginBottom: 3,
                    background: today ? '#2d7a4f' : 'transparent',
                    color: today ? '#fff' : '#374151',
                  }}>
                    {day.getDate()}
                  </div>
                  {dayEvents.slice(0, 3).map(ev => (
                    <div key={ev.id} onClick={e => { e.stopPropagation(); onEventClick(ev) }} style={{
                      fontSize: 10, padding: '1px 5px', borderRadius: 3, marginBottom: 1,
                      background: ev.colour + '18', color: ev.colour,
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer',
                    }}>
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <div style={{ fontSize: 10, color: '#9ca3af' }}>+{dayEvents.length - 3}</div>}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
