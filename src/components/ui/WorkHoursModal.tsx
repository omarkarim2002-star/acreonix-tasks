'use client'

import { useState } from 'react'
import { Clock, X } from 'lucide-react'

type Props = {
  onConfirm: (start: string, end: string) => void
  onCancel: () => void
}

const PRESETS = [
  { label: '9–5',   start: '09:00', end: '17:00' },
  { label: '9–6',   start: '09:00', end: '18:00' },
  { label: '8–4',   start: '08:00', end: '16:00' },
  { label: '10–6',  start: '10:00', end: '18:00' },
  { label: '10–7',  start: '10:00', end: '19:00' },
]

export function WorkHoursModal({ onConfirm, onCancel }: Props) {
  const [start, setStart] = useState('09:00')
  const [end, setEnd]     = useState('18:00')
  const [saving, setSaving] = useState(false)

  async function confirm() {
    setSaving(true)
    // Save to DB so it persists
    await fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ work_start: start, work_end: end }),
    }).catch(() => {})
    onConfirm(start, end)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }} onClick={onCancel}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, margin: 20, boxShadow: '0 16px 56px rgba(0,0,0,0.2)', fontFamily: 'DM Sans, sans-serif', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#f0faf4', border: '1px solid #c6e6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={17} style={{ color: '#2d7a4f' }} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>When do you work?</h3>
              <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0' }}>Used to schedule work vs personal tasks correctly</p>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 2 }}><X size={16} /></button>
        </div>

        <div style={{ padding: '18px 22px 20px' }}>

          {/* Quick presets */}
          <p style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Quick select</p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => { setStart(p.start); setEnd(p.end) }}
                style={{
                  padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  border: `1px solid ${start === p.start && end === p.end ? 'rgba(45,122,79,0.4)' : 'rgba(0,0,0,0.1)'}`,
                  background: start === p.start && end === p.end ? '#f0faf4' : '#fff',
                  color: start === p.start && end === p.end ? '#1f5537' : '#555',
                  fontFamily: 'DM Sans, sans-serif',
                }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Manual time inputs */}
          <p style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Or set manually</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Work starts</label>
              <input type="time" value={start} onChange={e => setStart(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none', color: '#1a1a1a', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Work ends</label>
              <input type="time" value={end} onChange={e => setEnd(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none', color: '#1a1a1a', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* What this means */}
          <div style={{ background: '#f9f9f7', borderRadius: 8, padding: '10px 12px', marginBottom: 18 }}>
            <p style={{ fontSize: 11, color: '#888', lineHeight: 1.6, margin: 0 }}>
              🏢 <strong>Work tasks</strong> scheduled {start}–{end} weekdays<br />
              🌙 <strong>Business & personal</strong> tasks in evenings + weekends<br />
              ⚙️ You can change this anytime in account settings
            </p>
          </div>

          <button onClick={confirm} disabled={saving} style={{
            width: '100%', padding: '11px 0', borderRadius: 9,
            background: '#2d7a4f', color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saving…' : 'Build my schedule →'}
          </button>
        </div>
      </div>
    </div>
  )
}
