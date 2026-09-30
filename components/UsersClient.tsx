'use client'

import { FormEvent, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { PageHeader } from './PageHeader'
import { Icon } from './Icon'
import { StatusBadge } from './StatusBadge'
import { SelectMenu } from './SelectMenu'

type User = { id: string; name: string; email: string; role: 'admin' | 'moderator' | 'user' }

const roleOptions=[{value:'Administrador',label:'Administrador',description:'Gestão completa'},{value:'Moderador',label:'Moderador',description:'Upload e moderação'},{value:'Usuário',label:'Usuário',description:'Consulta e colaboração'}]
const roleMap={Administrador:'admin',Moderador:'moderator',Usuário:'user'} as const
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{10,}$/

export function UsersClient(){
  const[users,setUsers]=useState<User[]>([]);const[open,setOpen]=useState(false);const[role,setRole]=useState('Usuário');const[error,setError]=useState('');const[saving,setSaving]=useState(false)
  useEffect(()=>{apiFetch<User[]>('/users').then(setUsers).catch(err=>setError(err instanceof Error?err.message:'Não foi possível carregar os usuários.'))},[])
    const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const form = event.currentTarget
      const formData = new FormData(form)
      const password = String(formData.get('password'))
      setError('')

      if (!passwordPattern.test(password)) {
        setError('A senha deve ter ao menos 10 caracteres, com maiúscula, minúscula, número e símbolo.')
        return
      }

      setSaving(true)
      try {
        const user = await apiFetch<User>('/users', {
          method: 'POST',
          body: JSON.stringify({
            name: String(formData.get('name')).trim(),
            email: String(formData.get('email')).trim(),
            password,
            role: roleMap[role as keyof typeof roleMap],
          }),
        })
        setUsers(current => [...current, user])
        setRole('Usuário')
        setOpen(false)
        form.reset()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível criar o usuário.')
      } finally {
        setSaving(false)
      }
    }
  return <><PageHeader title="Usuários" description="Gerencie usuários e perfis de acesso." actions={<button className="primary-button" type="button" onClick={()=>setOpen(v=>!v)}><Icon name="users" size={17}/>Novo usuário</button>}/>{error&&<div className="form-error" role="alert">{error}</div>}{open&&<form className="panel inline-create-form" onSubmit={submit}><label className="field"><span>Nome</span><input name="name" required/></label><label className="field"><span>E-mail</span><input name="email" type="email" required/></label><label className="field"><span>Senha</span><input name="password" type="password" minLength={10} required/></label><label className="field"><span>Perfil</span><SelectMenu name="role" value={role} onChange={setRole} options={roleOptions} ariaLabel="Selecionar perfil" className="field-select-menu" /></label><button className="primary-button" type="submit">Salvar</button></form>}<section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th></tr></thead><tbody>{users.map(user=><tr key={user.email}><td><strong>{user.name}</strong></td><td>{user.email}</td><td>{roleOptions.find(option=>roleMap[option.value as keyof typeof roleMap]===user.role)?.label}</td><td><StatusBadge tone="success">Ativo</StatusBadge></td></tr>)}</tbody></table></div></section></>
}
