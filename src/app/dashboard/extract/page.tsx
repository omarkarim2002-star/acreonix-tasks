'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, CheckCircle2, AlertCircle, ArrowRight, Plus, Trash2, RefreshCw, ChevronDown } from 'lucide-react'
import { cn, PRIORITY_COLOURS } from '@/lib/utils'
import type { Project } from '@/types'

type ExtractedTask = {
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedMinutes?: number
  deadline?: string
  tags: string[]
  suggestedProject: string
}

type ExtractPreview = {
  tasks: ExtractedTask[]
  projects: string[]
  summary: string
}

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'] as const

export default function ExtractPage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<ExtractPreview | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [existingProjects, setExistingProjects] = useState<Project[]>([])

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(setExistingProjects)
  }, [])

  // Step 1: Extract (preview only — don't save yet)
  async function handleExtract() {
    if (!text.trim()) return
    setLoading(true)
    setError('')
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
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Confirm and save
  async function handleConfirm() {
    if (!preview) return
    setSaving(true)
    try {
      const res = await fetch('/api/extract-tasks/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: preview.tasks, originalText: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSaved(true)
      setTimeout(() => router.push('/dashboard/tasks'), 1200)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save tasks')
    } finally {
      setSaving(false)
    }
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

  function addTask() {
    if (!preview) return
    setPreview({
      ...preview,
      tasks: [...preview.tasks, {
        title: '',
        priority: 'medium',
        tags: [],
        suggestedProject: preview.projects[0] ?? 'General',
      }]
    })
  }

  const allProjects = [
    ...new Set([
      ...existingProjects.map(p => p.name),
      ...(preview?.projects ?? []),
    ])
  ]

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--green)' }}>
            <Sparkles size={16} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 gold-underline" style={{ fontFamily: 'Georgia, serif' }}>
            AI Task Extraction
          </h1>
        </div>
        <p className="text-gray-500 text-sm mt-3">
          Paste anything — notes, emails, a brain dump. AI extracts and organises everything, then you confirm before saving.
        </p>
      </div>

      {/* Input area */}
      {!preview && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4 shadow-sm">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="e.g. Need to finish the client proposal by Friday, fix the login bug, book a call with James, pay the Supabase invoice, design new landing page hero..."
            className="w-full p-5 text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none min-h-[200px]"
            rows={9}
            disabled={loading}
          />
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-400">{text.length} characters</span>
            <button
              onClick={handleExtract}
              disabled={!text.trim() || loading}
              className="flex items-center gap-2 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: 'var(--green)' }}
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" />Extracting…</>
                : <><Sparkles size={14} />Extract tasks</>
              }
            </button>
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

      {/* Preview / Confirm step */}
      {preview && !saved && (
        <div className="animate-fade-in">
          {/* Summary banner */}
          <div className="rounded-2xl px-5 py-4 mb-5 border" style={{ background: '#e8f5ee', borderColor: '#a8d5bc' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--green)' }}>
                  ✨ {preview.tasks.length} tasks extracted across {preview.projects.length} projects
                </p>
                <p className="text-xs text-gray-600">{preview.summary}</p>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg bg-white transition-colors shrink-0 ml-4"
              >
                <RefreshCw size={12} />Re-extract
              </button>
            </div>
          </div>

          {/* Task review list */}
          <div className="space-y-3 mb-5">
            {preview.tasks.map((task, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <input
                      value={task.title}
                      onChange={e => updateTask(idx, 'title', e.target.value)}
                      className="w-full text-sm font-medium text-gray-900 focus:outline-none bg-transparent border-b border-transparent focus:border-gray-200 pb-0.5 transition-colors"
                      placeholder="Task title..."
                    />
                    {task.description && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{task.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeTask(idx)}
                    className="text-gray-300 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Task meta row */}
                <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                  {/* Project selector */}
                  <select
                    value={task.suggestedProject}
                    onChange={e => updateTask(idx, 'suggestedProject', e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-green-400 bg-white text-gray-700 max-w-[160px]"
                  >
                    {allProjects.map(p => <option key={p} value={p}>{p}</option>)}
                    <option value="__new__">+ New project…</option>
                  </select>

                  {/* Priority */}
                  <select
                    value={task.priority}
                    onChange={e => updateTask(idx, 'priority', e.target.value)}
                    className={cn('text-xs border rounded-lg px-2 py-1.5 focus:outline-none font-medium', PRIORITY_COLOURS[task.priority])}
                    style={{ borderColor: 'transparent' }}
                  >
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>

                  {/* Deadline */}
                  <input
                    type="date"
                    value={task.deadline ? task.deadline.split('T')[0] : ''}
                    onChange={e => updateTask(idx, 'deadline', e.target.value ? `${e.target.value}T00:00:00Z` : undefined)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none text-gray-600"
                  />

                  {/* Estimate */}
                  {task.estimatedMinutes && (
                    <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-1.5 rounded-lg">
                      {task.estimatedMinutes}m
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add task button */}
          <button
            onClick={addTask}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 hover:border-gray-400 rounded-xl py-3 mb-6 transition-all bg-white hover:bg-gray-50"
          >
            <Plus size={14} />Add a task manually
          </button>

          {/* Confirm bar */}
          <div className="sticky bottom-4 bg-white rounded-2xl border border-gray-200 shadow-lg px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {preview.tasks.length} tasks ready to save
              </p>
              <p className="text-xs text-gray-400">
                {preview.projects.length} project{preview.projects.length !== 1 ? 's' : ''} · Review above then confirm
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => setPreview(null)}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 border border-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving || preview.tasks.length === 0}
                className="flex items-center gap-2 text-white text-sm font-medium px-6 py-2 rounded-xl transition-all disabled:opacity-50"
                style={{ background: 'var(--green)' }}
              >
                {saving
                  ? <><Loader2 size={14} className="animate-spin" />Saving…</>
                  : <><CheckCircle2 size={14} />Confirm & save</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success */}
      {saved && (
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--green-muted)' }}>
            <CheckCircle2 size={32} style={{ color: 'var(--green)' }} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Tasks saved!</h2>
          <p className="text-sm text-gray-400">Redirecting to your task list…</p>
        </div>
      )}
    </div>
  )
}
