'use client'

import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  Handle,
  Position,
  NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useRouter } from 'next/navigation'
import type { Project, Task } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_BG: Record<string, string> = {
  todo: '#f3f4f6',
  in_progress: '#e8f5ee',
  done: '#dcfce7',
  blocked: '#fee2e2',
}

const STATUS_DOT: Record<string, string> = {
  todo: '#9ca3af',
  in_progress: '#2d7a4f',
  done: '#16a34a',
  blocked: '#ef4444',
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
      className="px-4 py-2 rounded-xl border shadow-sm min-w-[130px] text-center"
      style={{ background: data.colour + '10', borderColor: data.colour + '40' }}
    >
      <Handle type="target" position={Position.Top} style={{ background: data.colour, border: 'none', width: 6, height: 6 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: data.colour, border: 'none', width: 6, height: 6 }} />
      <div className="text-xs font-semibold text-gray-700">{data.label}</div>
      <div className="text-[10px] text-gray-400">{data.count} tasks</div>
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

const nodeTypes = {
  projectNode: ProjectNode,
  groupNode: GroupNode,
  taskNode: TaskNode,
}

interface Props {
  project: Project
  tasks: Task[]
}

export function MindMap({ project, tasks }: Props) {
  const groups = useMemo(() => {
    const g: Record<string, Task[]> = {
      'To do': tasks.filter(t => t.status === 'todo'),
      'In progress': tasks.filter(t => t.status === 'in_progress'),
      'Done': tasks.filter(t => t.status === 'done'),
      'Blocked': tasks.filter(t => t.status === 'blocked'),
    }
    return Object.entries(g).filter(([, t]) => t.length > 0)
  }, [tasks])

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    // Project root node
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

    const groupSpacing = Math.max(220, 800 / Math.max(groups.length, 1))
    const startX = 400 - ((groups.length - 1) * groupSpacing) / 2

    groups.forEach(([groupName, groupTasks], gi) => {
      const groupId = `group-${gi}`
      const gx = startX + gi * groupSpacing
      const gy = 200

      nodes.push({
        id: groupId,
        type: 'groupNode',
        position: { x: gx - 65, y: gy },
        data: {
          label: groupName,
          colour: project.colour,
          count: groupTasks.length,
        },
      })

      edges.push({
        id: `e-project-${groupId}`,
        source: 'project',
        target: groupId,
        style: { stroke: project.colour + '60', strokeWidth: 2 },
        animated: groupName === 'In progress',
      })

      const taskSpacing = Math.max(180, 160)
      const taskStartX = gx - ((groupTasks.length - 1) * taskSpacing) / 2

      groupTasks.forEach((task, ti) => {
        const taskId = `task-${task.id}`
        nodes.push({
          id: taskId,
          type: 'taskNode',
          position: {
            x: taskStartX + ti * taskSpacing - 75,
            y: gy + 120 + (ti % 2 === 0 ? 0 : 20),
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
          id: `e-${groupId}-${taskId}`,
          source: groupId,
          target: taskId,
          style: { stroke: '#d1d5db', strokeWidth: 1.5 },
        })
      })
    })

    return { nodes, edges }
  }, [project, tasks, groups])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const onConnect = useCallback((params: Connection) => setEdges(eds => addEdge(params, eds)), [setEdges])

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No tasks yet — add some to see the mind map
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
        <Controls showInteractive={false} className="!shadow-sm !border !border-gray-200 !rounded-xl overflow-hidden" />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'projectNode') return project.colour
            if (n.type === 'groupNode') return project.colour + '80'
            return STATUS_DOT[(n.data as { status: string }).status] ?? '#d1d5db'
          }}
          className="!border !border-gray-200 !rounded-xl overflow-hidden !shadow-sm"
          maskColor="rgba(248,250,249,0.7)"
        />
      </ReactFlow>
    </div>
  )
}
