'use client'

import { FormEvent, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { ThemeToggle } from './ThemeToggle'
import { Logo } from './Logo'
import { TurnstileWidget } from './TurnstileWidget'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
            <p>Informe as credenciais da sua conta.</p>
          </div>
          <form onSubmit={submit} className="form-stack" noValidate autoComplete="off">
            <label className="field"><span>E-mail</span><input type="email" autoComplete="off" required value={email} onChange={e => setEmail(e.target.value)} /></label>
            <label className="field"><span>Senha</span><input type="password" autoComplete="off" required value={password} onChange={e => setPassword(e.target.value)} /></label>
            <TurnstileWidget onToken={onCaptcha} />
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="primary-button full" type="submit" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
          </form>
        </div>
      </section>
    </main>
  )
}
