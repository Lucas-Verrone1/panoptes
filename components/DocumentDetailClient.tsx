'use client'

import { useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import type { DocumentItem } from '@/lib/types'
import { DocumentViewer } from './DocumentViewer'

export function DocumentDetailClient({ id }: { id: string }) {
  const [document, setDocument] = useState<DocumentItem | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    apiFetch<{ id: string; title: string; summary: string; full_text?: string | null; project_id: string; version: string; source_url?: string | null; generated_by_ai: boolean; document_chunks?: { id: string; chunk_index: number; content: string; source_url?: string | null }[] }>('/documents/' + encodeURIComponent(id))
      .then(row => setDocument({
        id: row.id,
        title: row.title,
        summary: row.summary,
        project: row.project_id,
        type: 'Markdown',
        version: row.version,
        updated: 'agora',
        generatedByAI: row.generated_by_ai,
        sources: row.source_url ? [row.source_url] : [],
        sections: [{ title: 'Conteúdo extraído', paragraphs: (row.full_text ? row.full_text.split(/\n\s*\n/) : [row.summary, "Reprocesse esta fonte para visualizar o texto integral sem sobreposição."]) }],
      }))
      .catch(() => setFailed(true))
  }, [id])

  if (failed) notFound()
  if (!document) return <div className="panel panel-pad">Carregando documentação...</div>
  return <DocumentViewer document={document} />
}
