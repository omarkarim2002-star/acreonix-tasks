'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Camera, Check, Loader2, ArrowLeft, User } from 'lucide-react'

export default function AccountPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '')
      setLastName(user.lastName ?? '')
    }
  }, [user])

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingPhoto(true)
    setError('')
    try {
      await user.setProfileImage({ file })
    } catch (e: any) {
      setError(e.message ?? 'Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  if (!isLoaded) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 size={20} style={{ color: '#2d7a4f', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const S = { fontFamily: 'DM Sans, sans-serif' }
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Your account'

  return (
    <div style={{ padding: '32px 32px 60px', maxWidth: 520, margin: '0 auto', ...S }}>

      {/* Back */}
      <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#888', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 28, padding: 0, fontFamily: 'DM Sans, sans-serif' }}>
        <ArrowLeft size={14} />Back
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.02em', marginBottom: 6 }}>Account</h1>
      <div style={{ width: 24, height: 2, background: '#c9a84c', borderRadius: 2, marginBottom: 28 }} />

      {/* Profile photo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 32 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={fullName}
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(0,0,0,0.08)' }}
            />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0faf4', border: '2px solid #c6e6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={28} style={{ color: '#2d7a4f' }} />
            </div>
          )}

          {/* Upload overlay */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingPhoto}
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: uploadingPhoto ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!uploadingPhoto) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.35)' }}
            onMouseLeave={e => { if (!uploadingPhoto) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)' }}
          >
            {uploadingPhoto
              ? <Loader2 size={16} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
              : <Camera size={16} style={{ color: '#fff', opacity: 0 }} className="photo-icon" />
            }
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
        </div>

        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{fullName}</p>
          <p style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{email}</p>
          <button
            onClick={() => fileRef.current?.click()}
            style={{ fontSize: 12, color: '#2d7a4f', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 6, fontFamily: 'DM Sans, sans-serif' }}
          >
            Change photo
          </button>
        </div>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>First name</label>
            <input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveProfile()}
              placeholder="First name"
              style={{
                width: '100%', padding: '9px 12px', border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: 8, fontSize: 14, color: '#1a1a1a', outline: 'none',
                fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
                transition: 'border-color 0.12s',
              }}
              onFocus={e => (e.target as HTMLElement).style.borderColor = 'rgba(45,122,79,0.4)'}
              onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(0,0,0,0.12)'}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last name</label>
            <input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveProfile()}
              placeholder="Last name"
              style={{
                width: '100%', padding: '9px 12px', border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: 8, fontSize: 14, color: '#1a1a1a', outline: 'none',
                fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
                transition: 'border-color 0.12s',
              }}
              onFocus={e => (e.target as HTMLElement).style.borderColor = 'rgba(45,122,79,0.4)'}
              onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(0,0,0,0.12)'}
            />
          </div>
        </div>

        {/* Email — read only, never changeable */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email address</label>
          <div style={{
            padding: '9px 12px', borderRadius: 8, fontSize: 14, color: '#bbb',
            background: '#f9f9f7', border: '1px solid rgba(0,0,0,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>{email}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cannot change</span>
          </div>
          <p style={{ fontSize: 11, color: '#ccc', marginTop: 4 }}>Email is set by your sign-in method and cannot be changed here.</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fff5f5', border: '1px solid #fecaca', marginBottom: 14 }}>
          <p style={{ fontSize: 13, color: '#b91c1c', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={saveProfile}
        disabled={saving || (!firstName.trim())}
        style={{
          width: '100%', padding: '11px 0', borderRadius: 9,
          background: saved ? '#16a34a' : (saving || !firstName.trim()) ? '#e8e8e5' : '#2d7a4f',
          color: (saving || !firstName.trim()) ? '#aaa' : '#fff',
          border: 'none', cursor: (saving || !firstName.trim()) ? 'not-allowed' : 'pointer',
          fontSize: 14, fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          transition: 'background 0.2s',
        }}
      >
        {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Saving…</>
          : saved ? <><Check size={14} />Saved!</>
          : 'Save changes'}
      </button>

      {/* Danger zone */}
      <div style={{ marginTop: 44, padding: '18px', borderRadius: 10, border: '1px solid rgba(220,38,38,0.15)', background: '#fff5f5' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#b91c1c', marginBottom: 4 }}>Danger zone</p>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>To delete your account or change your email, contact us at <a href="mailto:support@acreonix.co.uk" style={{ color: '#2d7a4f' }}>support@acreonix.co.uk</a></p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        button:hover .photo-icon { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
