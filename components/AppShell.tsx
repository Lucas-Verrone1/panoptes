'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthProvider'
import { Logo } from './Logo'
import { ThemeToggle, useTheme } from './ThemeToggle'
import { Icon, type IconName } from './Icon'
import { navItems, canAccess } from '@/lib/navigation'
import { roleLabels } from '@/lib/data'
import { CommandPalette } from './CommandPalette'
import { ShortcutHelp } from './ShortcutHelp'
import { Notifications } from './Notifications'
import { ProjectSelector } from './ProjectSelector'
import { AccessibilityMenu } from './AccessibilityMenu'
import { useAccessibility } from './AccessibilityProvider'
import type { Role } from '@/lib/types'

const titleMap: Record<string, string> = {
  '/dashboard': 'Início', '/ai': 'Assistente IA', '/search': 'Buscar', '/documents': 'Documentações', '/zendesk': 'Zendesk', '/forum': 'Zendesk',
  '/projects': 'Projetos', '/manual': 'Guia do Panoptes IA', '/upload': 'Fontes', '/users': 'Usuários',
  '/analises': 'Análises', '/analytics': 'Análises', '/settings': 'Configurações', '/profile': 'Perfil',
}

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, hydrated, logout, setDemoRole } = useAuth()
  const { increaseFont, decreaseFont, resetFont } = useAccessibility()
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [sequence, setSequence] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const sequenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const globalSearchRef = useRef<HTMLInputElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)
  const { toggle: toggleTheme } = useTheme()

  const role = session?.role ?? 'user'
  const isAiPage = pathname === '/ai'
  const availableNav = useMemo(() => navItems.filter(item => item.roles.includes(role)), [role])
  const primaryNav = useMemo(
    () => availableNav.filter(item => ['/dashboard', '/ai', '/documents', '/zendesk', '/projects', '/manual'].includes(item.href)),
    [availableNav],
  )
  const toolsNav = useMemo(
    () => availableNav.filter(item => !['/dashboard', '/ai', '/documents', '/zendesk', '/projects', '/search'].includes(item.href)),
    [availableNav],
  )
  const toolsActive = toolsNav.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))

  useEffect(() => {
    const stored = localStorage.getItem('panoptes-sidebar-collapsed') === 'true'
    setCollapsed(stored)
  }, [])

  useEffect(() => {
    if (!hydrated || !session) return
    if (!canAccess(pathname, session.role)) {
      setAnnouncement('Esta área não está disponível para o perfil atual. Redirecionando para o início.')
      router.replace('/dashboard')
    }
  }, [hydrated, pathname, router, session])

  useEffect(() => {
    setMobileOpen(false)
    setAccountOpen(false)
    if (toolsActive) setToolsOpen(true)
    const base = Object.keys(titleMap).find(k => pathname === k || pathname.startsWith(k + '/'))
    setAnnouncement(`Página ${base ? titleMap[base] : 'Panoptes'} carregada.`)
  }, [pathname])

  useEffect(() => {
    if (!accountOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [accountOpen])

  const toggleSidebar = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('panoptes-sidebar-collapsed', String(next))
      return next
    })
  }, [])

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCommandOpen(false); setHelpOpen(false); setMobileOpen(false); setAccountOpen(false); setSequence('')
        return
      }
      if (event.altKey && event.key === '-') { event.preventDefault(); decreaseFont(); return }
      if (event.altKey && (event.key === '=' || event.key === '+')) { event.preventDefault(); increaseFont(); return }
      if (event.altKey && event.key === '0') { event.preventDefault(); resetFont(); return }
      if (event.altKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        const selector = document.getElementById('global-project-selector') as HTMLButtonElement | null
        selector?.focus()
        return
      }
      if (isTypingTarget(event.target)) return

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setCommandOpen(true); return
      }
      if (event.key === '/') {
        event.preventDefault(); globalSearchRef.current?.focus(); return
      }
      if (event.key === '?') {
        event.preventDefault(); setHelpOpen(true); return
      }
      if (event.key === '\\') {
        event.preventDefault(); toggleSidebar(); return
      }
      if (event.shiftKey && event.key.toLowerCase() === 't') {
        event.preventDefault(); toggleTheme(); return
      }

      const key = event.key.toLowerCase()
      if (key === 'g') {
        setSequence('g')
        if (sequenceTimer.current) clearTimeout(sequenceTimer.current)
        sequenceTimer.current = setTimeout(() => setSequence(''), 1200)
        return
      }
      if (sequence === 'g') {
        const destinations: Record<string, string> = { d: '/dashboard', a: '/ai', o: '/documents', f: '/zendesk', p: '/projects' }
        const destination = destinations[key]
        setSequence('')
        if (destination && canAccess(destination, role)) {
          event.preventDefault(); router.push(destination)
        }
      }
    }
    document.addEventListener('keydown', handle)
    return () => {
      document.removeEventListener('keydown', handle)
      if (sequenceTimer.current) clearTimeout(sequenceTimer.current)
    }
  }, [role, router, sequence, toggleSidebar, toggleTheme, increaseFont, decreaseFont, resetFont])

  if (!hydrated || !session) return <div className="app-loading" role="status" aria-live="polite"><span className="loader" /> Carregando Panoptes…</div>

  return (
    <div className={`app-frame ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} aria-label="Navegação principal">
        <div className="sidebar-head">
          <Link href="/dashboard" className="logo-link"><Logo compact={collapsed && !mobileOpen} priority /></Link>
          <button className="sidebar-collapse" type="button" onClick={toggleSidebar} aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'} title="Recolher/expandir menu (\\)">
            <Icon name={collapsed ? 'chevrons-right' : 'chevrons-left'} size={18} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-primary">
            {primaryNav.map(item => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
              return (
                <Link key={item.href} href={item.href} className={`nav-link ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined} title={collapsed ? item.label : undefined}>
                  <Icon name={item.icon as IconName} size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {toolsNav.length > 0 && (
            <div className={`nav-tools ${toolsOpen ? 'open' : ''}`}>
              <button
                className={`nav-link nav-tools-toggle ${toolsActive ? 'active-soft' : ''}`}
                type="button"
                aria-expanded={toolsOpen}
                onClick={() => {
                  if (collapsed) {
                    setCollapsed(false)
                    localStorage.setItem('panoptes-sidebar-collapsed', 'false')
                    setToolsOpen(true)
                  } else {
                    setToolsOpen(value => !value)
                  }
                }}
                title={collapsed ? 'Ferramentas e gestão' : undefined}
              >
                <Icon name="activity" size={20} />
                <span>Ferramentas</span>
                <Icon name="chevron-down" size={15} className="nav-tools-chevron" />
              </button>
              <div className="nav-tools-content" aria-hidden={!toolsOpen}>
                {toolsNav.map(item => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link key={item.href} href={item.href} className={`nav-link nav-link-secondary ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
                      <Icon name={item.icon as IconName} size={18} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </nav>
        <div className="sidebar-footer-minimal" aria-hidden="true"><span /></div>
      </aside>
      {mobileOpen && <button className="mobile-scrim" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}

      <div className="content-column">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu-button" type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Icon name="menu" size={21} /></button>
            <label className="search-field global-search">
              <Icon name="search" size={18} />
              <span className="sr-only">Pesquisa global</span>
              <input ref={globalSearchRef} onFocus={() => setCommandOpen(true)} readOnly placeholder="Pesquisar no Panoptes…" aria-haspopup="dialog" />
              <span className="search-shortcut" aria-hidden="true">Ctrl K</span>
            </label>
          </div>
          <div className="topbar-actions">
            <AccessibilityMenu />
            <ThemeToggle compact />
            <Notifications />
            <div className="user-context-cluster">
              {!isAiPage && <ProjectSelector variant="account" />}
              <div className="popover-anchor" ref={accountRef}>
                <button className="profile-trigger" type="button" onClick={() => setAccountOpen(v => !v)} aria-expanded={accountOpen} aria-haspopup="menu">
                  <span className="avatar small-avatar">{session.name.slice(0,1)}</span>
                  <span className="profile-trigger-copy"><strong>{session.name}</strong><small>{roleLabels[role]}</small></span>
                  <Icon name="chevron-down" size={16} />
                </button>
                {accountOpen && (
                  <div className="popover account-popover" role="menu">
                    <div className="popover-head"><span><strong>{session.name}</strong><small>{session.email}</small></span></div>
                    {!isAiPage && <div className="account-project-mobile"><ProjectSelector variant="account" /></div>}
                    <div className="role-switcher" aria-label="Visualizar como">
                      <span className="eyebrow">Visualizar como</span>
                      {(['admin','moderator','user'] as Role[]).map(r => (
                        <button key={r} type="button" className={r === role ? 'role-option active' : 'role-option'} onClick={() => setDemoRole(r)}>
                          <Icon name={r === 'admin' ? 'users' : r === 'moderator' ? 'shield-check' : 'user-round'} size={18} />
                          <span><strong>{roleLabels[r]}</strong><small>{r === 'admin' ? 'Gestão completa' : r === 'moderator' ? 'Fontes e moderação' : 'Consulta e colaboração'}</small></span>
                        </button>
                      ))}
                    </div>
                    <div className="popover-actions account-links">
                      <Link href="/profile" onClick={() => setAccountOpen(false)}>Perfil e conquistas</Link>
                      <button type="button" onClick={() => { setAccountOpen(false); setHelpOpen(true) }}>Atalhos de teclado</button>
                      <button type="button" onClick={logout}>Sair</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main id="conteudo-principal" tabIndex={-1} className="main-content">
          <div className="route-transition" key={pathname}>{children}</div>
        </main>
      </div>

      {sequence && <div className="sequence-hint" role="status">G → escolha o destino</div>}
      <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} role={role} />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
