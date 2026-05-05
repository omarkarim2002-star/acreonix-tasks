'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles, Loader2, CheckCircle2, AlertCircle,
  Plus, Trash2, RefreshCw, Zap, Mic, Square,
} from 'lucide-react'
import Link from 'next/link'

type ExtractedTask = {
  title: string
  description?: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedMinutes?: number | null
  deadline?: string | null
  tags: string[]
  suggestedProject: string
}
type Preview = { tasks: ExtractedTask[]; projects: string[]; summary: string }
type VoiceState = 'idle' | 'requesting' | 'recording' | 'processing' | 'error'

const PS: Record<string, { bg: string; color: string }> = {
  urgent: { bg: '#fff0f0', color: '#b91c1c' },
  high:   { bg: '#fff4ee', color: '#c2410c' },
  medium: { bg: '#eff6ff', color: '#1d4ed8' },
  low:    { bg: '#f3f3f1', color: '#666' },
}

export default function ExtractPage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [existingProjects, setExistingProjects] = useState<string[]>([])
  const [extractsRemaining, setExtractsRemaining] = useState<number | null>(null)

  // Voice state
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [voiceError, setVoiceError] = useState('')
  const [transcript, setTranscript] = useState('')
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [amplitude, setAmplitude] = useState(0)

  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const speechSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setExistingProjects(data.map((p: any) => p.name ?? '').filter(Boolean))
    }).catch(() => {})
    return () => stopRecording()
  }, [])

  const animateAmplitude = useCallback(() => {
    if (!analyserRef.current) return
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(data)
    setAmplitude(Math.min(data.reduce((a, b) => a + b, 0) / data.length / 80, 1))
    animFrameRef.current = requestAnimationFrame(animateAmplitude)
  }, [])

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    analyserRef.current = null
    setRecordingSeconds(0); setAmplitude(0)
  }

  async function startVoice() {
    setVoiceError(''); setTranscript(''); setVoiceState('requesting')
    if (!speechSupported) { setVoiceError('Voice requires Chrome or Edge.'); setVoiceState('error'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser(); analyser.fftSize = 256
      source.connect(analyser); analyserRef.current = analyser

      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SR()
      recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-GB'
      recognitionRef.current = recognition
      let final = ''

      recognition.onresult = (e: any) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript
          if (e.results[i].isFinal) final += t + ' '
          else interim = t
        }
        setTranscript(final + interim)
      }
      recognition.onerror = (e: any) => {
        if (e.error !== 'aborted') { setVoiceError(`Mic error: ${e.error}`); setVoiceState('error'); stopRecording(); recognitionRef.current = null }
      }
      recognition.onend = () => {
        stopRecording(); recognitionRef.current = null
        if (final.trim()) {
          setText(prev => prev.trim() ? prev.trim() + '\n\n' + final.trim() : final.trim())
          setVoiceState('processing')
          setTimeout(() => setVoiceState('idle'), 800)
        } else { setVoiceState('idle') }
      }
      recognition.start()
      setVoiceState('recording')
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
      animateAmplitude()
    } catch (e: any) {
      setVoiceError(e.name === 'NotAllowedError' ? 'Microphone access denied.' : 'Could not access microphone.')
      setVoiceState('error')
    }
  }

  function stopVoice() {
    if (recognitionRef.current) { try { recognitionRef.current.stop() } catch {} }
    else { stopRecording(); setVoiceState('idle') }
  }

  async function handleExtract() {
    if (!text.trim()) return
    setLoading(true); setError(''); setPreview(null)
    try {
      const res = await fetch('/api/extract-tasks/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? data.error ?? 'Something went wrong'); return }
      setPreview({
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
        projects: Array.isArray(data.projects) ? data.projects : [],
        summary: data.summary ?? '',
      })
      if (typeof data.extractsRemaining === 'number') setExtractsRemaining(data.extractsRemaining)
    } catch { setError('Network error — please try again') }
    finally { setLoading(false) }
  }

  async function handleConfirm() {
    if (!preview || preview.tasks.length === 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/extract-tasks/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: preview.tasks, originalText: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setSaved(true)
      setTimeout(() => router.push('/dashboard/tasks'), 1400)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  function updateTask(idx: number, field: string, value: unknown) {
    if (!preview) return
    const updated = [...preview.tasks]
    updated[idx] = { ...updated[idx], [field]: value }
    setPreview({ ...preview, tasks: updated })
  }
  function removeTask(idx: number) {
    if (!preview) return
    setPreview({ ...preview, tasks: preview.tasks.filter((_, i) => i !== idx) })
  }

  const allProjects = [...new Set([...existingProjects, ...(preview?.projects ?? [])])]
  const isRecording = voiceState === 'recording'
  const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (saved) return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'50vh',gap:12,fontFamily:'DM Sans,sans-serif' }}>
      <div style={{ width:52,height:52,borderRadius:'50%',background:'#f0faf4',display:'flex',alignItems:'center',justifyContent:'center' }}>
        <CheckCircle2 size={26} style={{ color:'#2d7a4f' }} />
      </div>
      <h2 style={{ fontSize:17,fontWeight:600,color:'#1a1a1a' }}>Tasks saved!</h2>
      <p style={{ fontSize:13,color:'#aaa' }}>Redirecting to your task list…</p>
    </div>
  )

  return (
    <div style={{ padding:'28px 32px 60px',maxWidth:720,margin:'0 auto',fontFamily:'DM Sans,sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:6 }}>
          <div style={{ width:34,height:34,borderRadius:9,background:'#2d7a4f',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Sparkles size={16} color="#fff" />
          </div>
          <h1 style={{ fontSize:22,fontWeight:600,color:'#1a1a1a',letterSpacing:'-0.02em' }}>AI Extract</h1>
        </div>
        <p style={{ fontSize:13,color:'#888',marginLeft:44,lineHeight:1.6 }}>
          Type or speak your brain dump. AI extracts tasks — you review and confirm before anything saves.
        </p>
        {extractsRemaining !== null && (
          <div style={{ display:'inline-flex',alignItems:'center',gap:5,marginTop:8,marginLeft:44,background:'#fdf8ee',border:'1px solid #e8d5a0',borderRadius:6,padding:'3px 9px' }}>
            <Zap size={11} style={{ color:'#c9a84c' }} />
            <span style={{ fontSize:11,color:'#7a5e1a',fontWeight:500 }}>{extractsRemaining} extract{extractsRemaining!==1?'s':''} remaining</span>
          </div>
        )}
      </div>

      {/* Voice + text input — only show before preview */}
      {!preview && (
        <>
          {/* Voice recorder */}
          <div style={{
            background: isRecording ? 'rgba(239,68,68,0.03)' : voiceState==='processing' ? 'rgba(45,122,79,0.04)' : '#fff',
            border: `1px solid ${isRecording ? 'rgba(239,68,68,0.2)' : voiceState==='processing' ? 'rgba(45,122,79,0.2)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius:12, padding:'12px 16px', marginBottom:10,
            display:'flex', alignItems:'center', gap:12, transition:'all 0.2s',
          }}>
            <button
              onClick={isRecording ? stopVoice : startVoice}
              disabled={voiceState==='requesting'||voiceState==='processing'||!speechSupported}
              style={{
                width:44,height:44,borderRadius:'50%',flexShrink:0,border:'none',
                cursor:(voiceState==='requesting'||voiceState==='processing'||!speechSupported)?'not-allowed':'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',
                background:isRecording?'#ef4444':(voiceState==='requesting'||voiceState==='processing')?'#f0f0ee':'#2d7a4f',
                boxShadow:isRecording?`0 0 0 ${4+amplitude*12}px rgba(239,68,68,${0.12+amplitude*0.1})`:'0 2px 8px rgba(45,122,79,0.2)',
                transform:`scale(${isRecording?1+amplitude*0.06:1})`,transition:'background 0.15s,box-shadow 0.08s',
              }}
            >
              {voiceState==='requesting'||voiceState==='processing'
                ? <Loader2 size={18} color="#aaa" style={{ animation:'spin 1s linear infinite' }} />
                : isRecording ? <Square size={16} color="#fff" fill="#fff" /> : <Mic size={18} color="#fff" />}
            </button>
            <div style={{ flex:1,minWidth:0 }}>
              {voiceState==='idle' && <p style={{ fontSize:13,fontWeight:500,color:'#1a1a1a',margin:0 }}>{speechSupported?'Speak your brain dump':'Voice requires Chrome or Edge'}</p>}
              {voiceState==='idle' && <p style={{ fontSize:11,color:'#bbb',margin:'2px 0 0' }}>{speechSupported?'Tap mic → speak → tap stop → extract':'Type your tasks below instead'}</p>}
              {voiceState==='requesting' && <p style={{ fontSize:13,color:'#888',margin:0 }}>Requesting mic…</p>}
              {isRecording && (
                <>
                  <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:2 }}>
                    <div style={{ width:6,height:6,borderRadius:'50%',background:'#ef4444',animation:'pulseRed 1s infinite' }} />
                    <p style={{ fontSize:12.5,fontWeight:600,color:'#ef4444',margin:0 }}>Recording {fmtSecs(recordingSeconds)}</p>
                  </div>
                  <p style={{ fontSize:11.5,color:'#888',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                    {transcript ? `"${transcript.slice(-80)}"` : 'Listening…'}
                  </p>
                </>
              )}
              {voiceState==='processing' && <p style={{ fontSize:13,fontWeight:500,color:'#2d7a4f',margin:0 }}>✓ Transcript added — tap Extract tasks</p>}
              {voiceState==='error' && <p style={{ fontSize:12,color:'#ef4444',margin:0 }}>{voiceError}</p>}
            </div>
            {isRecording && (
              <div style={{ display:'flex',alignItems:'center',gap:2,flexShrink:0 }}>
                {[0.15,0.4,0.65,0.4,0.15].map((t,i) => (
                  <div key={i} style={{ width:3,borderRadius:2,height:`${6+(amplitude>t?16:4)}px`,background:amplitude>t?'#ef4444':'#f0f0ee',transition:'height 0.07s' }} />
                ))}
              </div>
            )}
            {isRecording && (
              <button onClick={stopVoice} style={{ fontSize:11.5,fontWeight:600,color:'#ef4444',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:6,padding:'5px 11px',cursor:'pointer',fontFamily:'DM Sans,sans-serif',flexShrink:0 }}>
                Stop
              </button>
            )}
          </div>

          {/* Text area */}
          <div style={{ background:'#fff',borderRadius:12,border:'1px solid rgba(0,0,0,0.09)',overflow:'hidden',marginBottom:14 }}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Type or use mic above — e.g. 'Need to finish the client proposal by Friday, fix the login bug, book a call with James...'"
              style={{ width:'100%',padding:'16px 18px',minHeight:160,border:'none',outline:'none',resize:'none',fontSize:14,color:'#1a1a1a',lineHeight:1.6,fontFamily:'DM Sans,sans-serif',boxSizing:'border-box',background:'transparent' }}
              disabled={loading||isRecording}
            />
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 18px',borderTop:'1px solid rgba(0,0,0,0.06)',background:'#fafaf8' }}>
              <div style={{ display:'flex',gap:10,alignItems:'center' }}>
                <span style={{ fontSize:11,color:'#ccc' }}>{text.length} chars</span>
                {text && <button onClick={()=>setText('')} style={{ fontSize:11,color:'#bbb',background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'DM Sans,sans-serif' }}>Clear</button>}
              </div>
              <button onClick={handleExtract} disabled={!text.trim()||loading||isRecording} style={{
                display:'inline-flex',alignItems:'center',gap:6,padding:'9px 20px',borderRadius:9,
                background:!text.trim()||loading?'#e8e8e5':'#2d7a4f',
                color:!text.trim()||loading?'#aaa':'#fff',
                border:'none',cursor:!text.trim()||loading||isRecording?'not-allowed':'pointer',
                fontSize:13.5,fontWeight:600,fontFamily:'DM Sans,sans-serif',transition:'all 0.15s',
                boxShadow:text.trim()&&!loading?'0 2px 8px rgba(45,122,79,0.25)':'none',
              }}>
                {loading?<><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} />Extracting…</>:<><Sparkles size={14} />Extract tasks</>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Error */}
      {error && (
        <div style={{ display:'flex',alignItems:'flex-start',gap:10,background:'#fff5f5',border:'1px solid #fecaca',borderRadius:10,padding:'12px 14px',marginBottom:14 }}>
          <AlertCircle size={15} style={{ color:'#ef4444',flexShrink:0,marginTop:1 }} />
          <div>
            <p style={{ fontSize:13,color:'#b91c1c',margin:0 }}>{error}</p>
            {error.toLowerCase().includes('limit') && (
              <Link href="/dashboard/billing" style={{ fontSize:12,color:'#2d7a4f',marginTop:4,display:'inline-block' }}>Upgrade for unlimited extracts →</Link>
            )}
          </div>
        </div>
      )}

      {/* Preview + confirm */}
      {preview && (
        <div>
          <div style={{ background:'#f0faf4',border:'1px solid #c6e6d4',borderRadius:10,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12 }}>
            <div>
              <p style={{ fontSize:13,fontWeight:600,color:'#1f5537',marginBottom:2 }}>✨ {preview.tasks.length} task{preview.tasks.length!==1?'s':''} extracted</p>
              <p style={{ fontSize:12,color:'#888',margin:0 }}>{preview.summary}</p>
            </div>
            <button onClick={()=>{setPreview(null);setError('')}} style={{ display:'inline-flex',alignItems:'center',gap:5,fontSize:12,color:'#888',background:'#fff',border:'1px solid rgba(0,0,0,0.1)',borderRadius:7,padding:'5px 10px',cursor:'pointer',flexShrink:0,fontFamily:'DM Sans,sans-serif' }}>
              <RefreshCw size={12} />Re-extract
            </button>
          </div>

          <div style={{ display:'flex',flexDirection:'column',gap:6,marginBottom:14 }}>
            {preview.tasks.map((task, idx) => {
              const ps = PS[task.priority] ?? PS.medium
              return (
                <div key={idx} style={{ background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,overflow:'hidden' }}>
                  <div style={{ padding:'10px 14px 8px',display:'flex',alignItems:'flex-start',gap:10 }}>
                    <div style={{ flex:1 }}>
                      <input value={task.title} onChange={e=>updateTask(idx,'title',e.target.value)} placeholder="Task title…"
                        style={{ width:'100%',border:'none',outline:'none',fontSize:13.5,fontWeight:500,color:'#1a1a1a',fontFamily:'DM Sans,sans-serif',background:'transparent' }} />
                      {task.description && <p style={{ fontSize:11,color:'#bbb',marginTop:3,lineHeight:1.4 }}>{task.description}</p>}
                    </div>
                    <button onClick={()=>removeTask(idx)} style={{ background:'none',border:'none',cursor:'pointer',color:'#ccc',padding:2,marginTop:1 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div style={{ padding:'0 14px 10px',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' }}>
                    <select value={task.suggestedProject} onChange={e=>updateTask(idx,'suggestedProject',e.target.value)}
                      style={{ fontSize:11,padding:'3px 22px 3px 8px',border:'1px solid rgba(0,0,0,0.1)',borderRadius:6,background:'#fafafa',color:'#444',fontFamily:'DM Sans,sans-serif',cursor:'pointer',outline:'none',appearance:'none' as const }}>
                      {allProjects.map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={task.priority} onChange={e=>updateTask(idx,'priority',e.target.value as any)}
                      style={{ fontSize:11,padding:'3px 18px 3px 8px',borderRadius:6,border:'none',fontWeight:600,cursor:'pointer',outline:'none',fontFamily:'DM Sans,sans-serif',background:ps.bg,color:ps.color,appearance:'none' as const }}>
                      {['low','medium','high','urgent'].map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                    <input type="date" value={task.deadline?task.deadline.split('T')[0]:''}
                      onChange={e=>updateTask(idx,'deadline',e.target.value?`${e.target.value}T00:00:00Z`:null)}
                      style={{ fontSize:11,padding:'3px 7px',border:'1px solid rgba(0,0,0,0.1)',borderRadius:6,color:'#666',fontFamily:'DM Sans,sans-serif',background:'#fafafa',outline:'none' }} />
                    {task.estimatedMinutes && <span style={{ fontSize:11,color:'#bbb',background:'#f3f3f1',padding:'3px 7px',borderRadius:6 }}>{task.estimatedMinutes}m</span>}
                  </div>
                </div>
              )
            })}
          </div>

          <button onClick={()=>setPreview(prev=>prev?{...prev,tasks:[...prev.tasks,{title:'',priority:'medium',tags:[],suggestedProject:allProjects[0]??'General'}]}:prev)}
            style={{ width:'100%',padding:'10px 0',marginBottom:20,border:'1px dashed rgba(0,0,0,0.15)',borderRadius:10,background:'#fff',color:'#aaa',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontFamily:'DM Sans,sans-serif' }}>
            <Plus size={14} />Add a task manually
          </button>

          <div style={{ position:'sticky',bottom:16,background:'#fff',borderRadius:12,border:'1px solid rgba(0,0,0,0.1)',boxShadow:'0 4px 20px rgba(0,0,0,0.1)',padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12 }}>
            <div>
              <p style={{ fontSize:13,fontWeight:600,color:'#1a1a1a',margin:0 }}>{preview.tasks.length} task{preview.tasks.length!==1?'s':''} ready to save</p>
              <p style={{ fontSize:11,color:'#aaa',margin:'2px 0 0' }}>{preview.projects.length} project{preview.projects.length!==1?'s':''} · Review above then confirm</p>
            </div>
            <div style={{ display:'flex',gap:8,flexShrink:0 }}>
              <button onClick={()=>setPreview(null)} style={{ padding:'8px 14px',border:'1px solid rgba(0,0,0,0.1)',borderRadius:8,background:'#fff',cursor:'pointer',fontSize:13,color:'#888',fontFamily:'DM Sans,sans-serif' }}>Cancel</button>
              <button onClick={handleConfirm} disabled={saving||preview.tasks.length===0} style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'8px 18px',borderRadius:8,background:saving||preview.tasks.length===0?'#e8e8e5':'#2d7a4f',color:saving||preview.tasks.length===0?'#aaa':'#fff',border:'none',cursor:saving||preview.tasks.length===0?'not-allowed':'pointer',fontSize:13,fontWeight:500,fontFamily:'DM Sans,sans-serif' }}>
                {saving?<><Loader2 size={13} style={{ animation:'spin 1s linear infinite' }} />Saving…</>:<><CheckCircle2 size={13} />Confirm & save</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulseRed{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}
      `}</style>
    </div>
  )
}
