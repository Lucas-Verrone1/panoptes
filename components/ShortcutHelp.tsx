'use client'

import Link from 'next/link'
import { shortcuts } from '@/lib/shortcuts'
import { Modal } from './Modal'

export function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Atalhos" description="Comandos essenciais para navegar mais rápido.">
      <div className="shortcut-list compact-shortcuts">
        {shortcuts.slice(0, 6).map((item) => (
          <div className="shortcut-row" key={item.action}>
            <span>{item.action}</span>
            <span className="shortcut-keys" aria-label={`Atalho: ${item.keys.join(' mais ')}`}>
              {item.keys.map((key) => <kbd key={key}>{key}</kbd>)}
            </span>
          </div>
        ))}
      </div>
      <div className="shortcut-help-footer">
        <span className="muted-copy">Os atalhos ficam suspensos enquanto você digita.</span>
        <Link href="/manual" onClick={onClose}>Ver manual completo</Link>
      </div>
    </Modal>
  )
}
