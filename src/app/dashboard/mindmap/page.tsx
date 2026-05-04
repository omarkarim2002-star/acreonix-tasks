'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  BackgroundVariant, Handle, Position, NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ArrowLeft, Loader2, Users } from 'lucide-react'
import Link from 'next/link'

const STATUS_DOT: Record<string, string> = {
  todo: '#9ca3af', in_progress: '#2d7a4f', done: '#16a34a', blocked: '#ef4444',
}
const STATUS_BG: Record<string, string> = {
  todo: '#f9fafb', in_progress: '#e8f4ee', done: '#f0fdf4', blocked: '#fff1f2',
}

// Purple palette for shared projects
const SHARED_COLOUR = '#7c3aed'
const SHARED_BG = 'rgba(124,58,237,0.1)'
const SHARED_BORDER = 'rgba(124,58,237,0.5)'

function RootNode({ data }: NodeProps) {
  return (
    <div style={{
      background: '#fff', border: '2px solid #2d7a4f', borderRadius: 14,
      padding: '10px 22px', textAlign: 'center', minWidth: 150,
      boxShadow: '0 4px 16px rgba(45,122,79,0.12)',
    }}>
      <Handle type="source" position={Position.Bottom} style={{ background: '#2d7a4f', border: 'none', width: 7, height: 7 }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: '#2d7a4f', letterSpacing: 2 }}>ACREONIX</div>
      <div style={{ fontSize: 8.5, color: '#c9a84c', letterSpacing: 2.5, marginTop: 1 }}>TASKS</div>
    </div>
  )
}

function ProjectNode({ data }: NodeProps) {
  const router = useRouter()
  const isShared = data.isShared
  const borderColor = isShared ? SHARED_COLOUR : data.colour
  const bgColor = isShared ? SHARED_BG : data.colour + '15'

  return (
    <div
      onClick={() => router.push(`/dashboard/projects/${data.projectId}`)}
      style={{
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: 12, padding: '10px 14px',
        textAlign: 'center', minWidth: 148,
        cursor: 'pointer',
        boxShadow: isShared
          ? '0 2px 12px rgba(124,58,237,0.15)'
          : '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: borderColor, border: 'none', width: 6, height: 6 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: borderColor, border: 'none', width: 6, height: 6 }} />
      <div style={{ fontSize: 18, marginBottom: 3 }}>{data.icon}</div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#141b2d' }}>{data.label}</div>
      <div style={{ fontSize: 9.5, color: '#9aa3b4', marginTop: 2 }}>{data.taskCount} tasks</div>
      {isShared && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
          marginTop: 5, background: 'rgba(124,58,237,0.12)',
          borderRadius: 10, padding: '2px 7px',
        }}>
          <Users size={9} style={{ color: SHARED_COLOUR }} />
          <span style={{ fontSize: 8.5, color: SHARED_COLOUR, fontWeight: 600 }}>Shared</span>
        </div>
      )}
    </div>
  )
}

function TaskNode({ data }: NodeProps) {
  const router = useRouter()
  return (
    <div
      onClick={() => router.push(`/dashboard/tasks/${data.taskId}`)}
      style={{
        background: STATUS_BG[data.status] ?? '#f9fafb',
        border: '1px solid #e8edf2', borderRadius: 8,
        padding: '7px 10px', cursor: 'pointer',
        minWidth: 138, maxWidth: 185,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#d1d5db', border: 'none', width: 5, height: 5 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: STATUS_DOT[data.status] ?? '#9ca3af',
          marginTop: 3, flexShrink: 0,
        }} />
        <span style={{ fontSize: 10.5, color: '#2d3748', lineHeight: 1.4 }}>{data.label}</span>
      </div>
    </div>
  )
}

const nodeTypes = { rootNode: RootNode, projectNode: ProjectNode, taskNode: TaskNode }

