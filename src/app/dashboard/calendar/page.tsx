'use client'
import React from 'react'
import { WorkHoursModal } from '@/components/ui/WorkHoursModal'
import { CalendarImportModal } from '@/components/ui/CalendarImportModal'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Sparkles, Loader2, Plus, X, Clock, Zap, Download } from 'lucide-react'
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
  confirmed: boolean   // false = provisional AI suggestion, true = user confirmed
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
    // Breaks and lunch always render full-width — never participate in column layout
    if (ev.type === 'break' || ev.type === 'lunch') {
      placed.push({ ...ev, col: 0, totalCols: 1 })
      continue
    }

    const evStart = new Date(ev.start_time).getTime()
    const evEnd   = new Date(ev.end_time).getTime()

    // Only consider non-break events for overlap detection
    const overlapping = placed.filter(p => {
      if (p.type === 'break' || p.type === 'lunch') return false
      const pStart = new Date(p.start_time).getTime()
      const pEnd   = new Date(p.end_time).getTime()
      return evStart < pEnd && evEnd > pStart
    })

    const usedCols = new Set(overlapping.map(p => p.col))
    let col = 0
    while (usedCols.has(col)) col++

    const totalCols = Math.max(col + 1, ...overlapping.map(p => p.totalCols), 1)
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


// ── Day Snapshot Panel ──────────────────────────────────────────────────────
// ── Calendar intelligence helpers ──────────────────────────────────────────

function computeFocusScore(events: CalEvent[], dayStr: string): { score: number; label: string; colour: string } {
  const dayEvents = events.filter(e => e.start_time.startsWith(dayStr) && e.type !== 'break' && e.type !== 'lunch')
  if (dayEvents.length === 0) return { score: 0, label: 'No tasks scheduled', colour: '#bbb' }

  // Score components
  const urgentCount  = dayEvents.filter(e => e.task?.priority === 'urgent' || e.task?.priority === 'high').length
  const totalCount   = dayEvents.length
  const urgentRatio  = urgentCount / totalCount
  const projectIds   = new Set(dayEvents.map(e => e.colour ?? e.id))
  const variety      = projectIds.size / totalCount // low variety = better focus
  const durationMins = dayEvents.reduce((sum, e) => {
    return sum + (timeToMins(e.end_time) - timeToMins(e.start_time))
  }, 0)
  const workdayMins = (18 - 9) * 60 // 9am–6pm
  const density = Math.min(durationMins / workdayMins, 1)

  // Scoring logic
  let score = 60
  if (urgentRatio > 0.3) score += 15 // good: tackling important work
  if (variety < 0.4)     score += 12 // good: focused on few projects
  if (density > 0.3 && density < 0.85) score += 13 // sweet spot
  if (density > 0.9)     score -= 10 // overpacked
  score = Math.min(100, Math.max(0, Math.round(score)))

  let label = 'Focused day'
  let colour = '#2d7a4f'
  if (score >= 80) { label = 'Excellent focus'; colour = '#16a34a' }
  else if (score >= 65) { label = 'Focused day'; colour = '#2d7a4f' }
  else if (score >= 50) { label = 'Balanced day'; colour = '#c9a84c' }
  else if (density > 0.88) { label = 'Packed — protect your focus'; colour = '#ef4444' }
  else { label = 'Light day'; colour = '#9ca3af' }

  return { score, label, colour }
}

