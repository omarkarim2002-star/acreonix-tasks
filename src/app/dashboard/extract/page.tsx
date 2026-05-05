'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles, Loader2, CheckCircle2, AlertCircle,
  ArrowRight, Mic, Square,
} from 'lucide-react'

const EXAMPLES = [
  "Need to finish the client proposal by Friday, also review the new logo designs, book a call with James about the website rebrand, and don't forget to pay the Supabase invoice",
  "Launch campaign: write copy for 3 social posts, design banner ads, brief the photographer, schedule posts for next Monday. Also personal: dentist appointment, order birthday gift for mum",
  "Fix the login bug on staging, deploy to production after testing, update the README, respond to all support tickets from this week, plan Q3 product roadmap",
]

type VoiceState = 'idle' | 'requesting' | 'recording' | 'processing' | 'error'

export default function ExtractPage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ summary: string; projectsCreated: number; tasksCreated: number } | null>(null)
  const [error, setError] = useState('')

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
  const voiceStateRef = useRef<VoiceState>('idle')

  // Keep ref in sync with state for use inside closures
  useEffect(() => { voiceStateRef.current = voiceState }, [voiceState])

  const speechSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const animateAmplitude = useCallback(() => {
    if (!analyserRef.current) return
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(data)
    const avg = data.reduce((a, b) => a + b, 0) / data.length
    setAmplitude(Math.min(avg / 80, 1))
    animFrameRef.current = requestAnimationFrame(animateAmplitude)
  }, [])

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    analyserRef.current = null
    setRecordingSeconds(0)
    setAmplitude(0)
  }

  async function startVoice() {
    setVoiceError('')
    setTranscript('')
    setVoiceState('requesting')

    if (!speechSupported) {
      setVoiceError('Voice input requires Chrome or Edge browser.')
      setVoiceState('error')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-GB'
      recognitionRef.current = recognition

      let finalTranscript = ''

      recognition.onresult = (e: any) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript
          if (e.results[i].isFinal) finalTranscript += t + ' '
          else interim = t
        }
        setTranscript(finalTranscript + interim)
      }

      recognition.onerror = (e: any) => {
        if (e.error !== 'aborted') {
          setVoiceError(`Mic error: ${e.error}. Please try again.`)
          setVoiceState('error')
          stopRecording()
          recognitionRef.current = null
        }
      }

      recognition.onend = () => {
        stopRecording()
        recognitionRef.current = null
        if (finalTranscript.trim()) {
          setText(prev => prev.trim() ? prev.trim() + '\n\n' + finalTranscript.trim() : finalTranscript.trim())
          setVoiceState('processing')
          setTimeout(() => setVoiceState('idle'), 800)
        } else {
          setVoiceState('idle')
        }
      }

      recognition.start()
      setVoiceState('recording')
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
      animateAmplitude()

    } catch (e: any) {
      setVoiceError(e.name === 'NotAllowedError'
        ? 'Microphone access denied — please allow mic access and try again.'
        : 'Could not access microphone.')
      setVoiceState('error')
    }
  }

  function stopVoice() {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    } else {
      stopRecording()
      setVoiceState('idle')
    }
  }

  useEffect(() => () => { stopRecording(); if (recognitionRef.current) try { recognitionRef.current.abort() } catch {} }, [])

  async function handleExtract() {
    if (!text.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const isRecording = voiceState === 'recording'
  const S = { fontFamily: 'DM Sans, sans-serif' }
  const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div style={{ padding: '28px 32px 60px', maxWidth: 680, margin: '0 auto', ...S }}>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 34, height: 34, background: '#2d7a4f', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={16} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.02em' }}>Add tasks with AI</h1>
        </div>
        <p style={{ fontSize: 13.5, color: '#888', lineHeight: 1.6, marginLeft: 44 }}>
          Type or speak your brain dump — AI extracts and organises everything into tasks.
        </p>
      </div>

      {/* Voice recorder */}
      <div style={{
        background: isRecording ? 'rgba(239,68,68,0.03)' : voiceState === 'processing' ? 'rgba(45,122,79,0.04)' : '#fff',
        border: `1px solid ${isRecording ? 'rgba(239,68,68,0.2)' : voiceState === 'processing' ? 'rgba(45,122,79,0.2)' : 'rgba(0,0,0,0.08)'}`,
        borderRadius: 14, padding: '14px 18px', marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.25s',
      }}>
        {/* Mic button */}
        <button
          onClick={isRecording ? stopVoice : startVoice}
          disabled={voiceState === 'requesting' || voiceState === 'processing' || !speechSupported}
          style={{
            width: 50, height: 50, borderRadius: '50%', flexShrink: 0, border: 'none',
            cursor: (voiceState === 'requesting' || voiceState === 'processing' || !speechSupported) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isRecording ? '#ef4444' : (voiceState === 'requesting' || voiceState === 'processing') ? '#f0f0ee' : '#2d7a4f',
            boxShadow: isRecording
              ? `0 0 0 ${4 + amplitude * 14}px rgba(239,68,68,${0.12 + amplitude * 0.1}), 0 2px 8px rgba(239,68,68,0.3)`
              : voiceState === 'idle' ? '0 2px 8px rgba(45,122,79,0.25)' : 'none',
            transform: `scale(${isRecording ? 1 + amplitude * 0.07 : 1})`,
            transition: 'background 0.15s, box-shadow 0.08s',
          }}
        >
          {voiceState === 'requesting' || voiceState === 'processing'
            ? <Loader2 size={20} color="#aaa" style={{ animation: 'spin 1s linear infinite' }} />
            : isRecording
            ? <Square size={18} color="#fff" fill="#fff" />
            : <Mic size={20} color="#fff" />}
        </button>

        {/* Status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {voiceState === 'idle' && (
            <>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: '#1a1a1a', marginBottom: 1 }}>
                {speechSupported ? 'Speak your brain dump' : 'Voice not supported in this browser'}
              </p>
              <p style={{ fontSize: 11.5, color: '#bbb' }}>
                {speechSupported ? 'Tap mic → speak → tap stop. Transcript goes straight into the text box.' : 'Use Chrome or Edge for voice input'}
              </p>
            </>
          )}
          {voiceState === 'requesting' && <p style={{ fontSize: 13, color: '#888' }}>Requesting mic access…</p>}
          {isRecording && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', animation: 'pulseRed 1s infinite' }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>Recording {fmtSecs(recordingSeconds)}</p>
                <p style={{ fontSize: 11.5, color: '#bbb' }}>· tap Stop when done</p>
              </div>
              <p style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {transcript ? `"${transcript.slice(-90)}"` : 'Listening…'}
              </p>
            </>
          )}
          {voiceState === 'processing' && <p style={{ fontSize: 13, fontWeight: 500, color: '#2d7a4f' }}>✓ Transcript added — ready to extract</p>}
          {voiceState === 'error' && <p style={{ fontSize: 12, color: '#ef4444', lineHeight: 1.5 }}>{voiceError}</p>}
        </div>

        {/* Waveform bars */}
        {isRecording && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2.5, flexShrink: 0 }}>
            {[0.15, 0.4, 0.65, 0.4, 0.15].map((t, i) => (
              <div key={i} style={{
                width: 3, borderRadius: 2,
                height: `${6 + (amplitude > t ? 18 : 4)}px`,
                background: amplitude > t ? '#ef4444' : '#f0f0ee',
                transition: 'height 0.07s ease',
              }} />
            ))}
          </div>
        )}

        {isRecording && (
          <button onClick={stopVoice} style={{
            fontSize: 12, fontWeight: 600, color: '#ef4444', background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '5px 12px',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
          }}>
            Stop
          </button>
        )}
      </div>

      {/* Text input */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 16 }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type or use the mic above — e.g. 'Need to finish the client proposal by Friday, book a call with James...'"
          disabled={loading || isRecording}
          rows={7}
          style={{
            width: '100%', padding: '16px 18px', fontSize: 14, color: '#1a1a1a',
            lineHeight: 1.7, resize: 'none', border: 'none', outline: 'none',
            fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
            background: 'transparent',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderTop: '1px solid rgba(0,0,0,0.06)', background: '#fafaf8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: '#ccc' }}>{text.length} chars</span>
            {text.length > 0 && !loading && (
              <button onClick={() => setText('')} style={{ fontSize: 11, color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif' }}>Clear</button>
            )}
          </div>
          <button
            onClick={handleExtract}
            disabled={!text.trim() || loading || isRecording}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '9px 20px', borderRadius: 9, fontSize: 13.5, fontWeight: 600,
              border: 'none', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
              cursor: (!text.trim() || loading || isRecording) ? 'not-allowed' : 'pointer',
              background: (!text.trim() || loading) ? '#e8e8e5' : '#2d7a4f',
              color: (!text.trim() || loading) ? '#aaa' : '#fff',
              boxShadow: text.trim() && !loading ? '0 2px 8px rgba(45,122,79,0.25)' : 'none',
            }}
          >
            {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Extracting…</> : <><Sparkles size={14} />Extract tasks</>}
          </button>
        </div>
      </div>

      {/* Examples */}
      {!result && !loading && !text && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Try an example</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => setText(ex)} style={{
                textAlign: 'left', fontSize: 12.5, color: '#666', background: '#fff',
                border: '1px solid rgba(0,0,0,0.07)', borderRadius: 10, padding: '10px 14px',
                cursor: 'pointer', lineHeight: 1.55, fontFamily: 'DM Sans, sans-serif',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                transition: 'border-color 0.12s',
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(45,122,79,0.3)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.07)'}
              >{ex}</button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
          <AlertCircle size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#b91c1c', lineHeight: 1.5 }}>{error}</p>
        </div>
      )}

      {/* Success */}
      {result && (
        <div style={{ animation: 'slideUp 0.3s ease' }}>
          <div style={{ background: '#f0faf4', border: '1px solid #c6e6d4', borderRadius: 14, padding: '18px 22px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
              <CheckCircle2 size={18} style={{ color: '#2d7a4f' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1f5537' }}>Tasks extracted!</span>
            </div>
            <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6, marginBottom: 14 }}>{result.summary}</p>
            <div style={{ display: 'flex', gap: 20 }}>
              <div><span style={{ fontSize: 22, fontWeight: 700, color: '#2d7a4f', letterSpacing: '-0.03em' }}>{result.tasksCreated}</span><span style={{ fontSize: 12, color: '#888', marginLeft: 5 }}>tasks</span></div>
              <div><span style={{ fontSize: 22, fontWeight: 700, color: '#2d7a4f', letterSpacing: '-0.03em' }}>{result.projectsCreated}</span><span style={{ fontSize: 12, color: '#888', marginLeft: 5 }}>projects</span></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setResult(null); setText('') }} style={{ flex: 1, padding: '10px 0', borderRadius: 9, fontSize: 13, fontWeight: 500, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', color: '#666', fontFamily: 'DM Sans, sans-serif' }}>Add more</button>
            <button onClick={() => router.push('/dashboard/tasks')} style={{ flex: 1, padding: '10px 0', borderRadius: 9, fontSize: 13, fontWeight: 500, border: 'none', background: '#2d7a4f', cursor: 'pointer', color: '#fff', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              View all tasks <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulseRed { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      `}</style>
    </div>
  )
}
