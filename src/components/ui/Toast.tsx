'use client'
import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'
type Toast = { id: string; message: string; type: ToastType }

type ToastCtx = { toast: (message: string, type?: ToastType) => void }
const Ctx = createContext<ToastCtx>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info }
  const COLOURS = {
    success: { bg: '#e8f4ee', border: '#a8d5bc', icon: '#2d7a4f', text: '#1f5537' },
    error:   { bg: '#fef2f2', border: '#fca5a5', icon: '#dc2626', text: '#991b1b' },
    info:    { bg: '#faf5e8', border: '#e8d5a0', icon: '#c9a84c', text: '#9e7e33' },
  }

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => {
          const Icon = ICONS[t.type]
          const c = COLOURS[t.type]
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 12, padding: '10px 14px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              pointerEvents: 'auto', maxWidth: 320,
              animation: 'toastIn 0.2s ease forwards',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              <Icon size={15} style={{ color: c.icon, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: c.text, flex: 1, lineHeight: 1.4 }}>{t.message}</span>
              <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.icon, padding: 2, display: 'flex' }}>
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
