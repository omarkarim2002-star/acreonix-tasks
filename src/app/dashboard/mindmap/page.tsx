'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  BackgroundVariant, Handle, Position, NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const STATUS_DOT: Record<string, string> = {
  todo: '#9ca3af', in_progress: '#2d7a4f', done: '#16a34a', blocked: '#ef4444',
}
const STATUS_BG: Record<string, string> = {
  todo: '#f9fafb', in_progress: '#e8f5ee', done: '#f0fdf4', blocked: '#fff1f2',
}

function RootNode({ data }: NodeProps) {
  return (
    <div style={{ background: '#fff', border: '2px solid #2d7a4f', borderRadius: 16, padding: '12px 24px', textAlign: 'center', minWidth: 160 }}>
      <Handle type="source" position={Position.Bottom} style={{ background: '#2d7a4f', border: 'none', width: 8, height: 8 }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: '#2d7a4f', letterSpacing: 2, fontFamily: 'Georgia, serif' }}>ACREONIX</div>
      <div style={{ fontSize: 9, color: '#c9a84c', letterSpacing: 3 }}>TASKS</div>
    </div>
  )
}

function ProjectNode({ data }: NodeProps) {
  const router = useRouter()
  return (
    <div
      onClick={() => router.push(`/dashboard/projects/${data.projectId}`)}
      style={{ background: data.colour + '18', border: `2px solid ${data.colour}`, borderRadius: 16, padding: '12px 16px', textAlign: 'center', minWidth: 150, cursor: 'pointer' }}
    >
      <Handle type="target" position={Position.Top} style={{ background: data.colour, border: 'none', width: 7, height: 7 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: data.colour, border: 'none', width: 7, height: 7 }} />
      <div style={{ fontSize: 20, marginBottom: 2 }}>{data.icon}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1f2e' }}>{data.label}</div>
      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{data.taskCount} tasks</div>
    </div>
  )
}

function TaskNode({ data }: NodeProps) {
  const router = useRouter()
  return (
    <div
      onClick={() => router.push(`/dashboard/tasks/${data.taskId}`)}
      style={{ background: STATUS_BG[data.status] ?? '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '8px 12px', cursor: 'pointer', minWidth: 140, maxWidth: 180 }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#d1d5db', border: 'none', width: 5, height: 5 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_DOT[data.status] ?? '#9ca3af', marginTop: 3, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: '#1f2937', lineHeight: 1.4 }}>{data.label}</span>
      </div>
    </div>
  )
}

const nodeTypes = { rootNode: RootNode, projectNode: ProjectNode, taskNode: TaskNode }

export default function GlobalMindMapPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
    ]).then(([projs, allTasks]) => {
      if (Array.isArray(projs) && Array.isArray(allTasks)) {
        setProjects(projs.map((p: any) => ({
          ...p,
          tasks: allTasks.filter((t: any) => t.project_id === p.id),
        })))
      }
      setLoading(false)
    })
  }, [])

  const { nodes: initNodes, edges: initEdges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []
    if (!projects.length) return { nodes, edges }

    nodes.push({ id: 'root', type: 'rootNode', position: { x: 400, y: 40 }, data: {} })

    const spacing = Math.max(280, Math.min(360, 1200 / projects.length))
    const startX = 400 - ((projects.length - 1) * spacing) / 2

    projects.forEach((p, pi) => {
      const px = startX + pi * spacing
      nodes.push({
        id: `p-${p.id}`, type: 'projectNode',
        position: { x: px - 75, y: 180 },
        data: { label: p.name, colour: p.colour, icon: p.icon, taskCount: p.tasks.length, projectId: p.id },
      })
      edges.push({ id: `ep-${p.id}`, source: 'root', target: `p-${p.id}`, style: { stroke: p.colour + '80', strokeWidth: 2 }, animated: p.tasks.some((t: any) => t.status === 'in_progress') })

      const visible = p.tasks.slice(0, 5)
      const ts = 180
      const tx = px - ((visible.length - 1) * ts) / 2
      visible.forEach((task: any, ti: number) => {
        nodes.push({
          id: `t-${task.id}`, type: 'taskNode',
          position: { x: tx + ti * ts - 70, y: 340 + (ti % 2 === 0 ? 0 : 30) },
          data: { label: task.title, status: task.status, taskId: task.id },
        })
        edges.push({ id: `et-${task.id}`, source: `p-${p.id}`, target: `t-${task.id}`, style: { stroke: '#d1d5db', strokeWidth: 1.5 } })
      })
    })
    return { nodes, edges }
  }, [projects])

  const [nodes, , onNodesChange] = useNodesState(initNodes)
  const [edges, , onEdgesChange] = useEdgesState(initEdges)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <Loader2 size={24} className="animate-spin text-[#2d7a4f]" />
      <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading mind map…</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8faf9' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: '#fff', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>
            <ArrowLeft size={14} />Back
          </button>
          <span style={{ color: '#e5e7eb' }}>|</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1f2e', fontFamily: 'Georgia, serif' }}>All projects — mind map</span>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>{projects.length} projects · {projects.reduce((a, p) => a + p.tasks.length, 0)} tasks</span>
        </div>
        <Link href="/dashboard" style={{ fontSize: 12, color: '#6b7280', border: '1px solid #e5e7eb', padding: '6px 12px', borderRadius: 8, textDecoration: 'none' }}>
          Dashboard
        </Link>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, padding: '8px 24px', background: '#fff', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
        {[['#9ca3af','To do'],['#2d7a4f','In progress'],['#16a34a','Done'],['#ef4444','Blocked']].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
            <span style={{ fontSize: 11, color: '#6b7280' }}>{l}</span>
          </div>
        ))}
        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>Click to open · Scroll to zoom</span>
      </div>

      {/* React Flow — explicit pixel height is the key fix */}
      <div style={{ flex: 1, height: 0, minHeight: 0 }}>
        {projects.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <p style={{ color: '#9ca3af', fontSize: 14 }}>No projects yet</p>
            <button onClick={() => router.push('/dashboard/extract')} style={{ background: '#2d7a4f', color: '#fff', border: 'none', borderRadius: 12, padding: '8px 20px', cursor: 'pointer', fontSize: 13 }}>
              Add tasks with AI
            </button>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1} maxZoom={2}
            proOptions={{ hideAttribution: true }}
            style={{ width: '100%', height: '100%' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e5e7eb" />
            <Controls showInteractive={false} />
            <MiniMap nodeColor={(n) => n.type === 'projectNode' ? (n.data as any).colour : STATUS_DOT[(n.data as any).status] ?? '#d1d5db'} maskColor="rgba(248,250,249,0.7)" />
          </ReactFlow>
        )}
      </div>
    </div>
  )
}
