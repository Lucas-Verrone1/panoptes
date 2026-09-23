'use client'

import Script from 'next/script'
import { useCallback, useEffect, useRef } from 'react'
import { useAccessibility } from './AccessibilityProvider'

declare global {
  interface Window {
    VLibras?: { Widget: new (baseUrl: string) => unknown }
    HT?: new (options: Record<string, unknown>) => unknown
    __panoptesVLibrasReady?: boolean
    __panoptesHandTalkReady?: boolean
  }
}

function clickVLibrasButton(attempt = 0) {
  const button = document.querySelector<HTMLElement>('.panoptes-vlibras-root [vw-access-button]')
  if (button) {
    button.click()
    return true
  }
  if (attempt < 8) window.setTimeout(() => clickVLibrasButton(attempt + 1), 180)
  return false
}

function loadExternalScript(id: string, src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null
    if (existing) {
      if (existing.dataset.loaded === 'true') return resolve()
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar o tradutor.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.addEventListener('load', () => { script.dataset.loaded = 'true'; resolve() }, { once: true })
    script.addEventListener('error', () => reject(new Error('Falha ao carregar o tradutor.')), { once: true })
    document.body.appendChild(script)
  })
}

export function LibrasBridge() {
  const {
    librasProvider, librasOpenRequest, handTalkAvailable, reportLibrasStatus,
  } = useAccessibility()
  const handTalkToken = process.env.NEXT_PUBLIC_HANDTALK_TOKEN?.trim()
  const vlibrasInitialized = useRef(false)
  const handTalkInitialized = useRef(false)
  const lastOpenRequest = useRef(0)

  const initializeVLibras = useCallback(() => {
    if (vlibrasInitialized.current || window.__panoptesVLibrasReady) {
      vlibrasInitialized.current = true
      if (librasProvider === 'vlibras') reportLibrasStatus('ready', 'VLibras carregado. Use “Abrir tradutor” quando quiser.')
      return true
    }
    if (!window.VLibras?.Widget) return false
    try {
      new window.VLibras.Widget('https://vlibras.gov.br/app')
      vlibrasInitialized.current = true
      window.__panoptesVLibrasReady = true
      if (librasProvider === 'vlibras') reportLibrasStatus('ready', 'VLibras carregado e pronto para uso.')
      return true
    } catch {
      if (librasProvider === 'vlibras') reportLibrasStatus('error', 'O VLibras não conseguiu iniciar. Verifique bloqueadores de conteúdo ou a conexão com vlibras.gov.br.')
      return false
    }
  }, [librasProvider, reportLibrasStatus])

  useEffect(() => {
    if (librasProvider !== 'vlibras') return
    reportLibrasStatus(vlibrasInitialized.current ? 'ready' : 'loading', vlibrasInitialized.current ? 'VLibras pronto para uso.' : 'Carregando o VLibras…')
    if (window.VLibras?.Widget) initializeVLibras()
  }, [initializeVLibras, librasProvider, reportLibrasStatus])

  useEffect(() => {
    if (librasProvider !== 'handtalk') return
    if (!handTalkAvailable || !handTalkToken) {
      reportLibrasStatus('error', 'A Hand Talk requer um token válido configurado para este domínio.')
      return
    }
    if (handTalkInitialized.current || window.__panoptesHandTalkReady) {
      handTalkInitialized.current = true
      reportLibrasStatus('ready', 'Hand Talk carregada. Use o botão do tradutor exibido na página.')
      return
    }

    reportLibrasStatus('loading', 'Carregando a Hand Talk…')
    loadExternalScript('panoptes-handtalk-script', 'https://plugin.handtalk.me/web/latest/handtalk.min.js')
      .then(() => {
        if (!window.HT) throw new Error('Hand Talk indisponível')
        if (!handTalkInitialized.current && !window.__panoptesHandTalkReady) {
          new window.HT({
            token: handTalkToken,
            doNotTrack: true,
            clickables: ['button', 'a', '[role="button"]'],
          })
          handTalkInitialized.current = true
          window.__panoptesHandTalkReady = true
        }
        reportLibrasStatus('ready', 'Hand Talk carregada. Use o botão do tradutor exibido na página.')
      })
      .catch(() => reportLibrasStatus('error', 'Não foi possível carregar a Hand Talk. Confira o token, o domínio autorizado e a conexão.'))
  }, [handTalkAvailable, handTalkToken, librasProvider, reportLibrasStatus])

  useEffect(() => {
    if (librasOpenRequest === 0 || librasOpenRequest === lastOpenRequest.current) return
    lastOpenRequest.current = librasOpenRequest

    if (librasProvider === 'vlibras') {
      const ready = initializeVLibras()
      if (!ready) {
        reportLibrasStatus('loading', 'Carregando o VLibras…')
        return
      }
      window.setTimeout(() => {
        clickVLibrasButton()
        reportLibrasStatus('ready', 'VLibras aberto. Selecione um texto da página para traduzir.')
      }, 120)
    } else if (librasProvider === 'handtalk') {
      reportLibrasStatus(handTalkInitialized.current ? 'ready' : 'loading', handTalkInitialized.current ? 'Hand Talk pronta. Use o botão do tradutor na página.' : 'Carregando a Hand Talk…')
    }
  }, [initializeVLibras, librasOpenRequest, librasProvider, reportLibrasStatus])

  const rootAttrs = { vw: '' } as Record<string, string>
  const buttonAttrs = { 'vw-access-button': '' } as Record<string, string>
  const wrapperAttrs = { 'vw-plugin-wrapper': '' } as Record<string, string>

  return (
    <>
      <div className={`libras-integrations provider-${librasProvider}`} data-provider={librasProvider}>
        <div {...rootAttrs} className="enabled panoptes-vlibras-root" aria-hidden={librasProvider !== 'vlibras'}>
          <div {...buttonAttrs} className="active" />
          <div {...wrapperAttrs}><div className="vw-plugin-top-wrapper" /></div>
        </div>
      </div>
      <Script
        id="panoptes-vlibras-script"
        src="https://vlibras.gov.br/app/vlibras-plugin.js"
        strategy="afterInteractive"
        onLoad={() => {
          const ok = initializeVLibras()
          if (!ok && librasProvider === 'vlibras') reportLibrasStatus('error', 'O script do VLibras carregou, mas o widget não ficou disponível.')
        }}
        onError={() => {
          if (librasProvider === 'vlibras') reportLibrasStatus('error', 'Não foi possível baixar o VLibras. Verifique a conexão e bloqueadores de conteúdo.')
        }}
      />
    </>
  )
}
