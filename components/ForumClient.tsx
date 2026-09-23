'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { collaborators, forumTopics as seedTopics } from '@/lib/data'
import { useAuth } from './AuthProvider'
import { GamificationEmblem } from './GamificationEmblem'
import { Icon } from './Icon'
import { StatusBadge } from './StatusBadge'

const repliesSeed: Record<number, { author: string; title: string; text: string; approved?: boolean; moderated?: boolean; tier: number }[]> = {
  1: [
    { author: 'Arthur Ferreira', title: 'Supercolaborador', text: 'Use a rotina APIDOC para listar endpoints e valide os schemas antes de gerar o fluxo.', tier: 4 },
    { author: 'Rafael Mendes', title: 'Guardião do Conhecimento', text: 'Fluxo validado: endpoints, schemas, logs e a integração associada devem ser exportados e revisados.', approved: true, moderated: true, tier: 5 },
  ],
  2: [{ author: 'Luiza Pereira', title: 'Especialista', text: 'A contingência depende da parametrização definida para o ambiente e deve ser validada antes da publicação.', tier: 3 }],
  3: [{ author: 'Rafael Mendes', title: 'Guardião do Conhecimento', text: 'A parametrização validada usa contas vinculadas às regras contábeis do módulo.', approved: true, moderated: true, tier: 5 }],
  4: [{ author: 'Arthur Ferreira', title: 'Supercolaborador', text: 'A validação precisa considerar chave, filial e parâmetros específicos do SIGAEST.', tier: 4 }],
}

type Topic = typeof seedTopics[number]

