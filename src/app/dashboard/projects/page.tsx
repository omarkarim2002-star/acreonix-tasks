'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, FolderKanban, GitMerge, Loader2, Check, X, Trash2 } from 'lucide-react'
import { ProjectMergeModal } from '@/components/ui/ProjectMergeModal'
import type { Project, Task } from '@/types'

const PROJECT_COLOURS = ['#2d7a4f', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16']
const PROJECT_ICONS = ['📁', '🚀', '💡', '🎯', '⚡', '🔥', '🌱', '🏗️', '📊', '🎨', '🛠️', '💼']

export default function ProjectsPage() {
  const [projects, setProjects] = useState<(Project & { tasks: Task[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColour, setNewColour] = useState('#2d7a4f')
  const [newIcon, setNewIcon] = useState('📁')
  const [creating, setCreating] = useState(false)
  const [showMerge, setShowMerge] = useState(false)

  function loadProjects() {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => { setProjects(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadProjects() }, [])

  async function handleDelete(id: string, name: string) {

    if (!confirm(`Delete project "${name}"? Tasks in this project will be unassigned.`)) return

    try {

      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })

      if (!res.ok) throw new Error('Delete failed')

      setProjects(prev => prev.filter(p => p.id !== id))

    } catch {

      alert('Failed to delete project')

    }

  }

  

  async function createProject() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), colour: newColour, icon: newIcon }),
      })
      const project = await res.json()
      setProjects(prev => [{ ...project, tasks: [] }, ...prev])
      setNewName(''); setNewIcon('📁'); setNewColour('#2d7a4f')
      setShowNew(false)
    } finally { setCreating(false) }
  }

  const S = { fontFamily: 'DM Sans, sans-serif' }

  return (
    <>
      <div style={{ padding: '28px 32px 60px', maxWidth: 900, margin: '0 auto', ...S }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2" style={{ color: '#101312', letterSpacing: '-0.5px' }}>Projects</h1>
            <div style={{ width: 24, height: 2, background: '#c9a84c', borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowMerge(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 500, background: '#f3f3f1', color: '#555', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              <GitMerge size={14} />Merge
            </button>
            <button onClick={() => setShowNew(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: '#2d7a4f', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 2px 8px rgba(45,122,79,0.25)' }}>
              <Plus size={14} />New project
            </button>
          </div>
        </div>

        {/* New project form */}
        {showNew && (
          <div style={{ background: '#fff', border: '1px solid rgba(45,122,79,0.2)', borderRadius: 14, padding: '20px', marginBottom: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>New project</p>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc' }}><X size={16} /></button>
            </div>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createProject()}
              placeholder="Project name…"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.12)', fontSize: 14, color: '#1a1a1a', outline: 'none', fontFamily: 'DM Sans, sans-serif', marginBottom: 14, boxSizing: 'border-box' as const }}
            />
            {/* Icon picker */}
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>Icon</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PROJECT_ICONS.map(icon => (
                  <button key={icon} onClick={() => setNewIcon(icon)} style={{ width: 36, height: 36, borderRadius: 8, fontSize: 18, border: `2px solid ${newIcon === icon ? '#2d7a4f' : 'transparent'}`, background: newIcon === icon ? '#f0faf4' : '#f9f9f7', cursor: 'pointer' }}>{icon}</button>
                ))}
              </div>
            </div>
            {/* Colour picker */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>Colour</p>
              <div style={{ display: 'flex', gap: 7 }}>
                {PROJECT_COLOURS.map(c => (
                  <button key={c} onClick={() => setNewColour(c)} style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: newColour === c ? '3px solid #1a1a1a' : '3px solid transparent', cursor: 'pointer', padding: 0 }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowNew(false)} style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', color: '#666', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
              <button onClick={createProject} disabled={!newName.trim() || creating} style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, background: !newName.trim() || creating ? '#e8e8e5' : '#2d7a4f', color: !newName.trim() || creating ? '#aaa' : '#fff', border: 'none', cursor: !newName.trim() || creating ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {creating ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />Creating…</> : 'Create project'}
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 10 }}>
            <Loader2 size={18} style={{ color: '#2d7a4f', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13, color: '#aaa' }}>Loading projects…</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && projects.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <FolderKanban size={40} style={{ color: '#e0e0de', margin: '0 auto 14px' }} />
            <p style={{ fontSize: 15, fontWeight: 500, color: '#aaa', marginBottom: 6 }}>No projects yet</p>
            <p style={{ fontSize: 13, color: '#ccc', marginBottom: 20 }}>Create your first project or use AI to extract tasks from text</p>
            <button onClick={() => setShowNew(true)} style={{ padding: '10px 20px', borderRadius: 9, background: '#2d7a4f', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
              + Create project
            </button>
          </div>
        )}

        {/* Project grid */}
        {!loading && projects.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {projects.map(project => {
              const total = project.tasks?.length ?? 0
              const done = project.tasks?.filter(t => t.status === 'done').length ?? 0
              const pct = total > 0 ? Math.round((done / total) * 100) : 0

              return (
                <Link key={project.id} href={`/dashboard/projects/${project.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{
                    background: '#fff', borderRadius: 14,
                    border: `1px solid rgba(0,0,0,0.07)`,
                    borderLeft: `4px solid ${project.colour ?? '#2d7a4f'}`,
                    padding: '18px 18px 14px',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '' }}
                  >
                    {/* Delete button — top right */}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(project.id, project.name) }}
                      style={{
                        position: 'absolute', top: 12, right: 12,
                        width: 26, height: 26, borderRadius: 6,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0.5, transition: 'opacity 0.15s, background 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.5'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      title="Delete project"
                    >
                      <Trash2 size={14} style={{ color: '#dc2626' }} />
                    </button>

                    {/* Icon + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingRight: 28 }}>
                      <span style={{ fontSize: 24 }}>{project.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{project.name}</span>
                    </div>

                    {/* Task count */}
                    <p style={{ fontSize: 12, color: '#aaa', marginBottom: 10 }}>
                      {total} task{total !== 1 ? 's' : ''} · {done} done
                    </p>

                    {/* Progress bar */}
                    <div style={{ height: 4, background: '#f0f0ee', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: project.colour ?? '#2d7a4f', borderRadius: 2, transition: 'width 0.4s ease' }} />
                    </div>
                    <p style={{ fontSize: 11, color: '#ccc', margin: 0 }}>{pct}% complete</p>
                  </div>
                </Link>
              )
            })}

            {/* Add project card */}
            <button onClick={() => setShowNew(true)} style={{
              background: 'transparent', border: '2px dashed rgba(0,0,0,0.1)', borderRadius: 14,
              padding: '18px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 120,
              transition: 'border-color 0.15s', fontFamily: 'DM Sans, sans-serif',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(45,122,79,0.4)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.1)'}
            >
              <Plus size={20} style={{ color: '#ccc' }} />
              <span style={{ fontSize: 12.5, color: '#ccc', fontWeight: 500 }}>New project</span>
            </button>
          </div>
        )}
      </div>

      {showMerge && (
        <ProjectMergeModal
          onClose={() => setShowMerge(false)}
          onMerged={() => { loadProjects(); setShowMerge(false) }}
        />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}
