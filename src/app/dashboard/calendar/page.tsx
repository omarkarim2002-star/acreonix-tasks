'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ChevronLeft, ChevronRight, Sparkles, Loader2,
  Plus, X, Clock, Tag, Zap, Grid, AlignJustify, Calendar
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

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

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8) // 8am–6pm
const PX_PER_HOUR = 72
const START_HOUR = 8
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
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
  const startPad = (first.getDay() + 6) % 7 // Monday start
  const days: (Date | null)[] = []
  for (let i = 0; i < startPad; i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function timeToMins(t: string) {
  const d = new Date(t)
  return d.getHours() * 60 + d.getMinutes()
}

function formatTime(t: string) {
  return new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const TYPE_COLOURS: Record<string, string> = {
  task: '#2d7a4f', break: '#9ca3af', lunch: '#c9a84c',
  event: '#3b82f6', ai_generated: '#2d7a4f',
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
  const [dragEvent, setDragEvent] = useState<{ event: CalEvent; originalStart: string } | null>(null)
  const [dragConfirm, setDragConfirm] = useState<{ event: CalEvent; newStart: string; newEnd: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const weekDays = getWeekDays(anchor)
  const monthDays = getMonthDays(anchor.getFullYear(), anchor.getMonth())

  // Date range for fetching
  const rangeStart = view === 'week' ? weekDays[0] : view === 'day' ? anchor : new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const rangeEnd = view === 'week' ? weekDays[6] : view === 'day' ? anchor : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)

  const rangeStartStr = rangeStart.toISOString().split('T')[0]
  const rangeEndStr = rangeEnd.toISOString().split('T')[0]

  useEffect(() => {
    setLoading(true)
    fetch(`/api/calendar-events?start=${rangeStartStr}T00:00:00Z&end=${rangeEndStr}T23:59:59Z`)
      .then(r => r.json())
      .then(d => { setEvents(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [rangeStartStr, rangeEndStr])

  function navigate(dir: 1 | -1) {
    const d = new Date(anchor)
    if (view === 'day') d.setDate(d.getDate() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setAnchor(d)
  }

  function goToday() { setAnchor(new Date()) }

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
        setEvents(prev => {
          const filtered = prev.filter(e => e.type !== 'ai_generated')
          return [...filtered, ...data.events]
        })
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
    const endISO = new Date(`${newEvent.date}T${newEvent.endTime}:00`).toISOString()
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
    setDragEvent(null)
  }

  async function deleteEvent(id: string) {
    await fetch(`/api/calendar-events/${id}`, { method: 'DELETE' })
    setEvents(prev => prev.filter(e => e.id !== id))
    setSelectedEvent(null)
  }

  function getEventsForDay(date: Date) {
    const ds = date.toISOString().split('T')[0]
    return events.filter(e => e.start_time.split('T')[0] === ds)
  }

  // Header display
  const headerLabel = view === 'day'
    ? anchor.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : view === 'week'
    ? `${weekDays[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString()

  return (
    <div className="flex flex-col h-screen bg-[#f4f6f9] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>Calendar</h1>

        <div className="flex items-center gap-1 ml-2">
          <button onClick={() => navigate(-1)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">
            <ChevronLeft size={15} className="text-gray-500" />
          </button>
          <span className="text-sm font-medium text-gray-800 mx-2 min-w-[200px] text-center">{headerLabel}</span>
          <button onClick={() => navigate(1)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">
            <ChevronRight size={15} className="text-gray-500" />
          </button>
          <button onClick={goToday} className="ml-2 text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">Today</button>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg ml-2">
          {(['week','day','month'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize', view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => setShowNewEvent(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700">
            <Plus size={13} />Add event
          </button>
          <button onClick={generateSchedule} disabled={scheduling}
            className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg text-white transition-all disabled:opacity-60"
            style={{ background: '#2d7a4f' }}>
            {scheduling ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {scheduling ? 'Scheduling…' : 'AI schedule'}
          </button>
        </div>
      </div>

      {/* Focus tip */}
      {focusTip && (
        <div className="flex items-center gap-2 px-6 py-2 bg-[#faf5e8] border-b border-[#e8d5a0] shrink-0">
          <Zap size={13} className="text-[#c9a84c] shrink-0" />
          <p className="text-xs text-gray-600">{focusTip}</p>
          <button onClick={() => setFocusTip('')} className="ml-auto text-gray-400 hover:text-gray-600"><X size={12} /></button>
        </div>
      )}

      {/* Calendar body */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 gap-3">
            <Loader2 size={18} className="animate-spin text-[#2d7a4f]" />
            <span className="text-sm text-gray-400">Loading calendar…</span>
          </div>
        ) : view === 'month' ? (
          <MonthView days={monthDays} events={events} onEventClick={setSelectedEvent} onDayClick={(d) => { setAnchor(d); setView('day') }} />
        ) : view === 'day' ? (
          <DayColumnView
            days={[anchor]} events={events}
            onEventClick={setSelectedEvent}
            onDrop={(event, newStart, newEnd) => setDragConfirm({ event, newStart, newEnd })}
          />
        ) : (
          <DayColumnView
            days={weekDays} events={events}
            onEventClick={setSelectedEvent}
            onDrop={(event, newStart, newEnd) => setDragConfirm({ event, newStart, newEnd })}
          />
        )}
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <Modal onClose={() => setSelectedEvent(null)}>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: selectedEvent.colour }} />
                <h2 className="text-base font-semibold text-gray-900">{selectedEvent.title}</h2>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock size={14} className="text-gray-400" />
                <span>{formatTime(selectedEvent.start_time)} – {formatTime(selectedEvent.end_time)}</span>
                <span className="text-gray-400">·</span>
                <span>{new Date(selectedEvent.start_time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
              {selectedEvent.description && (
                <p className="text-sm text-gray-500">{selectedEvent.description}</p>
              )}
              {selectedEvent.task_id && (
                <Link href={`/dashboard/tasks/${selectedEvent.task_id}`} className="flex items-center gap-1.5 text-xs text-[#2d7a4f] hover:underline">
                  <Tag size={12} />View task →
                </Link>
              )}
              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button onClick={() => deleteEvent(selectedEvent.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete event</button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* New event modal */}
      {showNewEvent && (
        <Modal onClose={() => setShowNewEvent(false)}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">New event</h2>
              <button onClick={() => setShowNewEvent(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">Title</label>
                <input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                  placeholder="Event title" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#2d7a4f] transition-colors" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">Date</label>
                <input type="date" value={newEvent.date} onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#2d7a4f] transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">Start time</label>
                  <input type="time" value={newEvent.startTime} onChange={e => setNewEvent(p => ({ ...p, startTime: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#2d7a4f] transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">End time</label>
                  <input type="time" value={newEvent.endTime} onChange={e => setNewEvent(p => ({ ...p, endTime: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#2d7a4f] transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">Colour</label>
                <div className="flex gap-2">
                  {['#2d7a4f','#c9a84c','#3b82f6','#8b5cf6','#ec4899','#f97316','#ef4444'].map(c => (
                    <button key={c} onClick={() => setNewEvent(p => ({ ...p, colour: c }))}
                      className={cn('w-6 h-6 rounded-full transition-transform hover:scale-110', newEvent.colour === c && 'ring-2 ring-offset-1 ring-gray-400 scale-110')}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <button onClick={saveNewEvent} disabled={!newEvent.title || !newEvent.date || saving}
                className="w-full py-2.5 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50"
                style={{ background: '#2d7a4f' }}>
                {saving ? 'Saving…' : 'Save event'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Drag confirm modal */}
      {dragConfirm && (
        <Modal onClose={() => setDragConfirm(null)}>
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Move event?</h2>
            <p className="text-sm text-gray-500 mb-1">
              <strong className="text-gray-800">{dragConfirm.event.title}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-5">
              {new Date(dragConfirm.newStart).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })} · {formatTime(dragConfirm.newStart)} – {formatTime(dragConfirm.newEnd)}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDragConfirm(null)} className="flex-1 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={confirmDrop} className="flex-1 py-2 text-sm font-medium text-white rounded-xl transition-colors" style={{ background: '#2d7a4f' }}>Confirm move</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function DayColumnView({ days, events, onEventClick, onDrop }: {
  days: Date[]
  events: CalEvent[]
  onEventClick: (e: CalEvent) => void
  onDrop: (event: CalEvent, newStart: string, newEnd: string) => void
}) {
  const [dragEvent, setDragEvent] = useState<CalEvent | null>(null)
  const colWidth = days.length === 1 ? '100%' : `${100 / days.length}%`

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

  return (
    <div className="flex h-full min-h-0">
      {/* Time gutter */}
      <div className="w-14 shrink-0 bg-white border-r border-gray-100">
        <div className="h-10 border-b border-gray-100" />
        {HOURS.map(h => (
          <div key={h} className="flex items-start justify-end pr-3 pt-1 text-[10px] text-gray-400 font-medium" style={{ height: PX_PER_HOUR }}>
            {h === 12 ? '12pm' : h > 12 ? `${h-12}pm` : `${h}am`}
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className="flex flex-1">
        {days.map((day, di) => {
          const dayEvents = events.filter(e => e.start_time.split('T')[0] === day.toISOString().split('T')[0])
          const isToday = day.toDateString() === new Date().toDateString()
          return (
            <div key={di} className="flex flex-col border-r border-gray-100 last:border-r-0" style={{ width: colWidth, minWidth: 0 }}>
              {/* Day header */}
              <div className={cn('h-10 border-b border-gray-100 flex flex-col items-center justify-center shrink-0', isToday ? 'bg-[#e8f5ee]' : 'bg-white')}>
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">{DAY_NAMES[(day.getDay() + 6) % 7]}</span>
                <span className={cn('text-sm font-semibold', isToday ? 'text-[#2d7a4f]' : 'text-gray-700')}>{day.getDate()}</span>
              </div>

              {/* Hour cells */}
              <div className="relative flex-1">
                {HOURS.map(h => (
                  <div key={h} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors"
                    style={{ height: PX_PER_HOUR }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDrop(e, day, h)} />
                ))}

                {/* Current time line */}
                {isToday && (() => {
                  const now = new Date()
                  const top = (now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) * (PX_PER_HOUR / 60) + 40
                  return top > 40 ? (
                    <div className="absolute left-0 right-0 flex items-center pointer-events-none z-20" style={{ top }}>
                      <div className="w-2 h-2 rounded-full bg-red-400 shrink-0 -ml-1" />
                      <div className="flex-1 h-px bg-red-300" />
                    </div>
                  ) : null
                })()}

                {/* Events */}
                {dayEvents.map(event => {
                  const startMins = timeToMins(event.start_time)
                  const endMins = timeToMins(event.end_time)
                  const top = (startMins - START_HOUR * 60) * (PX_PER_HOUR / 60) + 40
                  const height = Math.max((endMins - startMins) * (PX_PER_HOUR / 60) - 2, 20)
                  if (top < 40) return null
                  const isBreak = event.type === 'break' || event.type === 'lunch'
                  return (
                    <div key={event.id} draggable
                      onDragStart={e => handleDragStart(e, event)}
                      onClick={() => onEventClick(event)}
                      className="absolute left-1 right-1 rounded-lg px-2 py-1 cursor-pointer hover:opacity-90 transition-opacity select-none overflow-hidden"
                      style={{
                        top, height,
                        background: isBreak ? '#f9fafb' : (event.colour ?? '#2d7a4f') + '22',
                        borderLeft: `3px solid ${isBreak ? '#e5e7eb' : event.colour ?? '#2d7a4f'}`,
                        zIndex: 10,
                      }}>
                      <p className="text-[11px] font-medium truncate" style={{ color: isBreak ? '#9ca3af' : event.colour ?? '#2d7a4f' }}>
                        {event.title}
                      </p>
                      {height > 32 && (
                        <p className="text-[10px] text-gray-400">{new Date(event.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
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
    <div className="p-4">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden">
        {days.map((day, i) => {
          const dayEvents = day ? events.filter(e => e.start_time.split('T')[0] === day.toISOString().split('T')[0]) : []
          const today = day?.toDateString() === new Date().toDateString()
          return (
            <div key={i} className={cn('bg-white min-h-[100px] p-2 cursor-pointer hover:bg-gray-50 transition-colors', !day && 'bg-gray-50')}
              onClick={() => day && onDayClick(day)}>
              {day && (
                <>
                  <div className={cn('w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1', today ? 'bg-[#2d7a4f] text-white' : 'text-gray-700')}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(ev => (
                      <div key={ev.id} onClick={e => { e.stopPropagation(); onEventClick(ev) }}
                        className="text-[10px] truncate px-1.5 py-0.5 rounded font-medium"
                        style={{ background: ev.colour + '22', color: ev.colour }}>
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && <div className="text-[10px] text-gray-400 px-1">+{dayEvents.length - 3} more</div>}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
