'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type FontSizeLevel = 'xxsmall' | 'small' | 'default' | 'medium' | 'large' | 'xlarge' | 'xxlarge'
export type LibrasProvider = 'off' | 'vlibras' | 'handtalk'
export type LibrasStatus = 'idle' | 'loading' | 'ready' | 'error'

const fontOrder: FontSizeLevel[] = ['xxsmall', 'small', 'default', 'medium', 'large', 'xlarge', 'xxlarge']
const fontMeta: Record<FontSizeLevel, { label: string; percent: string }> = {
  xxsmall: { label: 'Muito pequena', percent: '88%' },
  small: { label: 'Pequena', percent: '94%' },
  default: { label: 'Padrão', percent: '100%' },
  medium: { label: 'Média', percent: '106%' },
  large: { label: 'Grande', percent: '113%' },
  xlarge: { label: 'Extra grande', percent: '125%' },
  xxlarge: { label: 'Máxima', percent: '138%' },
}

type AccessibilityContextValue = {
  fontSize: FontSizeLevel
  fontLabel: string
  fontPercent: string
  increaseFont: () => void
  decreaseFont: () => void
  resetFont: () => void
  setFontSize: (level: FontSizeLevel) => void
  fontOptions: Array<{ value: FontSizeLevel; label: string; percent: string }>
  librasProvider: LibrasProvider
  setLibrasProvider: (provider: LibrasProvider) => void
  librasStatus: LibrasStatus
  librasMessage: string
  reportLibrasStatus: (status: LibrasStatus, message?: string) => void
  librasOpenRequest: number
  requestLibrasOpen: () => void
  handTalkAvailable: boolean
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null)

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSize] = useState<FontSizeLevel>('default')
  const [librasProvider, setLibrasProviderState] = useState<LibrasProvider>('off')
  const [librasStatus, setLibrasStatus] = useState<LibrasStatus>('idle')
  const [librasMessage, setLibrasMessage] = useState('')
  const [librasOpenRequest, setLibrasOpenRequest] = useState(0)
  const handTalkAvailable = Boolean(process.env.NEXT_PUBLIC_HANDTALK_TOKEN?.trim())

  useEffect(() => {
    try {
      const storedFont = localStorage.getItem('panoptes-font-size') as FontSizeLevel | null
      if (storedFont && fontOrder.includes(storedFont)) setFontSize(storedFont)

      const storedLibras = localStorage.getItem('panoptes-libras-provider') as LibrasProvider | null
      if (storedLibras === 'vlibras' || storedLibras === 'off' || (storedLibras === 'handtalk' && handTalkAvailable)) {
        setLibrasProviderState(storedLibras)
      }
    } catch {
      // O app continua funcional mesmo quando o armazenamento do navegador estiver indisponível.
    }
  }, [handTalkAvailable])

  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize
    try { localStorage.setItem('panoptes-font-size', fontSize) } catch {}
  }, [fontSize])

  useEffect(() => {
    document.documentElement.dataset.librasProvider = librasProvider
    try { localStorage.setItem('panoptes-libras-provider', librasProvider) } catch {}
    if (librasProvider === 'off') {
      setLibrasStatus('idle')
      setLibrasMessage('')
    }
  }, [librasProvider])

  const moveFont = useCallback((direction: number) => {
    setFontSize(current => {
      const index = fontOrder.indexOf(current)
      return fontOrder[Math.max(0, Math.min(fontOrder.length - 1, index + direction))]
    })
  }, [])

  const increaseFont = useCallback(() => moveFont(1), [moveFont])
  const decreaseFont = useCallback(() => moveFont(-1), [moveFont])
  const resetFont = useCallback(() => setFontSize('default'), [])
  const chooseFontSize = useCallback((level: FontSizeLevel) => setFontSize(level), [])
  const fontOptions = useMemo(() => fontOrder.map(value => ({ value, ...fontMeta[value] })), [])

  const reportLibrasStatus = useCallback((status: LibrasStatus, message = '') => {
    setLibrasStatus(status)
    setLibrasMessage(message)
  }, [])

  const setLibrasProvider = useCallback((provider: LibrasProvider) => {
    if (provider === 'handtalk' && !handTalkAvailable) {
      reportLibrasStatus('error', 'A Hand Talk precisa de um token válido configurado para este domínio.')
      return
    }
    setLibrasProviderState(provider)
    if (provider !== 'off') reportLibrasStatus('loading', provider === 'vlibras' ? 'Preparando o VLibras…' : 'Preparando a Hand Talk…')
  }, [handTalkAvailable, reportLibrasStatus])

  const requestLibrasOpen = useCallback(() => setLibrasOpenRequest(value => value + 1), [])

  const value = useMemo<AccessibilityContextValue>(() => ({
    fontSize,
    fontLabel: fontMeta[fontSize].label,
    fontPercent: fontMeta[fontSize].percent,
    increaseFont,
    decreaseFont,
    resetFont,
    setFontSize: chooseFontSize,
    fontOptions,
    librasProvider,
    setLibrasProvider,
    librasStatus,
    librasMessage,
    reportLibrasStatus,
    librasOpenRequest,
    requestLibrasOpen,
    handTalkAvailable,
  }), [
    fontSize, increaseFont, decreaseFont, resetFont, chooseFontSize, fontOptions, librasProvider, setLibrasProvider,
    librasStatus, librasMessage, reportLibrasStatus, librasOpenRequest, requestLibrasOpen, handTalkAvailable,
  ])

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (!context) throw new Error('useAccessibility deve ser usado dentro de AccessibilityProvider')
  return context
}
