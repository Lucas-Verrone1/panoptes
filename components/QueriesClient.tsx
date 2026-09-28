'use client'

import { FormEvent, useState } from 'react'
import { useAuth } from './AuthProvider'
import { Icon } from './Icon'
import { PageHeader } from './PageHeader'
import { SelectMenu } from './SelectMenu'

const queryMap = {
  docs: { label:'Documentos indexados por projeto', sql:'SELECT project, COUNT(*) AS documents FROM documents GROUP BY project;', rows:[['Protheus TCC','1248'],['Integração API','342'],['Módulo Financeiro','823']] },
  zendesk: { label:'Chamados Zendesk por status', sql:'SELECT knowledge_status, COUNT(*) AS total FROM zendesk_tickets GROUP BY knowledge_status;', rows:[['Indexado','96'],['Novo','18'],['Aprovado','14']] },
  feedback: { label:'Feedback da IA', sql:'SELECT feedback, COUNT(*) AS total FROM ai_feedback GROUP BY feedback;', rows:[['Positivo','284'],['Negativo','19']] },
}

export function QueriesClient() {
  const { session } = useAuth()
  const [selected,setSelected]=useState<keyof typeof queryMap>('docs')
  const [result,setResult]=useState<string[][]>([])
  const submit=(e:FormEvent)=>{e.preventDefault();setResult(queryMap[selected].rows)}
  return <><PageHeader title="Consultas" description={session?.role==='moderator'?'Acesso somente leitura aos dados disponíveis.':'Consultas administrativas disponíveis no ambiente.'}/><section className="panel panel-pad"><form className="query-toolbar" onSubmit={submit}><label className="field"><span>Consulta</span><SelectMenu value={selected} onChange={value=>setSelected(value as keyof typeof queryMap)} options={Object.entries(queryMap).map(([id,q])=>({value:id,label:q.label}))} ariaLabel="Selecionar consulta" className="field-select-menu" /></label><button className="primary-button" type="submit"><Icon name="database" size={17}/>Consultar</button></form><pre className="sql-preview" aria-label="Consulta SQL">{queryMap[selected].sql}</pre>{result.length>0&&<div className="table-scroll"><table><thead><tr><th>Chave</th><th>Total</th></tr></thead><tbody>{result.map(row=><tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td></tr>)}</tbody></table></div>}</section></>
}
