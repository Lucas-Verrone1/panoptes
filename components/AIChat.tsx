'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { Icon } from './Icon'
import { ProjectSelector } from './ProjectSelector'
import { useProject } from './ProjectProvider'
import { useAuth } from './AuthProvider'
import { VoiceRecorder } from './VoiceRecorder'

type AssistantResponseStyle = 'direct' | 'patient' | 'technical'
type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

type Conversation = {
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
const conversationStorageKey = 'panoptes-ai-conversations'
const defaultAssistantConfig: AssistantConfig = {
  responseStyle: 'direct',
  handoffEnabled: true,
  handoffText: 'Se a pergunta exigir uma decisão humana, encaminhe o usuário para o responsável do processo ou peça confirmação antes de agir.',
  preferredModel: 'gemini-3.6-flash',
  customPrompt: '',
}

function loadStoredConversations(): Conversation[] {
  if (typeof window === 'undefined') {
    return [{ id: createSessionId(), title: 'Nova conversa', messages: [] }]
  }

  try {
    const stored = window.localStorage.getItem(conversationStorageKey)
    if (!stored) {
      return [{ id: createSessionId(), title: 'Nova conversa', messages: [] }]
    }

    const parsed = JSON.parse(stored) as Partial<Conversation>[]
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(item => item && typeof item.id === 'string' && Array.isArray(item.messages))) {
      return parsed as Conversation[]
    }
  } catch {
    // Ignore invalid saved state; create a fresh history.
  }

  return [{ id: createSessionId(), title: 'Nova conversa', messages: [] }]
}

const modelOptions = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.5-pro']
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
      handoffText: 'Se a pergunta exigir aprovação, decision-making humano ou ação crítica, indique o responsável e o próximo passo de forma explícita.',
      preferredModel: 'gemini-2.5-pro',
      customPrompt: 'Responda com rigor técnico, use nomenclatura correta, e priorize precisão e estrutura lógica.',
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
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatConversationTitle(text: string) {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > 28 ? `${clean.slice(0, 28).trim()}…` : clean
}

function appendConversationMessage(conversation: Conversation, message: ChatMessage): Conversation {
  return {
    ...conversation,
    messages: [...conversation.messages, message],
  }
}

