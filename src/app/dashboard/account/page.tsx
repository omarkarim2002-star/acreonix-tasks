'use client'

import { useState, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Clock, Coffee, CreditCard, LogOut, Save, ChevronRight } from 'lucide-react'

const HOURS = Array.from({length:16}, (_,i) => {
  const h = i + 7
  return { value:`${h}:00`, label: h < 12 ? `${h}:00 am` : h === 12 ? '12:00 pm' : `${h-12}:00 pm` }
})

const BREAK_OPTS = [
  { value:'none', label:'No break' },
  { value:'30',   label:'30 minutes' },
  { value:'60',   label:'1 hour' },
  { value:'90',   label:'90 minutes' },
]

export default function AccountPage() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()

  const [workStart,  setWorkStart]  = useState('09:00')
  const [workEnd,    setWorkEnd]    = useState('18:00')
  const [breakTime,  setBreakTime]  = useState('60')
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)

  useEffect(() => {
    // Load saved prefs from API
    fetch('/api/prefs').then(r => r.ok ? r.json() : null).then(data => {
      if (!data) return
      if (data.work_start) setWorkStart(data.work_start)
      if (data.work_end)   setWorkEnd(data.work_end)
      if (data.break_mins) setBreakTime(String(data.break_mins))
    }).catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    try {
      await fetch('/api/prefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_start: workStart, work_end: workEnd, break_mins: parseInt(breakTime) || 0 }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    finally { setSaving(false) }
  }

  const initials = [user?.firstName, user?.lastName].filter(Boolean).map(n => n![0].toUpperCase()).join('') || '?'
  const fullName  = [user?.firstName, user?.lastName].filter(Boolean).join(' ')

  return (
    <div className="px-8 py-8 max-w-2xl mx-auto">
      <h1 className="text-4xl font-black tracking-tight mb-8" style={{ color:'#101312', letterSpacing:'-0.5px' }}>Account</h1>

      {/* Profile card */}
      <div className="rounded-2xl p-6 mb-6 flex items-center gap-4" style={{ background:'#fff', boxShadow:'0 2px 8px rgba(16,19,18,0.06)' }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white shrink-0" style={{ background:'#0D3D2E' }}>
          {initials}
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold" style={{ color:'#101312' }}>{fullName || 'Your account'}</p>
          <p className="text-sm" style={{ color:'#9BA5A0' }}>{user?.primaryEmailAddress?.emailAddress}</p>
        </div>
      </div>

      {/* Work hours */}
      <div className="rounded-2xl p-6 mb-6" style={{ background:'#fff', boxShadow:'0 2px 8px rgba(16,19,18,0.06)' }}>
        <div className="flex items-center gap-2 mb-5">
          <Clock size={16} style={{ color:'#0D3D2E' }} />
          <h2 className="font-bold" style={{ color:'#101312' }}>Work hours</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color:'#9BA5A0', letterSpacing:'0.8px' }}>START TIME</label>
            <select
              value={workStart}
              onChange={e => setWorkStart(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
              style={{ background:'#F7F8F5', color:'#101312', border:'1px solid #EEEEE8' }}
            >
              {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color:'#9BA5A0', letterSpacing:'0.8px' }}>END TIME</label>
            <select
              value={workEnd}
              onChange={e => setWorkEnd(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
              style={{ background:'#F7F8F5', color:'#101312', border:'1px solid #EEEEE8' }}
            >
              {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color:'#9BA5A0', letterSpacing:'0.8px' }}>
            <Coffee size={11} className="inline mr-1" />LUNCH BREAK
          </label>
          <div className="flex gap-2">
            {BREAK_OPTS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setBreakTime(opt.value)}
                className="flex-1 text-xs py-2 rounded-xl transition-all font-medium"
                style={{
                  background: breakTime === opt.value ? '#0D3D2E' : '#F7F8F5',
                  color:      breakTime === opt.value ? '#fff' : '#66706B',
                  border:     '1px solid',
                  borderColor: breakTime === opt.value ? '#0D3D2E' : '#EEEEE8',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
          style={{ background:'#0D3D2E', color:'#fff', opacity: saving ? 0.7 : 1 }}
        >
          <Save size={14} />
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save preferences'}
        </button>
      </div>

      {/* Billing */}
      <div className="rounded-2xl overflow-hidden mb-6" style={{ background:'#fff', boxShadow:'0 2px 8px rgba(16,19,18,0.06)' }}>
        <a href="/dashboard/billing"
          className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors"
          style={{ borderBottom:'1px solid #F7F8F5' }}
        >
          <CreditCard size={16} style={{ color:'#0D3D2E' }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color:'#101312' }}>Plan & billing</p>
            <p className="text-xs" style={{ color:'#9BA5A0' }}>Manage your subscription</p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:'#EAF4EF', color:'#0D3D2E' }}>FREE</span>
          <ChevronRight size={14} style={{ color:'#C8D0CC' }} />
        </a>

        <button
          onClick={() => signOut(() => router.push('/'))}
          className="flex items-center gap-3 px-6 py-4 w-full hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} style={{ color:'#DC2626' }} />
          <span className="text-sm font-medium" style={{ color:'#DC2626' }}>Sign out</span>
        </button>
      </div>
    </div>
  )
}
