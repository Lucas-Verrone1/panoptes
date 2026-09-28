'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import type { Project } from '@/lib/types'
import { useAuth } from './AuthProvider'

type ProjectContextValue = {
  projects: Project[]
  projectId: string
  project: Project | null
  loading: boolean
  error: string
  setProjectId: (id: string) => void
  refreshProjects: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextValue | null>(null)
const STORAGE_KEY = 'panoptes-active-project'

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { session, hydrated } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectIdState] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshProjects = useCallback(async () => {
    setLoading(true)
    try {
      const next = await apiFetch<Project[]>('/projects')
      setProjects(next)
      setError('')
    } catch (caughtError) {
      setProjects([])
      setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível carregar os projetos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hydrated || !session) return
    void refreshProjects()
  }, [hydrated, refreshProjects, session])

  useEffect(() => {
    if (loading) return
    const activeProjects = projects.filter(project => project.is_active !== false)
    if (activeProjects.some(project => project.id === projectId)) return
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      const nextId = activeProjects.some(project => project.id === saved) ? saved! : activeProjects[0]?.id ?? ''
      setProjectIdState(nextId)
      if (nextId) window.localStorage.setItem(STORAGE_KEY, nextId)
      else window.localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [loading, projects, projectId])

  const setProjectId = useCallback((id: string) => {
    if (!projects.some(project => project.id === id && project.is_active !== false)) return
    setProjectIdState(id)
    try { window.localStorage.setItem(STORAGE_KEY, id) } catch {}
  }, [projects])

  const project = useMemo(() => projects.find(item => item.id === projectId && item.is_active !== false) ?? null, [projectId, projects])
  const value = useMemo(() => ({ projects, projectId: project?.id ?? '', project, loading, error, setProjectId, refreshProjects }), [project, projects, loading, error, setProjectId, refreshProjects])

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) throw new Error('useProject deve ser usado dentro de ProjectProvider')
  return context
}
