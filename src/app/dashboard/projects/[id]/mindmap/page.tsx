'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge, Connection,
  BackgroundVariant, Handle, Position, NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ArrowLeft, List, Plus, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'

const STATUS_DOT: Record<string, string> = {
  todo: '#9ca3af', in_progress: '#2d7a4f', done: '#16a34a', blocked: '#ef4444',
}
const STATUS_BG: Record<string, string> = {
  todo: '#f9fafb', in_progress: '#e8f5ee', done: '#f0fdf4', blocked: '#fff1f2',
}
const STATUS_LABELS: Record<string, string> = {
  todo: 'To do', in_progress: 'In progress', done: 'Done', blocked: 'Blocked',
}

function ProjectNode({ data }: NodeProps) {
  return (
    <div style={{ background: data.colour + '18', border: `2px solid ${data.colour}`, borderRadius: 16, padding: '12px 20px', textAlign: 'center', minWidth: 160 }}>
      <Handle type="source" position={Position.Bottom} style={{ background: data.colour, border: 'none', width: 8, height: 8 }} />
      <div style={{ fontSize: 22, marginBottom: 4 }}>{data.icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1f2e', fontFamily: 'Georgia, serif' }}>{data.label}</div>
      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{data.taskCount} tasks</div>
    </div>
  )
}

function GroupNode({ data }: NodeProps) {
  return (
    <div style={{ background: data.colour + '10', border: `1px solid ${data.colour}40`, borderRadius: 12, padding: '8px 16px', textAlign: 'center', minWidth: 120 }}>
      <Handle type="target" position={Position.Top} style={{ background: data.colour, border: 'none', width: 6, height: 6 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: data.colour, border: 'none', width: 6, height: 6 }} />
      <div style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{data.label}</div>
      <div style={{ fontSize: 10, color: '#9ca3af' }}>{data.count} task{data.count !== 1 ? 's' : ''}</div>
    </div>
  )
}

function TaskNode({ data }: NodeProps) {
  const router = useRouter()
  return (
    <div
      onClick={() => router.push(`/dashboard/tasks/${data.taskId}`)}
      style={{ background: STATUS_BG[data.status] ?? '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '8px 12px', cursor: 'pointer', minWidth: 150, maxWidth: 200 }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#d1d5db', border: 'none', width: 5, height: 5 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_DOT[data.status] ?? '#9ca3af', marginTop: 3, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: '#1f2937', lineHeight: 1.4 }}>{data.label}</span>
      </div>
      {data.deadline && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, marginLeft: 14 }}>{data.deadline}</div>}
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
      .map(s => ({ status: s, tasks: tasks.filter(t => t.status === s) }))
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

      const ts = Math.max(180, 160)
      const tx = gx - ((gt.length - 1) * ts) / 2
      gt.forEach((task: any, ti: number) => {
        nodes.push({
          id: `t-${task.id}`, type: 'taskNode',
          position: { x: tx + ti * ts - 75, y: 330 + (ti % 2 === 0 ? 0 : 25) },
          data: { label: task.title, status: task.status, taskId: task.id, deadline: task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : null },
        })
        edges.push({ id: `et-${task.id}`, source: gid, target: `t-${task.id}`, style: { stroke: '#d1d5db', strokeWidth: 1.5 } })
      })
    })
    return { nodes, edges }
  }, [project, tasks])

  const [nodes, , onNodesChange] = useNodesState(initNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges)
  const onConnect = useCallback((p: Connection) => setEdges(eds => addEdge(p, eds)), [setEdges])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <Loader2 size={24} className="animate-spin text-[#2d7a4f]" />
      <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading mind map…</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8faf9' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: '#fff', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>
            <ArrowLeft size={14} />Back
          </button>
          {project && <><span style={{ color: '#e5e7eb' }}>|</span><span style={{ fontSize: 18 }}>{project.icon}</span><span style={{ fontSize: 13, fontWeight: 600, color: '#1a1f2e' }}>{project.name}</span><span style={{ fontSize: 11, color: '#9ca3af' }}>{tasks.length} tasks</span></>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/dashboard/projects/${id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280', border: '1px solid #e5e7eb', padding: '6px 12px', borderRadius: 8, textDecoration: 'none' }}>
            <List size={12} />List
          </Link>
          <Link href="/dashboard/tasks/new" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#fff', background: '#2d7a4f', padding: '6px 12px', borderRadius: 8, textDecoration: 'none' }}>
            <Plus size={12} />New task
          </Link>
        </div>
      </div>

      <div style={{ flex: 1, height: 0, minHeight: 0 }}>
        {tasks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div style={{ fontSize: 36 }}>{project?.icon}</div>
            <p style={{ color: '#9ca3af', fontSize: 14 }}>No tasks in this project yet</p>
            <Link href="/dashboard/extract" style={{ background: '#2d7a4f', color: '#fff', borderRadius: 12, padding: '8px 20px', textDecoration: 'none', fontSize: 13 }}>Add tasks with AI</Link>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} nodeTypes={nodeTypes}
            fitView fitViewOptions={{ padding: 0.3 }}
            minZoom={0.2} maxZoom={2}
            proOptions={{ hideAttribution: true }}
            style={{ width: '100%', height: '100%' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
            <Controls showInteractive={false} />
            <MiniMap nodeColor={(n) => n.type === 'projectNode' ? project?.colour : STATUS_DOT[(n.data as any).status] ?? '#d1d5db'} maskColor="rgba(248,250,249,0.7)" />
          </ReactFlow>
        )}
      </div>
    </div>
  )
}
