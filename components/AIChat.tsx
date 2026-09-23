'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { Icon } from './Icon'
import { ProjectSelector } from './ProjectSelector'
import { useProject } from './ProjectProvider'

type AssistantResponseStyle = 'direct' | 'patient' | 'technical'

type SourceReference = {
  kind: 'document' | 'zendesk'
  label: string
  title: string
  url?: string | null
  document_id?: string | null
  ticket_number?: string | null
  ticket_date?: string | null
}

type ChatMessage = {
  id?: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceReference[]
  created_at?: string | null
}

type ConversationSummary = {
  id: string
  title: string
  message_count: number
  updated_at?: string | null
  questions: string[]
}

type ConversationDetail = {
  id: string
  title: string
  messages: ChatMessage[]
}

type AssistantConfig = {
  responseStyle: AssistantResponseStyle
  handoffEnabled: boolean
  handoffText: string
  preferredModel: string
  customPrompt: string
}

const assistantConfigStorageKey = 'panoptes-assistant-config'
const defaultAssistantConfig: AssistantConfig = {
  responseStyle: 'direct',
  handoffEnabled: true,
  handoffText: 'Se a pergunta exigir uma decisão humana, encaminhe o usuário para o responsável do processo ou peça confirmação antes de agir.',
  preferredModel: 'gemini-3.6-flash',
  customPrompt: '',
}

const modelOptions = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash']
const assistantPresets: Array<{ id: string; label: string; config: AssistantConfig }> = [
  {
    id: 'balanced',
    label: 'Equilibrado',
    config: {
      responseStyle: 'direct',
      handoffEnabled: true,
      handoffText: 'Se a pergunta exigir uma decisão humana, encaminhe o usuário para o responsável do processo ou peça confirmação antes de agir.',
      preferredModel: 'gemini-3.6-flash',
      customPrompt: 'Responda com linguagem clara, priorize passos práticos e cite apenas o contexto documental disponível.',
    },
  },
  {
    id: 'patient',
    label: 'Mais paciente',
    config: {
      responseStyle: 'patient',
      handoffEnabled: true,
      handoffText: 'Quando houver dúvida sobre a regra ou processo, explique em etapas curtas e pergunte se o usuário deseja mais detalhe.',
      preferredModel: 'gemini-3.6-flash',
      customPrompt: 'Explique com calma, em passos menores, e sempre deixe claro quando uma resposta depende de contexto adicional.',
    },
  },
  {
    id: 'technical',
    label: 'Mais técnico',
    config: {
      responseStyle: 'technical',
      handoffEnabled: true,
      handoffText: 'Se a pergunta exigir aprovação ou ação crítica, indique o responsável e o próximo passo de forma explícita.',
      preferredModel: 'gemini-2.5-pro',
      customPrompt: 'Responda com rigor técnico, use nomenclatura correta e priorize precisão e estrutura lógica.',
    },
  },
]

function loadAssistantConfig(): AssistantConfig {
  if (typeof window === 'undefined') return defaultAssistantConfig
  try {
    const stored = window.localStorage.getItem(assistantConfigStorageKey)
    if (!stored) return defaultAssistantConfig
    const parsed = JSON.parse(stored) as Partial<AssistantConfig>
    return {
      responseStyle: parsed.responseStyle === 'patient' || parsed.responseStyle === 'technical' ? parsed.responseStyle : defaultAssistantConfig.responseStyle,
      handoffEnabled: typeof parsed.handoffEnabled === 'boolean' ? parsed.handoffEnabled : defaultAssistantConfig.handoffEnabled,
      handoffText: typeof parsed.handoffText === 'string' ? parsed.handoffText : defaultAssistantConfig.handoffText,
      preferredModel: typeof parsed.preferredModel === 'string' && parsed.preferredModel ? parsed.preferredModel : defaultAssistantConfig.preferredModel,
      customPrompt: typeof parsed.customPrompt === 'string' ? parsed.customPrompt : defaultAssistantConfig.customPrompt,
    }
  } catch {
    return defaultAssistantConfig
  }
}

