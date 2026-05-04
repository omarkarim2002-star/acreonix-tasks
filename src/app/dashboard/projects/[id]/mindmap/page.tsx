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

const STATUS_GROUPS = ['todo', 'in_progress', 'done', 'blocked']
const STATUS_LABELS: Record<string, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
  blocked: 'Blocked',
}

function ProjectNode({ data }: NodeProps) {
  return (
    <div
      className="px-5 py-3 rounded-2xl shadow-lg border-2 min-w-[160px] text-center"
      style={{ background: data.colour + '18', borderColor: data.colour }}
    >
      <Handle type="source" position={Position.Bottom} style={{ background: data.colour, border: 'none', width: 8, height: 8 }} />
      <div className="text-2xl mb-1">{data.icon}</div>
      <div className="font-bold text-sm text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>{data.label}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">{data.taskCount} tasks</div>
    </div>
  )
}

function GroupNode({ data }: NodeProps) {
  return (
    <div
      className="px-4 py-2 rounded-xl border shadow-sm min-w-[120px] text-center"
      style={{ background: data.colour + '10', borderColor: data.colour + '40' }}
    >
      <Handle type="target" position={Position.Top} style={{ background: data.colour, border: 'none', width: 6, height: 6 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: data.colour, border: 'none', width: 6, height: 6 }} />
      <div className="text-xs font-semibold text-gray-700">{data.label}</div>
      <div className="text-[10px] text-gray-400">{data.count} task{data.count !== 1 ? 's' : ''}</div>
    </div>
  )
}

function TaskNode({ data }: NodeProps) {
  const router = useRouter()
  return (
    <div
      onClick={() => router.push(`/dashboard/tasks/${data.taskId}`)}
      className="px-3 py-2 rounded-xl border cursor-pointer hover:shadow-md transition-all min-w-[150px] max-w-[200px]"
      style={{ background: STATUS_BG[data.status] ?? '#f9fafb', borderColor: '#e5e7eb' }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#d1d5db', border: 'none', width: 5, height: 5 }} />
      <div className="flex items-start gap-1.5">
        <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: STATUS_DOT[data.status] ?? '#9ca3af' }} />
        <span className="text-xs text-gray-800 leading-snug line-clamp-2">{data.label}</span>
      </div>
      {data.deadline && (
        <div className="text-[10px] text-gray-400 mt-1 ml-3.5">{data.deadline}</div>
      )}
    </div>
  )
}

const nodeTypes = { projectNode: ProjectNode, groupNode: GroupNode, taskNode: TaskNode }

type Task = {
  id: string
  title: string
  status: string
  deadline?: string
  priority?: string
  project_id?: string
}

type Project = {
  id: string
  name: string
  colour: string
  icon: string
}

export default function MindMapPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [projRes, taskRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch(`/api/tasks?project_id=${id}`),
        ])

        if (!projRes.ok) throw new Error('Project not found')

        const [proj, taskData] = await Promise.all([
          projRes.json(),
          taskRes.json(),
        ])

        setProject(proj)
        setTasks(Array.isArray(taskData) ? taskData : [])
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!project) return { nodes: [], edges: [] }

    const nodes: Node[] = []
    const edges: Edge[] = []

    // Project root
    nodes.push({
      id: 'project',
      type: 'projectNode',
      position: { x: 400, y: 40 },
      data: {
        label: project.name,
        colour: project.colour,
        icon: project.icon,
        taskCount: tasks.length,
      },
    })

    // Group by status — only show groups that have tasks
    const groups = STATUS_GROUPS
      .map(status => ({
        status,
        tasks: tasks.filter(t => t.status === status),
      }))
      .filter(g => g.tasks.length > 0)

    const groupSpacing = Math.max(240, 900 / Math.max(groups.length, 1))
    const startX = 400 - ((groups.length - 1) * groupSpacing) / 2

    groups.forEach(({ status, tasks: groupTasks }, gi) => {
      const gx = startX + gi * groupSpacing
      const groupId = `group-${status}`

      nodes.push({
        id: groupId,
        type: 'groupNode',
        position: { x: gx - 60, y: 200 },
        data: {
          label: STATUS_LABELS[status],
          colour: project.colour,
          count: groupTasks.length,
        },
      })

      edges.push({
        id: `e-proj-${groupId}`,
        source: 'project',
        target: groupId,
        style: { stroke: project.colour + '60', strokeWidth: 2 },
        animated: status === 'in_progress',
      })

      const taskSpacing = Math.max(180, 160)
      const taskStartX = gx - ((groupTasks.length - 1) * taskSpacing) / 2

      groupTasks.forEach((task, ti) => {
        const taskNodeId = `task-${task.id}`
        nodes.push({
          id: taskNodeId,
          type: 'taskNode',
          position: {
            x: taskStartX + ti * taskSpacing - 75,
            y: 330 + (ti % 2 === 0 ? 0 : 25),
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
          id: `e-${groupId}-${task.id}`,
          source: groupId,
          target: taskNodeId,
          style: { stroke: '#d1d5db', strokeWidth: 1.5 },
        })
      })
    })

    return { nodes, edges }
  }, [project, tasks])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const onConnect = useCallback((p: Connection) => setEdges(eds => addEdge(p, eds)), [setEdges])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <Loader2 size={24} className="animate-spin text-[#2d7a4f]" />
        <p className="text-sm text-gray-400">Loading mind map…</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <p className="text-sm text-red-500">{error || 'Project not found'}</p>
        <button onClick={() => router.back()} className="text-xs text-[#2d7a4f] underline">Go back</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#f8faf9]">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={14} />Back
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <span className="text-lg">{project.icon}</span>
          <h1 className="text-sm font-semibold text-gray-900">{project.name}</h1>
          <span className="text-xs text-gray-400">{tasks.length} tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/projects/${id}`} className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <List size={13} />List view
          </Link>
          <Link href="/dashboard/extract" className="flex items-center gap-1.5 text-xs text-[#2d7a4f] border border-[#2d7a4f]/30 px-3 py-1.5 rounded-lg hover:bg-[#e8f5ee] transition-colors">
            <Sparkles size={13} />AI add
          </Link>
          <Link href="/dashboard/tasks/new" className="flex items-center gap-1.5 text-xs bg-[#2d7a4f] text-white px-3 py-1.5 rounded-lg hover:bg-[#1f5537] transition-colors">
            <Plus size={13} />New task
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4 px-6 py-2 bg-white border-b border-gray-100 shrink-0">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: STATUS_DOT[status] }} />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
        <span className="text-xs text-gray-400 ml-auto">Click any task to edit · Scroll to zoom</span>
      </div>

      <div className="flex-1 overflow-hidden">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="text-4xl mb-3">{project.icon}</div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">No tasks in this project yet</h2>
            <p className="text-sm text-gray-400 mb-4">Add tasks to see them in the mind map</p>
            <Link href="/dashboard/extract" className="text-sm text-white px-4 py-2 rounded-xl" style={{ background: '#2d7a4f' }}>
              Add tasks with AI
            </Link>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
            <Controls showInteractive={false} className="!shadow-sm !border !border-gray-200 !rounded-xl overflow-hidden" />
            <MiniMap
              nodeColor={n => {
                if (n.type === 'projectNode') return project.colour
                if (n.type === 'groupNode') return project.colour + '80'
                return STATUS_DOT[(n.data as any).status] ?? '#d1d5db'
              }}
              className="!border !border-gray-200 !rounded-xl overflow-hidden !shadow-sm"
              maskColor="rgba(248,250,249,0.7)"
            />
          </ReactFlow>
        )}
      </div>
    </div>
  )
}
