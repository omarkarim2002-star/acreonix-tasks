'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, Sparkles, Loader2,
  Clock, AlertCircle, Coffee, Zap, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ScheduleBlock = {
  taskId: string | null
  title: string
  startTime: string
  endTime: string
  project: string | null
  colour: string | null
  type: 'task' | 'break' | 'lunch'
  priority: string | null
}

type Schedule = {
  blocks: ScheduleBlock[]
  totalTaskMinutes: number
  focusScore: string
}

const HOURS = Array.from({ length: 10 }, (_, i) => i + 8) // 8am to 5pm

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToPx(minutes: number, pxPerHour = 80) {
  return (minutes / 60) * pxPerHour
}

const PRIORITY_BORDER: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#3b82f6',
  low: '#9ca3af',
}

export default function CalendarPage() {
  const router = useRouter()
  const [date, setDate] = useState(new Date())
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragBlock, setDragBlock] = useState<number | null>(null)
  const [dragY, setDragY] = useState(0)
  const calendarRef = useRef<HTMLDivElement>(null)

  const dateStr = date.toISOString().split('T')[0]
  const displayDate = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  async function generateSchedule() {
    setLoading(true)
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr }),
      })
      const data = await res.json()
      setSchedule(data)
    } catch {
      console.error('Schedule generation failed')
    } finally {
      setLoading(false)
    }
  }

  function prevDay() {
    const d = new Date(date)
    d.setDate(d.getDate() - 1)
    setDate(d)
    setSchedule(null)
  }

  function nextDay() {
    const d = new Date(date)
    d.setDate(d.getDate() + 1)
    setDate(d)
    setSchedule(null)
  }

  function handleDragStart(idx: number) { setDragBlock(idx) }

  function handleDrop(targetHour: number) {
    if (dragBlock === null || !schedule) return
    const blocks = [...schedule.blocks]
    const block = blocks[dragBlock]
    const durationMins = timeToMinutes(block.endTime) - timeToMinutes(block.startTime)
    const newStart = `${String(targetHour).padStart(2, '0')}:00`
    const endMins = targetHour * 60 + durationMins
    const newEnd = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`
    blocks[dragBlock] = { ...block, startTime: newStart, endTime: newEnd }
    setSchedule({ ...schedule, blocks })
    setDragBlock(null)
  }

  const isToday = date.toDateString() === new Date().toDateString()
  const PX_PER_HOUR = 80
  const START_HOUR = 8

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 gold-underline" style={{ fontFamily: 'Georgia, serif' }}>
          Calendar
        </h1>
        <button
          onClick={generateSchedule}
          disabled={loading}
          className="flex items-center gap-2 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-60 shadow-sm"
          style={{ background: '#2d7a4f' }}
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" />Scheduling…</>
            : <><Sparkles size={15} />AI schedule my day</>
          }
        </button>
      </div>

      {/* Date nav */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={prevDay} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ChevronLeft size={16} className="text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{displayDate}</span>
          {isToday && <span className="text-xs bg-[#e8f5ee] text-[#2d7a4f] px-2 py-0.5 rounded-full font-medium">Today</span>}
        </div>
        <button onClick={nextDay} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ChevronRight size={16} className="text-gray-600" />
        </button>
        <button
          onClick={() => { setDate(new Date()); setSchedule(null) }}
          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors ml-2"
        >
          Today
        </button>
      </div>

      {/* Focus tip */}
      {schedule?.focusScore && (
        <div className="flex items-start gap-3 bg-[#faf5e8] border border-[#e8d5a0] rounded-xl px-4 py-3 mb-5">
          <Zap size={16} className="text-[#c9a84c] shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">{schedule.focusScore}</p>
        </div>
      )}

      {/* Stats row */}
      {schedule && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">Scheduled tasks</p>
            <p className="text-xl font-bold text-gray-900">{schedule.blocks.filter(b => b.type === 'task').length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">Focus time</p>
            <p className="text-xl font-bold text-gray-900">
              {Math.floor(schedule.totalTaskMinutes / 60)}h {schedule.totalTaskMinutes % 60}m
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">Breaks</p>
            <p className="text-xl font-bold text-gray-900">{schedule.blocks.filter(b => b.type === 'break' || b.type === 'lunch').length}</p>
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {!schedule ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-14 h-14 bg-[#e8f5ee] rounded-2xl flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-[#2d7a4f]" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-2">AI-powered scheduling</h2>
            <p className="text-sm text-gray-400 max-w-sm mb-6">
              Click "AI schedule my day" to automatically organise your tasks into focused time blocks, grouped by project to minimise context switching.
            </p>
            <button
              onClick={generateSchedule}
              disabled={loading}
              className="flex items-center gap-2 text-white text-sm font-medium px-5 py-2.5 rounded-xl disabled:opacity-60"
              style={{ background: '#2d7a4f' }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {loading ? 'Generating…' : 'Generate schedule'}
            </button>
          </div>
        ) : (
          <div className="flex" ref={calendarRef}>
            {/* Time labels */}
            <div className="w-16 shrink-0 border-r border-gray-100">
              <div className="h-8 border-b border-gray-100" />
              {HOURS.map(h => (
                <div key={h} className="text-[10px] text-gray-400 px-2 flex items-start pt-1" style={{ height: PX_PER_HOUR }}>
                  {h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`}
                </div>
              ))}
            </div>

            {/* Schedule area */}
            <div className="flex-1 relative">
              {/* Header */}
              <div className="h-8 border-b border-gray-100 px-3 flex items-center">
                <span className="text-xs font-medium text-gray-500">{isToday ? 'Today' : displayDate}</span>
              </div>

              {/* Hour rows (drop zones) */}
              <div className="relative">
                {HOURS.map(h => (
                  <div
                    key={h}
                    style={{ height: PX_PER_HOUR }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(h)}
                  />
                ))}

                {/* Current time indicator */}
                {isToday && (() => {
                  const now = new Date()
                  const mins = now.getHours() * 60 + now.getMinutes()
                  const top = (mins - START_HOUR * 60) * (PX_PER_HOUR / 60) + 32
                  return top > 32 && top < 32 + HOURS.length * PX_PER_HOUR ? (
                    <div className="absolute left-0 right-0 flex items-center z-20 pointer-events-none" style={{ top }}>
                      <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <div className="flex-1 h-px bg-red-400" />
                    </div>
                  ) : null
                })()}

                {/* Schedule blocks */}
                {schedule.blocks.map((block, idx) => {
                  const startMins = timeToMinutes(block.startTime)
                  const endMins = timeToMinutes(block.endTime)
                  const top = (startMins - START_HOUR * 60) * (PX_PER_HOUR / 60) + 32
                  const height = Math.max((endMins - startMins) * (PX_PER_HOUR / 60), 24)

                  if (top < 32) return null

                  const isBreak = block.type === 'break' || block.type === 'lunch'
                  const colour = block.colour ?? '#2d7a4f'

                  return (
                    <div
                      key={idx}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      className={cn(
                        'absolute left-2 right-2 rounded-xl px-3 py-2 cursor-grab active:cursor-grabbing select-none transition-all hover:shadow-md',
                        dragBlock === idx && 'opacity-50'
                      )}
                      style={{
                        top,
                        height: height - 3,
                        background: isBreak ? '#f9fafb' : colour + '18',
                        borderLeft: `3px solid ${isBreak ? '#e5e7eb' : colour}`,
                        borderTop: block.priority ? `1px solid ${PRIORITY_BORDER[block.priority] ?? '#e5e7eb'}` : '1px solid transparent',
                        zIndex: 10,
                      }}
                    >
                      <div className="flex items-start gap-1.5 h-full overflow-hidden">
                        {block.type === 'lunch' && <Coffee size={12} className="text-gray-400 shrink-0 mt-0.5" />}
                        {block.type === 'break' && <Clock size={12} className="text-gray-400 shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-xs font-medium truncate', isBreak ? 'text-gray-400' : 'text-gray-800')}>
                            {block.title}
                          </p>
                          {!isBreak && block.project && (
                            <p className="text-[10px] text-gray-400 truncate">{block.project}</p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {block.startTime} – {block.endTime}
                          </p>
                        </div>
                        {block.taskId && (
                          <Link
                            href={`/dashboard/tasks/${block.taskId}`}
                            className="shrink-0 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink size={11} className="text-gray-400 hover:text-gray-600" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
