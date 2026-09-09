'use client'

import Link from 'next/link'
import { projects } from '@/lib/data'
import { useAuth } from './AuthProvider'
import { Icon } from './Icon'
import { PageHeader } from './PageHeader'
import { StatusBadge } from './StatusBadge'

export function ProjectsClient() {
  const { session } = useAuth()
  const admin = session?.role === 'admin'
  return (
    <>
      <PageHeader title="Projetos" description={admin ? 'Gerencie fontes e acompanhe o processamento dos projetos.' : 'Acompanhe os projetos e faça upload de documentação nas áreas permitidas.'} actions={admin ? <Link className="primary-button" href="/upload"><Icon name="upload-cloud" size={17}/>Nova fonte</Link> : undefined}/>
      <div className="projects-grid">{projects.map(project => <Link href={`/projects/${project.id}`} className="project-card panel" key={project.id}><div className="project-card-top"><span className="icon-tile"><Icon name="folder-git-2" size={20}/></span><StatusBadge tone={project.status==='Indexado'?'success':project.status==='Falha'?'danger':'accent'}>{project.status}</StatusBadge></div><h2>{project.name}</h2><p>{project.description}</p><dl className="project-meta"><div><dt>Origem</dt><dd>{project.source}</dd></div><div><dt>Branch</dt><dd>{project.branch}</dd></div><div><dt>Arquivos</dt><dd>{project.files.toLocaleString('pt-BR')}</dd></div></dl><span className="text-link">Abrir projeto →</span></Link>)}</div>
    </>
  )
}
