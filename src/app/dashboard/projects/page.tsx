'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, FolderKanban, GitMerge } from 'lucide-react'
import { ProjectMergeModal } from '@/components/ui/ProjectMergeModal'
import type { Project, Task } from '@/types'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<(Project & { tasks: Task[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showMerge, setShowMerge] = useState(false)

  useEffect(() => {
    fetch('/api/projects').then((r) => r.json()).then((data) => {
      setProjects(data)
      setLoading(false)
    })
  }, [])

  async function createProject() {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
    const project = await res.json()
    setProjects((prev) => [{ ...project, tasks: [] }, ...prev])
    setNewName('')
    setShowNew(false)
    setCreating(false)
  }

  return (
    <>
      <div className="px-6 py-8 max-w-4xl mx-auto">
      </div>

      {showMerge && (
        <ProjectMergeModal
          onClose={() => setShowMerge(false)}
          onMerged={() => {
            fetch('/api/projects').then(r => r.json()).then(data => setProjects(data))
            setShowMerge(false)
          }}
        />
      )}
    </>
  )
}
