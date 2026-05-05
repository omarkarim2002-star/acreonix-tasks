'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Save, Loader2, RefreshCw } from 'lucide-react'
import { TaskComments } from '@/components/ui/TaskComments'
import { cn, PRIORITY_COLOURS, STATUS_LABELS, STATUS_COLOURS } from '@/lib/utils'
import type { Task, Project } from '@/types'

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
const STATUSES = ['todo', 'in_progress', 'done', 'blocked'] as const

export default function TaskDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [task, setTask] = useState<Task & { project?: Project } | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/tasks/${id}`).then((r) => r.json()).then(setTask)
    fetch('/api/projects').then((r) => r.json()).then(setProjects)
  }, [id])

  async function save() {
    if (!task) return
    setSaving(true)
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        deadline: task.deadline || null,
        estimated_minutes: task.estimated_minutes || null,
        project_id: task.project_id || null,
      }),
    })
    setSaving(false)
  }

  async function deleteTask() {
    if (!confirm('Delete this task?')) return
    setDeleting(true)
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    router.push('/dashboard/tasks')
  }

  function update(field: string, value: unknown) {
    setTask((prev) => prev ? { ...prev, [field]: value } : prev)
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-gray-300" />
      </div>
    )
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Title */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <textarea
            value={task.title}
            onChange={(e) => update('title', e.target.value)}
            className="w-full text-xl font-semibold text-gray-900 resize-none focus:outline-none leading-snug"
            rows={1}
          />
          {task.ai_extracted && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[#2d7a4f] bg-[#e8f5ee] px-2 py-0.5 rounded-full mt-2">
              ✨ AI extracted
            </span>
          )}
        </div>

        {/* Fields */}
        <div className="px-6 py-5 space-y-5">

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-2">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => update('status', s)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full font-medium transition-all',
                      task.status === s ? STATUS_COLOURS[s] : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    )}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-2">Priority</label>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => update('priority', p)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full font-medium capitalize transition-all',
                      task.priority === p ? PRIORITY_COLOURS[p] : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-2">Project</label>
            <select
              value={task.project_id ?? ''}
              onChange={(e) => update('project_id', e.target.value || null)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#2d7a4f] transition-colors"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
              ))}
            </select>
          </div>

          {/* Deadline + Estimate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-2">Deadline</label>
              <input
                type="date"
                value={task.deadline ? task.deadline.split('T')[0] : ''}
                onChange={(e) => update('deadline', e.target.value ? `${e.target.value}T00:00:00Z` : null)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2d7a4f] transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-2">Estimate (mins)</label>
              <input
                type="number"
                value={task.estimated_minutes ?? ''}
                onChange={(e) => update('estimated_minutes', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="e.g. 30"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2d7a4f] transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-2">Notes</label>
            <textarea
              value={task.description ?? ''}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Add any extra notes..."
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2d7a4f] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={deleteTask}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
            {deleting ? 'Deleting…' : 'Delete task'}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-[#2d7a4f] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#1f5537] transition-colors disabled:opacity-70"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    {/* Comments */}
    <div style={{ marginTop: 8, padding: '0 0 40px' }}>
      <TaskComments taskId={id as string} />
    </div>
    </div>
  )
}
