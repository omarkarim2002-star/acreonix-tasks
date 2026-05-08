'use client'

import { useTimer } from '@/lib/TimerContext'
import { Pause, Play, Square } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

function fmt(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

export function FloatingTimer() {
  const { running, taskId, taskTitle, elapsed, pause, resume, stop } = useTimer()
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  if (!taskId) return null

  async function handleStop() {
    const { minsLogged } = await stop()
    setSavedMsg(minsLogged >= 1 ? `${minsLogged}m logged ✓` : 'Timer stopped')
    setTimeout(() => setSavedMsg(null), 3000)
  }

  return (
    <>
      {/* Floating pill — bottom right */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 200,
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#0D3D2E', color: '#fff',
        borderRadius: 999, padding: '8px 8px 8px 14px',
        boxShadow: '0 8px 24px rgba(13,61,46,0.35)',
        fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        animation: 'fadeUp 0.2s ease forwards',
        maxWidth: 320,
      }}>
        {/* Live dot */}
        <div style={{
          width: 8, height: 8, borderRadius: 4,
          background: '#D7F36A',
          animation: running ? 'pulse 1.4s infinite' : 'none',
          flexShrink: 0,
        }} />

        {/* Task name + time */}
        <Link
          href={taskId ? `/dashboard/tasks/${taskId}` : '#'}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, flex: 1,
            color: '#fff', textDecoration: 'none', minWidth: 0,
          }}
        >
          <span style={{
            fontSize: 13, fontWeight: 600, color: '#fff',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 160,
          }}>
            {taskTitle}
          </span>
          <span style={{
            fontSize: 13, fontWeight: 800, color: '#D7F36A',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fmt(elapsed)}
          </span>
        </Link>

        {/* Pause/Resume */}
        <button
          onClick={() => running ? pause() : resume()}
          style={{
            width: 28, height: 28, borderRadius: 14,
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title={running ? 'Pause' : 'Resume'}
        >
          {running ? <Pause size={12} fill="white" /> : <Play size={12} fill="white" />}
        </button>

        {/* Stop */}
        <button
          onClick={handleStop}
          style={{
            width: 28, height: 28, borderRadius: 14,
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Stop"
        >
          <Square size={11} fill="white" />
        </button>
      </div>

      {/* Toast confirmation */}
      {savedMsg && (
        <div style={{
          position: 'fixed', bottom: 84, right: 24, zIndex: 201,
          background: '#0D3D2E', color: '#D7F36A',
          padding: '10px 16px', borderRadius: 999,
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          animation: 'fadeUp 0.2s ease forwards',
        }}>
          {savedMsg}
        </div>
      )}

      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:0.5}}
      `}</style>
    </>
  )
}
