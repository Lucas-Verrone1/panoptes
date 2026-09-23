'use client'

import Link from 'next/link'
import { useAuth } from './AuthProvider'
import { AIChat } from './AIChat'
import { Icon, type IconName } from './Icon'
import type { Role } from '@/lib/types'

type QuickAction = { href:string; title:string; description:string; icon:IconName }
const roleActions: Record<Role, QuickAction[]> = {
  admin: [
    {href:'/projects',title:'Projetos',description:'Conectar Git, ZIP e APIs',icon:'folder-git-2'},
    {href:'/users',title:'Usuários',description:'Gerenciar acessos e perfis',icon:'users'},
    {href:'/documents',title:'Documentações',description:'Ver conteúdo gerado pela IA',icon:'file-text'},
    {href:'/analises',title:'Análises',description:'Acompanhar conhecimento e qualidade',icon:'chart-no-axes-combined'},
  ],
  moderator: [
    {href:'/upload',title:'Fontes',description:'Registrar URL para coleta e indexação',icon:'link'},
    {href:'/zendesk',title:'Zendesk',description:'Aprovar chamados para a base de conhecimento',icon:'zendesk'},
    {href:'/documents',title:'Documentações',description:'Ver conteúdo gerado pela IA',icon:'file-text'},
  ],
  user: [
    {href:'/projects',title:'Projetos',description:'Consultar projetos e seu status',icon:'folder-git-2'},
    {href:'/documents',title:'Documentações',description:'Consultar conteúdo gerado pela IA',icon:'file-text'},
    {href:'/search',title:'Buscar',description:'Localizar conhecimento do projeto',icon:'search'},
    {href:'/zendesk',title:'Zendesk',description:'Consultar chamados usados como conhecimento',icon:'zendesk'},
    {href:'/profile',title:'Conquistas',description:'Acompanhar títulos e emblemas',icon:'award'},
  ],
}

export function DashboardClient() {
  const { session } = useAuth()
  const role: Role = session?.role ?? 'user'
  return (
    <div className="dashboard-minimal">
      <div className="dashboard-center">
        <div className="hero-mark"><Icon name="sparkles" size={24} /></div>
        <h1>Olá, {session?.name}</h1>
        <AIChat compact />
        <div className="quick-actions" aria-label="Ações rápidas">
          {roleActions[role].map(({href,title,description,icon}) => (
            <Link href={href} className="quick-action" key={href}>
              <span className="quick-action-icon"><Icon name={icon} size={20} /></span>
              <span><strong>{title}</strong><small>{description}</small></span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