function findBestFreeSlot(events: CalEvent[], dayStr: string): string | null {
  // Find the best free slot in the working day
  const dayEvents = events
    .filter(e => e.start_time.startsWith(dayStr))
    .sort((a, b) => timeToMins(a.start_time) - timeToMins(b.start_time))

  const workStart = 9 * 60, workEnd = 18 * 60
  const busy: [number, number][] = dayEvents.map(e => [timeToMins(e.start_time), timeToMins(e.end_time)])

  let bestSlot: number | null = null
  let bestLen = 0
  let cursor = workStart

  for (const [bs, be] of busy) {
    if (bs > cursor && bs - cursor > bestLen) {
      bestLen = bs - cursor
      bestSlot = cursor
    }
    cursor = Math.max(cursor, be)
  }
  if (workEnd > cursor && workEnd - cursor > bestLen) {
    bestSlot = cursor
  }

  if (bestSlot === null || bestLen < 20) return null
  const h = Math.floor(bestSlot / 60)
  const m = bestSlot % 60
  const period = h >= 12 ? 'pm' : 'am'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2,'0')}${period}`
}

function detectConflicts(events: CalEvent[], dayStr: string): Set<string> {
  // Only flag actual overlaps (negative gap = events overlap in time)
  // Tight-but-not-overlapping is normal in a busy schedule, not an error
  const dayEvents = events
    .filter(e => e.start_time.startsWith(dayStr) && e.type !== 'break' && e.type !== 'lunch')
    .sort((a, b) => timeToMins(a.start_time) - timeToMins(b.start_time))
  const tight = new Set<string>()
  for (let i = 0; i < dayEvents.length - 1; i++) {
    const gap = timeToMins(dayEvents[i+1].start_time) - timeToMins(dayEvents[i].end_time)
    if (gap < 0) { tight.add(dayEvents[i].id); tight.add(dayEvents[i+1].id) }
  }
  return tight
}

function findFocusEvent(events: CalEvent[], dayStr: string): CalEvent | null {
  // Pick the single most important event of the day to highlight
  const dayEvents = events.filter(e =>
    e.start_time.startsWith(dayStr) && e.type !== 'break' && e.type !== 'lunch'
  )
  if (dayEvents.length === 0) return null
  const scored = dayEvents.map(e => {
    let s = 0
    if (e.task?.priority === 'urgent') s += 40
    else if (e.task?.priority === 'high') s += 25
    else if (e.task?.priority === 'medium') s += 10
    const dur = timeToMins(e.end_time) - timeToMins(e.start_time)
    if (dur >= 60) s += 15
    if (dur >= 90) s += 10
    return { event: e, score: s }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.event ?? null
}

function DaySnapshot({ events, anchor }: { events: CalEvent[]; anchor: Date }) {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const anchorStr = anchor.toISOString().split('T')[0]
  const isToday = anchorStr === todayStr
  const displayStr = isToday ? todayStr : anchorStr

  const todayEvents = events
    .filter(e => e.start_time.startsWith(displayStr))
    .sort((a, b) => timeToMins(a.start_time) - timeToMins(b.start_time))

  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(iv)
  }, [])

  const nowMins = now.getHours() * 60 + now.getMinutes()

  const current = todayEvents.find(e => {
    const s = timeToMins(e.start_time), en = timeToMins(e.end_time)
    return nowMins >= s && nowMins < en
  })

  // Split upcoming into "Next" (next 2) and "Later" (rest), skip breaks unless nothing else
  const upcoming = todayEvents.filter(e => timeToMins(e.start_time) > nowMins)
  const workItems = upcoming.filter(e => e.type !== 'break' && e.type !== 'lunch')
  const nextItems = workItems.slice(0, 2)
  const laterItems = workItems.slice(2, 5)

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  function minsUntil(iso: string) {
    const diff = Math.round((timeToMins(iso) - nowMins))
    if (diff <= 0) return 'Now'
    if (diff < 60) return `in ${diff}m`
    const h = Math.floor(diff / 60), m = diff % 60
    return m === 0 ? `in ${h}h` : `in ${h}h ${m}m`
  }

  // Intelligence
  const { score, label: scoreLabel, colour: scoreColour } = computeFocusScore(events, displayStr)
  const bestSlot = findBestFreeSlot(events, displayStr)
  const endOfDay = 18 * 60
  const scheduledMins = todayEvents
    .filter(e => e.type !== 'break' && e.type !== 'lunch')
    .reduce((acc, e) => acc + Math.max(0, Math.min(timeToMins(e.end_time), endOfDay) - Math.max(timeToMins(e.start_time), isToday ? nowMins : 9*60)), 0)
  const freeAfterNow = Math.max(0, endOfDay - Math.max(nowMins, 9 * 60) - scheduledMins)

  return (
    <div style={{
      width: 224, flexShrink: 0, borderLeft: '1px solid rgba(0,0,0,0.07)',
      background: '#fbfbfa', display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden', fontFamily: 'DM Sans, sans-serif',
    }}>

      {/* ── Header: time + focus score ── */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
              {isToday ? "Today's flow" : new Date(displayStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
            {isToday && (
              <div style={{ fontSize: 21, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
          {/* Focus score pill */}
          {score > 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
            }}>
              <div style={{
                fontSize: 16, fontWeight: 700, color: scoreColour,
                letterSpacing: '-0.03em', lineHeight: 1,
              }}>{score}%</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: scoreColour, opacity: 0.8, textAlign: 'right', lineHeight: 1.2, maxWidth: 70 }}>
                {scoreLabel}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Current block ── */}
      {current && (
        <div style={{
          padding: '9px 14px',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          background: `${current.colour ?? '#2d7a4f'}08`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 0 3px rgba(22,163,74,0.2)', animation: 'pulseGreen 2s infinite' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Now</span>
            <span style={{ fontSize: 9, color: '#bbb', marginLeft: 'auto' }}>until {fmtTime(current.end_time)}</span>
          </div>
          <div style={{ borderLeft: `2.5px solid ${current.colour ?? '#2d7a4f'}`, paddingLeft: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#111', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current.title}</div>
          </div>
        </div>
      )}

      {/* ── Next / Later ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
        {nextItems.length === 0 && !current && (
          <div style={{ padding: '18px 14px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#ddd' }}>Nothing scheduled</p>
          </div>
        )}

        {nextItems.length > 0 && (
          <>
            <div style={{ padding: '8px 14px 4px', fontSize: 9, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Next
            </div>
            {nextItems.map(ev => (
              <div key={ev.id} style={{ padding: '6px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 2.5, height: 34, borderRadius: 2, background: ev.colour ?? '#2d7a4f', flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                  <div style={{ fontSize: 10, color: '#bbb', marginTop: 1 }}>{fmtTime(ev.start_time)}</div>
                </div>
                <div style={{ fontSize: 9.5, color: '#2d7a4f', flexShrink: 0, marginTop: 2, fontWeight: 600, opacity: 0.8 }}>
                  {minsUntil(ev.start_time)}
                </div>
              </div>
            ))}
          </>
        )}

        {laterItems.length > 0 && (
          <>
            <div style={{ padding: '10px 14px 4px', fontSize: 9, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em', borderTop: '1px solid rgba(0,0,0,0.05)', marginTop: 4 }}>
              Later
            </div>
            {laterItems.map(ev => (
              <div key={ev.id} style={{ padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 8, opacity: 0.65 }}>
                <div style={{ width: 2.5, height: 26, borderRadius: 2, background: ev.colour ?? '#e0e0dd', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 400, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                  <div style={{ fontSize: 9.5, color: '#bbb', marginTop: 1 }}>{fmtTime(ev.start_time)}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Free time footer ── */}
      <div style={{ padding: '10px 14px 12px', borderTop: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
        {freeAfterNow > 20 ? (
          <>
            <div style={{ fontSize: 9.5, color: '#bbb', marginBottom: 1 }}>Free today</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2d7a4f', letterSpacing: '-0.02em' }}>
              {Math.floor(freeAfterNow / 60)}h {freeAfterNow % 60 > 0 ? `${freeAfterNow % 60}m` : ''}
              {bestSlot && <span style={{ fontSize: 10.5, fontWeight: 400, color: '#888', marginLeft: 4 }}>— best at {bestSlot}</span>}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 10, color: '#ccc' }}>Day fully scheduled</div>
        )}
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>(typeof window !== 'undefined' && window.innerWidth < 768 ? 'day' : 'week')
  const [anchor, setAnchor] = useState(new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [scheduling, setScheduling] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [hasExistingAiEvents, setHasExistingAiEvents] = useState(false)
  const [showWorkHoursModal, setShowWorkHoursModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [workHours, setWorkHours] = useState<{ start: string; end: string } | null>(null)
  const [focusTip, setFocusTip] = useState('')

  async function confirmEvent(id: string) {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, confirmed: true } : e))
    await fetch(`/api/calendar-events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: true }),
    })
  }

  async function clearSuggestion(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id))
    await fetch(`/api/calendar-events/${id}`, { method: 'DELETE' })
  }
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
      .then(d => { setEvents((() => {
          const now = new Date()
          const arr = Array.isArray(d) ? d : []
          // Remove stale provisional events and deduplicate lunch breaks
          const lunchSeen = new Set<string>()
          return arr.filter((e: CalEvent) => {
            // Remove stale unconfirmed AI events from past days
            if (e.type === 'ai_generated' && !e.confirmed) {
              return new Date(e.start_time).toDateString() >= now.toDateString()
            }
            // Keep only first lunch per day
            if (e.type === 'lunch') {
              const day = e.start_time.split('T')[0]
              if (lunchSeen.has(day)) return false
              lunchSeen.add(day)
            }
            return true
          })
        })()); setLoading(false) })
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

  async function handleScheduleClick() {
    // Check if work hours are set
    if (!workHours) {
      const res = await fetch('/api/preferences')
      const prefs = await res.json()
      if (!prefs.work_start || prefs.work_start === '09:00' && !prefs.id) {
        // No saved prefs — ask
        setShowWorkHoursModal(true)
        return
      }
      setWorkHours({ start: prefs.work_start, end: prefs.work_end })
    }
    const aiEvents = events.filter(e => e.type === 'ai_generated')
    if (aiEvents.length > 0) {
      setHasExistingAiEvents(true)
      setShowScheduleModal(true)
    } else {
      runSchedule('scratch')
    }
  }

  async function runSchedule(mode: 'scratch' | 'around') {
    setShowScheduleModal(false)
    setScheduling(true)
    try {
      // If scratch — delete existing AI events from DB first
      if (mode === 'scratch') {
        const aiEvents = events.filter(e => e.type === 'ai_generated')
        await Promise.all(aiEvents.map(e =>
          fetch(`/api/calendar-events/${e.id}`, { method: 'DELETE' })
        ))
        setEvents(prev => prev.filter(e => e.type !== 'ai_generated'))
      }
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: anchor.toISOString(),
          weekMode: view === 'week',
          preserveExisting: mode === 'around',
          workStart: workHours?.start,
          workEnd: workHours?.end,
        }),
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
        display: 'flex', alignItems: 'center', gap: 6, padding: 'clamp(8px,2vw,10px) clamp(10px,3vw,20px)',
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
              padding: 'clamp(3px,1vw,4px) clamp(7px,2vw,12px)', fontSize: 'clamp(10px,3vw,12px)', fontWeight: view === v ? 500 : 400,
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
          <button onClick={() => setShowImportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#374151' }}>
            <Download size={13} />Import
          </button>
          <button onClick={handleScheduleClick} disabled={scheduling} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 6, background: '#2d7a4f', color: '#fff', border: 'none', cursor: 'pointer', opacity: scheduling ? 0.7 : 1 }}>
            {scheduling ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
            {scheduling ? 'Scheduling…' : 'AI schedule'}
          </button>
        </div>
      </div>

      {/* Focus tip */}
      {/* Proposed plan banner — shown when unconfirmed AI events exist */}
      {events.some(e => e.type === 'ai_generated' && !e.confirmed) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px', background: 'linear-gradient(90deg,#f0faf4,#f9fdf9)', borderBottom: '1px solid #c6e6d4', flexShrink: 0 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#2d7a4f', boxShadow: '0 0 0 3px rgba(45,122,79,0.2)', animation: 'pulseGreen 2s infinite', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1f5537' }}>Proposed plan ready</span>
            <span style={{ fontSize: 11.5, color: '#2d7a4f', marginLeft: 8, opacity: 0.8 }}>
              {events.filter(e => e.type === 'ai_generated' && !e.confirmed).length} suggested blocks — confirm to commit, ✕ to remove
            </span>
          </div>
          <button
            onClick={() => {
              const ids = events.filter(e => e.type === 'ai_generated' && !e.confirmed).map(e => e.id)
              ids.forEach(id => confirmEvent(id))
            }}
            style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 12px', borderRadius: 6, background: '#2d7a4f', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0, fontFamily: 'DM Sans, sans-serif' }}
          >
            Confirm all
          </button>
          <button
            onClick={() => {
              const ids = events.filter(e => e.type === 'ai_generated' && !e.confirmed).map(e => e.id)
              ids.forEach(id => clearSuggestion(id))
            }}
            style={{ fontSize: 11.5, color: '#888', padding: '4px 10px', borderRadius: 6, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', flexShrink: 0, fontFamily: 'DM Sans, sans-serif' }}
          >
            Clear all
          </button>
        </div>
      )}

      {focusTip && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 20px', background: '#fdf8ee', borderBottom: '1px solid #e8d5a0', flexShrink: 0 }}>
          <Zap size={13} style={{ color: '#c9a84c', flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: '#6b7280', flex: 1 }}>{focusTip}</p>
          <button onClick={() => setFocusTip('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={12} /></button>
        </div>
      )}

      {/* Calendar body + snapshot panel */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'row' }}>
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
            focusEventId={findFocusEvent(events, anchor.toISOString().split('T')[0])?.id ?? null}
            conflictIds={detectConflicts(events, anchor.toISOString().split('T')[0])}
            onConfirm={confirmEvent}
            onClear={clearSuggestion}
          />
        )}
        </div>
        <div style={{ display: 'var(--cal-panel, flex)' }}>
          <DaySnapshot events={events} anchor={anchor} />
        </div>
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

      {/* Work hours modal */}
      {showImportModal && (
        <CalendarImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            setShowImportModal(false)
            // Reload events to show imported ones
            fetch('/api/calendar-events').then(r => r.json()).then(d => {
              if (Array.isArray(d)) setEvents(d)
            })
          }}
        />
      )}

      {showWorkHoursModal && (
        <WorkHoursModal
          onConfirm={(start, end) => {
            setWorkHours({ start, end })
            setShowWorkHoursModal(false)
            const aiEvents = events.filter(e => e.type === 'ai_generated')
            if (aiEvents.length > 0) { setShowScheduleModal(true) } else { runSchedule('scratch') }
          }}
          onCancel={() => setShowWorkHoursModal(false)}
        />
      )}

      {/* Schedule mode modal */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }} onClick={() => setShowScheduleModal(false)}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 400, margin: 20, boxShadow: '0 12px 48px rgba(0,0,0,0.18)', fontFamily: 'DM Sans, sans-serif', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '22px 24px 0' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Regenerate schedule?</h3>
              <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 20 }}>
                You already have an AI-generated schedule. How would you like to proceed?
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 20px 20px' }}>
              <button onClick={() => runSchedule('scratch')} style={{
                width: '100%', padding: '13px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)',
                background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif',
                transition: 'background 0.12s',
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f7f7f5'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 3 }}>🗑 Start from scratch</div>
                <div style={{ fontSize: 12, color: '#888' }}>Remove the current AI schedule and rebuild it fresh from your tasks</div>
              </button>
              <button onClick={() => runSchedule('around')} style={{
                width: '100%', padding: '13px 16px', borderRadius: 10, border: '1px solid rgba(45,122,79,0.3)',
                background: '#f0faf4', cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif',
                transition: 'background 0.12s',
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#e6f7ed'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#f0faf4'}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1f5537', marginBottom: 3 }}>➕ Build around existing</div>
                <div style={{ fontSize: 12, color: '#2d7a4f' }}>Keep your current events and fill remaining gaps with new AI suggestions</div>
              </button>
              <button onClick={() => setShowScheduleModal(false)} style={{
                width: '100%', padding: '10px 0', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 13, color: '#bbb', fontFamily: 'DM Sans, sans-serif',
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function EventHoverTooltip({ event, anchorRect }: { event: CalEvent; anchorRect: DOMRect }) {
  const viewportW = window.innerWidth
  const viewportH = window.innerHeight

  // Duration
  const durMins = timeToMins(event.end_time) - timeToMins(event.start_time)
  const durLabel = durMins >= 60
    ? `${Math.floor(durMins / 60)}h${durMins % 60 > 0 ? ` ${durMins % 60}m` : ''}`
    : `${durMins}m`

  const TOOLTIP_W = 240
  const TOOLTIP_H = 160 // estimated

  // Position: prefer right of event, flip left if near edge
  let left = anchorRect.right + 10
  if (left + TOOLTIP_W > viewportW - 16) left = anchorRect.left - TOOLTIP_W - 10

  // Vertically align with event top, clamp to viewport
  let top = anchorRect.top
  if (top + TOOLTIP_H > viewportH - 16) top = viewportH - TOOLTIP_H - 16
  if (top < 8) top = 8

  const isProvisional = event.type === 'ai_generated' && !event.confirmed

  return (
    <div style={{
      position: 'fixed', left, top, width: TOOLTIP_W, zIndex: 300,
      background: '#fff',
      borderRadius: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderTop: `3px solid ${event.colour}`,
      overflow: 'hidden',
      animation: 'tooltipIn 0.12s ease',
      pointerEvents: 'none',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      {/* Colour strip */}
      <div style={{ height: 3, background: isProvisional ? `repeating-linear-gradient(90deg,${event.colour}80 0,${event.colour}80 8px,transparent 8px,transparent 14px)` : event.colour }} />

      {/* Content */}
      <div style={{ padding: '10px 12px 11px' }}>
        {/* Title */}
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.35, marginBottom: 7, wordBreak: 'break-word' }}>
          {event.title}
        </p>

        {/* Time + duration */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#666', marginBottom: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>{fmtTime(event.start_time)} – {fmtTime(event.end_time)}</span>
          <span style={{ color: '#ddd' }}>·</span>
          <span style={{ color: '#aaa' }}>{durLabel}</span>
        </div>

        {/* Provisional badge */}
        {isProvisional && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: event.colour, background: event.colour + '12', padding: '2px 7px', borderRadius: 4, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ✦ Suggested — tap to confirm
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p style={{ fontSize: 11.5, color: '#888', lineHeight: 1.5, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {event.description}
          </p>
        )}

        {/* Task priority */}
        {event.task?.priority && event.task.priority !== 'medium' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#888' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: { urgent: '#dc2626', high: '#ea580c', low: '#9ca3af' }[event.task.priority] ?? '#aaa' }} />
            <span style={{ textTransform: 'capitalize' }}>{event.task.priority} priority</span>
          </div>
        )}
      </div>


    </div>
  )
}

function WeekDayView({ days, events, scrollRef, onEventClick, onDrop, isToday, focusEventId, conflictIds, onConfirm, onClear }: {
  days: Date[]
  events: CalEvent[]
  scrollRef: React.RefObject<HTMLDivElement>
  onEventClick: (e: CalEvent) => void
  onDrop: (event: CalEvent, newStart: string, newEnd: string) => void
  isToday: (d: Date) => boolean
  focusEventId?: string | null
  conflictIds?: Set<string>
  onConfirm?: (id: string) => void
  onClear?: (id: string) => void
}) {
  const [dragEvent, setDragEvent] = useState<CalEvent | null>(null)
  const [hovered, setHovered] = useState<{ event: CalEvent; rect: DOMRect } | null>(null)
  const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
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

                {/* Now indicator — red line at current time */}
                {isToday(day) && (() => {
                  const n = new Date()
                  const nowMins = n.getHours() * 60 + n.getMinutes()
                  const nowTop = (nowMins - START_HOUR * 60) * (PX_PER_HOUR / 60)
                  if (nowTop < 0) return null
                  return (
                    <div key="now-line" style={{ position: 'absolute', left: 0, right: 0, top: nowTop, zIndex: 20, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', marginLeft: -4, flexShrink: 0 }} />
                      <div style={{ flex: 1, height: 1.5, background: '#ef4444', opacity: 0.75 }} />
                    </div>
                  )
                })()}

                {/* Events — non-overlapping */}
                {laid.map(event => {
                  const startMins = timeToMins(event.start_time) - START_HOUR * 60
                  const endMins   = timeToMins(event.end_time)   - START_HOUR * 60
                  const top    = Math.max(0, startMins) * (PX_PER_HOUR / 60)
                  const height = Math.max(Math.min(endMins, HOURS.length * 60) - Math.max(startMins, 0), 0) * (PX_PER_HOUR / 60) - 2

                  if (height <= 0) return null

                  const isBreak = event.type === 'break' || event.type === 'lunch'
                  const isPast = new Date(event.end_time) < new Date() && event.confirmed
                  const isProvisional = event.type === 'ai_generated' && !event.confirmed
                  const colWidth = 100 / event.totalCols
                  const leftPct  = event.col * colWidth
                  const priority = event.task?.priority ?? ''
                  const durationMins = timeToMins(event.end_time) - timeToMins(event.start_time)

                  // Skip tiny break/lunch rendering noise
                  if (isBreak && height < 12) return null

                  // COMPACT PILL for very short non-break events (< 20px ≈ < 25 min)
                  if (height < 20 && !isBreak) {
                    return (
                      <div
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        title={`${event.title} · ${fmtTime(event.start_time)}–${fmtTime(event.end_time)}`}
                        style={{
                          position: 'absolute', top: top + 1, height: Math.max(height, 6),
                          left: `calc(${leftPct}% + 2px)`, width: `calc(${colWidth}% - 4px)`,
                          borderRadius: 3,
                          background: event.colour + (isProvisional ? '50' : 'bb'),
                          cursor: 'pointer', overflow: 'hidden', boxSizing: 'border-box',
                          display: 'flex', alignItems: 'center', paddingLeft: 4,
                          animation: 'fadeSlideIn 0.25s ease both', zIndex: 10,
                        }}
                      >
                        <span style={{ fontSize: 8, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1 }}>
                          {event.title}
                        </span>
                      </div>
                    )
                  }

                  // Break/lunch — minimal full-width band, no competing with task blocks
                  if (isBreak) {
                    return (
                      <div
                        key={event.id}
                        style={{
                          position: 'absolute', top: top + 1, height: Math.max(height - 2, 4),
                          left: '2px', width: 'calc(100% - 4px)',
                          borderRadius: 4,
                          background: 'rgba(0,0,0,0.04)',
                          borderLeft: '2px solid rgba(0,0,0,0.1)',
                          boxSizing: 'border-box',
                          display: 'flex', alignItems: 'center', paddingLeft: 6,
                          zIndex: 5, pointerEvents: height > 16 ? 'auto' : 'none',
                        }}
                      >
                        {height > 16 && (
                          <span style={{ fontSize: 9, color: '#bbb', fontWeight: 500, fontFamily: 'DM Sans, sans-serif' }}>
                            {event.type === 'lunch' ? '🍽 Lunch' : '☕ Break'}
                          </span>
                        )}
                      </div>
                    )
                  }

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
                        borderRadius: 6,
                        borderLeft: isProvisional
                          ? `2px dashed ${event.colour}bb`
                          : focusEventId === event.id
                          ? `3px solid ${event.colour}`
                          : `2.5px solid ${event.colour + 'cc'}`,
                        background: isProvisional
                          ? event.colour + '14'
                          : focusEventId === event.id
                          ? event.colour + '22'
                          : event.colour + '18',
                        boxShadow: focusEventId === event.id && !isProvisional
                          ? `0 1px 6px ${event.colour}18`
                          : 'none',
                        opacity: isProvisional ? 0.85 : isPast ? 0.4 : 1,
                        padding: '3px 5px',
                        cursor: 'pointer',
                        zIndex: focusEventId === event.id ? 11 : isProvisional ? 9 : 10,
                        outline: focusEventId === event.id ? `1.5px solid ${event.colour}60` : 'none',
                        outlineOffset: '1px',
                        overflow: 'hidden',
                        boxSizing: 'border-box',
                        animation: 'fadeSlideIn 0.3s ease both',
                        transition: 'box-shadow 0.15s, background 0.15s, opacity 0.2s',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.background = event.colour + '2e'
                        el.style.zIndex = '14'
                        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
                        const rect = el.getBoundingClientRect()
                        hoverTimerRef.current = setTimeout(() => {
                          if (!isBreak) setHovered({ event, rect })
                        }, 280)
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.background = focusEventId === event.id ? event.colour + '1a' : event.colour + '0e'
                        el.style.zIndex = focusEventId === event.id ? '11' : '10'
                        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
                        setHovered(null)
                      }}
                    >
                      {isProvisional && height >= 32 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 1 }}>
                          <div style={{ fontSize: 8, fontWeight: 700, color: event.colour, letterSpacing: '0.07em', textTransform: 'uppercase', opacity: 0.9 }}>
                            ✦ Suggested
                          </div>
                          {height >= 52 && (
                            <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => onConfirm?.(event.id)}
                                title="Confirm this block"
                                style={{ fontSize: 8, background: event.colour, color: '#fff', border: 'none', borderRadius: 3, padding: '1px 5px', cursor: 'pointer', fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}
                              >✓</button>
                              <button
                                onClick={() => onClear?.(event.id)}
                                title="Remove suggestion"
                                style={{ fontSize: 8, background: 'rgba(0,0,0,0.1)', color: '#666', border: 'none', borderRadius: 3, padding: '1px 5px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                              >✕</button>
                            </div>
                          )}
                        </div>
                      )}
                      {!isProvisional && focusEventId === event.id && height >= 40 && (
                        <div style={{ fontSize: 8.5, fontWeight: 700, color: event.colour, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.75, marginBottom: 1 }}>
                          ★ Focus
                        </div>
                      )}
                      {conflictIds?.has(event.id) && focusEventId !== event.id && height >= 36 && (
                        <div style={{ fontSize: 8, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.85, marginBottom: 1 }}>
                          ⚡ Overlap
                        </div>
                      )}
                      <div style={{ fontSize: 11.5, fontWeight: focusEventId === event.id ? 600 : 500, color: event.colour, lineHeight: 1.25, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', textDecoration: isPast ? 'line-through' : 'none', opacity: isPast ? 0.6 : 1 }}>
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
