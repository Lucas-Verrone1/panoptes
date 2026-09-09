'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Icon } from './Icon'
import { useProject } from './ProjectProvider'
import { ProjectSelector } from './ProjectSelector'
import { projects } from '@/lib/data'
import { apiFetch } from '@/lib/api'

type Message = { id: number; role: 'user'|'assistant'; text: string; sources?: string[] }

export function AIChat() {
  const params = useSearchParams()
  const initial = params.get('q') || ''
  const requestedProject = params.get('project')
  const { project, setProjectId } = useProject()
  const [messages, setMessages] = useState<Message[]>([])
  const [value, setValue] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<Record<number,'positive'|'negative'>>({})
  const sessionId = useRef(typeof crypto !== 'undefined' ? crypto.randomUUID() : `${Date.now()}`)
  const endRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)
  const previousProject = useRef(project.id)

  const suggestions = useMemo(() => {
    if (project.id === 'api') return ['Quais endpoints estão documentados?', 'Como funciona a autenticação das APIs?', 'Quais schemas fazem parte deste projeto?']
    if (project.id === 'financeiro') return ['Como funciona o módulo financeiro?', 'Quais regras de negócio estão documentadas?', 'Quais integrações bancárias existem?']
    if (project.id === 'relatorios') return ['Quais relatórios foram encontrados?', 'Quais fontes compõem este snapshot?', 'Há gaps na documentação dos relatórios?']
    return ['Como funciona o módulo financeiro?', 'Quais documentos falam sobre integração API?', 'Quais documentações foram geradas pela IA?']
  }, [project.id])

  const send = async (question: string) => {
    const clean = question.trim()
    if (!clean || loading) return
    const id = Date.now()
    setMessages(prev => [...prev, { id, role: 'user', text: clean }])
    setValue('')
    setLoading(true)
    try {
      const result = await apiFetch<{ answer: string; sources: string[] }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ question: clean, project_id: project.id, session_id: sessionId.current }),
      })
      setMessages(prev => [...prev, { id: id + 1, role: 'assistant', text: result.answer, sources: result.sources }])
    } catch (error) {
      setMessages(prev => [...prev, { id: id + 1, role: 'assistant', text: error instanceof Error ? error.message : 'Não foi possível consultar a documentação.' }])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initial || initialized.current) return
    if (requestedProject && projects.some(item => item.id === requestedProject) && requestedProject !== project.id) {
      previousProject.current = requestedProject
      setProjectId(requestedProject)
      return
    }
    initialized.current = true
    send(initial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, requestedProject, project.id, setProjectId])

  useEffect(() => {
    if (previousProject.current === project.id) return
    previousProject.current = project.id
    sessionId.current = typeof crypto !== 'undefined' ? crypto.randomUUID() : `${project.id}-${Date.now()}`
    setMessages([])
    setFeedback({})
    setValue('')
    const url = new URL(window.location.href)
    url.searchParams.set('project', project.id)
    url.searchParams.delete('q')
    window.history.replaceState({}, '', url)
  }, [project.id])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, loading])

  const submit = (event: FormEvent) => { event.preventDefault(); send(value) }

  const rate = async (messageId: number, rating: 'positive' | 'negative', text: string) => {
    setFeedback(prev => ({ ...prev, [messageId]: rating }))
    try {
      await apiFetch('/ai/feedback', {
        method: 'POST',
        body: JSON.stringify({ project_id: project.id, rating, message_excerpt: text }),
      })
    } catch {
      setFeedback(prev => {
        const next = { ...prev }
        delete next[messageId]
        return next
      })
    }
  }

  return (
    <div className="chat-layout">
      <div className="chat-project-bar">
        <ProjectSelector variant="chat" />
        <span>As respostas usam somente o contexto do projeto selecionado.</span>
      </div>
      <div className="chat-thread" aria-live="polite">
        {!messages.length && !loading && (
          <div className="chat-welcome">
            <span className="hero-mark"><Icon name="bot" size={25} /></span>
            <h1>{project.name}</h1>
            <div className="suggestion-grid">
              {suggestions.map(s => <button key={s} type="button" onClick={() => send(s)}>{s}</button>)}
            </div>
          </div>
        )}
        {messages.map(message => (
          <article className={`chat-message ${message.role}`} key={message.id}>
            {message.role === 'assistant' && <span className="avatar assistant-avatar">P</span>}
            <div className="chat-bubble">
              <p>{message.text}</p>
              {message.sources?.length ? <div className="source-chips" aria-label="Fontes utilizadas">{message.sources.map(source => <span key={source}>{source}</span>)}</div> : null}
              {message.role === 'assistant' && (
                <div className="feedback-controls" aria-label="Avaliar resposta">
                  <button type="button" className={feedback[message.id] === 'positive' ? 'selected' : ''} onClick={() => rate(message.id, 'positive', message.text)} aria-label="Resposta útil">Útil</button>
                  <button type="button" className={feedback[message.id] === 'negative' ? 'selected' : ''} onClick={() => rate(message.id, 'negative', message.text)} aria-label="Resposta não útil">Não útil</button>
                </div>
              )}
            </div>
          </article>
        ))}
        {loading && <div className="chat-message assistant"><span className="avatar assistant-avatar">P</span><div className="chat-bubble typing" role="status"><span/><span/><span/><span className="sr-only">Panoptes está respondendo</span></div></div>}
        <div ref={endRef} />
      </div>
      <div className="chat-composer-wrap">
        <form className="ai-composer chat-composer" onSubmit={submit}>
          <textarea value={value} onChange={e => setValue(e.target.value)} rows={1} placeholder={`Pergunte sobre ${project.name}…`} aria-label={`Mensagem para o Panoptes sobre ${project.name}`} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(value) } }} />
          <button type="submit" className="composer-send" disabled={!value.trim() || loading} aria-label="Enviar pergunta"><Icon name="sparkles" size={19} /></button>
        </form>
        <small className="composer-help">Enter envia · Shift + Enter cria uma nova linha</small>
      </div>
    </div>
  )
}
