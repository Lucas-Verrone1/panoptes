'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { projects } from '@/lib/data'
import type { Project } from '@/lib/types'

type ProjectContextValue = {
  projectId: string
  project: Project
  setProjectId: (id: string) => void
}

const ProjectContext = createContext<ProjectContextValue | null>(null)
const STORAGE_KEY = 'panoptes-active-project'

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projectId, setProjectIdState] = useState(projects[0].id)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved && projects.some(project => project.id === saved)) setProjectIdState(saved)
    } catch {}
  }, [])

  const setProjectId = useCallback((id: string) => {
    if (!projects.some(project => project.id === id)) return
    setProjectIdState(id)
    try { window.localStorage.setItem(STORAGE_KEY, id) } catch {}
  }, [])

  const project = useMemo(() => projects.find(item => item.id === projectId) ?? projects[0], [projectId])
  const value = useMemo(() => ({ projectId: project.id, project, setProjectId }), [project, setProjectId])

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) throw new Error('useProject deve ser usado dentro de ProjectProvider')
  return context
}
