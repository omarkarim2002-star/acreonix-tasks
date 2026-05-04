'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, GitFork, Sparkles } from 'lucide-react'
import { ProjectColourPicker } from '@/components/projects/ProjectColourPicker'
import type { Project, Task } from '@/types'

const DEFAULT_COLOUR = '#2d7a4f'
const DEFAULT_ICON = '📁'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<(Project & { tasks: Task[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColour, setNewColour] = useState(DEFAULT_COLOUR)
  const [newIcon, setNewIcon] = useState(DEFAULT_ICON)
  const [showPicker, setShowPicker] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(d => { setProjects(d); setLoading(false) })
  }, [])

  async function createProject() {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, colour: newColour, icon: newIcon }),
    })
    const p = await res.json()
    setProjects(prev => [{ ...p, tasks: [] }, ...prev])
    setNewName(''); setNewColour(DEFAULT_COLOUR); setNewIcon(DEFAULT_ICON)
    setShowNew(false); setShowPicker(false); setCreating(false)
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 gold-underline" style={{ fontFamily: 'Georgia, serif' }}>Projects</h1>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 text-sm bg-[#2d7a4f] text-white px-3 py-1.5 rounded-lg hover:bg-[#1f5537] transition-colors"
        >
          <Plus size={14} />New project
        </button>
      </div>

      {/* New project form */}
      {showNew && (
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <button
                onClick={() => setShowPicker(!showPicker)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl hover:opacity-80 transition-opacity"
                style={{ background: newColour + '22' }}
              >
                {newIcon}
              </button>
              {showPicker && (
                <div className="absolute top-12 left-0 z-50">
                  <ProjectColourPicker
                    colour={newColour}
                    icon={newIcon}
                    onChange={(c, i) => { setNewColour(c); setNewIcon(i) }}
                  />
                </div>
              )}
            </div>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createProject()}
              placeholder="Project name..."
              className="flex-1 text-base font-medium focus:outline-none placeholder:text-gray-300"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowNew(false); setShowPicker(false) }} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">Cancel</button>
            <button
              onClick={createProject}
              disabled={!newName.trim() || creating}
              className="text-xs bg-[#2d7a4f] text-white px-4 py-1.5 rounded-lg hover:bg-[#1f5537] disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map(project => {
            const tasks = project.tasks ?? []
            const done = tasks.filter(t => t.status === 'done').length
            const inProgress = tasks.filter(t => t.status === 'in_progress').length
            const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0

            return (
              <div key={project.id} className="bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group">
                <Link href={`/dashboard/projects/${project.id}`} className="block px-5 pt-4 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{ background: project.colour + '22' }}
                      >
                        {project.icon}
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-gray-900">{project.name}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          {inProgress > 0 && (
                            <span className="text-[10px] text-[#2d7a4f] bg-[#e8f5ee] px-1.5 py-0.5 rounded-full font-medium">
                              {inProgress} in progress
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">{tasks.length} tasks</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: project.colour }} />
                  </div>

                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: project.colour }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">{pct}% complete</p>
                </Link>

                {/* Footer actions */}
                <div className="px-5 pb-3 flex items-center gap-2 border-t border-gray-50 pt-2.5">
                  <Link
                    href={`/dashboard/projects/${project.id}/mindmap`}
                    className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#2d7a4f] transition-colors"
                  >
                    <GitFork size={11} />Mind map
                  </Link>
                  <span className="text-gray-200">·</span>
                  <Link
                    href={`/dashboard/projects/${project.id}`}
                    className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    View tasks
                  </Link>
                </div>
              </div>
            )
          })}

          {projects.length === 0 && (
            <div className="col-span-2 text-center py-16">
              <p className="text-gray-400 text-sm mb-4">No projects yet</p>
              <Link
                href="/dashboard/extract"
                className="inline-flex items-center gap-2 text-sm text-[#2d7a4f] bg-[#e8f5ee] px-4 py-2 rounded-lg hover:bg-[#d0e8da] transition-colors"
              >
                <Sparkles size={14} />Add tasks with AI to get started
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