function assistantConfigToBody(config: AssistantConfig) {
  return {
    response_style: config.responseStyle,
    handoff_enabled: config.handoffEnabled,
    handoff_text: config.handoffText,
    preferred_model: config.preferredModel,
    custom_prompt: config.customPrompt,
  }
}

function createSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatConversationTitle(text: string) {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > 46 ? `${clean.slice(0, 46).trim()}…` : clean
}

function formatHistoryDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatSourceDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export function AIChat({ compact = false }: { compact?: boolean }) {
  const firstSessionId = useRef(createSessionId())
  const activeConversationIdRef = useRef(firstSessionId.current)
  const activeProjectIdRef = useRef('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const lastAutoSubmittedRef = useRef<string | null>(null)

  const [assistantConfig, setAssistantConfig] = useState<AssistantConfig>(loadAssistantConfig)
  const [configOpen, setConfigOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversationId, setActiveConversationId] = useState(firstSessionId.current)
  const [activeConversationTitle, setActiveConversationTitle] = useState('Nova conversa')
  const [historyQuery, setHistoryQuery] = useState('')

  const searchParams = useSearchParams()
  const { project } = useProject()
  const requestedProjectId = searchParams.get('project') ?? project?.id ?? ''
  const requestedQuestion = searchParams.get('q')?.trim() ?? ''

  const loadConversations = useCallback(async (projectId: string) => {
    if (!projectId) return
    setHistoryLoading(true)
    try {
      const result = await apiFetch<ConversationSummary[]>(`/ai/conversations?project_id=${encodeURIComponent(projectId)}`)
      if (activeProjectIdRef.current === projectId) setConversations(result)
    } catch {
      if (activeProjectIdRef.current === projectId) setConversations([])
    } finally {
      if (activeProjectIdRef.current === projectId) setHistoryLoading(false)
    }
  }, [])

  const startNewConversation = useCallback(() => {
    const nextId = createSessionId()
    activeConversationIdRef.current = nextId
    setActiveConversationId(nextId)
    setActiveConversationTitle('Nova conversa')
    setMessages([])
    setError(null)
    setQuestion('')
  }, [])

  useEffect(() => {
    const projectId = project?.id ?? ''
    if (!projectId) return

    activeProjectIdRef.current = projectId
    setHistoryQuery('')
    setConversations([])
    setLoading(false)
    setHistoryLoading(false)
    startNewConversation()
    void loadConversations(projectId)
  }, [project?.id, loadConversations, startNewConversation])

  useEffect(() => {
    try {
      window.localStorage.setItem(assistantConfigStorageKey, JSON.stringify(assistantConfig))
    } catch {
      // Ambientes restritos podem bloquear localStorage.
    }
  }, [assistantConfig])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  const sendQuestion = useCallback(async (nextQuestion: string, nextProjectId: string) => {
    const trimmed = nextQuestion.trim()
    if (!trimmed || !nextProjectId) return

    const sessionId = activeConversationIdRef.current
    const projectId = nextProjectId
    const optimisticUserMessage: ChatMessage = { role: 'user', content: trimmed }

    setLoading(true)
    setError(null)
    setMessages(prev => [...prev, optimisticUserMessage])
    setActiveConversationTitle(prev => prev === 'Nova conversa' ? formatConversationTitle(trimmed) : prev)
    setQuestion('')

    try {
      const result = await apiFetch<{ answer: string; sources: SourceReference[]; session_id: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          question: trimmed,
          project_id: projectId,
          session_id: sessionId,
          assistant: assistantConfigToBody(assistantConfig),
        }),
      })

      if (activeProjectIdRef.current === projectId && activeConversationIdRef.current === sessionId) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.answer, sources: result.sources }])
      }
      await loadConversations(projectId)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Não foi possível consultar o assistente.'
      if (activeProjectIdRef.current === projectId && activeConversationIdRef.current === sessionId) {
        setError(message)
        setMessages(prev => [...prev, { role: 'assistant', content: `Não consegui responder agora. ${message}` }])
      }
    } finally {
      if (activeProjectIdRef.current === projectId && activeConversationIdRef.current === sessionId) setLoading(false)
    }
  }, [assistantConfig, loadConversations])

  useEffect(() => {
    if (!requestedQuestion || !requestedProjectId || !project?.id || requestedProjectId !== project.id) {
      if (!requestedQuestion) lastAutoSubmittedRef.current = null
      return
    }

    const requestKey = `${requestedProjectId}:${requestedQuestion}`
    if (lastAutoSubmittedRef.current === requestKey) return
    lastAutoSubmittedRef.current = requestKey
    void sendQuestion(requestedQuestion, requestedProjectId)
  }, [project?.id, requestedProjectId, requestedQuestion, sendQuestion])

  const openConversation = useCallback(async (conversation: ConversationSummary) => {
    if (!project?.id || loading) return

    activeConversationIdRef.current = conversation.id
    setActiveConversationId(conversation.id)
    setActiveConversationTitle(conversation.title)
    setMessages([])
    setError(null)
    setHistoryLoading(true)

    try {
      const result = await apiFetch<ConversationDetail>(
        `/ai/conversations/${encodeURIComponent(conversation.id)}?project_id=${encodeURIComponent(project.id)}`,
      )
      if (activeConversationIdRef.current === conversation.id && activeProjectIdRef.current === project.id) {
        setMessages(result.messages)
        setActiveConversationTitle(result.title)
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível abrir esta conversa.')
    } finally {
      setHistoryLoading(false)
    }
  }, [loading, project?.id])

  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!project?.id) return
    try {
      await apiFetch<{ ok: boolean }>(
        `/ai/conversations/${encodeURIComponent(conversationId)}?project_id=${encodeURIComponent(project.id)}`,
        { method: 'DELETE' },
      )
      setConversations(prev => prev.filter(item => item.id !== conversationId))
      if (activeConversationIdRef.current === conversationId) startNewConversation()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível excluir a conversa.')
    }
  }, [project?.id, startNewConversation])

  const filteredConversations = useMemo(() => {
    const query = historyQuery.trim().toLocaleLowerCase('pt-BR')
    if (!query) return conversations
    return conversations.filter(conversation => {
      const haystack = [conversation.title, ...conversation.questions].join(' ').toLocaleLowerCase('pt-BR')
      return haystack.includes(query)
    })
  }, [conversations, historyQuery])

  const submitQuestion = async () => {
    const trimmed = question.trim()
    if (!trimmed || !project?.id || loading) return
    await sendQuestion(trimmed, project.id)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await submitQuestion()
  }

  const composer = (
    <form className="ai-composer panoptes-chat-composer" onSubmit={handleSubmit} aria-label={`Perguntar ao Panoptes sobre ${project?.name ?? 'o projeto atual'}`}>
      <textarea
        rows={1}
        value={question}
        onChange={event => setQuestion(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            void submitQuestion()
          }
        }}
        placeholder={project ? `Pergunte sobre ${project.name}…` : 'Digite sua pergunta...'}
        aria-label={project ? `Sua pergunta sobre ${project.name}` : 'Sua pergunta'}
      />
      <button type="submit" className="composer-send" aria-label="Enviar pergunta" disabled={loading || !project?.id || !question.trim()}>
        <Icon name="sparkles" size={19} />
      </button>
    </form>
  )

  if (compact) {
    return (
      <div className="dashboard-ai-chat">
        {composer}
        {messages.length > 0 && (
          <div className="dashboard-ai-last-message" aria-live="polite">
            {messages.slice(-1).map((message, index) => (
              <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
                {message.role === 'assistant' && <div className="assistant-avatar"><Icon name="sparkles" size={17} /></div>}
                <div className="chat-bubble"><p>{message.content}</p></div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page ai-page panoptes-chat-page">
      <div className="panoptes-chat-shell">
        <aside className="panoptes-history-panel" aria-label={`Histórico do projeto ${project?.name ?? ''}`}>
          <div className="history-head">
            <div>
              <span className="eyebrow">Projeto atual</span>
              <strong>{project?.name ?? 'Projeto'}</strong>
            </div>
            <button type="button" className="icon-button" onClick={startNewConversation} aria-label="Nova conversa">
              <Icon name="message-square" size={18} />
            </button>
          </div>

          <div className="history-project-selector"><ProjectSelector variant="chat" /></div>

          <label className="history-search">
            <Icon name="search" size={16} />
            <input
              value={historyQuery}
              onChange={event => setHistoryQuery(event.target.value)}
              placeholder="Buscar conversas"
              aria-label="Buscar no histórico de conversas"
            />
          </label>

          <button type="button" className="primary-button full history-new-button" onClick={startNewConversation}>
            Nova conversa
          </button>

          <div className="history-list">
            {historyLoading && conversations.length === 0 && <p className="history-empty">Carregando histórico…</p>}
            {!historyLoading && filteredConversations.length === 0 && (
              <p className="history-empty">{historyQuery ? 'Nenhuma conversa encontrada.' : 'Ainda não há conversas neste projeto.'}</p>
            )}
            {filteredConversations.map(conversation => (
              <div
                key={conversation.id}
                className={`history-item ${conversation.id === activeConversationId ? 'active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => void openConversation(conversation)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    void openConversation(conversation)
                  }
                }}
              >
                <div className="history-item-copy">
                  <strong>{conversation.title}</strong>
                  <small>{conversation.message_count} mensagens{conversation.updated_at ? ` · ${formatHistoryDate(conversation.updated_at)}` : ''}</small>
                </div>
                <button
                  type="button"
                  className="history-delete"
                  aria-label={`Excluir conversa ${conversation.title}`}
                  onClick={event => {
                    event.stopPropagation()
                    void deleteConversation(conversation.id)
                  }}
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="panoptes-chat-main">
          <header className="panoptes-chat-header">
            <div>
              <span className="eyebrow">Assistente IA</span>
              <h1>{activeConversationTitle}</h1>
              <p>Respostas com base na documentação indexada de <strong>{project?.name}</strong>.</p>
            </div>
            <button type="button" className="secondary-button" onClick={() => setConfigOpen(true)}>
              <Icon name="settings-2" size={17} />
              Configurar IA
            </button>
          </header>

          <div className="panoptes-chat-thread" aria-live="polite">
            {messages.length === 0 && !historyLoading && (
              <div className="panoptes-chat-welcome">
                <div className="hero-mark"><Icon name="sparkles" size={24} /></div>
                <h2>Como posso ajudar neste projeto?</h2>
                <p>Faça uma pergunta sobre as fontes indexadas. Cada conversa ficará salva somente no histórico deste projeto.</p>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={message.id ?? `${message.role}-${index}`} className={`chat-message ${message.role}`}>
                {message.role === 'assistant' && (
                  <div className="assistant-avatar" aria-hidden="true"><Icon name="sparkles" size={17} /></div>
                )}
                <div className="chat-bubble">
                  <p>{message.content}</p>
                  {message.sources && message.sources.length > 0 && (
                    <div className="answer-sources">
                      <span className="answer-sources-title">Fontes utilizadas</span>
                      <div className="answer-source-list">
                        {message.sources.map((source, sourceIndex) => {
                          const content = (
                            <>
                              <span className={`answer-source-icon ${source.kind}`}><Icon name={source.kind === 'zendesk' ? 'zendesk' : 'file-text'} size={16} /></span>
                              <span className="answer-source-copy">
                                <strong>{source.label}</strong>
                                <small>{source.kind === 'zendesk'
                                  ? `Chamado #${source.ticket_number ?? '—'}${source.ticket_date ? ` · ${formatSourceDate(source.ticket_date)}` : ''}`
                                  : source.title}</small>
                                {source.kind === 'zendesk' && source.title && <span>{source.title}</span>}
                              </span>
                              {source.url && source.url.startsWith('http') && <Icon name="external-link" size={14} />}
                            </>
                          )
                          return source.url && source.url.startsWith('http')
                            ? <a className="answer-source-card" href={source.url} target="_blank" rel="noreferrer" key={`${source.kind}-${source.document_id ?? source.ticket_number ?? sourceIndex}`}>{content}</a>
                            : <div className="answer-source-card" key={`${source.kind}-${source.document_id ?? source.ticket_number ?? sourceIndex}`}>{content}</div>
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-message assistant">
                <div className="assistant-avatar" aria-hidden="true"><Icon name="sparkles" size={17} /></div>
                <div className="chat-bubble typing" aria-label="Panoptes está respondendo">
                  <span className="sr-only">Panoptes está respondendo</span><span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="panoptes-chat-composer-wrap">
            {error && <div className="form-error panoptes-chat-error" role="alert">{error}</div>}
            {composer}
            <small>Enter envia · Shift + Enter cria uma nova linha</small>
          </div>
        </section>
      </div>

      {configOpen && (
        <div className="assistant-settings-backdrop" role="presentation" onMouseDown={() => setConfigOpen(false)}>
          <section className="assistant-settings-panel" role="dialog" aria-modal="true" aria-labelledby="assistant-settings-title" onMouseDown={event => event.stopPropagation()}>
            <div className="assistant-settings-head">
              <div>
                <span className="eyebrow">Personalização</span>
                <h2 id="assistant-settings-title">Configurar IA</h2>
                <p>Defina como o assistente deve responder. As alterações são aplicadas às próximas mensagens.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setConfigOpen(false)} aria-label="Fechar configurações">
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="assistant-preset-row" aria-label="Presets do assistente">
              {assistantPresets.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  className={`secondary-button small assistant-preset ${assistantConfig.responseStyle === preset.config.responseStyle && assistantConfig.preferredModel === preset.config.preferredModel && assistantConfig.customPrompt === preset.config.customPrompt ? 'active' : ''}`}
                  onClick={() => setAssistantConfig(preset.config)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="assistant-config-grid">
              <label className="field">
                <span>Estilo de resposta</span>
                <select
                  value={assistantConfig.responseStyle}
                  onChange={event => setAssistantConfig(prev => ({ ...prev, responseStyle: event.target.value as AssistantResponseStyle }))}
                >
                  <option value="direct">Direta</option>
                  <option value="patient">Mais paciente</option>
                  <option value="technical">Mais técnica</option>
                </select>
              </label>

              <label className="field">
                <span>Modelo preferido</span>
                <select
                  value={assistantConfig.preferredModel}
                  onChange={event => setAssistantConfig(prev => ({ ...prev, preferredModel: event.target.value }))}
                >
                  {modelOptions.map(model => <option key={model} value={model}>{model}</option>)}
                </select>
              </label>

              <label className="field assistant-full-width">
                <span>Prompts extras</span>
                <textarea
                  rows={4}
                  value={assistantConfig.customPrompt}
                  onChange={event => setAssistantConfig(prev => ({ ...prev, customPrompt: event.target.value }))}
                  placeholder="Ex.: use linguagem simples, priorize respostas com passos claros e evite conclusões sem suporte documental."
                />
              </label>

              <div className="assistant-full-width">
                <label className="assistant-toggle">
                  <input
                    type="checkbox"
                    checked={assistantConfig.handoffEnabled}
                    onChange={event => setAssistantConfig(prev => ({ ...prev, handoffEnabled: event.target.checked }))}
                  />
                  <span>Habilitar hand-offs e orientações de encaminhamento</span>
                </label>

                <label className="field assistant-full-width" style={{ marginTop: 12 }}>
                  <span>Instruções de hand-off</span>
                  <textarea
                    rows={3}
                    value={assistantConfig.handoffText}
                    disabled={!assistantConfig.handoffEnabled}
                    onChange={event => setAssistantConfig(prev => ({ ...prev, handoffText: event.target.value }))}
                  />
                </label>
              </div>
            </div>

            <div className="assistant-settings-footer">
              <span>Modelo ativo: <strong>{assistantConfig.preferredModel}</strong></span>
              <button type="button" className="primary-button" onClick={() => setConfigOpen(false)}>Concluir</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
