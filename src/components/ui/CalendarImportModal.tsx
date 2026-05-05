'use client'

import { useState, useRef } from 'react'
import {
  X, Upload, Link2, Check, Loader2,
  Calendar, AlertCircle, Info, ExternalLink, ChevronRight,
} from 'lucide-react'

type Tab = 'google' | 'microsoft' | 'file' | 'url'

type ImportResult = {
  imported: number
  skipped: number
  total: number
  message: string
  summary: { title: string; start: string; allDay?: boolean }[]
}

type Props = {
  onClose: () => void
  onImported: () => void
}

export function CalendarImportModal({ onClose, onImported }: Props) {
  const [tab, setTab] = useState<Tab>('google')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [daysAhead, setDaysAhead] = useState(14)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImport() {
    setLoading(true); setError(''); setResult(null)
    const fd = new FormData()
    fd.append('daysAhead', String(daysAhead))
    if (tab === 'file' && file) { fd.append('file', file) }
    else if ((tab === 'url' || tab === 'google' || tab === 'microsoft') && url.trim()) { fd.append('url', url.trim()) }
    else {
      setError('Please provide a calendar URL or file')
      setLoading(false); return
    }
    try {
      const res = await fetch('/api/calendar-import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Import failed'); return }
      setResult(data)
    } catch { setError('Network error — please try again') }
    finally { setLoading(false) }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'google', label: 'Google', icon: '🔵' },
    { id: 'microsoft', label: 'Outlook', icon: '🟦' },
    { id: 'file', label: 'Upload .ics', icon: '📎' },
    { id: 'url', label: 'Subscribe URL', icon: '🔗' },
  ]

  const canImport = (tab === 'file' && !!file) || ((tab === 'url' || tab === 'google' || tab === 'microsoft') && !!url.trim())

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'DM Sans, sans-serif', animation: 'fadeIn 0.2s ease' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 500, boxShadow: '0 24px 80px rgba(0,0,0,0.2)', animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={18} style={{ color: '#2d7a4f' }} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Import calendar</h2>
                <p style={{ fontSize: 12, color: '#aaa', margin: '2px 0 0' }}>AI schedules around your existing events</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc' }}><X size={18} /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {!result ? (
            <>
              {/* Info */}
              <div style={{ background: '#f0faf4', border: '1px solid rgba(45,122,79,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 18, display: 'flex', gap: 9 }}>
                <Info size={14} style={{ color: '#2d7a4f', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: '#1f5537', lineHeight: 1.55, margin: 0 }}>
                  Imported events show as fixed blocks. AI scheduling automatically works around them.
                </p>
              </div>

              {/* Tab selector */}
              <div style={{ display: 'flex', gap: 4, background: '#f3f3f1', borderRadius: 10, padding: 3, marginBottom: 20 }}>
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 11.5, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', background: tab === t.id ? '#fff' : 'transparent', color: tab === t.id ? '#1a1a1a' : '#888', boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.12s' }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* Google Calendar tab */}
              {tab === 'google' && (
                <div>
                  <div style={{ background: '#f8fbff', border: '1px solid #dbeafe', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 10 }}>Get your Google Calendar iCal URL</p>
                    {[
                      { n: 1, text: 'Open Google Calendar on desktop' },
                      { n: 2, text: 'Click ⚙️ Settings → choose your calendar on the left' },
                      { n: 3, text: 'Scroll to "Integrate calendar"' },
                      { n: 4, text: 'Copy the "Secret address in iCal format" link' },
                      { n: 5, text: 'Paste it below' },
                    ].map(s => (
                      <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 7 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.n}</div>
                        <span style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.5 }}>{s.text}</span>
                      </div>
                    ))}
                    <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#2563eb', fontWeight: 600, textDecoration: 'none', marginTop: 4 }}>
                      Open Google Calendar Settings <ExternalLink size={11} />
                    </a>
                  </div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#aaa', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Paste your iCal URL</label>
                  <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://calendar.google.com/calendar/ical/..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.12)', fontSize: 13, color: '#1a1a1a', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' as const }} />
                  <p style={{ fontSize: 11, color: '#bbb', marginTop: 5 }}>This is a private URL — only you can see it. Replace <code style={{ background: '#f3f3f1', padding: '1px 4px', borderRadius: 3 }}>webcal://</code> with <code style={{ background: '#f3f3f1', padding: '1px 4px', borderRadius: 3 }}>https://</code> if needed.</p>
                </div>
              )}

              {/* Microsoft Outlook tab */}
              {tab === 'microsoft' && (
                <div>
                  <div style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#3730a3', marginBottom: 10 }}>Get your Outlook Calendar iCal URL</p>
                    {[
                      { n: 1, text: 'Open Outlook.com in a browser' },
                      { n: 2, text: 'Click ⚙️ Settings → View all Outlook settings' },
                      { n: 3, text: 'Go to Calendar → Shared calendars' },
                      { n: 4, text: 'Under "Publish a calendar", choose your calendar → Can view all details → Publish' },
                      { n: 5, text: 'Copy the ICS link and paste below' },
                    ].map(s => (
                      <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 7 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#4f46e5', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.n}</div>
                        <span style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.5 }}>{s.text}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                      <a href="https://outlook.live.com/calendar/0/options/calendar/SharedCalendars" target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
                        Outlook.com settings <ExternalLink size={11} />
                      </a>
                      <a href="https://outlook.office.com/calendar/0/options/calendar/SharedCalendars" target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
                        Office 365 settings <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, padding: '10px 13px', marginBottom: 14, display: 'flex', gap: 8 }}>
                    <AlertCircle size={13} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                      <strong>Microsoft 365 work accounts:</strong> Your IT admin may need to allow calendar sharing. If blocked, ask them to enable "Allow calendar sharing" in the Microsoft 365 admin centre.
                    </p>
                  </div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#aaa', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Paste your ICS URL</label>
                  <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://outlook.live.com/owa/calendar/..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.12)', fontSize: 13, color: '#1a1a1a', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
              )}

              {/* File upload tab */}
              {tab === 'file' && (
                <>
                  <div onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${file ? 'rgba(45,122,79,0.4)' : 'rgba(0,0,0,0.12)'}`, borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: file ? 'rgba(45,122,79,0.03)' : '#fafaf8', transition: 'all 0.15s', marginBottom: 14 }}>
                    {file ? (
                      <><Check size={24} style={{ color: '#2d7a4f', margin: '0 auto 8px' }} /><p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a1a', marginBottom: 3 }}>{file.name}</p><p style={{ fontSize: 12, color: '#aaa' }}>{(file.size / 1024).toFixed(1)} KB · Click to change</p></>
                    ) : (
                      <><Upload size={24} style={{ color: '#ccc', margin: '0 auto 8px' }} /><p style={{ fontSize: 13.5, fontWeight: 500, color: '#888', marginBottom: 4 }}>Drop your .ics file here</p><p style={{ fontSize: 12, color: '#bbb' }}>or click to browse</p></>
                    )}
                    <input ref={fileRef} type="file" accept=".ics,text/calendar" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
                  </div>
                  <div style={{ background: '#f9f9f7', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>How to export</p>
                    {[
                      { name: 'Google Calendar', steps: 'Settings → Import & export → Export' },
                      { name: 'Apple Calendar', steps: 'File → Export → Export as .ics' },
                      { name: 'Outlook', steps: 'File → Save Calendar → Save as iCal' },
                    ].map(({ name, steps }) => (
                      <div key={name} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#555', minWidth: 110, flexShrink: 0 }}>{name}</span>
                        <span style={{ fontSize: 11, color: '#aaa' }}>{steps}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* URL tab */}
              {tab === 'url' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#aaa', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>iCal / WebCal subscribe URL</label>
                  <input value={url} onChange={e => setUrl(e.target.value)} placeholder="webcal:// or https://..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.12)', fontSize: 13, color: '#1a1a1a', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' as const }} />
                  <p style={{ fontSize: 11, color: '#bbb', marginTop: 5 }}>Works with any calendar that provides an iCal subscription link.</p>
                </div>
              )}

              {/* Days ahead */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#aaa', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Import events for the next</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[7, 14, 30, 60].map(d => (
                    <button key={d} onClick={() => setDaysAhead(d)} style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, border: `1px solid ${daysAhead === d ? 'rgba(45,122,79,0.4)' : 'rgba(0,0,0,0.1)'}`, background: daysAhead === d ? '#f0faf4' : '#fff', color: daysAhead === d ? '#2d7a4f' : '#666', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      {d === 7 ? '1 week' : d === 14 ? '2 weeks' : d === 30 ? '1 month' : '2 months'}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div style={{ display: 'flex', gap: 9, background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 9, padding: '10px 13px', marginBottom: 14 }}>
                  <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <p style={{ fontSize: 12.5, color: '#b91c1c', margin: 0 }}>{error}</p>
                </div>
              )}
            </>
          ) : (
            <div>
              <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Check size={24} style={{ color: '#2d7a4f' }} />
                </div>
                <p style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>{result.imported} event{result.imported !== 1 ? 's' : ''} imported</p>
                <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>{result.message}</p>
              </div>
              {result.summary.length > 0 && (
                <div style={{ background: '#f9f9f7', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Imported events</p>
                  {result.summary.slice(0, 8).map((ev, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12.5, color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
                      <span style={{ fontSize: 11, color: '#bbb', flexShrink: 0 }}>{fmtDate(ev.start)}</span>
                    </div>
                  ))}
                  {result.summary.length > 8 && <p style={{ fontSize: 11, color: '#ccc', textAlign: 'center', margin: 0 }}>+{result.summary.length - 8} more</p>}
                </div>
              )}
              <div style={{ background: 'linear-gradient(135deg,#f0faf4,#f9fdf9)', border: '1px solid #c6e6d4', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 12.5, color: '#1f5537', lineHeight: 1.6, margin: 0 }}>
                  ✓ AI scheduling now knows about these events and will plan around them automatically.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 18px', borderTop: '1px solid rgba(0,0,0,0.06)', flexShrink: 0, display: 'flex', gap: 10 }}>
          {!result ? (
            <>
              <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 9, fontSize: 13, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', color: '#666', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
              <button onClick={handleImport} disabled={loading || !canImport} style={{ flex: 1, padding: '10px 0', borderRadius: 9, fontSize: 13.5, fontWeight: 600, background: loading || !canImport ? '#e8e8e5' : '#2d7a4f', color: loading || !canImport ? '#aaa' : '#fff', border: 'none', cursor: loading || !canImport ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Importing…</> : <><Calendar size={14} />Import events</>}
              </button>
            </>
          ) : (
            <button onClick={() => { onImported(); onClose() }} style={{ flex: 1, padding: '10px 0', borderRadius: 9, fontSize: 13.5, fontWeight: 600, background: '#2d7a4f', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              View calendar →
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}
