'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, AlertCircle, Clock, ChevronRight, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type NotifItem = {
  id: string
  title: string
  type: 'overdue' | 'due_today' | 'due_tomorrow'
  project: string | null
  colour: string
  deadline: string
}

type NotifData = {
  count: number
  items: NotifItem[]
}

const TYPE_STYLES = {
  overdue: { label: 'Overdue', bg: 'bg-red-50', text: 'text-red-600', dot: '#ef4444' },
  due_today: { label: 'Due today', bg: 'bg-orange-50', text: 'text-orange-600', dot: '#f97316' },
  due_tomorrow: { label: 'Due tomorrow', bg: 'bg-[#faf5e8]', text: 'text-[#c9a84c]', dot: '#c9a84c' },
}

export function NotificationBell() {
  const [data, setData] = useState<NotifData>({ count: 0, items: [] })
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/insights/notifications').then(r => r.json()).then(setData).catch(() => {})
    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetch('/api/insights/notifications').then(r => r.json()).then(setData).catch(() => {})
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'relative w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
          open ? 'bg-[#e8f5ee]' : 'hover:bg-gray-100'
        )}
      >
        <Bell size={16} className={data.count > 0 ? 'text-[#2d7a4f]' : 'text-gray-400'} />
        {data.count > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ background: '#ef4444' }}>
            {data.count > 9 ? '9+' : data.count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            {data.count > 0 && (
              <span className="text-xs text-white px-2 py-0.5 rounded-full font-medium" style={{ background: '#ef4444' }}>
                {data.count} urgent
              </span>
            )}
          </div>

          {/* Items */}
          <div className="max-h-72 overflow-y-auto">
            {data.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <Bell size={24} className="text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">All clear — no urgent tasks</p>
              </div>
            ) : (
              data.items.map(item => {
                const style = TYPE_STYLES[item.type]
                const Icon = item.type === 'overdue' ? AlertCircle : Clock
                return (
                  <Link
                    key={item.id}
                    href={`/dashboard/tasks/${item.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: style.dot + '18' }}>
                      <Icon size={13} style={{ color: style.dot }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{item.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {item.project && (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.colour }} />
                            <span className="text-[10px] text-gray-400 truncate">{item.project}</span>
                            <span className="text-gray-300">·</span>
                          </>
                        )}
                        <span className={cn('text-[10px] font-medium', style.text)}>{style.label}</span>
                      </div>
                    </div>
                    <ChevronRight size={12} className="text-gray-300 shrink-0 mt-1.5" />
                  </Link>
                )
              })
            )}
          </div>

          {/* Footer — link to insights */}
          <Link
            href="/dashboard/insights"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between px-4 py-3 border-t border-gray-100 hover:bg-[#e8f5ee] transition-colors group"
          >
            <div className="flex items-center gap-2">
              <BarChart2 size={14} className="text-[#2d7a4f]" />
              <span className="text-xs font-medium text-[#2d7a4f]">View full insights & summary</span>
            </div>
            <ChevronRight size={12} className="text-[#2d7a4f]" />
          </Link>
        </div>
      )}
    </div>
  )
}
