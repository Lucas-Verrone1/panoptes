import Link from 'next/link'
import { Icon } from './Icon'
import { StatusBadge } from './StatusBadge'
import type { DocumentItem } from '@/lib/types'

export function DocumentCard({ document }: { document: DocumentItem }) {
  return (
    <article className="document-card">
      <div className="document-card-top">
        <span className="icon-tile"><Icon name="file-text" size={20} /></span>
        <div className="document-card-badges">
          {document.generatedByAI && <StatusBadge tone="accent">Gerada por IA</StatusBadge>}
          
        </div>
      </div>
      <div className="document-card-copy">
        <span className="eyebrow">{document.project} · v{document.version}</span>
        <h2>{document.title}</h2>
        <p>{document.summary}</p>
      </div>
      <div className="document-card-footer">
        <small>Atualizada {document.updated.toLowerCase()}</small>
        <Link className="text-link" href={`/documents/${document.id}`}>Abrir documentação <span aria-hidden="true">→</span></Link>
      </div>
    </article>
  )
}
