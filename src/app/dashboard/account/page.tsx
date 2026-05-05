'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Camera, Check, Loader2, ArrowLeft, User, Clock } from 'lucide-react'
import { PushNotificationSetup } from '@/components/ui/PushNotificationSetup'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_VALUES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i
  const label = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`
  return { value: `${String(h).padStart(2, '0')}:00`, label }
})

type Prefs = {
  work_start: string
  work_end: string
  work_days: string[]
  timezone: string
}

export default function AccountPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  // Profile state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [error, setError] = useState('')

  // Work hours state
  const [prefs, setPrefs] = useState<Prefs>({
    work_start: '09:00',
    work_end: '18:00',
    work_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsSaved, setPrefsSaved] = useState(false)

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '')
      setLastName(user.lastName ?? '')
    }
    // Load preferences
    fetch('/api/preferences')
      .then(r => r.json())
      .then(data => {
        if (data?.work_start) setPrefs(data)
      })
      .catch(() => {})
  }, [user])

  async function saveProfile() {
    if (!user) return
    setSaving(true); setError('')
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save')
    } finally { setSaving(false) }
  }

  async function savePrefs() {
    setPrefsSaving(true)
    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      setPrefsSaved(true)
      setTimeout(() => setPrefsSaved(false), 2500)
    } catch {}
    finally { setPrefsSaving(false) }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingPhoto(true)
    try { await user.setProfileImage({ file }) }
    catch (e: any) { setError(e.message ?? 'Failed to upload') }
    finally { setUploadingPhoto(false) }
  }

  function toggleDay(day: string) {
    setPrefs(prev => ({
      ...prev,
      work_days: prev.work_days.includes(day)
        ? prev.work_days.filter(d => d !== day)
        : [...prev.work_days, day],
    }))
  }

  if (!isLoaded) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 size={20} style={{ color: '#2d7a4f', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Your account'
  const S = { fontFamily: 'DM Sans, sans-serif' }

  return (
    <div style={{ padding: '28px 32px 60px', maxWidth: 540, margin: '0 auto', ...S }}>

      <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#888', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 28, padding: 0, fontFamily: 'DM Sans, sans-serif' }}>
        <ArrowLeft size={14} />Back
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.02em', marginBottom: 6 }}>Account</h1>
      <div style={{ width: 24, height: 2, background: '#c9a84c', borderRadius: 2, marginBottom: 28 }} />

      {/* ── Profile photo ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt={fullName} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(0,0,0,0.08)' }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0faf4', border: '2px solid #c6e6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={28} style={{ color: '#2d7a4f' }} />
            </div>
          )}
          <button onClick={() => fileRef.current?.click()} disabled={uploadingPhoto} style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: uploadingPhoto ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
            onMouseEnter={e => { if (!uploadingPhoto) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.35)' }}
            onMouseLeave={e => { if (!uploadingPhoto) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)' }}>
            {uploadingPhoto ? <Loader2 size={16} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} /> : <Camera size={16} style={{ color: '#fff', opacity: 0 }} />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{fullName}</p>
          <p style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{email}</p>
          <button onClick={() => fileRef.current?.click()} style={{ fontSize: 12, color: '#2d7a4f', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 6, fontFamily: 'DM Sans, sans-serif' }}>Change photo</button>
        </div>
      </div>

      {/* ── Name fields ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)', padding: '20px', marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Profile</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {[{ label: 'First name', val: firstName, set: setFirstName }, { label: 'Last name', val: lastName, set: setLastName }].map(({ label, val, set }) => (
            <div key={label}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
              <input value={val} onChange={e => set(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveProfile()} placeholder={label}
                style={{ width: '100%', padding: '9px 11px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 14, color: '#1a1a1a', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
                onFocus={e => (e.target as HTMLElement).style.borderColor = 'rgba(45,122,79,0.4)'}
                onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(0,0,0,0.12)'} />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email address</label>
          <div style={{ padding: '9px 11px', borderRadius: 8, fontSize: 14, color: '#bbb', background: '#f9f9f7', border: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{email}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cannot change</span>
          </div>
        </div>
        {error && <p style={{ fontSize: 12, color: '#b91c1c', marginBottom: 10 }}>{error}</p>}
        <button onClick={saveProfile} disabled={saving || !firstName.trim()} style={{ width: '100%', padding: '10px 0', borderRadius: 9, background: saved ? '#16a34a' : (saving || !firstName.trim()) ? '#e8e8e5' : '#2d7a4f', color: (saving || !firstName.trim()) ? '#aaa' : '#fff', border: 'none', cursor: (saving || !firstName.trim()) ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'background 0.2s' }}>
          {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Saving…</> : saved ? <><Check size={14} />Saved!</> : 'Save changes'}
        </button>
      </div>

      {/* ── Work hours ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)', padding: '20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Clock size={15} style={{ color: '#2d7a4f' }} />
          <p style={{ fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Work hours</p>
        </div>
        <p style={{ fontSize: 12.5, color: '#888', marginBottom: 16, lineHeight: 1.55 }}>
          AI scheduling uses these to place tasks only in your working hours.
        </p>

        {/* Work days */}
        <label style={{ fontSize: 11, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Work days</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          {DAYS.map((day, i) => {
            const val = DAY_VALUES[i]
            const active = prefs.work_days.includes(val)
            return (
              <button key={day} onClick={() => toggleDay(val)} style={{
                width: 40, height: 36, borderRadius: 8, border: `1px solid ${active ? 'rgba(45,122,79,0.4)' : 'rgba(0,0,0,0.1)'}`,
                background: active ? '#f0faf4' : '#fff', color: active ? '#1f5537' : '#888',
                fontSize: 11.5, fontWeight: active ? 600 : 400, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', transition: 'all 0.12s',
              }}>{day}</button>
            )
          })}
        </div>

        {/* Start / End time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[{ label: 'Start time', key: 'work_start' as const }, { label: 'End time', key: 'work_end' as const }].map(({ label, key }) => (
            <div key={key}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
              <select value={prefs[key]} onChange={e => setPrefs(prev => ({ ...prev, [key]: e.target.value }))}
                style={{ width: '100%', padding: '9px 11px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 14, color: '#1a1a1a', outline: 'none', fontFamily: 'DM Sans, sans-serif', background: '#fff', cursor: 'pointer', appearance: 'none' as const }}>
                {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* Timezone (read-only, auto-detected) */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Timezone</label>
          <div style={{ padding: '9px 11px', borderRadius: 8, fontSize: 13, color: '#888', background: '#f9f9f7', border: '1px solid rgba(0,0,0,0.07)' }}>
            {prefs.timezone}
          </div>
        </div>

        <button onClick={savePrefs} disabled={prefsSaving} style={{ width: '100%', padding: '10px 0', borderRadius: 9, background: prefsSaved ? '#16a34a' : prefsSaving ? '#e8e8e5' : '#2d7a4f', color: prefsSaving ? '#aaa' : '#fff', border: 'none', cursor: prefsSaving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'background 0.2s' }}>
          {prefsSaving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Saving…</> : prefsSaved ? <><Check size={14} />Saved!</> : 'Save work hours'}
        </button>
      </div>

      {/* Push notifications */}
      <div style={{ marginBottom: 16 }}>
        <PushNotificationSetup />
      </div>

      {/* Danger zone */}
      <div style={{ padding: '18px', borderRadius: 10, border: '1px solid rgba(220,38,38,0.15)', background: '#fff5f5' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#b91c1c', marginBottom: 4 }}>Danger zone</p>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 0 }}>To delete your account or change your email, contact <a href="mailto:support@acreonix.co.uk" style={{ color: '#2d7a4f' }}>support@acreonix.co.uk</a></p>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
