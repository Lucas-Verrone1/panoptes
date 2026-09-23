'use client'

import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { useProject } from './ProjectProvider'
import { Icon } from './Icon'
import { PageHeader } from './PageHeader'
import { StatusBadge } from './StatusBadge'
import { apiFetch } from '@/lib/api'

const stages = ['Fila', 'Validação', 'Coleta (URL)', 'Extração', 'Processamento', 'Vetorização', 'Disponível']
const MAX_FILE_BYTES = 8 * 1024 * 1024

type SourceJob = {
  id: string
  url: string
  title?: string | null
  status: string
  stage: number
  error?: string | null
}

export function UploadClient() {
  const { project } = useProject()
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [job, setJob] = useState<SourceJob | null>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!job || job.status === 'indexed' || job.status === 'failed') return
    const timer = window.setInterval(async () => {
      try {
        const next = await apiFetch<SourceJob>(`/sources/${job.id}`)
        setJob(next)
        if (next.status === 'indexed' || next.status === 'failed') setRunning(false)
      } catch {
        setRunning(false)
      }
    }, 1600)
    return () => window.clearInterval(timer)
  }, [job])

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const clean = url.trim()
    if (!/^https?:\/\/.+/i.test(clean)) {
      setError('Informe uma URL http ou https completa.')
      return
    }
    setJob(null)
    setRunning(true)
    try {
      const created = await apiFetch<SourceJob>('/sources', {
        method: 'POST',
        body: JSON.stringify({ url: clean, project_id: project.id }),
      })
      setJob(created)
    } catch (err) {
      setRunning(false)
      setError(err instanceof Error ? err.message : 'Não foi possível registrar a URL.')
    }
  }

  const submitFile = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (!file) {
      setError('Selecione um arquivo PDF, DOCX ou ZIP.')
      return
    }

    if (file.size > MAX_FILE_BYTES) {
      setError(`O arquivo excede o limite de ${MAX_FILE_BYTES / (1024 * 1024)} MB.`)
      return
    }

    const allowedExtensions = ['.pdf', '.docx', '.zip']
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!allowedExtensions.includes(extension)) {
      setError('Formato não suportado. Envie PDF, DOCX ou ZIP.')
      return
    }

    setJob(null)
    setRunning(true)

    const formData = new FormData()
    formData.append('project_id', project.id)
    formData.append('file', file)

    try {
      const created = await apiFetch<SourceJob>('/sources/upload', {
        method: 'POST',
        body: formData,
      })
      setJob(created)
    } catch (err) {
      setRunning(false)
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o arquivo.')
    }
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError('')
    setFile(event.target.files?.[0] ?? null)
  }

  const stage = job?.stage ?? -1
  const failed = job?.status === 'failed'

  return (
    <>
      <PageHeader title="Fontes" description={`Cole a URL da documentação do projeto ${project.name}. O Panoptes coleta, extrai e indexa o conteúdo para o assistente.`} />
      <div className="upload-grid">
        <section className="panel upload-dropzone">
          <span className="upload-icon"><Icon name="link" size={28} /></span>
          <h2>Registrar URL</h2>
          <p>Use a página oficial do sistema, wiki ou manual.</p>
          <form className="url-ingest-form" onSubmit={submit}>
            <label className="field">
              <span>URL da documentação</span>
              <input type="url" placeholder="https://docs.exemplo.com/modulo-financeiro" value={url} onChange={e => setUrl(e.target.value)} required />
            </label>
            <button type="submit" className="primary-button full" disabled={running || !project.id}>{running ? 'Coletando…' : 'Coletar e indexar'}</button>
          </form>

          <div className="upload-divider" aria-hidden="true" />

          <h2>Enviar arquivo</h2>
          <p>Envie arquivos PDF, DOCX ou ZIP até {MAX_FILE_BYTES / (1024 * 1024)} MB. O conteúdo será extraído e indexado para a busca da IA.</p>
          <form className="url-ingest-form" onSubmit={submitFile}>
            <label className="field">
              <span>Arquivo</span>
              <div className="upload-file-picker">
                <input type="file" accept=".pdf,.docx,.zip" onChange={onFileChange} />
                <span className="upload-file-trigger">
                  <Icon name="upload" size={17} />
                  Escolher arquivo
                </span>
              </div>
            </label>
            {file && (
              <div className="selected-file">
                <span>
                  <strong>{file.name}</strong>
                  <small>{formatBytes(file.size)}</small>
                </span>
              </div>
            )}
            <button type="submit" className="primary-button full" disabled={running || !project.id}>{running ? 'Processando…' : 'Enviar e indexar'}</button>
          </form>

          {error && <div className="form-error" role="alert">{error}</div>}
          {job?.error && <div className="form-error" role="alert">{job.error}</div>}
        </section>
        <section className="panel panel-pad">
          <div className="panel-heading">
            <div><span className="eyebrow">Fluxo</span><h2>Status do processamento</h2></div>
            {job?.status === 'indexed' && <StatusBadge tone="success">Disponível</StatusBadge>}
            {failed && <StatusBadge tone="danger">Falha</StatusBadge>}
          </div>
          <div className="pipeline-list">
            {stages.map((name, index) => (
              <div key={name}>
                <span className={`pipeline-dot ${index <= stage ? 'done' : ''}`}>{index <= stage ? <Icon name="check" size={13} /> : index + 1}</span>
                <span>
                  <strong>{name}</strong>
                  <small>{index < stage ? 'Concluído' : index === stage ? (running ? 'Em andamento' : failed ? 'Interrompido' : 'Concluído') : 'Aguardando'}</small>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

    </>
  )
}
