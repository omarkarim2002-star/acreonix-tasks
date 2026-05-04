'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Sparkles, Loader2, Pencil, Check, X,
  GitFork, Trash2, Copy, GripVertical
} from 'lucide-react'
import { cn, formatDeadline, deadlineColour, PRIORITY_COLOURS, STATUS_LABELS } from '@/lib/utils'
import { ProjectColourPicker } from '@/components/projects/ProjectColourPicker'
import { ShareProjectButton } from '@/components/ui/ShareProjectButton'
import type { Project, Task } from '@/types'

const STATUSES = ['todo', 'in_progress', 'done', 'blocked'] as const

export default function ProjectDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showPicker, setShowPicker] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then(r => r.json()),
      fetch(`/api/tasks?project_id=${id}`).then(r => r.json()),
    ]).then(([proj, t]) => {
      setProject(proj)
      setNameValue(proj.name)
      setTasks(Array.isArray(t) ? t : [])
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function saveName() {
    if (!project || !nameValue.trim()) return
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameValue }),
    })
    setProject(prev => prev ? { ...prev, name: nameValue } : prev)
    setEditingName(false)
  }

  async function saveColourIcon(colour: string, icon: string) {
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colour, icon }),
    })
    setProject(prev => prev ? { ...prev, colour, icon } : prev)
  }

  async function toggleTask(task: Task) {
    const s = task.status === 'done' ? 'todo' : 'done'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: s } : t))
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: s }),
    })
  }

  async function duplicateTask(task: Task) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${task.title} (copy)`,
        description: task.description,
        project_id: task.project_id,
        priority: task.priority,
        deadline: task.deadline,
        estimated_minutes: task.estimated_minutes,
        tags: task.tags,
      }),
    })
    const newTask = await res.json()
    setTasks(prev => [newTask, ...prev])
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDragId(taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, taskId: string) {
    e.preventDefault()
    setDragOver(taskId)
  }

  async function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragId || dragId === targetId) { setDragId(null); setDragOver(null); return }
    const reordered = [...tasks]
    const fromIdx = reordered.findIndex(t => t.id === dragId)
    const toIdx = reordered.findIndex(t => t.id === targetId)
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    const updated = reordered.map((t, i) => ({ ...t, position: i }))
    setTasks(updated)
    setDragId(null)
    setDragOver(null)
    await Promise.all(
      updated.map(t => fetch(`/api/tasks/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: t.position }),
      }))
    )
  }

  const filtered = statusFilter === 'all' ? tasks : tasks.filter(t => t.status === statusFilter)
  const done = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={20} className="animate-spin text-gray-300" />
    </div>
  )
  if (!project) return null

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft size={14} />Projects
      </button>

      {/* Project header */}
      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          {/* Icon + colour picker */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl hover:opacity-80 transition-opacity relative"
              style={{ background: project.colour + '22' }}
              title="Change colour & icon"
            >
              {project.icon}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: project.colour }}>
                <Pencil size={8} className="text-white" />
              </div>
            </button>
            {showPicker && (
              <div className="absolute top-14 left-0 z-50">
                <ProjectColourPicker
                  colour={project.colour}
                  icon={project.icon}
                  onChange={(c, i) => { saveColourIcon(c, i); setShowPicker(false) }}
                />
              </div>
            )}
          </div>

          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                  className="text-xl font-bold text-gray-900 focus:outline-none border-b-2 border-[#2d7a4f] flex-1 pb-0.5 bg-transparent"
                />
                <button onClick={saveName} className="text-[#2d7a4f]"><Check size={16} /></button>
                <button onClick={() => setEditingName(false)} className="text-gray-400"><X size={16} /></button>
              </div>
            ) : (
              <button onClick={() => setEditingName(true)} className="group flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                <Pencil size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </button>
            )}
          </div>

          {/* Share button — only shows on team plan */}
          <ShareProjectButton
            projectId={id as string}
            sharingType={(project as any).sharing_type ?? 'private'}
            isOwn={(project as any).isOwn !== false}
            onUpdate={(type) => setProject(prev => prev ? { ...prev, sharing_type: type } as any : prev)}
          />

          {/* Mind map button */}
          <Link
            href={`/dashboard/projects/${id}/mindmap`}
            className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all"
          >
            <GitFork size={13} />Mind map
          </Link>
        </div>

        {/* Progress */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: project.colour }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{done} of {tasks.length} tasks done</span>
          <span>{pct}%</span>
        </div>
      </div>

      {/* Filters + actions */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto shrink-0">
          {(['all', ...STATUSES] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn('text-xs font-medium px-2.5 py-1 rounded-lg whitespace-nowrap transition-all',
                statusFilter === s ? 'bg-white text-[#2d7a4f] shadow-sm' : 'text-gray-500 hover:text-gray-700')}
            >
              {s === 'all' ? `All (${tasks.length})` : `${STATUS_LABELS[s]} (${tasks.filter(t => t.status === s).length})`}
            </button>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/dashboard/extract" className="flex items-center gap-1 text-xs text-[#2d7a4f] border border-[#2d7a4f]/30 px-2.5 py-1.5 rounded-lg hover:bg-[#e8f5ee] transition-colors">
            <Sparkles size={12} />AI
          </Link>
          <Link href="/dashboard/tasks/new" className="flex items-center gap-1 text-xs bg-[#2d7a4f] text-white px-2.5 py-1.5 rounded-lg hover:bg-[#1f5537] transition-colors">
            <Plus size={12} />New
          </Link>
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-1.5">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">No tasks</p>
        )}
        {filtered.map(task => (
          <div
            key={task.id}
            draggable
            onDragStart={e => handleDragStart(e, task.id)}
            onDragOver={e => handleDragOver(e, task.id)}
            onDrop={e => handleDrop(e, task.id)}
            onDragEnd={() => { setDragId(null); setDragOver(null) }}
            className={cn(
              'flex items-center gap-3 bg-white rounded-xl px-3 py-3 border transition-all task-card group',
              dragOver === task.id ? 'border-[#2d7a4f] shadow-md scale-[1.01]' : 'border-gray-100 hover:border-[#2d7a4f]/20',
              dragId === task.id ? 'opacity-40' : 'opacity-100'
            )}
          >
            <div className="cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity shrink-0">
              <GripVertical size={14} className="text-gray-400" />
            </div>

            <input type="checkbox" className="task-check shrink-0" checked={task.status === 'done'} onChange={() => toggleTask(task)} />

            <Link href={`/dashboard/tasks/${task.id}`} className="flex-1 flex items-center gap-3 min-w-0">
              <span className={cn('text-sm flex-1 truncate', task.status === 'done' && 'line-through text-gray-400')}>
                {task.title}
              </span>
            </Link>

            <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', PRIORITY_COLOURS[task.priority])}>
                {task.priority}
              </span>
              {task.deadline && (
                <span className={cn('text-xs', deadlineColour(task.deadline))}>{formatDeadline(task.deadline)}</span>
              )}
              {task.estimated_minutes && (
                <span className="text-xs text-gray-400">{task.estimated_minutes}m</span>
              )}
            </div>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
              <button onClick={() => duplicateTask(task)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Duplicate">
                <Copy size={12} />
              </button>
              <button onClick={() => deleteTask(task.id)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
