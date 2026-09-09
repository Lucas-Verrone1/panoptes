'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { apiFetch, setToken } from '@/lib/api'
import { demoAccounts } from '@/lib/data'
import type { Role } from '@/lib/types'

type Session = { name: string; email: string; role: Role }
type AuthContextValue = {
  session: Session | null
  hydrated: boolean
  login: (email: string, password: string, captchaToken?: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  setDemoRole: (role: Role) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const STORAGE = 'panoptes-session'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE)
      if (saved) setSession(JSON.parse(saved))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!session && pathname !== '/login') router.replace('/login')
    if (session && pathname === '/login') router.replace('/dashboard')
  }, [hydrated, pathname, router, session])

  const persist = useCallback((next: Session | null) => {
    setSession(next)
    try {
      if (next) window.localStorage.setItem(STORAGE, JSON.stringify(next))
      else window.localStorage.removeItem(STORAGE)
    } catch {}
  }, [])

  useEffect(() => {
    const handleInvalidAuth = () => {
      setToken(null)
      persist(null)
      if (window.location.pathname !== '/login') router.replace('/login')
    }
    window.addEventListener('panoptes-auth-invalid', handleInvalidAuth)
    return () => window.removeEventListener('panoptes-auth-invalid', handleInvalidAuth)
  }, [persist, router])

  const login = useCallback(async (email: string, password: string, captchaToken?: string) => {
    try {
      const result = await apiFetch<{ token: string; name: string; email: string; role: Role }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, captcha_token: captchaToken || null }),
      })
      setToken(result.token)
      persist({ name: result.name, email: result.email, role: result.role })
      return { ok: true }
    } catch (error) {
      const fallback = demoAccounts[email]
      const apiDown = error instanceof Error && /Failed to fetch|NetworkError|fetch/.test(error.message)
      if (fallback && fallback.password === password && apiDown) {
        setToken(null)
        persist({ name: fallback.name, email, role: fallback.role })
        return { ok: true, error: 'API offline: sessão local de demonstração.' }
      }
      const message = error instanceof Error ? error.message : 'E-mail ou senha inválidos.'
      return { ok: false, error: message }
    }
  }, [persist])

  const logout = useCallback(() => {
    setToken(null)
    persist(null)
    router.replace('/login')
  }, [persist, router])

  const setDemoRole = useCallback((role: Role) => {
    if (!session) return
    persist({ ...session, role })
    router.push('/dashboard')
  }, [persist, router, session])

  const value = useMemo(() => ({ session, hydrated, login, logout, setDemoRole }), [session, hydrated, login, logout, setDemoRole])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return value
}
