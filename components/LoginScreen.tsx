'use client'

import { FormEvent, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { ThemeToggle } from './ThemeToggle'
import { Logo } from './Logo'
import { TurnstileWidget } from './TurnstileWidget'
import { roleLabels } from '@/lib/data'
import type { Role } from '@/lib/types'

const presets: { label: string; email: string; password: string; role: Role }[] = [
  { label: 'Administrador', email: 'admin@panoptes.local', password: 'admin123', role: 'admin' },
  { label: 'Moderador', email: 'moderador@panoptes.local', password: 'mod123', role: 'moderator' },
  { label: 'Usuário', email: 'usuario@panoptes.local', password: 'user123', role: 'user' },
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginScreen() {
  const [email, setEmail] = useState('usuario@panoptes.local')
  const [password, setPassword] = useState('user123')
  const [captcha, setCaptcha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const needsCaptcha = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  const onCaptcha = useCallback((token: string) => setCaptcha(token), [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Informe um e-mail válido.')
      return
    }
    if (password.length < 3) {
      setError('Informe a senha.')
      return
    }
    if (needsCaptcha && !captcha) {
      setError('Conclua a verificação anti-robô.')
      return
    }
    setLoading(true)
    const result = await login(email.trim(), password, captcha)
    setLoading(false)
    if (result.ok) router.replace('/dashboard')
    else setError(result.error || 'E-mail ou senha inválidos.')
  }

  const usePreset = (preset: typeof presets[number]) => {
    setEmail(preset.email)
    setPassword(preset.password)
  }

  return (
    <main id="conteudo-principal" className="login-page">
      <div className="login-theme"><ThemeToggle compact /></div>
      <section className="login-visual" aria-labelledby="login-brand-title">
        <div className="login-brand">
          <div className="login-logo-wrap"><Logo priority tone="inverse" /></div>
          <div className="login-copy">
            <span className="eyebrow">Conhecimento conectado</span>
            <h1 id="login-brand-title">Documentação, pessoas e IA em um único contexto.</h1>
            <p>Entre com seu perfil para acessar apenas as funções disponíveis para sua função.</p>
          </div>
        </div>
        <div className="login-orbit" aria-hidden="true"><span /><span /><span /></div>
      </section>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card">
          <div className="login-card-head">
            <span className="eyebrow">Acesso</span>
            <h2 id="login-title">Entrar no Panoptes</h2>
            <p>Use uma conta de demonstração ou informe suas credenciais.</p>
          </div>
          <form onSubmit={submit} className="form-stack" noValidate>
            <label className="field"><span>E-mail</span><input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
            <label className="field"><span>Senha</span><input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
            <TurnstileWidget onToken={onCaptcha} />
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="primary-button full" type="submit" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
          </form>
          <div className="demo-access">
            <span className="eyebrow">Visualizar perfis</span>
            <div className="demo-grid">
              {presets.map(preset => (
                <button key={preset.role} type="button" onClick={() => usePreset(preset)} className="demo-button">
                  <strong>{roleLabels[preset.role]}</strong><small>Preencher acesso</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
