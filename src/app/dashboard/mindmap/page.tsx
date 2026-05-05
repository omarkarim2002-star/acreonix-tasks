'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, BackgroundVariant,
  Handle, Position, NodeProps, NodeChange, EdgeChange,
  applyNodeChanges, applyEdgeChanges,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ArrowLeft, Loader2, Plus, Sparkles, Check, X, Users, Share2, Lock } from 'lucide-react'
import Link from 'next/link'

// ── Colour constants ────────────────────────────────────────────────────────
const SHARE_COLOUR: Record<string, string | null> = {
  own: null, pro_share: '#7c3aed', team_share: '#2563eb',
}
const PRIORITY_COLOUR: Record<string, string> = {
  urgent: '#dc2626', high: '#ea580c', medium: '#3b82f6', low: '#9ca3af',
}
const STATUS_DOT: Record<string, string> = {
  todo: '#9ca3af', in_progress: '#2d7a4f', done: '#16a34a', blocked: '#ef4444',
}

// ── Inline editable text ───────────────────────────────────────────────────
function InlineEdit({ value, onSave, style }: { value: string; onSave: (v: string) => void; style?: React.CSSProperties }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function commit() {
    setEditing(false)
    if (val.trim() && val.trim() !== value) onSave(val.trim())
    else setVal(value)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setVal(value) } }}
        style={{
          border: 'none', outline: 'none', background: 'rgba(255,255,255,0.9)',
          borderRadius: 4, padding: '1px 4px', width: '100%',
          fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit',
          fontFamily: 'DM Sans, sans-serif',
          ...style,
        }}
        onClick={e => e.stopPropagation()}
      />
    )
  }

  return (
    <span
      onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
      title="Double-click to rename"
      style={{ cursor: 'text', ...style }}
    >
      {value}
    </span>
  )
}

