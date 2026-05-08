'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'

type TimerState = {
  taskId:    string | null
  taskTitle: string | null
  startedAt: number | null
  elapsed:   number
  running:   boolean
}

type TimerCtx = TimerState & {
  start:   (taskId: string, taskTitle: string, estimatedMinutes?: number) => void
  pause:   () => void
  resume:  () => void
  stop:    () => Promise<{ minsLogged: number }>
  toggle:  (taskId: string, taskTitle: string, estimatedMinutes?: number) => Promise<void>
}

const Ctx = createContext<TimerCtx | null>(null)

export function useTimer() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTimer must be inside TimerProvider')
  return ctx
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TimerState>({
    taskId: null, taskTitle: null, startedAt: null, elapsed: 0, running: false,
  })
  const intervalRef       = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (state.running) {
      intervalRef.current = setInterval(() => {
        setState(prev => ({ ...prev, elapsed: prev.elapsed + 1 }))
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [state.running])

  function start(taskId: string, taskTitle: string, estimatedMinutes?: number) {
    setState({ taskId, taskTitle, startedAt: Date.now(), elapsed: 0, running: true })
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)
    if (estimatedMinutes && estimatedMinutes > 0) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      }
      warningTimeoutRef.current = setTimeout(() => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Estimated time reached', {
            body: `Still working on "${taskTitle}"? Tap to confirm or stop.`,
            tag: `timer-overtime-${taskId}`,
          })
        }
      }, estimatedMinutes * 60 * 1000)
    }
  }

  function pause() {
    setState(prev => ({ ...prev, running: false }))
  }

  function resume() {
    setState(prev => prev.taskId ? { ...prev, running: true } : prev)
  }

  async function stop() {
    const { taskId, elapsed } = state
    if (warningTimeoutRef.current) { clearTimeout(warningTimeoutRef.current); warningTimeoutRef.current = null }
    let minsLogged = 0
    if (taskId && elapsed >= 30) {
      minsLogged = Math.round(elapsed / 60)
      try {
        // Fetch existing logged_minutes first then add to it
        const res = await fetch(`/api/tasks/${taskId}`)
        const t   = await res.json()
        const total = (t?.logged_minutes ?? 0) + minsLogged
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logged_minutes: total }),
        })
      } catch {}
    }
    setState({ taskId: null, taskTitle: null, startedAt: null, elapsed: 0, running: false })
    return { minsLogged }
  }

  async function toggle(taskId: string, taskTitle: string, estimatedMinutes?: number) {
    if (state.running && state.taskId === taskId) {
      await stop()
    } else if (state.taskId === taskId) {
      // Same task, paused → resume
      resume()
    } else if (state.running || state.taskId) {
      // Different task running/paused → stop current, start new
      await stop()
      setTimeout(() => start(taskId, taskTitle, estimatedMinutes), 100)
    } else {
      start(taskId, taskTitle, estimatedMinutes)
    }
  }

  return (
    <Ctx.Provider value={{ ...state, start, pause, resume, stop, toggle }}>
      {children}
    </Ctx.Provider>
  )
}
