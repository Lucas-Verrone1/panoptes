'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthProvider'
import { Icon, type IconName } from './Icon'
import { PageHeader } from './PageHeader'
import { apiFetch } from '@/lib/api'

type AnalyticsResponse = {
  metrics: Array<{ label: string; value: number; helper: string; icon: IconName; tone: string }>
  projectStatus: Array<{ label: string; value: number; color: string }>
  projectActivity: Array<{ id: string; name: string; status: string; documents: number; sources: number; updated_at: string | null }>
  recentSources: Array<{ title: string; status: string; project: string; created_at: string | null }>
  recentDocuments: Array<{ title: string; summary: string; project: string; updated_at: string | null; source_url: string | null }>
  feedbackBreakdown: Array<{ label: string; value: number; color: string; percentage: number }>
  activitySummary: {
    documents: number
    sources: number
    projects: number
    messages: number
    indexedSources: number
    pendingJobs: number
    zendeskTickets: number
    indexedZendesk: number
    zendeskCitations: number
  }
}

const toneClasses: Record<string, string> = {
  accent: 'accent',
  info: 'info',
  success: 'success',
  warning: 'warning',
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatCompactNumber(value: number) {
  return Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value)
}

function formatSourceStatus(value: string) {
  const labels: Record<string, string> = {
    indexed: 'Indexada',
    failed: 'Falha',
    pending: 'Pendente',
    processing: 'Processando',
    queued: 'Na fila',
  }
  return labels[value.toLowerCase()] ?? value
}

export function AnalyticsClient() {
  const { session } = useAuth()
  const limited = session?.role === 'moderator'

  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        const result = await apiFetch<AnalyticsResponse>('/analytics')
        if (mounted) {
          setData(result)
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Não foi possível carregar os dados de análises.')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  const visibleMetrics = useMemo(() => {
    if (!data) return []
    return data.metrics.filter((metric) => !(limited && metric.label === 'Avaliações da IA'))
  }, [data, limited])

  if (loading) {
    return (
      <>
        <PageHeader title="Análises" description="Carregando indicadores em tempo real do banco..." />
        <div className="panel panel-pad empty-state">Carregando painéis...</div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <PageHeader title="Análises" description="Indicadores de conhecimento, colaboração e qualidade." />
        <div className="panel panel-pad empty-state">{error || 'Não foi possível carregar os dados.'}</div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Análises"
        description={limited ? 'Visão limitada aos indicadores de documentação e comunidade.' : 'Indicadores de conhecimento, colaboração e qualidade.'}
      />

      <div className="metrics-grid">
        {visibleMetrics.map((metric) => (
          <section className="metric-card panel" key={metric.label}>
            <span className="icon-tile">
              <Icon name={metric.icon} size={19} />
            </span>
            <strong>{formatCompactNumber(metric.value)}</strong>
            <span>{metric.label}</span>
            <small className={`status-badge ${toneClasses[metric.tone] || 'accent'}`}>{metric.helper}</small>
          </section>
        ))}
      </div>

      <div className="grid-two" style={{ marginBottom: '16px' }}>
        <section className="panel panel-pad">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Status dos projetos</span>
              <h2>Distribuição por estado</h2>
            </div>
          </div>

          <div className="analytics-flow" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
            {data.projectStatus.map((item) => (
              <div key={item.label}>
                <span style={{ background: item.color, color: '#fff', borderColor: item.color }}>{item.value}</span>
                <strong>{item.label}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel panel-pad">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Avaliações</span>
              <h2>Qualidade da resposta da IA</h2>
            </div>
          </div>

          <div className="knowledge-list">
            {data.feedbackBreakdown.map((item) => (
              <div key={item.label}>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.percentage}% do total</small>
                </span>
                <div className="status-badge" style={{ background: `${item.color}1A`, color: item.color }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel panel-pad" style={{ marginBottom: '16px' }}>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Resumo executivo</span>
            <h2>Atividade por projeto</h2>
          </div>
        </div>

        <div className="projects-grid">
          {data.projectActivity.map((project) => (
            <article className="project-card panel" key={project.id}>
              <div className="project-card-top">
                <div className={`status-badge ${(project.status === 'Indexado' ? 'success' : project.status === 'Processando' ? 'warning' : 'danger')}`}>
                  {project.status}
                </div>
              </div>
              <h2>{project.name}</h2>
              <p>Última atualização: {formatDate(project.updated_at)}</p>
              <dl className="project-meta">
                <div>
                  <dt>Documentos</dt>
                  <dd>{project.documents}</dd>
                </div>
                <div>
                  <dt>Fontes</dt>
                  <dd>{project.sources}</dd>
                </div>
                <div>
                  <dt>Atualização</dt>
                  <dd>{project.updated_at ? 'Ativo' : 'Sem dados'}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <div className="grid-two" style={{ marginBottom: '16px' }}>
        <section className="panel panel-pad">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Fonte</span>
              <h2>Últimas fontes registradas</h2>
            </div>
          </div>

          <div className="knowledge-list">
            {data.recentSources.map((source) => (
              <div key={`${source.title}-${source.created_at}`}>
                <span>
                  <strong>{source.title}</strong>
                  <small>{source.project}</small>
                </span>
                <div className={`status-badge ${source.status === 'indexed' ? 'success' : source.status === 'failed' ? 'danger' : 'warning'}`}>
                  {formatSourceStatus(source.status)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel panel-pad">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Documentação</span>
              <h2>Documentos mais recentes</h2>
            </div>
          </div>

          <div className="knowledge-list">
            {data.recentDocuments.map((document) => (
              <div key={`${document.title}-${document.updated_at}`}>
                <span>
                  <strong>{document.title}</strong>
                  <small>{document.project}</small>
                </span>
                <small>{formatDate(document.updated_at)}</small>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel panel-pad">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Resumo operacional</span>
            <h2>Indicadores ativos</h2>
          </div>
        </div>

        <div className="metrics-grid">
          <section className="metric-card panel" key="summary-1">
            <span className="icon-tile"><Icon name="file-text" size={19} /></span>
            <strong>{data.activitySummary.documents}</strong>
            <span>Documentos disponíveis</span>
          </section>
          <section className="metric-card panel" key="summary-2">
            <span className="icon-tile"><Icon name="database" size={19} /></span>
            <strong>{data.activitySummary.sources}</strong>
            <span>Fontes cadastradas</span>
          </section>
          <section className="metric-card panel" key="summary-3">
            <span className="icon-tile"><Icon name="folder-git-2" size={19} /></span>
            <strong>{data.activitySummary.indexedSources}</strong>
            <span>Fontes indexadas</span>
          </section>
          <section className="metric-card panel" key="summary-4">
            <span className="icon-tile"><Icon name="messages-square" size={19} /></span>
            <strong>{data.activitySummary.messages}</strong>
            <span>Mensagens no chat</span>
          </section>
          <section className="metric-card panel" key="summary-5">
            <span className="icon-tile"><Icon name="zendesk" size={19} /></span>
            <strong>{data.activitySummary.indexedZendesk}</strong>
            <span>Chamados Zendesk indexados</span>
          </section>
          <section className="metric-card panel" key="summary-6">
            <span className="icon-tile"><Icon name="link" size={19} /></span>
            <strong>{data.activitySummary.zendeskCitations}</strong>
            <span>Citações Zendesk nas respostas</span>
          </section>
        </div>
      </section>
    </>
  )
}
