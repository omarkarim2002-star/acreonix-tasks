'use client'
import { useState } from 'react'

type Props = {
  done: boolean
  onChange: (done: boolean) => void
  size?: number
  colour?: string
}

export function TaskCheckbox({ done, onChange, size = 18, colour = '#2d7a4f' }: Props) {
  const [animating, setAnimating] = useState(false)

  function handleClick() {
    setAnimating(true)
    onChange(!done)
    setTimeout(() => setAnimating(false), 400)
  }

  return (
    <button
      onClick={handleClick}
      style={{
        width: size, height: size, borderRadius: '50%',
        border: `1.5px solid ${done ? colour : '#c8d4de'}`,
        background: done ? colour : 'transparent',
        cursor: 'pointer', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s ease',
        transform: animating ? 'scale(0.85)' : 'scale(1)',
        outline: 'none',
      }}
      aria-label={done ? 'Mark incomplete' : 'Mark complete'}
    >
      {done && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" style={{ display: 'block' }}>
          <path d="M1 3.5L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}
