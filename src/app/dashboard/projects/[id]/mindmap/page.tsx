'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge, Connection,
  BackgroundVariant, Handle, Position, NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ArrowLeft, List, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'

const STATUS_DOT: Record<string, string> = {
  todo: '#9ca3af', in_progress: '#2d7a4f', done: '#16a34a', blocked: '#ef4444',
}
const STATUS_BG: Record<string, string> = {
  todo: '#f9fafb', in_progress: '#e8f4ee', done: '#f0fdf4', blocked: '#fff1f2',
}
const STATUS_LABELS: Record<string, string> = {
  todo: 'To do', in_progress: 'In progress', done: 'Done', blocked: 'Blocked',
}

function ProjectNode({ data }: NodeProps) {
  return (
    <div style={{ background: data.colour + '18', border: `2px solid ${data.colour}`, borderRadius: 16, padding: '14px 20px', textAlign: 'center', minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
      <Handle type="source" position={Position.Bottom} style={{ background: data.colour, border: 'none', width: 8, height: 8 }} />
      <div style={{ fontSize: 22, marginBottom: 4 }}>{data.icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#141b2d', fontFamily: 'Georgia,serif' }}>{data.label}</div>
      <div style={{ fontSize: 10, color: '#9aa3b4', marginTop: 2 }}>{data.taskCount} tasks</div>
    </div>
  )
}

function GroupNode({ data }: NodeProps) {
  return (
    <div style={{ background: data.colour + '10', border: `1px solid ${data.colour}50`, borderRadius: 10, padding: '8px 16px', textAlign: 'center', minWidth: 120 }}>
      <Handle type="target" position={Position.Top} style={{ background: data.colour, border: 'none', width: 6, height: 6 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: data.colour, border: 'none', width: 6, height: 6 }} />
      <div style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{data.label}</div>
      <div style={{ fontSize: 10, color: '#9aa3b4' }}>{data.count} task{data.count !== 1 ? 's' : ''}</div>
    </div>
  )
}

function TaskNode({ data }: NodeProps) {
  const router = useRouter()
  return (
    <div onClick={() => router.push(`/dashboard/tasks/${data.taskId}`)}
      style={{ background: STATUS_BG[data.status] ?? '#f9fafb', border: '1px solid #e8edf2', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', minWidth: 150, maxWidth: 200 }}>
      <Handle type="target" position={Position.Top} style={{ background: '#d1d5db', border: 'none', width: 5, height: 5 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_DOT[data.status] ?? '#9ca3af', marginTop: 4, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: '#2d3748', lineHeight: 1.45 }}>{data.label}</span>
      </div>
      {data.deadline && <div style={{ fontSize: 10, color: '#9aa3b4', marginTop: 4, marginLeft: 14 }}>{data.deadline}</div>}
    </div>
  )
}

const nodeTypes = { projectNode: ProjectNode, groupNode: GroupNode, taskNode: TaskNode }

export default function MindMapPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then(r => r.json()),
      fetch(`/api/tasks?project_id=${id}`).then(r => r.json()),
    ]).then(([proj, taskData]) => {
      setProject(proj)
      setTasks(Array.isArray(taskData) ? taskData : [])
      setLoading(false)
    })
  }, [id])

  const { nodes: initNodes, edges: initEdges } = useMemo(() => {
    if (!project) return { nodes: [], edges: [] }
    const nodes: Node[] = []
    const edges: Edge[] = []

    nodes.push({
      id: 'project', type: 'projectNode',
      position: { x: 400, y: 40 },
      data: { label: project.name, colour: project.colour, icon: project.icon, taskCount: tasks.length },
    })

    const groups = ['todo','in_progress','done','blocked']
      .map(s => ({ status: s, tasks: tasks.filter((t: any) => t.status === s) }))
      .filter(g => g.tasks.length > 0)

    const gSpacing = Math.max(240, 900 / Math.max(groups.length, 1))
    const gStartX = 400 - ((groups.length - 1) * gSpacing) / 2

    groups.forEach(({ status, tasks: gt }, gi) => {
      const gx = gStartX + gi * gSpacing
      const gid = `g-${status}`
      nodes.push({
        id: gid, type: 'groupNode',
        position: { x: gx - 60, y: 200 },
        data: { label: STATUS_LABELS[status], colour: project.colour, count: gt.length },
      })
      edges.push({ id: `eg-${status}`, source: 'project', target: gid, style: { stroke: project.colour + '60', strokeWidth: 2 }, animated: status === 'in_progress' })

      const ts = 185
      const tx = gx - ((gt.length - 1) * ts) / 2
      gt.forEach((task: any, ti: number) => {
        nodes.push({
          id: `t-${task.id}`, type: 'taskNode',
          position: { x: tx + ti * ts - 75, y: 340 + (ti % 2 === 0 ? 0 : 28) },
          data: { label: task.title, status: task.status, taskId: task.id, deadline: task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : null },
        })
        edges.push({ id: `et-${task.id}`, source: gid, target: `t-${task.id}`, style: { stroke: '#e8edf2', strokeWidth: 1.5 } })
      })
    })
    return { nodes, edges }
  }, [project, tasks])

  const [nodes, , onNodesChange] = useNodesState(initNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges)
  const onConnect = useCallback((p: Connection) => setEdges(eds => addEdge(p, eds)), [setEdges])

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#f4f6f8', zIndex: 40 }}>
      <Loader2 size={22} style={{ color: '#2d7a4f', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: '#9aa3b4', fontSize: 13 }}>Loading mind map…</p>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#f4f6f8', zIndex: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: '#fff', borderBottom: '1px solid #e8edf2', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5a6478', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={14} />Back
          </button>
          {project && (
            <>
              <span style={{ width: 1, height: 16, background: '#e8edf2' }} />
              <span style={{ fontSize: 18 }}>{project.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#141b2d', fontFamily: 'Georgia,serif' }}>{project.name}</span>
              <span style={{ fontSize: 12, color: '#9aa3b4' }}>{tasks.length} tasks</span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/dashboard/projects/${id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5a6478', border: '1px solid #e8edf2', padding: '6px 12px', borderRadius: 8, textDecoration: 'none', background: '#fff' }}>
            <List size={12} />List view
          </Link>
          <Link href="/dashboard/tasks/new" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#fff', background: '#2d7a4f', padding: '6px 14px', borderRadius: 8, textDecoration: 'none' }}>
            <Plus size={12} />New task
          </Link>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, padding: '8px 24px', background: '#fff', borderBottom: '1px solid #e8edf2', flexShrink: 0 }}>
        {Object.entries(STATUS_LABELS).map(([s, l]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_DOT[s] }} />
            <span style={{ fontSize: 11, color: '#9aa3b4' }}>{l}</span>
          </div>
        ))}
        <span style={{ fontSize: 11, color: '#c8d0dc', marginLeft: 'auto' }}>Click any task to edit · Scroll to zoom</span>
      </div>

      {/* ReactFlow */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {tasks.length === 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ fontSize: 36 }}>{project?.icon}</div>
            <p style={{ color: '#9aa3b4', fontSize: 14 }}>No tasks in this project yet</p>
            <Link href="/dashboard/extract" style={{ background: '#2d7a4f', color: '#fff', borderRadius: 10, padding: '8px 20px', textDecoration: 'none', fontSize: 13 }}>Add tasks with AI</Link>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} nodeTypes={nodeTypes}
            fitView fitViewOptions={{ padding: 0.3 }}
            minZoom={0.15} maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#e8edf2" />
            <Controls showInteractive={false} />
            <MiniMap nodeColor={(n) => n.type === 'projectNode' ? project?.colour : STATUS_DOT[(n.data as any).status] ?? '#d1d5db'} maskColor="rgba(244,246,248,0.8)" />
          </ReactFlow>
        )}
      </div>
    </div>
  )
}
