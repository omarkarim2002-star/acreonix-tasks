'use client'

import { useState, useEffect } from 'react'
import { X, GitMerge, Loader2, Check, ChevronDown } from 'lucide-react'

type Project = { id: string; name: string; icon: string; colour: string }

type Props = {
  onClose: () => void
  onMerged: () => void
  initialSourceId?: string
}

export function ProjectMergeModal({ onClose, onMerged, initialSourceId }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [sourceId, setSourceId] = useState(initialSourceId ?? '')
  const [targetId, setTargetId] = useState('')
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [merged, setMerged] = useState(false)
  const [result, setResult] = useState<{ taskCount: number; name: string } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setProjects(data)
      })
  }, [])

  // Auto-suggest merged name
  useEffect(() => {
    if (!sourceId || !targetId) return
    const src = projects.find(p => p.id === sourceId)
    const tgt = projects.find(p => p.id === targetId)
    if (src && tgt) setNewName(tgt.name)
  }, [sourceId, targetId, projects])

  async function handleMerge() {
    if (!sourceId || !targetId || sourceId === targetId) {
      setError('Please select two different projects')
      return
    }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/projects/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, targetId, newName: newName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Merge failed')
      setResult({ taskCount: data.taskCount, name: data.mergedProjectName })
      setMerged(true)
    } catch (e: any) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  const source = projects.find(p => p.id === sourceId)
  const target = projects.find(p => p.id === targetId)

  const S = { fontFamily: 'DM Sans, sans-serif' }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, ...S, animation: 'fadeIn 0.2s ease',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460,
        boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
        animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GitMerge size={17} style={{ color: '#2d7a4f' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Merge projects</h2>
              <p style={{ fontSize: 11.5, color: '#aaa', margin: '2px 0 0' }}>All tasks move to the target project</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc' }}><X size={17} /></button>
        </div>

        {!merged ? (
          <div style={{ padding: '20px 24px 24px' }}>

            {/* Visual merge diagram */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              {/* Source */}
              <div style={{ flex: 1, background: '#f9f9f7', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                {source ? (
                  <>
                    <span style={{ fontSize: 22 }}>{source.icon}</span>
                    <p style={{ fontSize: 11.5, fontWeight: 600, color: '#1a1a1a', marginTop: 4, marginBottom: 0 }}>{source.name}</p>
                    <p style={{ fontSize: 10, color: '#bbb', margin: '2px 0 0' }}>will be archived</p>
                  </>
                ) : (
                  <p style={{ fontSize: 12, color: '#ccc', margin: 0 }}>Select source</p>
                )}
              </div>

              {/* Arrow */}
              <div style={{ flexShrink: 0, color: '#2d7a4f', fontSize: 20 }}>→</div>

              {/* Target */}
              <div style={{ flex: 1, background: target ? '#f0faf4' : '#f9f9f7', border: `1px solid ${target ? 'rgba(45,122,79,0.25)' : 'rgba(0,0,0,0.09)'}`, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                {target ? (
                  <>
                    <span style={{ fontSize: 22 }}>{target.icon}</span>
                    <p style={{ fontSize: 11.5, fontWeight: 600, color: '#1f5537', marginTop: 4, marginBottom: 0 }}>{newName || target.name}</p>
                    <p style={{ fontSize: 10, color: '#2d7a4f', margin: '2px 0 0' }}>merged project</p>
                  </>
                ) : (
                  <p style={{ fontSize: 12, color: '#ccc', margin: 0 }}>Select target</p>
                )}
              </div>
            </div>

            {/* Source selector */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#aaa', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Merge FROM (will be archived)
              </label>
              <div style={{ position: 'relative' }}>
                <select value={sourceId} onChange={e => setSourceId(e.target.value)}
                  style={{ width: '100%', padding: '9px 32px 9px 11px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 9, fontSize: 13.5, color: '#1a1a1a', outline: 'none', fontFamily: 'DM Sans, sans-serif', background: '#fff', cursor: 'pointer', appearance: 'none' as const }}>
                  <option value="">Select project…</option>
                  {projects.filter(p => p.id !== targetId).map(p => (
                    <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Target selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#aaa', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Merge INTO (keeps all tasks)
              </label>
              <div style={{ position: 'relative' }}>
                <select value={targetId} onChange={e => setTargetId(e.target.value)}
                  style={{ width: '100%', padding: '9px 32px 9px 11px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 9, fontSize: 13.5, color: '#1a1a1a', outline: 'none', fontFamily: 'DM Sans, sans-serif', background: '#fff', cursor: 'pointer', appearance: 'none' as const }}>
                  <option value="">Select project…</option>
                  {projects.filter(p => p.id !== sourceId).map(p => (
                    <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* New name */}
            {sourceId && targetId && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#aaa', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Merged project name
                </label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder={target?.name ?? 'Project name…'}
                  style={{ width: '100%', padding: '9px 11px', border: '1px solid rgba(45,122,79,0.3)', borderRadius: 9, fontSize: 13.5, color: '#1a1a1a', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: 11, color: '#bbb', marginTop: 5 }}>All tasks from "{source?.name}" will move here. "{source?.name}" will be archived.</p>
              </div>
            )}

            {error && <p style={{ fontSize: 12, color: '#b91c1c', marginBottom: 10 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 9, fontSize: 13, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', color: '#666', fontFamily: 'DM Sans, sans-serif' }}>
                Cancel
              </button>
              <button onClick={handleMerge} disabled={loading || !sourceId || !targetId || sourceId === targetId}
                style={{ flex: 1, padding: '10px 0', borderRadius: 9, fontSize: 13.5, fontWeight: 600, border: 'none', cursor: loading || !sourceId || !targetId ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', background: loading || !sourceId || !targetId ? '#e8e8e5' : '#2d7a4f', color: loading || !sourceId || !targetId ? '#aaa' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Merging…</> : <><GitMerge size={14} />Merge projects</>}
              </button>
            </div>
          </div>
        ) : (
          /* Success state */
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Check size={24} style={{ color: '#2d7a4f' }} />
            </div>
            <p style={{ fontSize: 17, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>Merge complete</p>
            <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 20 }}>
              All tasks are now in <strong style={{ color: '#1a1a1a' }}>{result?.name}</strong>.
              The source project has been archived.
            </p>
            <button onClick={() => { onMerged(); onClose() }} style={{ padding: '10px 24px', borderRadius: 9, background: '#2d7a4f', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
              View merged project →
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px) scale(0.97)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}
