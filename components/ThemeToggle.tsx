'use client'

import { useCallback, useEffect, useState } from 'react'
import { Icon } from './Icon'

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> }
}

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const toggle = useCallback(() => {
    const root = document.documentElement
    const current = root.dataset.theme === 'light' ? 'light' : 'dark'
    const next = current === 'dark' ? 'light' : 'dark'
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const applyTheme = () => {
      root.dataset.theme = next
      localStorage.setItem('panoptes-theme', next)
      setTheme(next)
    }

    root.classList.add('theme-switching')
    const viewDocument = document as ViewTransitionDocument
    if (!reduceMotion && viewDocument.startViewTransition) {
      const transition = viewDocument.startViewTransition(applyTheme)
      transition.finished.finally(() => root.classList.remove('theme-switching'))
    } else {
      applyTheme()
      window.setTimeout(() => root.classList.remove('theme-switching'), reduceMotion ? 0 : 520)
    }
  }, [])

  return { theme, toggle }
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme()
  return (
    <button className="icon-button" type="button" onClick={toggle} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} title="Alternar tema (Shift + T)">
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
      {!compact && <span className="sr-only">Alternar tema</span>}
    </button>
  )
}
