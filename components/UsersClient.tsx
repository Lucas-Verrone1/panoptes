'use client'

import { FormEvent, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { PageHeader } from './PageHeader'
import { Icon } from './Icon'
import { StatusBadge } from './StatusBadge'
import { SelectMenu } from './SelectMenu'

const roleOptions=[{value:'Administrador',label:'Administrador',description:'Gestão completa'},{value:'Moderador',label:'Moderador',description:'Upload e moderação'},{value:'Usuário',label:'Usuário',description:'Consulta e colaboração'}]
const roleMap={Administrador:'admin',Moderador:'moderator',Usuário:'user'} as const

export function UsersClient(){
  const[users,setUsers]=useState<{id:string;name:string;email:string;role:'admin'|'moderator'|'user'}[]>([]);const[open,setOpen]=useState(false);const[role,setRole]=useState('Usuário');const[error,setError]=useState('')
  useEffect(()=>{apiFetch<typeof users>('/users').then(setUsers).catch(err=>setError(err instanceof Error?err.message:'Não foi possível carregar os usuários.'))},[])
  const submit=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{const user=await apiFetch<typeof users[number]>('/users',{method:'POST',body:JSON.stringify({name:String(fd.get('name')),email:String(fd.get('email')),password:String(fd.get('password')),role:roleMap[role as keyof typeof roleMap]})});setUsers(v=>[...v,user]);setRole('Usuário');setOpen(false);setError('')}catch(err){setError(err instanceof Error?err.message:'Não foi possível criar o usuário.')}}
  return <><PageHeader title="Usuários" description="Gerencie usuários e perfis de acesso." actions={<button className="primary-button" type="button" onClick={()=>setOpen(v=>!v)}><Icon name="users" size={17}/>Novo usuário</button>}/>{error&&<div className="form-error" role="alert">{error}</div>}{open&&<form className="panel inline-create-form" onSubmit={submit}><label className="field"><span>Nome</span><input name="name" required/></label><label className="field"><span>E-mail</span><input name="email" type="email" required/></label><label className="field"><span>Senha</span><input name="password" type="password" minLength={10} required/></label><label className="field"><span>Perfil</span><SelectMenu name="role" value={role} onChange={setRole} options={roleOptions} ariaLabel="Selecionar perfil" className="field-select-menu" /></label><button className="primary-button" type="submit">Salvar</button></form>}<section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th></tr></thead><tbody>{users.map(user=><tr key={user.email}><td><strong>{user.name}</strong></td><td>{user.email}</td><td>{roleOptions.find(option=>roleMap[option.value as keyof typeof roleMap]===user.role)?.label}</td><td><StatusBadge tone="success">Ativo</StatusBadge></td></tr>)}</tbody></table></div></section></>
}
