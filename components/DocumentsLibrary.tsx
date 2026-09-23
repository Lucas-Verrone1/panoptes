'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useProject } from './ProjectProvider'
import type { DocumentItem } from '@/lib/types'
import { Icon } from './Icon'
import { StatusBadge } from './StatusBadge'
import { useAuth } from './AuthProvider'
import Link from 'next/link'

export function DocumentsLibrary() {
  const { session } = useAuth()
  const { project } = useProject()
  const [query, setQuery] = useState('')
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [editingId,setEditingId]=useState<string|null>(null)
  const [editingTitle,setEditingTitle]=useState('')
  const admin = session?.role === 'admin'
  useEffect(() => {
    let active=true
    setDocuments([])
    if(!project.id) return
    apiFetch<Array<{ id: string; title: string; summary: string; project_id: string; version: string; source_url?: string | null; generated_by_ai: boolean; updated_at: string }>>(`/documents?project_id=${encodeURIComponent(project.id)}`)
      .then(rows => {if(active) setDocuments(rows.map(row => ({
        id: row.id,
        title: row.title,
        summary: row.summary,
        project: project.name,
        type: 'Markdown',
        version: row.version,
        updated: new Date(row.updated_at).toLocaleString('pt-BR'),
        generatedByAI: row.generated_by_ai,
        sources: row.source_url ? [row.source_url] : [],
        sections: [{ title: 'Resumo', paragraphs: [row.summary] }],
      } as DocumentItem)))})
      .catch(e => {if(active){setDocuments([]);}})
    return ()=>{active=false}
  }, [project.id, project.name])
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return documents
    return documents.filter(d => `${d.title} ${d.summary} ${d.project} ${d.sources.join(' ')}`.toLowerCase().includes(q))
  }, [query, documents])

  const newVersion = (id:string) => setDocuments(prev => prev.map(doc => doc.id === id ? {...doc, version: (Number(doc.version)+0.1).toFixed(1), updated:'agora'} : doc))
  const remove = (id:string) => setDocuments(prev => prev.filter(doc => doc.id !== id))
  const beginEdit=(id:string,title:string)=>{setEditingId(id);setEditingTitle(title)}
  const saveEdit=(id:string)=>{const clean=editingTitle.trim();if(clean)setDocuments(prev=>prev.map(doc=>doc.id===id?{...doc,title:clean,updated:'agora'}:doc));setEditingId(null)}

  return (
    <>
      <div className="library-toolbar">
        <label className="search-field library-search"><Icon name="search" size={18}/><span className="sr-only">Buscar documentações</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar documentações…" /></label>
        <span className="library-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'documentação' : 'documentações'}</span>
      </div>
      <div className="documents-grid">
        {filtered.map(document => (
          <article className="document-card" key={document.id}>
            <div className="document-card-top"><span className="icon-tile"><Icon name="file-text" size={20}/></span><div className="document-card-badges">{document.generatedByAI&&<StatusBadge tone="accent">Gerada por IA</StatusBadge>}</div></div>
            <div className="document-card-copy"><span className="eyebrow">{document.project} · v{document.version}</span>{editingId===document.id?<div className="document-edit"><input value={editingTitle} onChange={e=>setEditingTitle(e.target.value)} aria-label="Título da documentação" autoFocus/><button type="button" className="primary-button small" onClick={()=>saveEdit(document.id)}>Salvar</button><button type="button" className="secondary-button small" onClick={()=>setEditingId(null)}>Cancelar</button></div>:<h2>{document.title}</h2>}<p>{document.summary}</p></div>
            <div className="document-card-footer"><small>Atualizada {document.updated.toLowerCase()}</small><Link className="text-link" href={`/documents/${document.id}`}>Abrir documentação <span aria-hidden="true">→</span></Link></div>
            {admin&&<div className="document-admin-actions" aria-label={`Ações administrativas de ${document.title}`}><button className="secondary-button small" type="button" onClick={()=>beginEdit(document.id,document.title)}>Editar</button><button className="secondary-button small" type="button" onClick={()=>newVersion(document.id)}>Nova versão</button><button className="danger-button small" type="button" onClick={()=>remove(document.id)}>Excluir</button></div>}
          </article>
        ))}
      </div>
      {!filtered.length && <div className="empty-state">Nenhuma documentação encontrada.</div>}
    </>
  )
}
