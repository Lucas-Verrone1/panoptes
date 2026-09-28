'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { documents } from '@/lib/data'
import { Icon } from './Icon'

export function SearchClient() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const results = useMemo(() => {
    const q = submitted.toLowerCase().trim()
    if (!q) return []
    return [
      ...documents.filter(d => `${d.title} ${d.summary} ${d.sources.join(' ')}`.toLowerCase().includes(q)).map(d => ({ href: `/documents/${d.id}`, title: d.title, text: d.summary, type: 'Documentação' })),
    ]
  }, [submitted])
  const submit = (e: FormEvent) => { e.preventDefault(); setSubmitted(query) }
  return (
    <div className="search-page-center">
      <div className="search-intro"><span className="hero-mark"><Icon name="file-search" size={24}/></span><h1>Buscar conhecimento</h1></div>
      <form className="semantic-search" onSubmit={submit}><Icon name="search" size={20}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Busque por módulo, regra, API ou dúvida…" aria-label="Buscar conhecimento"/><button type="submit">Buscar</button></form>
      {submitted && <div className="search-results" aria-live="polite">{results.length ? results.map(item => <Link className="search-result" href={item.href} key={`${item.type}-${item.title}`}><span className="eyebrow">{item.type}</span><strong>{item.title}</strong><p>{item.text}</p></Link>) : <div className="empty-state">Nenhum resultado para “{submitted}”.</div>}</div>}
    </div>
  )
}