export function AIChat({ compact = false }: { compact?: boolean }) {
  const initialConversationId = useRef(createSessionId())
  const [assistantConfig, setAssistantConfig] = useState<AssistantConfig>(loadAssistantConfig)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [homeConversationOpen, setHomeConversationOpen] = useState(false)
  const conversationPanelRef = useRef<HTMLElement>(null)
  const [respondingConversationId, setRespondingConversationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const stored = loadStoredConversations()
    const firstConversation = stored[0] ?? { id: initialConversationId.current, title: 'Nova conversa', messages: [] }
    if (stored.length === 0) {
      return [{ id: initialConversationId.current, title: 'Nova conversa', messages: [] }]
    }
    return stored.map(conversation => ({
      ...conversation,
      id: conversation.id || firstConversation.id,
      title: conversation.title || 'Nova conversa',
      messages: Array.isArray(conversation.messages) ? conversation.messages : [],
    }))
  })
  const [activeConversationId, setActiveConversationId] = useState<string>(() => {
    const stored = loadStoredConversations()
    return stored[0]?.id ?? initialConversationId.current
  })
  const searchParams = useSearchParams()
  const lastAutoSubmittedRef = useRef<string | null>(null)
  const { project } = useProject()
  const { session } = useAuth()
  const requestedProjectId = searchParams.get('project') ?? project?.id ?? ''
  const requestedQuestion = searchParams.get('q')?.trim() ?? ''
  const activeConversation = conversations.find(item => item.id === activeConversationId) ?? conversations[0]
  const messages = activeConversation?.messages ?? []
  const showHomeConversation = homeConversationOpen && (messages.length > 0 || (loading && respondingConversationId === activeConversationId))

  useEffect(() => {
    if (!compact) return
    const panel = conversationPanelRef.current
    if (panel) panel.scrollTop = panel.scrollHeight
  }, [compact, activeConversationId, messages.length, loading, showHomeConversation])

  useEffect(() => {
    const activeProjectId = project?.id
    if (!activeProjectId || !session) return

    let active = true
    async function loadConversations() {
      if (!activeProjectId) return
      try {
        const history = await apiFetch<Conversation[]>(`/ai/conversations?project_id=${encodeURIComponent(activeProjectId)}`)
        if (!active) return

        if (history.length > 0) {
          setConversations(history)
          setActiveConversationId(currentId => history.some(item => item.id === currentId) ? currentId : history[0].id)
          return
        }

        const freshConversation = { id: createSessionId(), title: 'Nova conversa', messages: [] }
        setConversations([freshConversation])
        setActiveConversationId(freshConversation.id)
      } catch {
        // If the backend is unavailable, keep the in-browser fallback history.
      }
    }

    void loadConversations()
    return () => { active = false }
  }, [project?.id, session])

  const sendQuestion = useCallback(async (nextQuestion: string, nextProjectId: string, conversationId = activeConversationId) => {
    const trimmed = nextQuestion.trim()
    if (!trimmed || !nextProjectId) return

    setLoading(true)
    setRespondingConversationId(conversationId)
    setError(null)

    setConversations(prev => prev.map(conversation => {
      if (conversation.id !== conversationId) return conversation

      const updatedMessages: ChatMessage[] = [...conversation.messages, { role: 'user', content: trimmed }]
      return {
        ...conversation,
        title: conversation.messages.length === 0 ? formatConversationTitle(trimmed) : conversation.title,
        messages: updatedMessages,
      }
    }))

    setQuestion('')

    try {
      const result = await apiFetch<{ answer: string; sources: string[] }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          question: trimmed,
          project_id: nextProjectId,
          session_id: conversationId,
          assistant: assistantConfigToBody(assistantConfig),
        }),
      })

      setConversations(prev => prev.map(conversation => {
        if (conversation.id !== conversationId) return conversation

        const assistantMessage: ChatMessage = { role: 'assistant', content: result.answer, sources: result.sources }
        return appendConversationMessage(conversation, assistantMessage)
      }))
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Não foi possível consultar o assistente.'
      setError(message)
      setConversations(prev => prev.map(conversation => {
        if (conversation.id !== conversationId) return conversation

        const assistantMessage: ChatMessage = { role: 'assistant', content: message }
        return appendConversationMessage(conversation, assistantMessage)
      }))
    } finally {
      setLoading(false)
      setRespondingConversationId(null)
    }
  }, [activeConversationId, assistantConfig])

  useEffect(() => {
    try {
      window.localStorage.setItem(assistantConfigStorageKey, JSON.stringify(assistantConfig))
    } catch {
      // Ignore persistence failures in restricted environments.
    }
  }, [assistantConfig])

  useEffect(() => {
    try {
      window.localStorage.setItem(conversationStorageKey, JSON.stringify(conversations))
    } catch {
      // Ignore persistence failures in restricted environments.
    }
  }, [conversations])

  useEffect(() => {
    if (compact) {
      lastAutoSubmittedRef.current = null
      return
    }

    if (!requestedQuestion || !requestedProjectId) {
      lastAutoSubmittedRef.current = null
      return
    }

    const requestKey = `${requestedProjectId}:${requestedQuestion}`
    if (lastAutoSubmittedRef.current === requestKey) return

    lastAutoSubmittedRef.current = requestKey
    void sendQuestion(requestedQuestion, requestedProjectId)
  }, [compact, requestedProjectId, requestedQuestion, sendQuestion])

  const submitQuestion = async () => {
    if ((compact && loading) || voiceBusy) return
    const trimmed = question.trim()
    if (!trimmed || !project?.id) return

    if (compact) {
      let conversationId = activeConversation?.id ?? createSessionId()
      if (!homeConversationOpen && messages.length > 0) {
        conversationId = createSessionId()
        setConversations(prev => [...prev, { id: conversationId, title: 'Nova conversa', messages: [] }])
      }
      setActiveConversationId(conversationId)
      setHomeConversationOpen(true)
      await sendQuestion(trimmed, project.id, conversationId)
      return
    }

    await sendQuestion(trimmed, project.id)
  }

  const startNewConversation = useCallback(() => {
    setHomeConversationOpen(false)
    const nextConversation = { id: createSessionId(), title: 'Nova conversa', messages: [] }
    setConversations(prev => [...prev, nextConversation])
    setActiveConversationId(nextConversation.id)
    setError(null)
    setQuestion('')
  }, [])

  const deleteConversation = useCallback((conversationId: string) => {
    setConversations(prev => {
      const nextConversations = prev.filter(conversation => conversation.id !== conversationId)

      if (nextConversations.length === 0) {
        const freshConversation = { id: createSessionId(), title: 'Nova conversa', messages: [] }
        setActiveConversationId(freshConversation.id)
        return [freshConversation]
      }

      if (conversationId === activeConversationId) {
        setActiveConversationId(nextConversations[0].id)
      }

      return nextConversations
    })
  }, [activeConversationId])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await submitQuestion()
  }

  const conversationPanel = (compact ? showHomeConversation : messages.length > 0) && (
    <section ref={compact ? conversationPanelRef : undefined} className={`panel panel-pad assistant-config-panel ${compact ? 'assistant-config-panel-compact home-chat-conversation' : ''}`}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Conversação</span>
          <h2>{activeConversation?.title ?? 'Histórico do chat'}</h2>
        </div>
      </div>

      <div className="chat-thread" style={{ display: 'grid', gap: 18, padding: 0 }}>
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
            {message.role === 'assistant' && (
              <div className="assistant-avatar" aria-hidden="true">
                <Icon name="sparkles" size={17} />
              </div>
            )}
            <div className="chat-bubble">
              <p>{message.content}</p>
              {message.sources && message.sources.length > 0 && (
                <div className="source-chips">
                  {message.sources.map(source => (
                    <span key={`${source}-${index}`}>{source}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {compact && loading && respondingConversationId === activeConversationId && (
          <div className="home-chat-waiting" role="status" aria-live="polite" aria-atomic="true">
            <span className="home-chat-waiting-dots" aria-hidden="true">
              <span /><span /><span />
            </span>
            <span>IA respondendo…</span>
          </div>
        )}
      </div>
    </section>
  )

  return (
    <div className={`page ai-page ${compact ? 'ai-page-compact' : ''}`}>
      {!compact && (
        <section className="panel panel-pad assistant-config-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Configuração</span>
              <h2>Assistente IA</h2>
            </div>
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
              <span>Prompts extras para melhorar assertividade</span>
              <textarea
                rows={4}
                value={assistantConfig.customPrompt}
                onChange={event => setAssistantConfig(prev => ({ ...prev, customPrompt: event.target.value }))}
                placeholder="Ex.: use linguagem simples, priorize respostas com passos claros, evite conclusões sem suporte documental."
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
                  placeholder="Ex.: quando a pergunta exigir aprovação humana, peça confirmação antes de qualquer ação crítica."
                />
              </label>
            </div>
          </div>
        </section>
      )}

      <div
        className={compact ? 'home-chat-shell' : 'ai-chat-shell'}
        style={compact ? undefined : {
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 260px',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div className={compact ? `home-chat-main ${showHomeConversation ? 'home-chat-active' : ''}` : ''}>
          {compact && conversationPanel}
          <section className={`panel panel-pad assistant-config-panel ${compact ? 'assistant-config-panel-compact' : ''}`}>
            {compact && !showHomeConversation && (
              <div className="home-chat-welcome">
                <span className="hero-mark"><Icon name="sparkles" size={26} /></span>
                <p className="home-chat-greeting">Olá, {session?.name ?? 'usuário'}!</p>
                <h1>Qual é a boa de hoje?</h1>
                <p className="home-chat-description">Vamos explorar ideias e encontrar respostas nos seus documentos.</p>
              </div>
            )}
            {!compact && (
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Perguntar para a documentação</span>
                  <h2>Assistente Panoptes IA</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button type="button" className="secondary-button small" onClick={startNewConversation}>
                    Nova conversa
                  </button>
                  <span className="status-badge accent">Projeto: {project?.name}</span>
                </div>
              </div>
            )}

            {!compact && (
              <div style={{ marginBottom: 12 }}>
                <ProjectSelector variant="chat" />
              </div>
            )}

            <form className="ai-composer chat-composer" onSubmit={handleSubmit} aria-label={`Perguntar ao Panoptes sobre ${project?.name ?? 'o projeto atual'}`}>
              <textarea
                rows={1}
                value={question}
                onChange={event => setQuestion(event.target.value)}
                onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey && !voiceBusy) {
                    event.preventDefault()
                    void submitQuestion()
                  }
                }}
                placeholder={compact ? 'Como posso ajudar hoje?' : project ? `Pergunte sobre ${project.name}…` : 'Digite sua pergunta...'}
                aria-label={project ? `Sua pergunta sobre ${project.name}` : 'Sua pergunta'}
              />
              <VoiceRecorder
                disabled={loading || !project?.id}
                onBusyChange={setVoiceBusy}
                onTranscript={transcript => setQuestion(current => current.trim() ? `${current.trim()} ${transcript}` : transcript)}
              />
              <button type="submit" className="composer-send" aria-label="Enviar pergunta" disabled={loading || voiceBusy || !project?.id}>
                <Icon name="sparkles" size={19} />
              </button>
            </form>
            {!project && <p className="empty-state compact-empty">Selecione ou crie um projeto ativo para iniciar uma conversa.</p>}

            {error && <div className="form-error" role="alert">{error}</div>}

            {compact && (
              <div className="home-chat-tools" aria-label="Ações rápidas">
                <button type="button" onClick={() => setQuestion('Resuma os principais documentos do projeto')}>Resumir documentos</button>
                <button type="button" onClick={() => setQuestion('Quais são os próximos passos do projeto?')}>Próximos passos</button>
                <button type="button" onClick={() => setQuestion('Encontre informações importantes na documentação')}>Buscar na documentação</button>
              </div>
            )}
          </section>

          {!compact && conversationPanel}

        </div>

        <aside className={compact ? 'panel home-chat-sidebar' : 'panel'} style={compact ? undefined : { padding: 12 }} aria-label={compact ? 'Histórico de conversas' : undefined}>
          <div className="panel-heading" style={{ marginBottom: compact ? 8 : 10 }}>
            <div>
              <span className="eyebrow">Recentes</span>
              <h2 style={{ fontSize: compact ? '.9rem' : '1rem' }}>{compact ? 'Histórico de conversas' : 'Conversas'}</h2>
            </div>
            <button type="button" className="secondary-button small" onClick={startNewConversation}>
              + Novo chat
            </button>
          </div>

          <div className="home-chat-history-list" style={{ display: 'grid', gap: 8 }}>
            {conversations.map(conversation => (
              <div
                key={conversation.id}
                className={`panel ${compact ? 'home-chat-thread' : ''} ${conversation.id === activeConversationId ? 'active-chat-thread' : ''}`}
                style={{
                  padding: compact ? '10px 10px' : '10px 10px',
                  borderColor: conversation.id === activeConversationId ? 'var(--accent)' : 'var(--line)',
                  background: conversation.id === activeConversationId ? 'var(--accent-soft)' : 'var(--surface)',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setActiveConversationId(conversation.id)
                  setHomeConversationOpen(conversation.messages.length > 0)
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: compact ? '.74rem' : '.76rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conversation.title}
                    </strong>
                    <small style={{ color: 'var(--muted)', fontSize: compact ? '.62rem' : '.66rem' }}>
                      {conversation.messages.length} mensagens
                    </small>
                  </div>
                  <button
                    type="button"
                    className="text-button"
                    onClick={event => {
                      event.stopPropagation()
                      deleteConversation(conversation.id)
                    }}
                    aria-label={`Excluir conversa ${conversation.title}`}
                    style={{ fontSize: compact ? '.65rem' : '.7rem', padding: 0 }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
