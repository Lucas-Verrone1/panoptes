'use client'

import { useAuth } from './AuthProvider'
import { GamificationEmblem } from './GamificationEmblem'
import { Icon } from './Icon'

const badges = [
  { name: 'Primeira resposta', desc: 'Publicou sua primeira contribuição no fórum.', tier: 1, icon: 'messages-square' as const, unlocked: true },
  { name: 'Conhecimento aprovado', desc: 'Teve uma resposta validada pela comunidade.', tier: 2, icon: 'shield-check' as const, unlocked: true },
  { name: 'Mão na massa', desc: 'Recebeu reconhecimento dos colegas.', tier: 3, icon: 'award' as const, unlocked: true },
  { name: 'Constância', desc: 'Participou do fórum em semanas consecutivas.', tier: 4, icon: 'activity' as const, unlocked: true },
  { name: 'Referência técnica', desc: 'Alcance 10 respostas aprovadas.', tier: 4, icon: 'trophy' as const, unlocked: false },
  { name: 'Mentor', desc: 'Ajude outros colaboradores de forma recorrente.', tier: 5, icon: 'shield-check' as const, unlocked: false },
]

export function ProfileClient() {
  const { session } = useAuth()
  const xp = 640
  const currentMin = 350
  const nextMin = 700
  const progress = Math.round(((xp-currentMin)/(nextMin-currentMin))*100)
  return (
    <div className="profile-layout">
      <section className="panel profile-hero-card">
        <div className="profile-identity-large"><span className="avatar profile-avatar">{session?.name[0]}</span><div><span className="eyebrow">Perfil</span><h1>{session?.name}</h1><p>Especialista · {xp} XP</p></div></div>
        <div className="profile-progress-area">
          <div className="profile-progress-copy"><span><strong>{progress}%</strong><small>para Supercolaborador</small></span><span>{nextMin-xp} XP restantes</span></div>
          <div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso para Supercolaborador"><span style={{width:`${progress}%`}}/></div>
          <div className="progress-labels"><span><Icon name="award" size={15}/> Especialista</span><span><Icon name="trophy" size={15}/> Supercolaborador</span></div>
        </div>
      </section>
      <div className="profile-columns">
        <section className="panel panel-pad"><div className="panel-heading"><div><span className="eyebrow">Coleção</span><h2>Emblemas</h2></div><span className="muted-copy">4 de 6 conquistados</span></div><div className="achievement-grid">{badges.map(item => <article className={`achievement-card ${item.unlocked?'':'locked'}`} key={item.name}><GamificationEmblem tier={item.tier} icon={item.icon} label={item.name} locked={!item.unlocked}/><div><strong>{item.name}</strong><p>{item.desc}</p></div>{item.unlocked && <span className="achievement-check"><Icon name="check" size={14}/></span>}</article>)}</div></section>
        <section className="panel panel-pad"><div className="panel-heading"><div><span className="eyebrow">Atividade</span><h2>Contribuição no fórum</h2></div></div><div className="profile-stats"><div><strong>18</strong><span>Respostas</span></div><div><strong>8</strong><span>Aprovadas</span></div><div><strong>4</strong><span>Tópicos</span></div><div><strong>37</strong><span>Reconhecimentos</span></div></div><div className="xp-list"><div><Icon name="messages-square" size={18}/><span><strong>+10 XP</strong><small>Responder um tópico</small></span></div><div><Icon name="award" size={18}/><span><strong>Bônus</strong><small>Resposta aprovada</small></span></div><div><Icon name="trophy" size={18}/><span><strong>Conquistas</strong><small>Marcos de colaboração</small></span></div></div></section>
      </div>
    </div>
  )
}
