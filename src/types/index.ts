export type ProjectStatus = 'active' | 'archived' | 'completed'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Project {
  id: string
  user_id: string
  name: string
  description?: string
  colour: string
  icon: string
  status: ProjectStatus
  created_at: string
  updated_at: string
  tasks?: Task[]
}

export interface Task {
  id: string
  user_id: string
  project_id?: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  deadline?: string
  estimated_minutes?: number
  tags: string[]
  ai_extracted: boolean
  raw_input?: string
  position: number
  created_at: string
  updated_at: string
  project?: Project
}

export interface ExtractedTask {
  title: string
  description?: string
  priority: TaskPriority
  estimatedMinutes?: number
  deadline?: string
  tags: string[]
  suggestedProject: string
}

export interface ExtractResult {
  tasks: ExtractedTask[]
  projects: string[]
  summary: string
}
