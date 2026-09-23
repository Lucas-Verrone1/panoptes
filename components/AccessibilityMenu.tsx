'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './Icon'
import { useAccessibility, type LibrasProvider } from './AccessibilityProvider'

function StatusLine() {
  const { librasProvider, librasStatus, librasMessage } = useAccessibility()
  if (librasProvider === 'off' && !librasMessage) return null
  const label = librasStatus === 'loading' ? 'Carregando' : librasStatus === 'ready' ? 'Pronto' : librasStatus === 'error' ? 'Não foi possível ativar' : 'Desativado'
  return (
    <div className={`libras-status ${librasStatus}`} role="status" aria-live="polite">
      <span className="libras-status-dot" aria-hidden="true" />
      <span><strong>{label}</strong>{librasMessage && <small>{librasMessage}</small>}</span>
    </div>
  )
}

function FontControls({ compact = false }: { compact?: boolean }) {
  const { fontSize, fontLabel, fontPercent, increaseFont, decreaseFont, resetFont, setFontSize, fontOptions } = useAccessibility()
  const first = fontOptions[0]?.value
  const last = fontOptions[fontOptions.length - 1]?.value

  return (
    <div className={`font-control-shell ${compact ? 'compact' : ''}`}>
      <div className="font-control-summary">
        <div className="font-current" aria-live="polite"><strong>{fontLabel}</strong><small>{fontPercent}</small></div>
        <div className="font-controls" role="group" aria-label="Ajustar tamanho do texto">
          <button type="button" onClick={decreaseFont} disabled={fontSize === first} aria-label="Diminuir tamanho da fonte">A−</button>
          <button type="button" className="font-reset" onClick={resetFont} aria-label="Restaurar tamanho padrão">100%</button>
          <button type="button" onClick={increaseFont} disabled={fontSize === last} aria-label="Aumentar tamanho da fonte">A+</button>
        </div>
      </div>
      <div className="font-size-presets" role="radiogroup" aria-label="Escolher tamanho do texto">
        {fontOptions.map(option => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={fontSize === option.value}
            className={fontSize === option.value ? 'active' : ''}
            onClick={() => setFontSize(option.value)}
            title={`${option.label} · ${option.percent}`}
          >
            {option.percent}
          </button>
        ))}
      </div>
    </div>
  )
}

function LibrasControls() {
  const {
    librasProvider, setLibrasProvider, requestLibrasOpen, handTalkAvailable, librasStatus,
  } = useAccessibility()

  const choose = (provider: LibrasProvider) => {
    if (librasProvider === provider) {
      requestLibrasOpen()
      return
    }
    setLibrasProvider(provider)
    requestLibrasOpen()
  }

  return (
    <>
      <div className="libras-provider-list" role="radiogroup" aria-label="Tradutor de Libras">
        <button type="button" role="radio" aria-checked={librasProvider === 'vlibras'} className={librasProvider === 'vlibras' ? 'active' : ''} onClick={() => choose('vlibras')}>
          <span><strong>VLibras</strong><small>{librasProvider === 'vlibras' ? 'Clique novamente para abrir o tradutor' : 'Tradutor público em Libras'}</small></span>
          {librasProvider === 'vlibras' ? <Icon name="check" size={16} /> : <Icon name="languages" size={16} />}
        </button>
        <button type="button" role="radio" aria-checked={librasProvider === 'handtalk'} disabled={!handTalkAvailable} className={librasProvider === 'handtalk' ? 'active' : ''} onClick={() => choose('handtalk')}>
          <span><strong>Hand Talk</strong><small>{handTalkAvailable ? 'Tradutor licenciado deste ambiente' : 'Requer token/licença do domínio'}</small></span>
          {librasProvider === 'handtalk' ? <Icon name="check" size={16} /> : <Icon name="languages" size={16} />}
        </button>
      </div>
      {librasProvider !== 'off' && (
        <div className="libras-inline-actions">
          <button type="button" className="secondary-button small" onClick={requestLibrasOpen} disabled={librasStatus === 'loading'}>
            <Icon name="languages" size={15} /> Abrir tradutor
          </button>
          <button type="button" className="a11y-disable-link" onClick={() => setLibrasProvider('off')}>Desativar</button>
        </div>
      )}
      <StatusLine />
    </>
  )
}

export function AccessibilityMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogId = useId().replace(/:/g, '')

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  return (
    <div className="popover-anchor accessibility-anchor" ref={rootRef}>
      <button
        ref={triggerRef}
        className={`icon-button accessibility-trigger ${open ? 'active' : ''}`}
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-label="Abrir opções de acessibilidade"
        aria-expanded={open}
        aria-controls={dialogId}
        title="Acessibilidade"
      >
        <Icon name="accessibility" size={19} />
      </button>
      {open && (
        <div id={dialogId} className="popover accessibility-popover" role="dialog" aria-modal="false" aria-label="Opções de acessibilidade">
          <div className="popover-head"><span><strong>Acessibilidade</strong><small>Leitura, tamanho do texto e tradução em Libras</small></span></div>
          <section className="a11y-section" aria-labelledby={`${dialogId}-font`}>
            <div className="a11y-section-head"><span><strong id={`${dialogId}-font`}>Tamanho do texto</strong><small>A alteração é aplicada em toda a interface</small></span><Icon name="type" size={18} /></div>
            <FontControls compact />
          </section>
          <section className="a11y-section" aria-labelledby={`${dialogId}-libras`}>
            <div className="a11y-section-head"><span><strong id={`${dialogId}-libras`}>Libras</strong><small>Ative um tradutor sem sair do Panoptes</small></span><Icon name="languages" size={18} /></div>
            <LibrasControls />
          </section>
        </div>
      )}
    </div>
  )
}

export function AccessibilitySettings() {
  return (
    <section className="panel panel-pad accessibility-settings-card">
      <div className="settings-section-heading"><div><strong>Leitura e Libras</strong><p>As preferências são aplicadas em todo o Panoptes e ficam salvas neste navegador.</p></div><Icon name="accessibility" size={22} /></div>
      <div className="settings-a11y-grid">
        <div className="settings-a11y-block"><span className="field-label">Tamanho do texto</span><FontControls /></div>
        <div className="settings-a11y-block"><span className="field-label">Tradução em Libras</span><LibrasControls /></div>
      </div>
    </section>
  )
}
