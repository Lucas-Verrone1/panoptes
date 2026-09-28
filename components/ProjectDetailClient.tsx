'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import type { Project } from '@/lib/types'
import { useAuth } from './AuthProvider'
import { Icon } from './Icon'
import { StatusBadge } from './StatusBadge'
import { useProject } from './ProjectProvider'

type ProjectDocument = {
  id: string
  title: string
  summary: string
  version: string
  generated_by_ai: boolean
}

export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const { session } = useAuth()
  const { setProjectId } = useProject()
  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'overview' | 'sources' | 'docs' | 'versions'>('overview')
  const canAddSource = session?.role === 'admin' || session?.role === 'moderator'

  useEffect(() => {
    async function loadProject() {
      try {
        setLoading(true)
        setError('')
        const [projectData, docsData] = await Promise.all([
          apiFetch<Project>(`/projects/${projectId}`),
          apiFetch<ProjectDocument[]>(`/documents?project_id=${encodeURIComponent(projectId)}`),
        ])
        setProject(projectData)
        if (projectData.is_active !== false) setProjectId(projectData.id)
        setDocuments(docsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível carregar o projeto.')
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [projectId, setProjectId])

  if (loading) {
    return <div className="panel panel-pad"><p>Carregando projeto…</p></div>
  }

  if (error || !project) {
    return (
      <div className="panel panel-pad">
        <Link href="/projects" className="back-link">← Voltar para projetos</Link>
        <h1>Projeto não encontrado</h1>
        <p>{error || 'Este projeto não está disponível no momento.'}</p>
      </div>
    )
  }

  return (
    <>
      <div className="project-detail-head"><div><Link href="/projects" className="back-link">← Projetos</Link><div className="project-title-row"><h1>{project.name}</h1><StatusBadge tone={project.status==='Indexado'?'success':project.status==='Falha'?'danger':'accent'}>{project.status}</StatusBadge></div><p>{project.description}</p></div>{canAddSource && <Link className="primary-button" href="/upload"><Icon name="upload-cloud" size={17}/>Adicionar fonte</Link>}</div>
      <div className="tabs" role="tablist" aria-label="Seções do projeto">{([['overview','Visão geral'],['sources','Fontes'],['docs','Documentação'],['versions','Versões']] as const).map(([id,label]) => <button key={id} role="tab" aria-selected={tab===id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div>
      {tab==='overview' && <div className="grid-two"><section className="panel panel-pad"><div className="panel-heading"><h2>Resumo</h2></div><dl className="detail-list"><div><dt>Origem</dt><dd>{project.source}</dd></div><div><dt>Branch</dt><dd>{project.branch}</dd></div><div><dt>Arquivos</dt><dd>{project.files.toLocaleString('pt-BR')}</dd></div><div><dt>Atualização</dt><dd>{project.updated}</dd></div></dl></section><section className="panel panel-pad"><div className="panel-heading"><h2>Pipeline</h2></div><div className="pipeline-list">{['Upload / coleta','Validação','Extração','Chunking','Embeddings','Indexação','Disponível'].map((step,index)=><div key={step}><span className={`pipeline-dot ${index<6?'done':''}`}>{index<6?<Icon name="check" size={13}/>:index+1}</span><span><strong>{step}</strong><small>{index<6?'Concluído':'Pronto para consulta'}</small></span></div>)}</div></section></div>}
      {tab==='sources' && <section className="panel panel-pad"><div className="panel-heading"><div><h2>Fontes conectadas</h2><p>Repositórios, arquivos e contratos usados no processamento.</p></div></div><div className="source-table"><div><span><Icon name="folder-git-2" size={18}/><strong>{project.source}</strong></span><span>{project.branch}</span><StatusBadge tone="success">Conectado</StatusBadge></div><div><span><Icon name="file-text" size={18}/><strong>Documentos do projeto</strong></span><span>{project.files} arquivos</span><StatusBadge tone="success">Indexado</StatusBadge></div></div></section>}
      {tab==='docs' && (
        <section className="panel panel-pad">
          <div className="panel-heading">
            <div>
              <h2>Documentação gerada</h2>
              <p>Conteúdo disponível para todos os perfis com acesso de leitura.</p>
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma documentação foi gerada para este projeto ainda.</p>
            </div>
          ) : (
            documents.map((document) => (
              <Link href={`/documents/${document.id}`} className="document-inline-link" key={document.id}>
                <span className="icon-tile"><Icon name="file-text" size={18}/></span>
                <span>
                  <strong>{document.title}</strong>
                  <small>{document.generated_by_ai ? 'Gerada pela IA' : 'Documento do projeto'} · v{document.version}</small>
                </span>
                <span>→</span>
              </Link>
            ))
          )}
        </section>
      )}
      {tab==='versions' && <section className="panel panel-pad"><div className="timeline-list"><div><span>v2.4.1</span><strong>Indexação completa</strong><small>Hoje, 10:18</small></div><div><span>v2.4.0</span><strong>Nova documentação gerada</strong><small>Ontem, 16:42</small></div><div><span>v2.3.8</span><strong>Fontes atualizadas</strong><small>3 dias atrás</small></div></div></section>}
    </>
  )
}
