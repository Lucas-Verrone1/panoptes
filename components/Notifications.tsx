'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Icon } from './Icon'

const initial = [
  { id: 1, title: 'Documentação concluída', text: 'Módulo Financeiro v2.1 está disponível.', href: '/documents/doc-fin', unread: true },
  { id: 2, title: 'Chamado indexado', text: 'Um chamado do Zendesk entrou na base de conhecimento.', href: '/zendesk', unread: true },
  { id: 3, title: 'Nova conquista', text: 'Você está próximo do título Supercolaborador.', href: '/profile', unread: false },
]

export function Notifications() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(initial)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const unread = items.filter(i => i.unread).length

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="popover-anchor" ref={rootRef}>
      <button ref={triggerRef} className="icon-button notification-button" type="button" onClick={() => setOpen(v => !v)} aria-label={`Notificações${unread ? `, ${unread} não lidas` : ''}`} aria-expanded={open}>
        <Icon name="bell" size={19} />
        {unread > 0 && <span className="notification-dot" aria-hidden="true">{unread}</span>}
      </button>
      {open && (
        <div className="popover notifications-popover" role="dialog" aria-label="Notificações">
          <div className="popover-head"><strong>Notificações</strong><button type="button" className="text-button" onClick={() => setItems(v => v.map(i => ({ ...i, unread: false })))}>Marcar como lidas</button></div>
          <div className="notification-list">
            {items.map(item => (
              <Link className={`notification-item ${item.unread ? 'unread' : ''}`} href={item.href} key={item.id} onClick={() => { setOpen(false); setItems(v => v.map(i => i.id === item.id ? { ...i, unread: false } : i)) }}>
                <span className="notification-symbol"><Icon name={item.unread ? 'sparkles' : 'check'} size={16} /></span>
                <span><strong>{item.title}</strong><small>{item.text}</small></span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