// ── Add task/AI mini panel ─────────────────────────────────────────────────
function AddTaskPanel({ projectId, projectName, colour, onAdd, onClose }: {
  projectId: string; projectName: string; colour: string
  onAdd: (task: any) => void; onClose: () => void
}) {
  const [mode, setMode] = useState<'manual' | 'ai'>('manual')
  const [title, setTitle] = useState('')
  const [aiText, setAiText] = useState('')
  const [loading, setLoading] = useState(false)

  async function saveManual() {
    if (!title.trim()) return
    setLoading(true)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), project_id: projectId, priority: 'medium', status: 'todo' }),
    })
    const task = await res.json()
    onAdd(task)
    onClose()
    setLoading(false)
  }

  async function saveAI() {
    if (!aiText.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/extract-tasks/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText }),
      })
      const data = await res.json()
      const tasks = (data.tasks ?? []).map((t: any) => ({ ...t, suggestedProject: projectName }))
      if (tasks.length > 0) {
        await fetch('/api/extract-tasks/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks, originalText: aiText }),
        })
        onAdd({ _refresh: true })
      }
    } finally {
      setLoading(false)
      onClose()
    }
  }

  return (
    <div
      style={{
        position: 'absolute', zIndex: 1000, width: 240,
        background: '#fff', borderRadius: 10, padding: 12,
        border: `1px solid ${colour}40`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        fontFamily: 'DM Sans, sans-serif',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        <button onClick={() => setMode('manual')} style={{
          flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 600, borderRadius: 6,
          border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          background: mode === 'manual' ? colour : '#f3f3f1',
          color: mode === 'manual' ? '#fff' : '#888',
        }}>Manual</button>
        <button onClick={() => setMode('ai')} style={{
          flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 600, borderRadius: 6,
          border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          background: mode === 'ai' ? colour : '#f3f3f1',
          color: mode === 'ai' ? '#fff' : '#888',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        }}><Sparkles size={10} />AI</button>
      </div>

      {mode === 'manual' ? (
        <>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveManual(); if (e.key === 'Escape') onClose() }}
            placeholder="Task title…"
            style={{
              width: '100%', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 7,
              padding: '7px 9px', fontSize: 12.5, outline: 'none', boxSizing: 'border-box',
              fontFamily: 'DM Sans, sans-serif',
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '6px 0', fontSize: 11, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, background: '#fff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
            <button onClick={saveManual} disabled={!title.trim() || loading} style={{
              flex: 2, padding: '6px 0', fontSize: 11, fontWeight: 600, border: 'none',
              borderRadius: 6, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              background: !title.trim() ? '#e8e8e5' : colour, color: !title.trim() ? '#aaa' : '#fff',
            }}>
              {loading ? '…' : 'Add task'}
            </button>
          </div>
        </>
      ) : (
        <>
          <textarea
            autoFocus
            value={aiText}
            onChange={e => setAiText(e.target.value)}
            placeholder={`Describe tasks for "${projectName}"…`}
            style={{
              width: '100%', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 7,
              padding: '7px 9px', fontSize: 12, outline: 'none', resize: 'none',
              minHeight: 70, boxSizing: 'border-box', fontFamily: 'DM Sans, sans-serif',
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '6px 0', fontSize: 11, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, background: '#fff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
            <button onClick={saveAI} disabled={!aiText.trim() || loading} style={{
              flex: 2, padding: '6px 0', fontSize: 11, fontWeight: 600, border: 'none',
              borderRadius: 6, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              background: !aiText.trim() ? '#e8e8e5' : colour, color: !aiText.trim() ? '#aaa' : '#fff',
            }}>
              {loading ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={11} />}
              {loading ? 'Generating…' : 'Generate tasks'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Node types ─────────────────────────────────────────────────────────────
function RootNode({ data }: NodeProps) {
  const [showNewProject, setShowNewProject] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [creating, setCreating] = useState(false)

  async function createProject() {
    if (!projectName.trim()) return
    setCreating(true)
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: projectName.trim() }),
    })
    setCreating(false)
    setShowNewProject(false)
    setProjectName('')
    data.onRefresh?.()
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        background: '#fff', border: '2px solid #2d7a4f', borderRadius: 14,
        padding: '10px 22px', textAlign: 'center', minWidth: 150,
        boxShadow: '0 4px 16px rgba(45,122,79,.12)',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <Handle type="source" position={Position.Bottom} style={{ background: '#2d7a4f', border: 'none', width: 7, height: 7 }} />
        <div style={{ fontSize: 10, fontWeight: 700, color: '#2d7a4f', letterSpacing: 2 }}>ACREONIX</div>
        <div style={{ fontSize: 8.5, color: '#c9a84c', letterSpacing: 2.5, marginTop: 1 }}>TASKS</div>
        <button
          onClick={e => { e.stopPropagation(); setShowNewProject(s => !s) }}
          title="Add new project"
          style={{
            position: 'absolute', top: -10, right: -10,
            width: 20, height: 20, borderRadius: '50%',
            background: '#2d7a4f', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(45,122,79,.3)',
          }}
        >
          <Plus size={11} />
        </button>
      </div>

      {showNewProject && (
        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8, zIndex: 1000, width: 220, background: '#fff', borderRadius: 10, padding: 12, border: '1px solid rgba(45,122,79,.2)', boxShadow: '0 8px 24px rgba(0,0,0,.14)', fontFamily: 'DM Sans, sans-serif' }}
          onClick={e => e.stopPropagation()}
        >
          <p style={{ fontSize: 11, fontWeight: 600, color: '#2d7a4f', marginBottom: 8 }}>New project</p>
          <input
            autoFocus value={projectName} onChange={e => setProjectName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createProject(); if (e.key === 'Escape') setShowNewProject(false) }}
            placeholder="Project name…"
            style={{ width: '100%', border: '1px solid rgba(0,0,0,.12)', borderRadius: 7, padding: '7px 9px', fontSize: 12.5, outline: 'none', boxSizing: 'border-box', fontFamily: 'DM Sans, sans-serif' }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onClick={() => setShowNewProject(false)} style={{ flex: 1, padding: '6px 0', fontSize: 11, border: '1px solid rgba(0,0,0,.1)', borderRadius: 6, background: '#fff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
            <button onClick={createProject} disabled={!projectName.trim() || creating} style={{ flex: 2, padding: '6px 0', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#2d7a4f', color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectNode({ data }: NodeProps) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const nodeRef = useRef<HTMLDivElement>(null)
  const accessType = data.accessType ?? 'own'
  const shareColour = SHARE_COLOUR[accessType]
  const borderColor = shareColour ?? data.colour ?? '#2d7a4f'
  const bgColor = shareColour ? shareColour + '10' : (data.colour ?? '#2d7a4f') + '14'

  async function renameProject(newName: string) {
    await fetch(`/api/projects/${data.projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
    data.onRename?.(data.projectId, newName)
  }

  const ShareIcon = accessType === 'pro_share' ? Share2 : accessType === 'team_share' ? Users : null

  return (
    <div ref={nodeRef} style={{ position: 'relative', fontFamily: 'DM Sans, sans-serif' }}>
      <div
        style={{
          background: bgColor, border: `2px solid ${borderColor}`,
          borderRadius: 12, padding: '10px 14px',
          textAlign: 'center', minWidth: 148, cursor: 'pointer',
          boxShadow: shareColour ? `0 2px 12px ${shareColour}25` : '0 2px 8px rgba(0,0,0,.06)',
        }}
        onDoubleClick={() => router.push(`/dashboard/projects/${data.projectId}`)}
      >
        <Handle type="target" position={Position.Top} style={{ background: borderColor, border: 'none', width: 6, height: 6 }} />
        <Handle type="source" position={Position.Bottom} style={{ background: borderColor, border: 'none', width: 6, height: 6 }} />
        <div style={{ fontSize: 18, marginBottom: 3 }}>{data.icon}</div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#141b2d' }}>
          <InlineEdit value={data.label} onSave={renameProject} />
        </div>
        <div style={{ fontSize: 9.5, color: '#9aa3b4', marginTop: 2 }}>{data.taskCount} tasks</div>
        {ShareIcon && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 5, background: borderColor + '18', borderRadius: 10, padding: '2px 7px' }}>
            <ShareIcon size={9} style={{ color: borderColor }} />
            <span style={{ fontSize: 8.5, color: borderColor, fontWeight: 600 }}>{accessType === 'pro_share' ? 'Pro shared' : 'Team shared'}</span>
          </div>
        )}
      </div>

      {/* Add task button */}
      {data.isOwn !== false && (
        <button
          onClick={e => { e.stopPropagation(); setShowAdd(s => !s) }}
          title="Add task to this project"
          style={{
            position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
            width: 20, height: 20, borderRadius: '50%',
            background: borderColor, color: '#fff',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 6px ${borderColor}40`, zIndex: 10,
          }}
        >
          <Plus size={11} />
        </button>
      )}

      {showAdd && (
        <div style={{ position: 'absolute', top: '105%', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
          <AddTaskPanel
            projectId={data.projectId}
            projectName={data.label}
            colour={borderColor}
            onAdd={(task) => { data.onTaskAdded?.(task); setShowAdd(false) }}
            onClose={() => setShowAdd(false)}
          />
        </div>
      )}
    </div>
  )
}

function TaskNode({ data }: NodeProps) {
  const router = useRouter()
  const [status, setStatus] = useState(data.status ?? 'todo')
  const [completing, setCompleting] = useState(false)

  const CYCLE: Record<string, string> = {
    todo: 'in_progress', in_progress: 'done', done: 'todo', blocked: 'todo',
  }

  async function cycleStatus(e: React.MouseEvent) {
    e.stopPropagation()
    const next = CYCLE[status] ?? 'todo'
    setCompleting(next === 'done')
    setStatus(next)
    await fetch(`/api/tasks/${data.taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, completed_at: next === 'done' ? new Date().toISOString() : null }),
    })
    setTimeout(() => setCompleting(false), 600)
    data.onStatusChange?.(data.taskId, next)
  }

  const isDone = status === 'done'

  return (
    <div
      style={{
        background: isDone ? '#f0faf4' : '#fff',
        border: `1px solid ${isDone ? '#c6e6d4' : '#e8edf2'}`,
        borderRadius: 8, padding: '7px 10px',
        minWidth: 138, maxWidth: 185,
        fontFamily: 'DM Sans, sans-serif',
        opacity: isDone ? 0.75 : 1,
        transition: 'all 0.25s',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#d1d5db', border: 'none', width: 5, height: 5 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
        {/* Completion circle */}
        <button
          onClick={cycleStatus}
          title={isDone ? 'Mark as to-do' : status === 'in_progress' ? 'Mark as done' : 'Mark in progress'}
          style={{
            width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 1,
            border: `1.5px solid ${isDone ? '#2d7a4f' : status === 'in_progress' ? '#2d7a4f' : '#d1d5db'}`,
            background: isDone ? '#2d7a4f' : status === 'in_progress' ? 'rgba(45,122,79,0.1)' : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', padding: 0,
            transform: completing ? 'scale(1.3)' : 'scale(1)',
          }}
        >
          {isDone && (
            <svg width="8" height="7" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l2.5 3L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {status === 'in_progress' && !isDone && (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2d7a4f' }} />
          )}
        </button>
        <span style={{
          fontSize: 10.5, color: isDone ? '#888' : '#2d3748', lineHeight: 1.4, cursor: 'pointer',
          textDecoration: isDone ? 'line-through' : 'none',
        }}
          onClick={() => router.push(`/dashboard/tasks/${data.taskId}`)}
        >
          {data.label}
        </span>
      </div>
      {data.priority && data.priority !== 'medium' && !isDone && (
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 3, marginLeft: 23 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: PRIORITY_COLOUR[data.priority] ?? '#9ca3af' }} />
          <span style={{ fontSize: 9, color: '#bbb', textTransform: 'capitalize' }}>{data.priority}</span>
        </div>
      )}
    </div>
  )
}

const nodeTypes = { rootNode: RootNode, projectNode: ProjectNode, taskNode: TaskNode }

// ── Layout persistence key ─────────────────────────────────────────────────
const LAYOUT_KEY = 'acreonix_mindmap_layout'

function loadLayout(): Record<string, { x: number; y: number }> {
  try { return JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? '{}') } catch { return {} }
}
function saveLayout(nodes: Node[]) {
  const pos: Record<string, { x: number; y: number }> = {}
  for (const n of nodes) pos[n.id] = n.position
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(pos))
}

// ── Graph builder ─────────────────────────────────────────────────────────
function buildGraph(
  projects: any[],
  savedPos: Record<string, { x: number; y: number }>,
  callbacks: { onRefresh: () => void; onRename: (id: string, name: string) => void; onTaskAdded: (t: any) => void; onStatusChange: (taskId: string, status: string) => void }
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  nodes.push({
    id: 'root', type: 'rootNode',
    position: savedPos['root'] ?? { x: 0, y: 0 },
    data: { onRefresh: callbacks.onRefresh },
  })

  const spacing = Math.max(270, Math.min(330, 1200 / Math.max(projects.length, 1)))
  const startX = -((projects.length - 1) * spacing) / 2

  projects.forEach((p, pi) => {
    const defaultPos = { x: startX + pi * spacing - 74, y: 190 }
    const pPos = savedPos[`p-${p.id}`] ?? defaultPos
    const accessType = p.access_type ?? 'own'
    const shareColour = SHARE_COLOUR[accessType]
    const edgeColor = shareColour ?? (p.colour ?? '#2d7a4f')

    nodes.push({
      id: `p-${p.id}`, type: 'projectNode',
      position: pPos,
      data: {
        label: p.name, colour: p.colour, icon: p.icon,
        taskCount: p.tasks?.length ?? 0, projectId: p.id,
        accessType, isOwn: p.access_type === 'own' || !p.access_type,
        onRename: callbacks.onRename,
        onTaskAdded: callbacks.onTaskAdded,
      },
    })

    edges.push({
      id: `ep-${p.id}`, source: 'root', target: `p-${p.id}`,
      style: { stroke: edgeColor + '70', strokeWidth: shareColour ? 2 : 1.5 },
      animated: (p.tasks ?? []).some((t: any) => t.status === 'in_progress'),
    })

    const visible = (p.tasks ?? []).slice(0, 5)
    const ts = 170, tx = (savedPos[`p-${p.id}`]?.x ?? (startX + pi * spacing - 74)) + 74

    visible.forEach((task: any, ti: number) => {
      const tId = `t-${task.id}`
      const defaultTPos = { x: tx + ti * ts - 69 - ((visible.length - 1) * ts / 2), y: 360 + (ti % 2 === 0 ? 0 : 28) }
      nodes.push({
        id: tId, type: 'taskNode',
        position: savedPos[tId] ?? defaultTPos,
        data: { label: task.title, status: task.status, taskId: task.id, priority: task.priority, onStatusChange: callbacks.onStatusChange },
      })
      edges.push({
        id: `et-${task.id}`, source: `p-${p.id}`, target: tId,
        style: { stroke: shareColour ? shareColour + '40' : '#e8edf2', strokeWidth: 1.2 },
      })
    })
  })

  return { nodes, edges }
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function GlobalMindMapPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<any[]>([])
  const [allTasks, setAllTasks] = useState<any[]>([])
  const [nodes, setNodes] = useNodesState([])
  const [edges, setEdges] = useEdgesState([])
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleStatusChange = useCallback((taskId: string, newStatus: string) => {
    setNodes(ns => ns.map(n =>
      n.id === `t-${taskId}` ? { ...n, data: { ...n.data, status: newStatus } } : n
    ))
  }, [setNodes])

  const loadData = useCallback(async () => {
    const [projRes, taskRes] = await Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
    ])
    const projs = Array.isArray(projRes) ? projRes : []
    const tasks = Array.isArray(taskRes) ? taskRes : []
    const enriched = projs.map((p: any) => ({
      ...p, tasks: tasks.filter((t: any) => t.project_id === p.id),
    }))
    setProjects(enriched)
    setAllTasks(tasks)
    return enriched
  }, [])

  // Rename handler — update node label without full reload
  const handleRename = useCallback((projectId: string, newName: string) => {
    setNodes(ns => ns.map(n =>
      n.id === `p-${projectId}` ? { ...n, data: { ...n.data, label: newName } } : n
    ))
  }, [setNodes])

  // Task added — refresh graph
  const handleTaskAdded = useCallback((task: any) => {
    if (task?._refresh) {
      loadData().then(enriched => {
        const saved = loadLayout()
        const { nodes: n, edges: e } = buildGraph(enriched, saved, { onRefresh: () => loadData(), onRename: handleRename, onTaskAdded: handleTaskAdded, onStatusChange: handleStatusChange })
        setNodes(n); setEdges(e)
      })
    } else {
      // Optimistic: add task node to its project
      setProjects(prev => prev.map(p =>
        p.id === task.project_id ? { ...p, tasks: [...(p.tasks ?? []), task] } : p
      ))
    }
  }, [loadData, setNodes, setEdges, handleRename])

  useEffect(() => {
    setLoading(true)
    loadData().then(enriched => {
      const saved = loadLayout()
      const { nodes: n, edges: e } = buildGraph(enriched, saved, { onRefresh: () => loadData(), onRename: handleRename, onTaskAdded: handleTaskAdded, onStatusChange: handleStatusChange })
      setNodes(n); setEdges(e)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [loadData, setNodes, setEdges, handleRename, handleTaskAdded])

  // Auto-save layout on node drag (debounced 800ms)
  function onNodesChange(changes: NodeChange[]) {
    setNodes(ns => {
      const updated = applyNodeChanges(changes, ns)
      // Debounce save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => saveLayout(updated), 800)
      return updated
    })
  }

  function onEdgesChange(changes: EdgeChange[]) {
    setEdges(es => applyEdgeChanges(changes, es))
  }

  const proShared = projects.filter(p => p.access_type === 'pro_share').length
  const teamShared = projects.filter(p => p.access_type === 'team_share').length

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#f7f7f5', zIndex: 40 }}>
      <Loader2 size={22} style={{ color: '#2d7a4f', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: '#9aa3b4', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>Loading mind map…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#f7f7f5', zIndex: 40, fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 24px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={14} />Back
          </button>
          <span style={{ width: 1, height: 16, background: 'rgba(0,0,0,.1)' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#141b2d' }}>All projects — mind map</span>
          <span style={{ fontSize: 12, color: '#9aa3b4' }}>{projects.length} projects · {allTasks.length} tasks</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#bbb' }}>Layout auto-saves · Double-click to rename · ⊕ to add</span>
          <Link href="/dashboard" style={{ fontSize: 12, color: '#6b7280', border: '1px solid rgba(0,0,0,.09)', padding: '6px 14px', borderRadius: 8, textDecoration: 'none' }}>Dashboard</Link>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 18, padding: '7px 24px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,.05)', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
        {[['#9ca3af','To do'],['#2d7a4f','In progress'],['#16a34a','Done'],['#ef4444','Blocked']].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{l}</span>
          </div>
        ))}
        {proShared > 0 && <div style={{ display:'flex',alignItems:'center',gap:5 }}><div style={{ width:10,height:10,borderRadius:2,background:'#7c3aed' }}/><span style={{ fontSize:11,color:'#9ca3af' }}>Pro shared ({proShared})</span></div>}
        {teamShared > 0 && <div style={{ display:'flex',alignItems:'center',gap:5 }}><div style={{ width:10,height:10,borderRadius:2,background:'#2563eb' }}/><span style={{ fontSize:11,color:'#9ca3af' }}>Team shared ({teamShared})</span></div>}
        <span style={{ fontSize: 11, color: 'rgba(0,0,0,.18)', marginLeft: 'auto' }}>Drag to rearrange · ⊕ to add tasks/projects</span>
      </div>

      {/* ReactFlow */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {nodes.length === 0 ? (
          <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14 }}>
            <p style={{ color:'#9aa3b4',fontSize:14 }}>No projects yet</p>
            <button onClick={() => router.push('/dashboard/extract')} style={{ background:'#2d7a4f',color:'#fff',border:'none',borderRadius:10,padding:'9px 22px',cursor:'pointer',fontSize:13,fontFamily:'DM Sans,sans-serif' }}>
              Add tasks with AI
            </button>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1} maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(0,0,0,.07)" />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={n => {
                if (n.type === 'rootNode') return '#2d7a4f'
                const at = (n.data as any).accessType
                if (at === 'pro_share') return '#7c3aed'
                if (at === 'team_share') return '#2563eb'
                return (n.data as any).colour ?? '#2d7a4f'
              }}
              maskColor="rgba(247,247,245,.75)"
            />
          </ReactFlow>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
