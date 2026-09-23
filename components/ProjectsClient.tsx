'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import type { Project } from '@/lib/types'
import { useAuth } from './AuthProvider'
import { Icon } from './Icon'
import { PageHeader } from './PageHeader'
import { StatusBadge } from './StatusBadge'

const emptyProject = {
  id: '',
  name: '',
  description: '',
  source: 'URL',
  branch: 'main',
}

export function ProjectsClient() {
  const { session } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyProject)
  const canCreateProject = session?.role === 'admin' || session?.role === 'moderator'

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true)
        const data = await apiFetch<Project[]>('/projects')
        setProjects(data)
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

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    try {
      setCreating(true)
      const created = await apiFetch<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({
          id: form.id,
          name: form.name,
          description: form.description,
          source: form.source,
          branch: form.branch,
        }),
      })

      setProjects(prev => [created, ...prev])
      setForm(emptyProject)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o projeto.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Projetos"
        description={adminDescription}
        actions={canCreateProject ? <button type="button" className="primary-button" onClick={() => document.getElementById('new-project-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Icon name="upload-cloud" size={17}/>Novo projeto</button> : undefined}
      />

      {canCreateProject && (
        <section id="new-project-form" className="panel panel-pad" style={{ marginBottom: '1.5rem' }}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Criar projeto</span>
              <h2>Novo projeto</h2>
            </div>
          </div>

          <form className="panel-form" onSubmit={submit}>
            <div className="form-grid two-columns">
              <label className="field">
                <span>Nome</span>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex.: Módulo Financeiro" required />
              </label>
              <label className="field">
                <span>Identificador</span>
                <input value={form.id} onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))} placeholder="modulo-financeiro" />
              </label>
            </div>
            <div className="form-grid two-columns">
              <label className="field">
                <span>Origem</span>
                <input value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} placeholder="URL" />
              </label>
              <label className="field">
                <span>Ramificação</span>
                <input value={form.branch} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))} placeholder="main" />
              </label>
            </div>
            <label className="field">
              <span>Descrição</span>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} placeholder="Descreva o objetivo do projeto, documentação e áreas envolvidas." />
            </label>
            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={creating || !form.name.trim()}>{creating ? 'Criando…' : 'Criar projeto'}</button>
            </div>
          </form>
          {error && <div className="form-error" role="alert">{error}</div>}
        </section>
      )}

      {loading ? (
        <div className="panel panel-pad">
          <p>Carregando projetos…</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <Link href={`/projects/${project.id}`} className="project-card panel" key={project.id}>
              <div className="project-card-top">
                <span className="icon-tile"><Icon name="folder-git-2" size={20} /></span>
                <StatusBadge tone={project.status === 'Indexado' ? 'success' : project.status === 'Falha' ? 'danger' : 'accent'}>{project.status}</StatusBadge>
              </div>
              <h2>{project.name}</h2>
              <p>{project.description || 'Sem descrição adicionada.'}</p>
              <dl className="project-meta">
                <div><dt>Origem</dt><dd>{project.source}</dd></div>
                <div><dt>Ramificação</dt><dd>{project.branch}</dd></div>
                <div><dt>Arquivos</dt><dd>{project.files.toLocaleString('pt-BR')}</dd></div>
              </dl>
              <span className="text-link">Abrir projeto →</span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