function buildGraph(projects: any[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  nodes.push({ id: 'root', type: 'rootNode', position: { x: 0, y: 0 }, data: {} })

  const spacing = Math.max(270, Math.min(330, 1200 / Math.max(projects.length, 1)))
  const startX = -((projects.length - 1) * spacing) / 2

  projects.forEach((p, pi) => {
    const px = startX + pi * spacing
    const isShared = p.isShared === true
    const edgeColor = isShared ? SHARED_COLOUR : (p.colour ?? '#2d7a4f')

    nodes.push({
      id: `p-${p.id}`, type: 'projectNode',
      position: { x: px - 74, y: 190 },
      data: {
        label: p.name, colour: p.colour, icon: p.icon,
        taskCount: p.tasks?.length ?? 0, projectId: p.id,
        isShared,
      },
    })

    edges.push({
      id: `ep-${p.id}`, source: 'root', target: `p-${p.id}`,
      style: { stroke: edgeColor + '70', strokeWidth: isShared ? 2 : 1.5 },
      animated: !isShared && (p.tasks ?? []).some((t: any) => t.status === 'in_progress'),
    })

    const visible = (p.tasks ?? []).slice(0, 5)
    const ts = 170
    const tx = px - ((visible.length - 1) * ts) / 2

    visible.forEach((task: any, ti: number) => {
      nodes.push({
        id: `t-${task.id}`, type: 'taskNode',
        position: { x: tx + ti * ts - 69, y: 360 + (ti % 2 === 0 ? 0 : 28) },
        data: { label: task.title, status: task.status, taskId: task.id },
      })
      edges.push({
        id: `et-${task.id}`, source: `p-${p.id}`, target: `t-${task.id}`,
        style: { stroke: isShared ? SHARED_BORDER : '#e8edf2', strokeWidth: 1.2 },
      })
    })
  })

  return { nodes, edges }
}

export default function GlobalMindMapPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [projectCount, setProjectCount] = useState(0)
  const [taskCount, setTaskCount] = useState(0)
  const [sharedCount, setSharedCount] = useState(0)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    Promise.all([
      fetch('/api/projects?shared=true').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
    ]).then(([projs, allTasks]) => {
      if (!Array.isArray(projs) || !Array.isArray(allTasks)) { setLoading(false); return }

      const projects = projs.map((p: any) => ({
        ...p,
        tasks: allTasks.filter((t: any) => t.project_id === p.id),
      }))

      setProjectCount(projects.length)
      setTaskCount(allTasks.length)
      setSharedCount(projects.filter((p: any) => p.isShared).length)

      const { nodes: n, edges: e } = buildGraph(projects)
      setNodes(n)
      setEdges(e)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [setNodes, setEdges])

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#f7f7f5', zIndex: 40 }}>
      <Loader2 size={22} style={{ color: '#2d7a4f' }} className="animate-spin" />
      <p style={{ color: '#9aa3b4', fontSize: 13 }}>Loading mind map…</p>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#f7f7f5', zIndex: 40 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={14} />Back
          </button>
          <span style={{ width: 1, height: 16, background: 'rgba(0,0,0,0.1)' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#141b2d' }}>All projects — mind map</span>
          <span style={{ fontSize: 12, color: '#9aa3b4' }}>
            {projectCount} projects · {taskCount} tasks
            {sharedCount > 0 && ` · ${sharedCount} shared`}
          </span>
        </div>
        <Link href="/dashboard" style={{ fontSize: 12, color: '#6b7280', border: '1px solid rgba(0,0,0,0.09)', padding: '6px 14px', borderRadius: 8, textDecoration: 'none', background: '#fff' }}>
          Dashboard
        </Link>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, padding: '8px 24px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.05)', flexShrink: 0, flexWrap: 'wrap' }}>
        {[
          ['#9ca3af','To do'],
          ['#2d7a4f','In progress'],
          ['#16a34a','Done'],
          ['#ef4444','Blocked'],
        ].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
            <span style={{ fontSize: 11, color: '#9aa3b4' }}>{l}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: 2, background: SHARED_COLOUR }} />
          <span style={{ fontSize: 11, color: '#9aa3b4' }}>Shared with team</span>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.2)', marginLeft: 'auto' }}>Click to open · Scroll to zoom</span>
      </div>

      {/* ReactFlow */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {nodes.length === 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <p style={{ color: '#9aa3b4', fontSize: 14 }}>No projects yet</p>
            <button onClick={() => router.push('/dashboard/extract')} style={{ background: '#2d7a4f', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 20px', cursor: 'pointer', fontSize: 13 }}>
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
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(0,0,0,0.07)" />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={n => {
                if (n.type === 'rootNode') return '#2d7a4f'
                if (n.type === 'projectNode') return (n.data as any).isShared ? SHARED_COLOUR : ((n.data as any).colour ?? '#2d7a4f')
                return STATUS_DOT[(n.data as any).status] ?? '#d1d5db'
              }}
              maskColor="rgba(247,247,245,0.75)"
            />
          </ReactFlow>
        )}
      </div>
    </div>
  )
}
