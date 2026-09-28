'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { zendeskKnowledgeStatuses, type ZendeskKnowledgeStatus } from '@/lib/data'
import { useAuth } from './AuthProvider'
import { Icon } from './Icon'
import { ProjectSelector } from './ProjectSelector'
import { StatusBadge } from './StatusBadge'
import { useProject } from './ProjectProvider'

type Ticket = {
  id: string
  project_id: string
  ticket_number: string
  subject: string
  description: string
  resolution: string
  ticket_status: string
  knowledge_status: ZendeskKnowledgeStatus
  url?: string | null
  created_at_zendesk?: string | null
  solved_at?: string | null
}
type IntegrationStatus = { configured: boolean; message: string }

const statusLabels: Record<ZendeskKnowledgeStatus, string> = {
  new: 'Novo', approved: 'Aprovado', indexed: 'Indexado', rejected: 'Rejeitado',
}
const statusTones: Record<ZendeskKnowledgeStatus, 'info' | 'warning' | 'success' | 'danger'> = {
  new: 'info', approved: 'warning', indexed: 'success', rejected: 'danger',
}

function formatDate(value?: string | null) {
  if (!value) return 'Data não informada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date)
}

export function ZendeskClient() {
  const { project } = useProject()
  const { session } = useAuth()
  const canCurate = session?.role === 'admin' || session?.role === 'moderator'
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | ZendeskKnowledgeStatus>('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [integration, setIntegration] = useState<IntegrationStatus | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const loadTickets = useCallback(async () => {
    if (!project?.id) return
    setLoading(true)
    setNotice(null)
    try {
      const [rows, status] = await Promise.all([
        apiFetch<Ticket[]>(`/zendesk/tickets?project_id=${encodeURIComponent(project.id)}`),
        apiFetch<IntegrationStatus>('/zendesk/status'),
      ])
      setTickets(rows)
      setIntegration(status)
      setSelectedId(current => rows.some(ticket => ticket.id === current) ? current : rows[0]?.id ?? null)
    } catch (error) {
      setTickets([])
      setSelectedId(null)
      setNotice(error instanceof Error ? error.message : 'Não foi possível carregar os chamados.')
    } finally {
      setLoading(false)
    }
  }, [project?.id])

  useEffect(() => {
    setFilter('all')
    setQuery('')
    void loadTickets()
  }, [loadTickets])

  const visibleTickets = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    return tickets.filter(ticket => (filter === 'all' || ticket.knowledge_status === filter)
      && (!term || `${ticket.ticket_number} ${ticket.subject} ${ticket.description} ${ticket.resolution}`.toLocaleLowerCase('pt-BR').includes(term)))
  }, [filter, query, tickets])
  const selected = tickets.find(ticket => ticket.id === selectedId) ?? visibleTickets[0] ?? null
  const counts = useMemo(() => ({
    all: tickets.length,
    new: tickets.filter(ticket => ticket.knowledge_status === 'new').length,
    approved: tickets.filter(ticket => ticket.knowledge_status === 'approved').length,
    indexed: tickets.filter(ticket => ticket.knowledge_status === 'indexed').length,
    rejected: tickets.filter(ticket => ticket.knowledge_status === 'rejected').length,
  }), [tickets])

  async function performAction(action: 'approve' | 'reject' | 'index') {
    if (!selected) return
    setActionLoading(true)
    setNotice(null)
    try {
      const ticket = await apiFetch<Ticket>(`/zendesk/tickets/${encodeURIComponent(selected.id)}/${action}`, { method: 'POST' })
      setTickets(current => current.map(item => item.id === ticket.id ? ticket : item))
      setNotice(action === 'index' ? 'Chamado indexado para consulta pelo Assistente IA.' : action === 'approve' ? 'Chamado aprovado.' : 'Chamado rejeitado.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível concluir a ação.')
    } finally {
      setActionLoading(false)
    }
  }

  async function createDemo() {
    if (!project?.id) return
    setActionLoading(true)
    setNotice(null)
    try {
      const ticket = await apiFetch<Ticket>('/zendesk/demo-ticket', { method: 'POST', body: JSON.stringify({ project_id: project.id }) })
      setTickets(current => [ticket, ...current])
      setSelectedId(ticket.id)
      setNotice('Chamado de teste criado. Aprove e indexe para validar o fluxo.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível criar um chamado de teste.')
    } finally {
      setActionLoading(false)
    }
  }

  const filters: Array<{ id: 'all' | ZendeskKnowledgeStatus; label: string }> = canCurate
    ? [{ id: 'all', label: 'Todos' }, { id: 'new', label: 'Novos' }, { id: 'approved', label: 'Aprovados' }, { id: 'indexed', label: 'Indexados' }, { id: 'rejected', label: 'Rejeitados' }]
    : [{ id: 'all', label: 'Todos' }, { id: 'indexed', label: 'Indexados' }]

  return (
    <div className="zendesk-page">
      <section className="zendesk-hero panel">
        <div className="zendesk-brand-block">
          <span className="zendesk-brand-mark"><Icon name="zendesk" size={26} /></span>
          <div><span className="eyebrow">Integração de conhecimento</span><h1>Zendesk</h1><p>Revise chamados resolvidos e aprove as soluções que podem compor a base de conhecimento.</p></div>
        </div>
        <div className="zendesk-hero-actions"><ProjectSelector /><button type="button" className="secondary-button" disabled title="A sincronização automática será habilitada após configurar a regra de associação de tickets aos projetos."><Icon name="refresh-cw" size={16} /> Sincronizar</button></div>
      </section>

      <div className="zendesk-status-row"><span className={`zendesk-connection ${integration?.configured ? 'connected' : ''}`}><span className="zendesk-connection-dot" />{integration?.message ?? 'Carregando integração…'}</span><span className="zendesk-project-caption">Projeto: <strong>{project?.name}</strong></span></div>
      {notice && <div className="zendesk-notice" role="status">{notice}</div>}

      <section className="zendesk-toolbar panel">
        <label className="zendesk-search"><Icon name="search" size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por número, assunto ou conteúdo…" /></label>
        <div className="zendesk-filter-tabs" aria-label="Filtrar chamados">{filters.map(item => <button key={item.id} type="button" className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)}>{item.label}<span>{counts[item.id]}</span></button>)}</div>
      </section>

      <div className="zendesk-workspace">
        <section className="zendesk-ticket-list panel" aria-label="Chamados Zendesk">
          <div className="zendesk-list-head"><div><span className="eyebrow">Chamados</span><h2>{project?.name}</h2></div>{canCurate && <button type="button" className="secondary-button small" disabled={actionLoading} onClick={() => void createDemo()}>Criar exemplo</button>}</div>
          {loading && <div className="zendesk-empty"><span className="loader" /> Carregando chamados…</div>}
          {!loading && visibleTickets.length === 0 && <div className="zendesk-empty"><span className="zendesk-empty-icon"><Icon name="inbox" size={24} /></span><strong>Nenhum chamado neste filtro</strong><p>{tickets.length === 0 ? 'Chamados sincronizados para este projeto aparecerão aqui.' : 'Tente outro filtro ou termo de busca.'}</p>{canCurate && tickets.length === 0 && <button type="button" className="primary-button small" disabled={actionLoading} onClick={() => void createDemo()}>Criar exemplo para testar</button>}</div>}
          <div className="zendesk-ticket-stack">{visibleTickets.map(ticket => <button key={ticket.id} type="button" className={`zendesk-ticket-row ${ticket.id === selected?.id ? 'active' : ''}`} onClick={() => setSelectedId(ticket.id)}><span className="zendesk-ticket-number">#{ticket.ticket_number}</span><span className="zendesk-ticket-copy"><strong>{ticket.subject}</strong><small>Resolvido em {formatDate(ticket.solved_at ?? ticket.created_at_zendesk)}</small></span><StatusBadge tone={statusTones[ticket.knowledge_status]}>{statusLabels[ticket.knowledge_status]}</StatusBadge></button>)}</div>
        </section>

        <section className="zendesk-ticket-detail panel">
          {!selected ? <div className="zendesk-detail-empty"><Icon name="ticket" size={30} /><strong>Selecione um chamado</strong><p>Os detalhes e ações de curadoria aparecerão aqui.</p></div> : <>
            <div className="zendesk-detail-head"><div><span className="eyebrow">Chamado #{selected.ticket_number}</span><h2>{selected.subject}</h2><div className="zendesk-ticket-meta"><span><Icon name="clock" size={14} /> {formatDate(selected.solved_at ?? selected.created_at_zendesk)}</span><span>Status Zendesk: {selected.ticket_status}</span></div></div><StatusBadge tone={statusTones[selected.knowledge_status]}>{statusLabels[selected.knowledge_status]}</StatusBadge></div>
            <div className="zendesk-content-block"><span className="eyebrow">Descrição do chamado</span><p>{selected.description || 'Sem descrição importada.'}</p></div>
            <div className="zendesk-content-block solution"><span className="eyebrow">Solução registrada</span><p>{selected.resolution || 'Ainda não há uma solução registrada.'}</p></div>
            {selected.knowledge_status === 'indexed' && <div className="zendesk-indexed-callout"><Icon name="check-circle-2" size={20} /><div><strong>Disponível para o Assistente IA</strong><p>Este chamado pode aparecer como fonte nas respostas do chat.</p></div></div>}
            <div className="zendesk-detail-actions">
              {selected.url && <a className="secondary-button" href={selected.url} target="_blank" rel="noreferrer"><Icon name="external-link" size={16} /> Abrir no Zendesk</a>}
              {canCurate && selected.knowledge_status !== 'indexed' && selected.knowledge_status !== 'approved' && <button type="button" className="primary-button" disabled={actionLoading} onClick={() => void performAction('approve')}><Icon name="check-circle-2" size={16} /> Aprovar conhecimento</button>}
              {canCurate && selected.knowledge_status === 'approved' && <button type="button" className="primary-button" disabled={actionLoading} onClick={() => void performAction('index')}><Icon name="database" size={16} /> Indexar na IA</button>}
              {canCurate && selected.knowledge_status !== 'indexed' && selected.knowledge_status !== 'rejected' && <button type="button" className="danger-button" disabled={actionLoading} onClick={() => void performAction('reject')}><Icon name="x-circle" size={16} /> Rejeitar</button>}
            </div>
          </>}
        </section>
      </div>
    </div>
  )
}