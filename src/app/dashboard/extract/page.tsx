'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, CheckCircle2, AlertCircle, ArrowRight, Mic, Square } from 'lucide-react'

const EXAMPLES = [
  "Need to finish the client proposal by Friday, also review the new logo designs, book a call with James about the website rebrand, and don't forget to pay the Supabase invoice",
  "Launch campaign: write copy for 3 social posts, design banner ads, brief the photographer, schedule posts for next Monday. Also personal: dentist appointment, order birthday gift for mum",
  "Fix the login bug on staging, deploy to production after testing, update the README, respond to all support tickets from this week, plan Q3 product roadmap",
]

export default function ExtractPage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    summary: string
    projectsCreated: number
    tasksCreated: number
  } | null>(null)
  const [error, setError] = useState('')
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function startRecording() {
    // getUserMedia requires HTTPS or localhost
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    if (!isSecure) {
      setError('Microphone requires a secure connection (HTTPS). Please use the deployed site at tasks.acreonix.co.uk.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Your browser does not support microphone access. Try Chrome or Safari.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Live transcribe: emit a chunk every 5 seconds → POST → append
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mr.ondataavailable = async (e) => {
        if (e.data.size === 0) return
        try {
          const fd = new FormData()
          fd.append('file', e.data, 'chunk.webm')
          const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
          const data = await res.json()
          if (data.text?.trim()) setText(prev => prev ? prev + ' ' + data.text.trim() : data.text.trim())
        } catch {}
      }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        setTranscribing(false)
      }
      mediaRecorderRef.current = mr
      // 5000ms timeslice → ondataavailable fires every 5 seconds
      mr.start(5000)
      setRecording(true)
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings and try again.')
      } else if (e.name === 'NotFoundError') {
        setError('No microphone found on this device.')
      } else {
        setError('Could not access microphone: ' + e.message)
      }
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  async function handleExtract() {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

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

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-[#2d7a4f] rounded-lg flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color:'#101312', letterSpacing:'-0.5px' }}>Add tasks with AI</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Paste anything — a brain dump, email, notes, random thoughts. AI will extract and organise everything for you.
        </p>
      </div>

      {/* Main input */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Need to finish the client proposal by Friday, book a call with James, fix the login bug, pay the Supabase invoice..."
          className="w-full p-5 text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none min-h-[180px]"
          rows={8}
          disabled={loading}
        />
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
          <span className="text-xs text-gray-400">{text.length} characters</span>
          <div className="flex items-center gap-2">
            {/* Mic button — icon only */}
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={loading || transcribing}
              title={recording ? 'Stop recording' : 'Speak your tasks'}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-50 shrink-0"
              style={{
                background: recording ? '#DC2626' : '#EAF4EF',
                color: recording ? '#fff' : '#0D3D2E',
                boxShadow: recording ? '0 0 0 4px rgba(220,38,38,0.15)' : 'none',
              }}
            >
              {transcribing
                ? <Loader2 size={16} className="animate-spin" />
                : recording
                ? <Square size={14} fill="currentColor" />
                : <Mic size={16} />
              }
            </button>

            <button
              onClick={handleExtract}
              disabled={!text.trim() || loading}
              className="flex items-center gap-2 bg-[#2d7a4f] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#1f5537] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" />Extracting…</>
            ) : (
              <><Sparkles size={14} />Extract tasks</>
            )}
            </button>
          </div>
        </div>
      </div>

      {/* Examples */}
      {!result && !loading && (
        <div className="mb-8">
          <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">Try an example</p>
          <div className="space-y-2">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => setText(ex)}
                className="w-full text-left text-xs text-gray-600 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-[#2d7a4f]/40 hover:bg-[#f8faf9] transition-all line-clamp-2"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="animate-slide-up">
          <div className="bg-[#e8f5ee] border border-[#a8d5bc] rounded-2xl px-5 py-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={18} className="text-[#2d7a4f]" />
              <span className="font-semibold text-[#2d7a4f]">Tasks extracted!</span>
            </div>
            <p className="text-sm text-gray-700 mb-3">{result.summary}</p>
            <div className="flex gap-4 text-sm">
              <span className="text-gray-600">
                <strong className="text-gray-900">{result.tasksCreated}</strong> tasks created
              </span>
              <span className="text-gray-600">
                <strong className="text-gray-900">{result.projectsCreated}</strong> projects
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setResult(null); setText('') }}
              className="flex-1 text-sm border border-gray-200 text-gray-600 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Add more
            </button>
            <button
              onClick={() => router.push('/dashboard/tasks')}
              className="flex-1 text-sm bg-[#2d7a4f] text-white px-4 py-2.5 rounded-lg hover:bg-[#1f5537] transition-colors flex items-center justify-center gap-2"
            >
              View all tasks <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
