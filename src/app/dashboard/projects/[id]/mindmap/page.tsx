'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, List, GitFork, Plus, Sparkles } from 'lucide-react'
import { MindMap } from '@/components/mindmap/MindMap'
import type { Project, Task } from '@/types'

export default function MindMapPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then(r => r.json()),
      fetch(`/api/tasks?project_id=${id}`).then(r => r.json()),
    ]).then(([proj, t]) => {
      setProject(proj)
      setTasks(t)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-[#2d7a4f] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="flex flex-col h-screen bg-[#f8faf9]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <span className="text-lg">{project.icon}</span>
          <h1 className="text-sm font-semibold text-gray-900">{project.name}</h1>
          <span className="text-xs text-gray-400">{tasks.length} tasks</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/projects/${id}`}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <List size={13} />
            List view
          </Link>
          <Link
            href="/dashboard/extract"
            className="flex items-center gap-1.5 text-xs text-[#2d7a4f] border border-[#2d7a4f]/30 px-3 py-1.5 rounded-lg hover:bg-[#e8f5ee] transition-colors"
          >
            <Sparkles size={13} />
            AI add
          </Link>
          <Link
            href="/dashboard/tasks/new"
            className="flex items-center gap-1.5 text-xs bg-[#2d7a4f] text-white px-3 py-1.5 rounded-lg hover:bg-[#1f5537] transition-colors"
          >
            <Plus size={13} />
            New task
          </Link>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-2 bg-white border-b border-gray-100 shrink-0">
        {[
          { label: 'To do', colour: '#9ca3af' },
          { label: 'In progress', colour: '#2d7a4f' },
          { label: 'Done', colour: '#16a34a' },
          { label: 'Blocked', colour: '#ef4444' },
        ].map(({ label, colour }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: colour }} />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
        <span className="text-xs text-gray-400 ml-auto">Click any task to edit · Scroll to zoom · Drag to pan</span>
      </div>

      {/* Mind map canvas */}
      <div className="flex-1 overflow-hidden">
        <MindMap project={project} tasks={tasks} />
      </div>
    </div>
  )
}
