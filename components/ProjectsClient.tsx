'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import type { Project } from '@/lib/types'
import { useAuth } from './AuthProvider'
import { Icon } from './Icon'
import { PageHeader } from './PageHeader'
import { StatusBadge } from './StatusBadge'
import { useProject } from './ProjectProvider'

const emptyProject = {
  id: '',
  name: '',
  description: '',
  source: 'URL',
  branch: 'main',
}

export function ProjectsClient() {
  const { session } = useAuth()
  const { refreshProjects, setProjectId } = useProject()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyProject)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const canCreateProject = session?.role === 'admin' || session?.role === 'moderator'

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true)
        const data = await apiFetch<Project[]>('/projects')
        setProjects(data)
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível carregar os projetos.')
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [])

  const adminDescription = useMemo(
    () => canCreateProject ? 'Gerencie projetos, fontes e acompanhe o processamento do ambiente.' : 'Acompanhe os projetos e consulte documentação disponível no ambiente.',
    [canCreateProject],
  )
  const visibleProjects = canCreateProject ? projects : projects.filter(project => project.is_active !== false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    try {
      setCreating(true)
      const payload = {
        name: form.name,
        description: form.description,
        source: form.source,
        branch: form.branch,
      }
      const saved = editingId
        ? await apiFetch<Project>(`/projects/${encodeURIComponent(editingId)}`, { method: 'PATCH', body: JSON.stringify({ ...payload, is_active: projects.find(project => project.id === editingId)?.is_active !== false }) })
        : await apiFetch<Project>('/projects', { method: 'POST', body: JSON.stringify({ ...payload, id: form.id }) })

      setProjects(prev => editingId ? prev.map(project => project.id === saved.id ? saved : project) : [saved, ...prev])
      setForm(emptyProject)
      setEditingId(null)
      await refreshProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : editingId ? 'Não foi possível editar o projeto.' : 'Não foi possível criar o projeto.')
    } finally {
      setCreating(false)
    }
  }

  const beginEdit = (project: Project) => {
    setEditingId(project.id)
    setForm({ id: project.id, name: project.name, description: project.description, source: project.source, branch: project.branch })
    setError('')
    document.getElementById('new-project-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const updateActive = async (project: Project, isActive: boolean) => {
    setError('')
    setSavingId(project.id)
    try {
      const updated = await apiFetch<Project>(`/projects/${encodeURIComponent(project.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: project.name, description: project.description, source: project.source, branch: project.branch, is_active: isActive }),
      })
      setProjects(current => current.map(item => item.id === updated.id ? updated : item))
      await refreshProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar o estado do projeto.')
    } finally {
      setSavingId(null)
    }
  }

  const deleteProject = async (project: Project) => {
    const confirmed = window.confirm(`Excluir "${project.name}"? Esta ação também remove fontes, documentos e dados associados ao projeto.`)
    if (!confirmed) return
    setError('')
    setSavingId(project.id)
    try {
      await apiFetch<{ ok: boolean }>(`/projects/${encodeURIComponent(project.id)}`, { method: 'DELETE' })
      setProjects(current => current.filter(item => item.id !== project.id))
      if (editingId === project.id) {
        setEditingId(null)
        setForm(emptyProject)
      }
      await refreshProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir o projeto.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Projetos"
        description={adminDescription}
        actions={canCreateProject ? <button type="button" className="primary-button" onClick={() => document.getElementById('new-project-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Icon name="upload-cloud" size={17}/>Novo projeto</button> : undefined}
      />
      {error && <div className="form-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

      {canCreateProject && (
        <section id="new-project-form" className="panel panel-pad" style={{ marginBottom: '1.5rem' }}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">{editingId ? 'Editar projeto' : 'Criar projeto'}</span>
              <h2>{editingId ? form.name : 'Novo projeto'}</h2>
            </div>
          </div>

          <form className="panel-form project-form" onSubmit={submit}>
            <div className="form-grid two-columns">
              <label className="field">
                <span>Nome</span>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex.: Módulo Financeiro" required />
              </label>
              <label className="field">
                <span>Identificador</span>
                <input value={form.id} onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))} placeholder="modulo-financeiro" disabled={Boolean(editingId)} />
              </label>
            </div>
            <div className="form-grid two-columns">
              <label className="field">
                <span>Origem</span>
                <input value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} placeholder="URL" />
              </label>
              <label className="field">
                <span>Branch</span>
                <input value={form.branch} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))} placeholder="main" />
              </label>
            </div>
            <label className="field">
              <span>Descrição</span>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} placeholder="Descreva o objetivo do projeto, documentação e áreas envolvidas." />
            </label>
            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={creating || !form.name.trim()}>{creating ? (editingId ? 'Salvando…' : 'Criando…') : (editingId ? 'Salvar alterações' : 'Criar projeto')}</button>
              {editingId && <button type="button" className="secondary-button" onClick={() => { setEditingId(null); setForm(emptyProject) }}>Cancelar edição</button>}
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <div className="panel panel-pad">
          <p>Carregando projetos…</p>
        </div>
      ) : (
        visibleProjects.length > 0 ? <div className="projects-grid">
          {visibleProjects.map((project) => (
            <article className={`project-card panel ${project.is_active === false ? 'project-card-inactive' : ''}`} key={project.id}>
              <div className="project-card-top">
                <span className="icon-tile"><Icon name="folder-git-2" size={20} /></span>
                <StatusBadge tone={project.is_active === false ? 'neutral' : project.status === 'Indexado' ? 'success' : project.status === 'Falha' ? 'danger' : 'accent'}>{project.is_active === false ? 'Inativo' : project.status}</StatusBadge>
              </div>
              <h2>{project.name}</h2>
              <p>{project.description || 'Sem descrição adicionada.'}</p>
              <dl className="project-meta">
                <div><dt>Origem</dt><dd>{project.source}</dd></div>
                <div><dt>Branch</dt><dd>{project.branch}</dd></div>
                <div><dt>Arquivos</dt><dd>{project.files.toLocaleString('pt-BR')}</dd></div>
              </dl>
              <div className="project-card-footer">
                <Link href={`/projects/${encodeURIComponent(project.id)}`} className="text-link" onClick={() => { if (project.is_active !== false) setProjectId(project.id) }}>Abrir projeto <span aria-hidden="true">→</span></Link>
                {canCreateProject && <div className="project-admin-actions" aria-label={`Ações de ${project.name}`}>
                  <button type="button" className="secondary-button small" disabled={savingId === project.id} onClick={() => beginEdit(project)}>Editar</button>
                  <button type="button" className="secondary-button small" disabled={savingId === project.id} onClick={() => void updateActive(project, project.is_active === false)}>{project.is_active === false ? 'Ativar' : 'Desativar'}</button>
                  <button type="button" className="danger-button small" disabled={savingId === project.id} onClick={() => void deleteProject(project)}>Excluir</button>
                </div>}
              </div>
            </article>
          ))}
        </div> : <div className="panel panel-pad empty-state">Nenhum projeto foi encontrado no banco de dados. {canCreateProject ? 'Crie um projeto para começar.' : 'Peça a um administrador para criar ou ativar um projeto.'}</div>
      )}
    </>
  )
}
