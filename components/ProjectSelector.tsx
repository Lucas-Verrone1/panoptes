'use client'

import { useProject } from './ProjectProvider'
import { Icon } from './Icon'
import { SelectMenu } from './SelectMenu'

export function ProjectSelector({ compact = false, variant = 'sidebar' }: { compact?: boolean; variant?: 'sidebar' | 'chat' | 'dashboard' | 'account' }) {
  const { projects, projectId, setProjectId, loading } = useProject()
  const activeProjects = projects.filter(item => item.is_active !== false)
  if (activeProjects.length === 0) {
    return <span className={`project-selector-empty project-selector-${variant}`} role="status">{loading ? 'Carregando projetos…' : 'Nenhum projeto ativo'}</span>
  }
  return (
    <SelectMenu
      id={variant === 'account' ? 'global-project-selector' : undefined}
      value={projectId}
      onChange={setProjectId}
      options={activeProjects.map(item => ({ value: item.id, label: item.name, description: item.description }))}
      ariaLabel="Selecionar projeto ativo"
      className={`project-select-shell project-selector-${variant} ${compact ? 'compact' : ''}`}
      triggerClassName={`project-selector ${compact ? 'compact' : ''}`}
      leading={<span className="project-selector-icon" aria-hidden="true"><Icon name="folder-git-2" size={18} /></span>}
      eyebrow={variant === 'account' ? 'Projeto' : 'Projeto ativo'}
    />
  )
}
