'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bell, AlertCircle, Clock, ChevronRight, BarChart2 } from 'lucide-react'
import Link from 'next/link'

type NotifItem = {
  id: string
  title: string
  type: 'overdue' | 'due_today' | 'due_tomorrow'
  project: string | null
  colour: string
  deadline: string
}

type NotifData = { count: number; items: NotifItem[] }

const TYPE_STYLES = {
  overdue:      { label: 'Overdue',       dot: '#ef4444', text: '#b91c1c' },
  due_today:    { label: 'Due today',     dot: '#f59e0b', text: '#b45309' },
  due_tomorrow: { label: 'Due tomorrow',  dot: '#c9a84c', text: '#92700a' },
}

function Dropdown({ data, anchorRef, onClose }: {
  data: NotifData
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 8, left: Math.min(rect.left - 200, window.innerWidth - 316) })
    }
  }, [anchorRef])

  useEffect(() => {
    function handle(e: MouseEvent) {
      const el = document.getElementById('notif-dropdown')
      if (el && !el.contains(e.target as Node) && anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose, anchorRef])

  return createPortal(
    <div
      id="notif-dropdown"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: 300,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        boxShadow: '0 4px 24px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)',
        zIndex: 9999,
        overflow: 'hidden',
        fontFamily: 'DM Sans, sans-serif',
        animation: 'fadeUp 0.15s ease forwards',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderBottom: '1px solid #f1f3f5',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Notifications</span>
        {data.count > 0 && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: '#fef2f2', color: '#b91c1c' }}>
            {data.count} urgent
          </span>
        )}
      </div>

      {/* Items */}
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {data.items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', textAlign: 'center' }}>
            <Bell size={22} style={{ color: '#d1d5db', marginBottom: 8 }} />
            <p style={{ fontSize: 13, color: '#9ca3af' }}>All clear — no urgent tasks</p>
          </div>
        ) : (
          data.items.map(item => {
            const style = TYPE_STYLES[item.type]
            const Icon = item.type === 'overdue' ? AlertCircle : Clock
            return (
              <Link
                key={item.id}
                href={`/dashboard/tasks/${item.id}`}
                onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', textDecoration: 'none',
                  borderBottom: '1px solid #f9fafb', transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8f9fa'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: style.dot + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={13} style={{ color: style.dot }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    {item.project && <>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.colour }} />
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{item.project}</span>
                      <span style={{ color: '#d1d5db', fontSize: 10 }}>·</span>
                    </>}
                    <span style={{ fontSize: 11, fontWeight: 500, color: style.text }}>{style.label}</span>
                  </div>
                </div>
                <ChevronRight size={12} style={{ color: '#d1d5db', flexShrink: 0 }} />
              </Link>
            )
          })
        )}
      </div>

      {/* Footer */}
      <Link
        href="/dashboard/insights"
        onClick={onClose}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderTop: '1px solid #f1f3f5', textDecoration: 'none',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f0faf4'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BarChart2 size={13} style={{ color: '#2d7a4f' }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: '#2d7a4f' }}>View full insights</span>
        </div>
        <ChevronRight size={12} style={{ color: '#2d7a4f' }} />
      </Link>
    </div>,
    document.body
  )
}

export function NotificationBell() {
  const [data, setData] = useState<NotifData>({ count: 0, items: [] })
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    fetch('/api/insights/notifications').then(r => r.json()).then(setData).catch(() => {})
    const iv = setInterval(() => {
      fetch('/api/insights/notifications').then(r => r.json()).then(setData).catch(() => {})
    }, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', width: 28, height: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open ? '#f0faf4' : 'transparent',
          border: '1px solid',
          borderColor: open ? '#bbddc9' : 'transparent',
          borderRadius: 6, cursor: 'pointer',
          transition: 'all 0.1s', flexShrink: 0,
        }}
        onMouseEnter={e => { if (!open) { (e.currentTarget as HTMLElement).style.background = '#f8f9fa' } }}
        onMouseLeave={e => { if (!open) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent' } }}
        aria-label="Notifications"
      >
        <Bell size={14} style={{ color: data.count > 0 ? '#2d7a4f' : '#9ca3af' }} />
        {data.count > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            width: 15, height: 15, borderRadius: '50%',
            background: '#ef4444', color: '#fff',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid #fff',
          }}>
            {data.count > 9 ? '9+' : data.count}
          </span>
        )}
      </button>

      {open && <Dropdown data={data} anchorRef={btnRef} onClose={() => setOpen(false)} />}
    </>
  )
}
