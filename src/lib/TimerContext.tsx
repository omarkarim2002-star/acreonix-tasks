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
  start:   (taskId: string, taskTitle: string) => void
  pause:   () => void
  resume:  () => void
  stop:    () => Promise<{ minsLogged: number }>
  toggle:  (taskId: string, taskTitle: string) => Promise<void>
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

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

  function start(taskId: string, taskTitle: string) {
    setState({ taskId, taskTitle, startedAt: Date.now(), elapsed: 0, running: true })
  }

  function pause() {
    setState(prev => ({ ...prev, running: false }))
  }

  function resume() {
    setState(prev => prev.taskId ? { ...prev, running: true } : prev)
  }

  async function stop() {
    const { taskId, elapsed } = state
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

  async function toggle(taskId: string, taskTitle: string) {
    if (state.running && state.taskId === taskId) {
      await stop()
    } else if (state.taskId === taskId) {
      // Same task, paused → resume
      resume()
    } else if (state.running || state.taskId) {
      // Different task running/paused → stop current, start new
      await stop()
      setTimeout(() => start(taskId, taskTitle), 100)
    } else {
      start(taskId, taskTitle)
    }
  }

  return (
    <Ctx.Provider value={{ ...state, start, pause, resume, stop, toggle }}>
      {children}
    </Ctx.Provider>
  )
}
