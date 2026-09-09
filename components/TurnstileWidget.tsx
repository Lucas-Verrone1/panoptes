'use client'

import { useEffect, useRef } from 'react'

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type Props = {
  onToken: (token: string) => void
}

export function TurnstileWidget({ onToken }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const hostRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  useEffect(() => {
    if (!siteKey || !hostRef.current) return
    const render = () => {
      const turnstile = (window as unknown as { turnstile?: { render: (el: HTMLElement, opts: object) => string } }).turnstile
      if (!turnstile || !hostRef.current || widgetId.current) return
      widgetId.current = turnstile.render(hostRef.current, {
        sitekey: siteKey,
        callback: onToken,
        'expired-callback': () => onToken(''),
      })
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-panoptes-turnstile]')
    if (existing) {
      render()
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT
    script.async = true
    script.dataset.panoptesTurnstile = 'true'
    script.onload = render
    document.head.appendChild(script)
  }, [onToken, siteKey])

  if (!siteKey) return null
  return <div className="captcha-slot" ref={hostRef} aria-label="Verificação anti-robô" />
}