export function ForumClient() {
  const params = useSearchParams()
  const topicParam = Number(params.get('topic')) || 1
  const [topics, setTopics] = useState<Topic[]>(seedTopics)
  const [selected, setSelected] = useState(topicParam)
  const [replies, setReplies] = useState(repliesSeed)
  const [reply, setReply] = useState('')
  const [points, setPoints] = useState(640)
  const [hiddenReplies, setHiddenReplies] = useState<Record<string, boolean>>({})
  const [newTopicOpen,setNewTopicOpen]=useState(false)
  const [newTopicTitle,setNewTopicTitle]=useState('')
  const { session } = useAuth()
  const moderator = session?.role === 'admin' || session?.role === 'moderator'
  const topic = topics.find(t => t.id === selected) ?? topics[0]
  const currentReplies = replies[selected] ?? []

  const title = useMemo(() => points >= 1200 ? 'Guardião do Conhecimento' : points >= 700 ? 'Supercolaborador' : points >= 350 ? 'Especialista' : points >= 120 ? 'Colaborador' : 'Participante', [points])

  const submitReply = (event: FormEvent) => {
    event.preventDefault()
    const clean = reply.trim()
    if (!clean) return
    setReplies(prev => ({ ...prev, [selected]: [...(prev[selected] ?? []), { author: session?.name ?? 'Você', title, text: clean, tier: points >= 700 ? 4 : points >= 350 ? 3 : 2 }] }))
    setTopics(prev=>prev.map(t=>t.id===selected?{...t,replies:t.replies+1}:t))
    setReply('')
    setPoints(v => v + 10)
  }

  const submitTopic=(event:FormEvent)=>{
    event.preventDefault()
    const clean=newTopicTitle.trim()
    if(!clean)return
    const id=Math.max(0,...topics.map(t=>t.id))+1
    const item:Topic={id,title:clean,status:'Em aberto',replies:0,project:'Protheus TCC'}
    setTopics(prev=>[item,...prev]);setReplies(prev=>({...prev,[id]:[]}));setSelected(id);setNewTopicTitle('');setNewTopicOpen(false);setPoints(v=>v+5)
  }

  const updateReply=(index:number,patch:Partial<(typeof currentReplies)[number]>)=>setReplies(prev=>({...prev,[selected]:(prev[selected]??[]).map((item,i)=>i===index?{...item,...patch}:item)}))
  const removeReply=(index:number)=>{setReplies(prev=>({...prev,[selected]:(prev[selected]??[]).filter((_,i)=>i!==index)}));setTopics(prev=>prev.map(t=>t.id===selected?{...t,replies:Math.max(0,t.replies-1)}:t))}

  return (
    <div className="forum-page-grid">
      <section className="forum-list-panel panel">
        <div className="panel-heading"><div><span className="eyebrow">Comunidade</span><h1>Fórum</h1></div><button type="button" className="primary-button small" onClick={()=>setNewTopicOpen(v=>!v)}>Novo tópico</button></div>
        {newTopicOpen&&<form className="new-topic-form" onSubmit={submitTopic}><label className="field"><span>Título da dúvida</span><input autoFocus value={newTopicTitle} onChange={e=>setNewTopicTitle(e.target.value)} placeholder="Descreva sua dúvida"/></label><div><button className="primary-button small" type="submit">Criar</button><button className="secondary-button small" type="button" onClick={()=>setNewTopicOpen(false)}>Cancelar</button></div></form>}
        <div className="topic-list">
          {topics.map(item => (
            <button type="button" key={item.id} className={`topic-button ${item.id === selected ? 'active' : ''}`} onClick={() => setSelected(item.id)}>
              <span><strong>{item.title}</strong><small>{item.project} · {item.replies} respostas</small></span>
              <StatusBadge tone={item.status === 'Aprovada' ? 'success' : item.status === 'Aguardando validação' ? 'warning' : 'info'}>{item.status}</StatusBadge>
            </button>
          ))}
        </div>
      </section>

      <section className="thread-panel panel" aria-labelledby="topic-title">
        <div className="thread-head">
          <div><span className="eyebrow">{topic.project}</span><h2 id="topic-title">{topic.title}</h2></div>
          <StatusBadge tone={topic.status === 'Aprovada' ? 'success' : 'warning'}>{topic.status}</StatusBadge>
        </div>
        <article className="forum-post original-post">
          <div className="forum-author"><span className="avatar">G</span><span><strong>Gabriela Silva</strong><small>Especialista · 09:12</small></span></div>
          <p>Preciso esclarecer o fluxo e os parâmetros desta rotina para manter a documentação completa.</p>
        </article>
        <div className="reply-stack">
          {currentReplies.map((item, index) => {
            const replyKey=`${selected}-${index}`
            if(hiddenReplies[replyKey]) return null
            return <article className={`forum-post ${item.approved ? 'approved-post' : ''}`} key={`${item.author}-${index}`}>
              <div className="forum-author rank-author">
                <GamificationEmblem tier={item.tier} icon={item.tier >= 5 ? 'shield-check' : item.tier >= 4 ? 'trophy' : 'award'} label={item.title} />
                <span><strong>{item.author}</strong><small>{item.title}</small></span>
                {item.approved ? <StatusBadge tone="success">Aprovada para IA</StatusBadge> : item.moderated ? <StatusBadge tone="info">Mantida</StatusBadge> : null}
              </div>
              <p>{item.text}</p>
              {moderator && !item.approved && <div className="moderation-bar"><button type="button" className="secondary-button small" onClick={()=>updateReply(index,{moderated:true})}>Manter</button><button type="button" className="primary-button small" onClick={()=>updateReply(index,{approved:true,moderated:true})}>Aprovar para IA</button><button type="button" className="secondary-button small" onClick={()=>setHiddenReplies(v=>({...v,[replyKey]:true}))}>Ocultar</button><button type="button" className="danger-button small" onClick={()=>removeReply(index)}>Remover</button></div>}
            </article>
          })}
        </div>
        <form className="reply-form" onSubmit={submitReply}>
          <label className="field"><span>Responder</span><textarea value={reply} onChange={e => setReply(e.target.value)} rows={4} placeholder="Compartilhe sua resposta…" /></label>
          <div className="reply-form-footer"><span className="reward-copy"><Icon name="award" size={16}/> +10 XP ao publicar</span><button className="primary-button" type="submit">Responder</button></div>
        </form>
      </section>

      <aside className="forum-side-stack">
        <section className="panel leaderboard-panel">
          <div className="panel-heading"><div><span className="eyebrow">Destaques</span><h2>Colaboradores</h2></div><Icon name="trophy" size={20}/></div>
          <div className="leaderboard-list">{collaborators.map((person,index) => <div className="leaderboard-row" key={person.name}><span className="leader-index">{index+1}</span><span className="avatar small-avatar">{person.name[0]}</span><span><strong>{person.name}</strong><small>{person.title} · {person.xp} XP</small></span></div>)}</div>
        </section>
        <section className="panel forum-rule"><Icon name="shield-check" size={22}/><div><strong>Conhecimento validado</strong><p>Somente respostas aprovadas entram no contexto utilizado pela IA.</p></div></section>
      </aside>
    </div>
  )
}
