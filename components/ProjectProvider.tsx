'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { projects as fallbackProjects } from '@/lib/data'
import type { Project } from '@/lib/types'

type ProjectContextValue = {
  projects: Project[]
  projectId: string
  project: Project
  setProjectId: (id: string) => void
}

const ProjectContext = createContext<ProjectContextValue | null>(null)
const STORAGE_KEY = 'panoptes-active-project'

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const fallbackProject = fallbackProjects[0]
  const [projects, setProjects] = useState<Project[]>(fallbackProjects)
  const [projectId, setProjectIdState] = useState(fallbackProject?.id ?? '')

  useEffect(() => {
    let active = true

    async function loadProjects() {
      try {
        const next = await apiFetch<Project[]>('/projects')
        if (!active) return
        setProjects(next.length ? next : fallbackProjects)

        try {
          const saved = window.localStorage.getItem(STORAGE_KEY)
          if (saved && next.some(project => project.id === saved)) {
            setProjectIdState(saved)
            return
          }
        } catch {}

        if (next[0]) setProjectIdState(next[0].id)
      } catch {
        if (active) setProjects(fallbackProjects)
      }
    }

    loadProjects()
    return () => { active = false }
  }, [])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved && projects.some(project => project.id === saved)) setProjectIdState(saved)
      else if (!saved && projects[0]) setProjectIdState(projects[0].id)
    } catch {}
  }, [projects])

  const setProjectId = useCallback((id: string) => {
    if (!projects.some(project => project.id === id)) return
    setProjectIdState(id)
    try { window.localStorage.setItem(STORAGE_KEY, id) } catch {}
  }, [projects])

  const project = useMemo(() => projects.find(item => item.id === projectId) ?? projects[0] ?? fallbackProject, [projectId, projects, fallbackProject])
  const value = useMemo(() => ({ projects, projectId: project?.id ?? '', project, setProjectId }), [project, projects, setProjectId])

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) throw new Error('useProject deve ser usado dentro de ProjectProvider')
  return context
}
