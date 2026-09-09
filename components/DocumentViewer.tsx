'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { DocumentItem } from '@/lib/types'
import { Icon } from './Icon'
import { StatusBadge } from './StatusBadge'
import { projects } from '@/lib/data'

export function DocumentViewer({ document: doc }: { document: DocumentItem }) {
  const [copied, setCopied] = useState(false)
  const projectId = projects.find(project => project.name === doc.project)?.id ?? projects[0].id
  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(window.location.href)
      else {
        const input = window.document.createElement('textarea')
        input.value = window.location.href
        input.style.position = 'fixed'
        input.style.opacity = '0'
        window.document.body.appendChild(input)
        input.select()
        window.document.execCommand('copy')
        input.remove()
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="document-view-layout">
      <article className="document-reader">
        <div className="document-reader-head">
          <div className="document-reader-title">
            <span className="eyebrow">{doc.project} · v{doc.version}</span>
            <h1>{doc.title}</h1>
            <div className="inline-badges"><StatusBadge tone="accent">Gerada por IA</StatusBadge></div>
          </div>
          <div className="document-actions">
            <button className="secondary-button" type="button" onClick={copyLink}><Icon name="check" size={17}/>{copied ? 'Link copiado' : 'Copiar link'}</button>
            <Link className="primary-button" href={`/ai?project=${encodeURIComponent(projectId)}&q=${encodeURIComponent(`Explique a documentação ${doc.title}`)}`}><Icon name="bot" size={17}/>Perguntar à IA</Link>
          </div>
        </div>
        <p className="document-lead">{doc.summary}</p>
        {doc.sections.map(section => (
          <section className="document-section" key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs?.map(p => <p key={p}>{p}</p>)}
            {section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}
          </section>
        ))}
      </article>
      <aside className="document-context" aria-label="Contexto e fontes da documentação">
        <section className="side-panel"><h2>Fontes utilizadas</h2><ul className="source-list">{doc.sources.map(source => <li key={source}><Icon name="file-text" size={16}/><span>{source}</span></li>)}</ul></section>
        <section className="side-panel"><h2>Rastreabilidade</h2><p>As fontes exibidas permitem conferir de onde vieram as informações usadas na documentação.</p></section>
      </aside>
    </div>
  )
}
