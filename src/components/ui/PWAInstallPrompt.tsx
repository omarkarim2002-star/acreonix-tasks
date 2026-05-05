'use client'

import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

export function PWAInstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Don't show if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Don't show if dismissed
    try { if (localStorage.getItem('pwa_dismissed')) return } catch {}

    const isIOSDevice = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
    if (isIOSDevice) {
      setIsIOS(true)
      setTimeout(() => setShow(true), 30000) // 30s delay on iOS
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e)
      setTimeout(() => setShow(true), 30000) // 30s delay
    }
    window.addEventListener('beforeinstallprompt', handler as any)
    return () => window.removeEventListener('beforeinstallprompt', handler as any)
  }, [])

  function dismiss() {
    setShow(false)
    try { localStorage.setItem('pwa_dismissed', '1') } catch {}
  }

  async function install() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 200,
      background: '#fff', borderRadius: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
      padding: '16px 18px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      animation: 'slideUpPrompt 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      fontFamily: 'DM Sans, sans-serif',
      maxWidth: 400, margin: '0 auto',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#2d7a4f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Download size={18} color="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a1a', marginBottom: 3 }}>Install Acreonix Tasks</p>
        {isIOS ? (
          <p style={{ fontSize: 12, color: '#888', lineHeight: 1.5, marginBottom: 10 }}>
            Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> for the full app experience
          </p>
        ) : (
          <p style={{ fontSize: 12, color: '#888', lineHeight: 1.5, marginBottom: 10 }}>
            Add to your home screen for faster access — works offline too
          </p>
        )}
        {!isIOS && (
          <button onClick={install} style={{ padding: '7px 16px', borderRadius: 8, background: '#2d7a4f', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
            Install app
          </button>
        )}
      </div>
      <button onClick={dismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 2, flexShrink: 0 }}>
        <X size={16} />
      </button>
      <style>{`@keyframes slideUpPrompt{from{transform:translateY(100%);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  )
}
