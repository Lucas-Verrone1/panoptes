export function apiUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function getToken() {
  try {
    return window.sessionStorage.getItem('panoptes-token') || window.localStorage.getItem('panoptes-token')
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) {
      window.sessionStorage.setItem('panoptes-token', token)
      window.localStorage.setItem('panoptes-token', token)
    } else {
      window.sessionStorage.removeItem('panoptes-token')
      window.localStorage.removeItem('panoptes-token')
    }
  } catch {}
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(apiUrl(path), { ...init, headers })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      setToken(null)
      window.dispatchEvent(new Event('panoptes-auth-invalid'))
    }
    const detail = typeof payload.detail === 'string'
      ? payload.detail
      : Array.isArray(payload.detail)
        ? payload.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(' ')
        : 'Não foi possível concluir a requisição.'
    throw new ApiError(response.status, detail)
  }
  return payload as T
}
