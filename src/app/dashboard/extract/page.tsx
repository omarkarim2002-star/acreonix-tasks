'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Loader2, Zap, Clock, ArrowRight, Coffee, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { cn, PRIORITY_COLOURS } from '@/lib/utils'

type PriorityTask = {
  taskId: string
  title: string
  reason: string
  estimatedMinutes?: number
}

type PriorityResult = {
  doNow: PriorityTask[]
  doLater: PriorityTask[]
  insight: string
  focusTip: string
}

export default function ExtractPage() {
  const [priority, setPriority] = useState<PriorityResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [extractLoading, setExtractLoading] = useState(false)
  const [extractResult, setExtractResult] = useState<any>(null)
  const [extractError, setExtractError] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [existingProjects, setExistingProjects] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(setExistingProjects)
  }, [])

  async function loadPriority() {
    setLoading(true)
    try {
      const res = await fetch('/api/prioritise')
      const data = await res.json()
      setPriority(data)
    } catch {
      console.error('Failed to load priority')
    } finally {
      setLoading(false)
    }
  }

  async function handleExtract() {
    if (!text.trim()) return
    setExtractLoading(true)
    setExtractError('')
    setPreview(null)
    try {
      const res = await fetch('/api/extract-tasks/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPreview(data)
    } catch (e: unknown) {
      setExtractError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setExtractLoading(false)
    }
  }

  async function handleConfirm() {
    if (!preview) return
    setSaving(true)
    try {
      const res = await fetch('/api/extract-tasks/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: preview.tasks, originalText: text }),
      })
      if (res.ok) { setSaved(true); setPreview(null); setText('') }
    } finally { setSaving(false) }
  }

  function updateTask(idx: number, field: string, value: unknown) {
    if (!preview) return
    const updated = [...preview.tasks]
    updated[idx] = { ...updated[idx], [field]: value }
    setPreview({ ...preview, tasks: updated })
  }

  function removeTask(idx: number) {
    if (!preview) return
    setPreview({ ...preview, tasks: preview.tasks.filter((_: any, i: number) => i !== idx) })
  }

  function addTask() {
    if (!preview) return
    setPreview({ ...preview, tasks: [...preview.tasks, { title: '', priority: 'medium', tags: [], suggestedProject: preview.projects[0] ?? 'General' }] })
  }

  const allProjects = [...new Set([...existingProjects.map((p: any) => p.name), ...(preview?.projects ?? [])])]

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#2d7a4f' }}>
            <Sparkles size={16} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 gold-underline" style={{ fontFamily: 'Georgia, serif' }}>
            AI Task Extraction
          </h1>
        </div>
        <p className="text-gray-500 text-sm mt-3">Paste anything. AI extracts tasks, you confirm before saving.</p>
      </div>

      {/* Do Now section */}
      {!priority && !loading && (
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-[#c9a84c]" />
              <span className="text-sm font-semibold text-gray-800">What should I work on now?</span>
            </div>
            <button onClick={loadPriority} className="flex items-center gap-1.5 text-xs text-[#2d7a4f] border border-[#2d7a4f]/30 px-3 py-1.5 rounded-lg hover:bg-[#e8f5ee] transition-colors">
              <Sparkles size={12} />Get AI recommendation
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-5 py-4 mb-6">
          <Loader2 size={16} className="animate-spin text-[#2d7a4f]" />
          <span className="text-sm text-gray-500">Analysing your tasks and habits…</span>
        </div>
      )}

      {priority && (
        <div className="mb-6 space-y-3">
          {/* Insight */}
          <div className="bg-[#faf5e8] border border-[#e8d5a0] rounded-2xl px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={14} className="text-[#c9a84c]" />
                  <span className="text-xs font-semibold text-[#9e7e33] uppercase tracking-wide">AI Insight</span>
                </div>
                <p className="text-sm text-gray-700">{priority.insight}</p>
                <p className="text-xs text-[#c9a84c] mt-1 font-medium">💡 {priority.focusTip}</p>
              </div>
              <button onClick={loadPriority} className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Do Now */}
          {priority.doNow.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#2d7a4f] animate-pulse" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Do now</span>
              </div>
              <div className="divide-y divide-gray-50">
                {priority.doNow.map((t, i) => (
                  <Link key={i} href={`/dashboard/tasks/${t.taskId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group">
                    <div className="w-2 h-2 rounded-full bg-[#2d7a4f] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                      <p className="text-xs text-gray-400">{t.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.estimatedMinutes && (
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} />{t.estimatedMinutes}m</span>
                      )}
                      <ArrowRight size={14} className="text-gray-300 group-hover:text-[#2d7a4f] transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Do Later */}
          {priority.doLater.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <Coffee size={13} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Leave for later</span>
              </div>
              <div className="divide-y divide-gray-50">
                {priority.doLater.slice(0, 4).map((t, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-2.5 opacity-60">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600 truncate">{t.title}</p>
                      <p className="text-xs text-gray-400">{t.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Extract input */}
      {!preview && !saved && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-4">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste anything — notes, emails, a brain dump. AI extracts and organises everything, then you confirm before saving..."
            className="w-full p-5 text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none min-h-[160px]"
            rows={7}
            disabled={extractLoading}
          />
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-400">{text.length} characters</span>
            <button
              onClick={handleExtract}
              disabled={!text.trim() || extractLoading}
              className="flex items-center gap-2 text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50"
              style={{ background: '#2d7a4f' }}
            >
              {extractLoading ? <><Loader2 size={14} className="animate-spin" />Extracting…</> : <><Sparkles size={14} />Extract tasks</>}
            </button>
          </div>
        </div>
      )}

      {extractError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <span className="text-sm text-red-700">{extractError}</span>
        </div>
      )}

      {/* Preview */}
      {preview && !saved && (
        <div>
          <div className="rounded-2xl px-5 py-4 mb-4 border flex items-center justify-between" style={{ background: '#e8f5ee', borderColor: '#a8d5bc' }}>
            <div>
              <p className="font-semibold text-sm mb-0.5" style={{ color: '#2d7a4f' }}>✨ {preview.tasks.length} tasks extracted</p>
              <p className="text-xs text-gray-600">{preview.summary}</p>
            </div>
            <button onClick={() => setPreview(null)} className="text-xs text-gray-500 border border-gray-300 px-3 py-1.5 rounded-lg bg-white ml-4">Re-extract</button>
          </div>

          <div className="space-y-2 mb-4">
            {preview.tasks.map((task: any, idx: number) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 flex items-start gap-3">
                  <input
                    value={task.title}
                    onChange={e => updateTask(idx, 'title', e.target.value)}
                    className="flex-1 text-sm font-medium text-gray-900 focus:outline-none bg-transparent border-b border-transparent focus:border-gray-200 pb-0.5"
                    placeholder="Task title..."
                  />
                  <button onClick={() => removeTask(idx)} className="text-gray-300 hover:text-red-400 transition-colors">✕</button>
                </div>
                <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                  <select value={task.suggestedProject} onChange={e => updateTask(idx, 'suggestedProject', e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white text-gray-700 max-w-[160px]">
                    {allProjects.map((p: string) => <option key={p} value={p}>{p}</option>)}
                    <option value="__new__">+ New project…</option>
                  </select>
                  <select value={task.priority} onChange={e => updateTask(idx, 'priority', e.target.value)} className={cn('text-xs border rounded-lg px-2 py-1.5 focus:outline-none font-medium', PRIORITY_COLOURS[task.priority])} style={{ borderColor: 'transparent' }}>
                    {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input type="date" value={task.deadline ? task.deadline.split('T')[0] : ''} onChange={e => updateTask(idx, 'deadline', e.target.value ? `${e.target.value}T00:00:00Z` : undefined)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none text-gray-600" />
                </div>
              </div>
            ))}
          </div>

          <button onClick={addTask} className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 border border-dashed border-gray-300 rounded-xl py-3 mb-4 hover:bg-gray-50 transition-colors bg-white">
            + Add a task manually
          </button>

          <div className="sticky bottom-4 bg-white rounded-2xl border border-gray-200 shadow-lg px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">{preview.tasks.length} tasks ready</p>
              <p className="text-xs text-gray-400">{preview.projects.length} project{preview.projects.length !== 1 ? 's' : ''} · Review then confirm</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPreview(null)} className="text-sm text-gray-500 px-4 py-2 border border-gray-200 rounded-xl">Cancel</button>
              <button onClick={handleConfirm} disabled={saving || preview.tasks.length === 0} className="flex items-center gap-2 text-white text-sm font-medium px-6 py-2 rounded-xl disabled:opacity-50" style={{ background: '#2d7a4f' }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {saving ? 'Saving…' : 'Confirm & save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {saved && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: '#e8f5ee' }}>
            <Sparkles size={28} style={{ color: '#2d7a4f' }} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Tasks saved!</h2>
          <button onClick={() => setSaved(false)} className="text-sm text-[#2d7a4f] mt-3 hover:underline">Add more tasks</button>
        </div>
      )}
    </div>
  )
}
