'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { documents, forumTopics, projects } from '@/lib/data'
import { Modal } from './Modal'
import { Icon } from './Icon'
import type { Role } from '@/lib/types'

export function CommandPalette({ open, onClose, role }: { open: boolean; onClose: () => void; role: Role }) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = [
      ...documents.map(d => ({ href: `/documents/${d.id}`, title: d.title, meta: `Documentação · ${d.project}`, icon: 'file-text' as const })),
      ...forumTopics.map(t => ({ href: `/forum?topic=${t.id}`, title: t.title, meta: `Fórum · ${t.status}`, icon: 'messages-square' as const })),
      ...(role === 'admin' || role === 'moderator' ? projects.map(p => ({ href: `/projects/${p.id}`, title: p.name, meta: `Projeto · ${p.source}`, icon: 'folder-git-2' as const })) : []),
    ]
    return (q ? all.filter(x => `${x.title} ${x.meta}`.toLowerCase().includes(q)) : all).slice(0, 8)
  }, [query, role])

  return (
    <Modal open={open} onClose={onClose} title="Pesquisa global" description="Pesquise documentações, tópicos e projetos disponíveis para o seu perfil.">
      <label className="search-field modal-search">
        <Icon name="search" size={18} />
        <span className="sr-only">Pesquisar</span>
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Digite para pesquisar..." />
      </label>
      <div className="command-results" role="listbox" aria-label="Resultados da pesquisa">
        {results.map(item => (
          <Link key={`${item.href}-${item.title}`} href={item.href} onClick={onClose} className="command-result">
            <span className="icon-tile compact"><Icon name={item.icon} size={17} /></span>
            <span><strong>{item.title}</strong><small>{item.meta}</small></span>
          </Link>
        ))}
        {!results.length && <div className="empty-state compact-empty">Nenhum resultado encontrado.</div>}
      </div>
    </Modal>
  )
}
