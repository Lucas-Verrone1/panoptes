'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

type LogoTone = 'auto' | 'inverse'

export function Logo({ compact = false, priority = false, tone = 'auto' }: { compact?: boolean; priority?: boolean; tone?: LogoTone }) {
  const [theme, setTheme] = useState<'dark'|'light'>('dark')

  useEffect(() => {
    const sync = () => setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const inverse = tone === 'inverse'
  const fullSrc = inverse || theme === 'dark' ? '/logo-dark.png' : '/logo-navy.png'
  const markSrc = inverse || theme === 'dark' ? '/logo-mark-dark.png' : '/logo-mark-navy.png'
  const src = compact ? markSrc : fullSrc

  return (
    <span className={`brand ${compact ? 'brand-compact' : 'brand-full'}`} aria-label="Panoptes">
      <Image
        src={src}
        width={compact ? 245 : 914}
        height={222}
        priority={priority}
        alt=""
        aria-hidden="true"
        className="brand-image brand-image-single"
      />
      <span className="sr-only">Panoptes</span>
    </span>
  )
}
