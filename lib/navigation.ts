import type { Role } from './types'

export type NavItem = { href: string; label: string; icon: string; roles: Role[] }

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Início', icon: 'home', roles: ['admin', 'moderator', 'user'] },
  { href: '/ai', label: 'Assistente IA', icon: 'bot', roles: ['admin', 'moderator', 'user'] },
  { href: '/search', label: 'Buscar', icon: 'search', roles: ['admin', 'moderator', 'user'] },
  { href: '/documents', label: 'Documentações', icon: 'file-text', roles: ['admin', 'moderator', 'user'] },
  { href: '/zendesk', label: 'Zendesk', icon: 'zendesk', roles: ['admin', 'moderator', 'user'] },
  { href: '/projects', label: 'Projetos', icon: 'folder-git-2', roles: ['admin', 'moderator', 'user'] },
  { href: '/manual', label: 'Guia do Panoptes IA', icon: 'book-open', roles: ['admin', 'moderator', 'user'] },
  { href: '/upload', label: 'Fontes', icon: 'link', roles: ['admin', 'moderator'] },
  { href: '/users', label: 'Usuários', icon: 'users', roles: ['admin'] },
  { href: '/analytics', label: 'Indicadores', icon: 'chart-no-axes-combined', roles: ['admin', 'moderator'] },
  { href: '/settings', label: 'Configurações', icon: 'settings-2', roles: ['admin'] },
]

export const routeRoles: Record<string, Role[]> = {
  '/dashboard': ['admin', 'moderator', 'user'],
  '/ai': ['admin', 'moderator', 'user'],
  '/search': ['admin', 'moderator', 'user'],
  '/documents': ['admin', 'moderator', 'user'],
  '/profile': ['admin', 'moderator', 'user'],
  '/manual': ['admin', 'moderator', 'user'],
  '/projects': ['admin', 'moderator', 'user'],
  '/upload': ['admin', 'moderator'],
  '/analytics': ['admin', 'moderator'],
  '/zendesk': ['admin', 'moderator', 'user'],
  '/users': ['admin'],
  '/settings': ['admin'],
}

export function canAccess(pathname: string, role: Role) {
  if (pathname.startsWith('/documents/')) return true
  if (pathname.startsWith('/projects/')) return ['admin', 'moderator', 'user'].includes(role)
  const base = Object.keys(routeRoles).find((path) => pathname === path || pathname.startsWith(path + '/'))
  return base ? routeRoles[base].includes(role) : true
}
