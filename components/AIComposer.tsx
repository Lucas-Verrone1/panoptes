'use client'

import { FormEvent, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from './Icon'
import { useProject } from './ProjectProvider'

export function AIComposer({ large = false }: { large?: boolean }) {
  const [value, setValue] = useState('')
  const router = useRouter()
  const ref = useRef<HTMLTextAreaElement>(null)
  const { project, loading } = useProject()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const text = value.trim()
    if (!text) { ref.current?.focus(); return }
    if (!project) return
    router.push(`/ai?project=${encodeURIComponent(project.id)}&q=${encodeURIComponent(text)}`)
  }

  return (
    <div className={`composer-context-shell ${large ? 'large' : ''}`}>
      {project ? (
        <form className={`ai-composer ${large ? 'large' : ''}`} onSubmit={submit} aria-label={`Perguntar ao Panoptes sobre ${project.name}`}>
          <textarea ref={ref} value={value} onChange={e => setValue(e.target.value)} rows={1} placeholder={`Pergunte sobre ${project.name}…`} aria-label={`Sua pergunta sobre ${project.name}`} />
          <button type="submit" className="composer-send" aria-label="Enviar pergunta"><Icon name="sparkles" size={19} /></button>
        </form>
      ) : <p className="empty-state">{loading ? 'Carregando projetos…' : 'Selecione ou crie um projeto ativo para conversar com a IA.'}</p>}
    </div>
  )
}
