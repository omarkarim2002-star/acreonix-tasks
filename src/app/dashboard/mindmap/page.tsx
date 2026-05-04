'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  BackgroundVariant, Handle, Position, NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ArrowLeft, LayoutDashboard } from 'lucide-react'
import type { Project, Task } from '@/types'

const STATUS_DOT: Record<string, string> = {
  todo: '#9ca3af',
  in_progress: '#2d7a4f',
  done: '#16a34a',
  blocked: '#ef4444',
}

const STATUS_BG: Record<string, string> = {
  todo: '#f9fafb',
  in_progress: '#e8f5ee',
  done: '#f0fdf4',
  blocked: '#fff1f2',
}

function RootNode({ data }: NodeProps) {
  return (
    <div className="px-6 py-3 rounded-2xl text-center shadow-lg border-2 border-[#2d7a4f] bg-white min-w-[160px]">
      <Handle type="source" position={Position.Bottom} style={{ background: '#2d7a4f', border: 'none', width: 8, height: 8 }} />
      <div className="text-xs font-bold text-[#2d7a4f] uppercase tracking-widest" style={{ fontFamily: 'Georgia, serif' }}>Acreonix</div>
      <div className="text-[10px] text-[#c9a84c] tracking-widest uppercase">Tasks</div>
    </div>
  )
}

function ProjectNode({ data }: NodeProps) {
  const router = useRouter()
  return (
    <div
      className="px-4 py-3 rounded-2xl shadow-md border-2 min-w-[140px] text-center cursor-pointer hover:shadow-lg transition-shadow"
      style={{ background: data.colour + '15', borderColor: data.colour }}
      onClick={() => router.push(`/dashboard/projects/${data.projectId}`)}
    >
      <Handle type="target" position={Position.Top} style={{ background: data.colour, border: 'none', width: 7, height: 7 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: data.colour, border: 'none', width: 7, height: 7 }} />
      <div className="text-xl mb-0.5">{data.icon}</div>
      <div className="text-xs font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>{data.label}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{data.taskCount} tasks</div>
      {data.inProgress > 0 && (
        <div className="text-[9px] text-[#2d7a4f] bg-[#e8f5ee] px-1.5 py-0.5 rounded-full mt-1 inline-block font-medium">
          {data.inProgress} active
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
      className="px-3 py-2 rounded-xl border cursor-pointer hover:shadow-md transition-all min-w-[140px] max-w-[180px]"
      style={{ background: STATUS_BG[data.status] ?? '#f9fafb', borderColor: '#e5e7eb' }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#d1d5db', border: 'none', width: 5, height: 5 }} />
      <div className="flex items-start gap-1.5">
        <div className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{ background: STATUS_DOT[data.status] ?? '#9ca3af' }} />
        <span className="text-[11px] text-gray-800 leading-snug line-clamp-2">{data.label}</span>
      </div>
      {data.deadline && (
        <div className="text-[10px] text-gray-400 mt-1 ml-3.5">{data.deadline}</div>
      )}
    </div>
  )
}

const nodeTypes = { rootNode: RootNode, projectNode: ProjectNode, taskNode: TaskNode }

export default function GlobalMindMapPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<(Project & { tasks: Task[] })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
    ]).then(([projs, allTasks]) => {
      const withTasks = projs.map((p: Project) => ({
        ...p,
        tasks: allTasks.filter((t: Task) => t.project_id === p.id),
      }))
      setProjects(withTasks)
      setLoading(false)
    })
  }, [])

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    // Root node
    nodes.push({
      id: 'root',
      type: 'rootNode',
      position: { x: 0, y: 0 },
      data: {},
    })

    const projCount = projects.length
    const projSpacing = Math.max(260, 1400 / Math.max(projCount, 1))
    const startX = -((projCount - 1) * projSpacing) / 2

    projects.forEach((project, pi) => {
      const px = startX + pi * projSpacing
      const py = 160

      nodes.push({
        id: `proj-${project.id}`,
        type: 'projectNode',
        position: { x: px - 70, y: py },
        data: {
          label: project.name,
          colour: project.colour,
          icon: project.icon,
          taskCount: project.tasks.length,
          projectId: project.id,
          inProgress: project.tasks.filter(t => t.status === 'in_progress').length,
        },
      })

      edges.push({
        id: `e-root-proj-${project.id}`,
        source: 'root',
        target: `proj-${project.id}`,
        style: { stroke: project.colour + '80', strokeWidth: 2 },
        animated: project.tasks.some(t => t.status === 'in_progress'),
      })

      // Show up to 6 tasks per project to avoid overwhelming
      const visibleTasks = project.tasks.slice(0, 6)
      const taskSpacing = Math.max(160, 200)
      const taskStartX = px - ((visibleTasks.length - 1) * taskSpacing) / 2

      visibleTasks.forEach((task, ti) => {
        nodes.push({
          id: `task-${task.id}`,
          type: 'taskNode',
          position: {
            x: taskStartX + ti * taskSpacing - 70,
            y: py + 140 + (ti % 2 === 0 ? 0 : 25),
          },
          data: {
            label: task.title,
            status: task.status,
            taskId: task.id,
            deadline: task.deadline
              ? new Date(task.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              : null,
          },
        })

        edges.push({
          id: `e-proj-task-${task.id}`,
          source: `proj-${project.id}`,
          target: `task-${task.id}`,
          style: { stroke: '#d1d5db', strokeWidth: 1.5 },
        })
      })

      if (project.tasks.length > 6) {
        nodes.push({
          id: `more-${project.id}`,
          type: 'default',
          position: { x: px + (visibleTasks.length * taskSpacing) / 2 - 40, y: py + 140 },
          data: { label: `+${project.tasks.length - 6} more` },
          style: {
            background: project.colour + '15',
            border: `1px dashed ${project.colour}`,
            borderRadius: 12,
            fontSize: 11,
            color: project.colour,
            padding: '6px 12px',
            cursor: 'pointer',
          },
        })
      }
    })

    return { nodes, edges }
  }, [projects])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-[#2d7a4f] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#f8faf9]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={14} />Back
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <h1 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
            All projects — mind map
          </h1>
          <span className="text-xs text-gray-400">{projects.length} projects · {projects.reduce((a, p) => a + p.tasks.length, 0)} tasks</span>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
        >
          <LayoutDashboard size={13} />Dashboard
        </button>
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
        <span className="text-xs text-gray-400 ml-auto">Click a project to open it · Click a task to edit</span>
      </div>

      <div className="flex-1 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.15}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e5e7eb" />
          <Controls showInteractive={false} className="!shadow-sm !border !border-gray-200 !rounded-xl overflow-hidden" />
          <MiniMap
            nodeColor={n => {
              if (n.type === 'rootNode') return '#2d7a4f'
              if (n.type === 'projectNode') return (n.data as any).colour ?? '#2d7a4f'
              return STATUS_DOT[(n.data as any).status] ?? '#d1d5db'
            }}
            className="!border !border-gray-200 !rounded-xl overflow-hidden !shadow-sm"
            maskColor="rgba(248,250,249,0.7)"
          />
        </ReactFlow>
      </div>
    </div>
  )
}
