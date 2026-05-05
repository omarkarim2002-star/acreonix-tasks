'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2, Check } from 'lucide-react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr.buffer as ArrayBuffer
}

export function PushNotificationSetup() {
  const [status, setStatus] = useState<'idle' | 'subscribed' | 'denied' | 'loading' | 'unsupported'>('idle')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return
    }
    const perm = Notification.permission
    if (perm === 'granted') setStatus('subscribed')
    else if (perm === 'denied') setStatus('denied')
  }, [])

  async function subscribe() {
    if (!VAPID_PUBLIC_KEY) return
    setStatus('loading')
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        await saveSub(existing)
        setStatus('subscribed')
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      await saveSub(sub)
      setStatus('subscribed')
    } catch (e: any) {
      if (Notification.permission === 'denied') setStatus('denied')
      else setStatus('idle')
    }
  }

  async function unsubscribe() {
    setStatus('loading')
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      await sub?.unsubscribe()
      await fetch('/api/push/subscribe', { method: 'DELETE' })
      setStatus('idle')
    } catch { setStatus('idle') }
  }

  async function saveSub(sub: PushSubscription) {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    })
  }

  if (status === 'unsupported') return null

  const S = { fontFamily: 'DM Sans, sans-serif' }

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)', padding: '18px 20px', ...S }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Bell size={15} style={{ color: '#2d7a4f' }} />
        <p style={{ fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Notifications</p>
      </div>

      {status === 'subscribed' ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 500, color: '#1a1a1a', marginBottom: 2 }}>Notifications enabled</p>
            <p style={{ fontSize: 12, color: '#aaa' }}>You'll be nudged when tasks go overdue</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Check size={13} style={{ color: '#2d7a4f' }} />
              <span style={{ fontSize: 12, color: '#2d7a4f', fontWeight: 600 }}>On</span>
            </div>
            <button onClick={unsubscribe} style={{ fontSize: 11, color: '#ccc', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Turn off
            </button>
          </div>
        </div>
      ) : status === 'denied' ? (
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 3 }}>Notifications blocked</p>
          <p style={{ fontSize: 12, color: '#888', lineHeight: 1.55 }}>
            Enable them in your browser settings → Site permissions → Notifications → Allow for tasks.acreonix.co.uk
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 500, color: '#1a1a1a', marginBottom: 2 }}>Enable push notifications</p>
            <p style={{ fontSize: 12, color: '#aaa' }}>Get nudged when tasks go overdue or it's time to check in</p>
          </div>
          <button onClick={subscribe} disabled={status === 'loading'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: status === 'loading' ? '#e8e8e5' : '#2d7a4f', color: status === 'loading' ? '#aaa' : '#fff', border: 'none', cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>
            {status === 'loading' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Bell size={13} />}
            {status === 'loading' ? 'Enabling…' : 'Enable'}
          </button>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
