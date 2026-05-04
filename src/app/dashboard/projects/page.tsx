'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, FolderKanban, Sparkles, Users, Share2 } from 'lucide-react'

type Project = {
  id: string
  name: string
  colour: string
  icon: string
  description?: string
  tasks?: { id: string; status: string }[]
  access_type?: string
  sharing_colour?: string | null
}

const SHARE_BADGE: Record<string, { label: string; color: string; bg: string; icon: typeof Users }> = {
  pro_share:  { label: 'Pro shared',  color: '#7c3aed', bg: 'rgba(124,58,237,.08)', icon: Share2 },
  team_share: { label: 'Team shared', color: '#2563eb', bg: 'rgba(37,99,235,.08)',  icon: Users },
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => {
        // Safely normalise — ensure tasks is always an array
        const safe = Array.isArray(data)
          ? data.map((p: any) => ({ ...p, tasks: Array.isArray(p.tasks) ? p.tasks : [] }))
          : []
        setProjects(safe)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function createProject() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      const project = await res.json()
      setProjects(prev => [{ ...project, tasks: [] }, ...prev])
      setNewName('')
      setShowNew(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 900, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.02em', marginBottom: 6 }}>Projects</h1>
          <div style={{ width: 24, height: 2, background: '#c9a84c', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/dashboard/extract" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: '#f0faf4', color: '#1f5537',
            border: '1px solid rgba(45,122,79,0.2)', textDecoration: 'none',
          }}>
            <Sparkles size={13} />AI Extract
          </Link>
          <button
            onClick={() => setShowNew(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: '#2d7a4f', color: '#fff', border: 'none', cursor: 'pointer',
            }}
          >
            <Plus size={13} />New project
          </button>
        </div>
      </div>

      {/* New project input */}
      {showNew && (
        <div style={{
          background: '#fff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)',
          padding: '10px 14px', marginBottom: 16,
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createProject(); if (e.key === 'Escape') setShowNew(false) }}
            placeholder="Project name…"
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 14, color: '#1a1a1a', fontFamily: 'DM Sans, sans-serif',
            }}
          />
          <button onClick={() => setShowNew(false)} style={{ fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={createProject}
            disabled={!newName.trim() || creating}
            style={{
              fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 7,
              background: '#2d7a4f', color: '#fff', border: 'none', cursor: 'pointer',
              opacity: !newName.trim() ? 0.5 : 1, fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 110, borderRadius: 12, background: '#f0f0ee', animation: 'shimmer 1.4s ease infinite', backgroundSize: '400px 100%', backgroundImage: 'linear-gradient(90deg,#f0f0ee 25%,#e8e8e5 50%,#f0f0ee 75%)' }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && projects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FolderKanban size={40} style={{ color: '#e0e0dd', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#aaa', marginBottom: 20 }}>No projects yet.</p>
          <Link href="/dashboard/extract" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#2d7a4f', color: '#fff', padding: '9px 18px',
            borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none',
          }}>
            <Sparkles size={13} />Add tasks with AI
          </Link>
        </div>
      )}

      {/* Grid */}
      {!loading && projects.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {projects.map(project => {
            const tasks = project.tasks ?? []
            const done = tasks.filter(t => t.status === 'done').length
            const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
            const shareInfo = project.access_type ? SHARE_BADGE[project.access_type] : null
            const ShareIcon = shareInfo?.icon

            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                style={{
                  background: '#fff',
                  border: `1px solid ${project.sharing_colour ? project.sharing_colour + '30' : 'rgba(0,0,0,0.08)'}`,
                  borderRadius: 12, padding: '16px 18px',
                  textDecoration: 'none', display: 'block',
                  transition: 'border-color 0.12s, box-shadow 0.12s, transform 0.12s',
                  boxShadow: project.sharing_colour ? `0 2px 8px ${project.sharing_colour}12` : 'none',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = 'translateY(-2px)'
                  el.style.boxShadow = '0 4px 14px rgba(0,0,0,0.09)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = 'none'
                  el.style.boxShadow = project.sharing_colour ? `0 2px 8px ${project.sharing_colour}12` : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 9,
                      background: (project.colour ?? '#2d7a4f') + '18',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                    }}>
                      {project.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.2 }}>{project.name}</div>
                      {project.description && (
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{project.description}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 11, color: '#bbb' }}>{tasks.length} tasks</span>
                    {shareInfo && ShareIcon && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        background: shareInfo.bg, borderRadius: 5, padding: '2px 7px',
                      }}>
                        <ShareIcon size={9} style={{ color: shareInfo.color }} />
                        <span style={{ fontSize: 9, fontWeight: 600, color: shareInfo.color }}>{shareInfo.label}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div style={{ height: 3, background: 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'hidden', marginBottom: 5 }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: project.sharing_colour ?? project.colour ?? '#2d7a4f',
                    borderRadius: 2, transition: 'width 0.5s ease',
                  }} />
                </div>
                <p style={{ fontSize: 11, color: '#bbb' }}>{pct}% complete</p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
