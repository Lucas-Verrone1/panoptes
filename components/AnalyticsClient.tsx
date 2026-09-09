'use client'

import { useAuth } from './AuthProvider'
import { Icon, type IconName } from './Icon'
import { PageHeader } from './PageHeader'

const allMetrics:{value:string;label:string;icon:IconName;adminOnly?:boolean}[]=[
  {value:'1.248',label:'Documentos indexados',icon:'file-text'},
  {value:'96',label:'Respostas aprovadas',icon:'messages-square'},
  {value:'303',label:'Feedbacks de IA',icon:'bot',adminOnly:true},
  {value:'2',label:'Gaps prioritários',icon:'brain-circuit',adminOnly:true},
]
export function AnalyticsClient(){const{session}=useAuth();const limited=session?.role==='moderator';const metrics=limited?allMetrics.filter(m=>!m.adminOnly):allMetrics;return <><PageHeader title="Analytics" description={limited?'Visão limitada aos indicadores de documentação e comunidade.':'Indicadores de conhecimento, colaboração e qualidade.'}/><div className="metrics-grid">{metrics.map(m=><section className="metric-card panel" key={m.label}><span className="icon-tile"><Icon name={m.icon} size={19}/></span><strong>{m.value}</strong><span>{m.label}</span></section>)}</div><section className="panel panel-pad"><div className="panel-heading"><div><span className="eyebrow">Ciclo</span><h2>Conhecimento conectado</h2></div></div><div className="analytics-flow">{['Resposta com fontes','Feedback','Conhecimento validado','ML identifica gaps','Novo contexto RAG'].map((item,index)=><div key={item}><span>{index+1}</span><strong>{item}</strong></div>)}</div></section></>}
