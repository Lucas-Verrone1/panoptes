'use client'

import { useEffect, useState } from 'react'
import { useReactMediaRecorder } from 'react-media-recorder'
import { apiFetch } from '@/lib/api'
import { Icon } from './Icon'

type Props = {
  disabled?: boolean
  onTranscript: (transcript: string) => void
  onBusyChange: (busy: boolean) => void
}

const recorderErrors: Record<string, string> = {
  permission_denied: 'Permita o acesso ao microfone para gravar.',
  no_specified_media_found: 'Nenhum microfone foi encontrado neste dispositivo.',
  media_in_use: 'O microfone está sendo usado por outro aplicativo.',
  invalid_media_constraints: 'Não foi possível iniciar o microfone neste dispositivo.',
  recorder_error: 'A gravação de áudio falhou.',
}

export function VoiceRecorder({ disabled = false, onTranscript, onBusyChange }: Props) {
  const [transcribing, setTranscribing] = useState(false)
  const [transcriptionError, setTranscriptionError] = useState('')

  const transcribe = async (blob: Blob) => {
    setTranscribing(true)
    setTranscriptionError('')
    try {
      const extension = blob.type.includes('wav') ? 'wav' : blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
      const form = new FormData()
      form.append('audio', blob, `mensagem-de-voz.${extension}`)
      const result = await apiFetch<{ transcript: string }>('/ai/transcribe', { method: 'POST', body: form })
      if (!result.transcript.trim()) throw new Error('Não foi encontrada fala na gravação.')
      onTranscript(result.transcript.trim())
    } catch (error) {
      setTranscriptionError(error instanceof Error ? error.message : 'Não foi possível transcrever o áudio.')
    } finally {
      setTranscribing(false)
    }
  }

  const { status, error, startRecording, stopRecording } = useReactMediaRecorder({
    audio: true,
    video: false,
    onStop: (_blobUrl, blob) => { void transcribe(blob) },
  })
  const isRecording = status === 'recording' || status === 'acquiring_media'
  const busy = isRecording || transcribing || status === 'stopping'

  useEffect(() => {
    onBusyChange(busy)
  }, [busy, onBusyChange])

  const errorMessage = transcriptionError || (error ? recorderErrors[error] ?? 'Não foi possível acessar o microfone.' : '')
  const label = transcribing
    ? 'Transcrevendo áudio…'
    : status === 'acquiring_media'
      ? 'Aguardando acesso ao microfone…'
      : status === 'recording'
        ? 'Gravando áudio'
        : status === 'stopping'
          ? 'Preparando áudio…'
          : ''

  return (
    <div className="voice-recorder">
      <button
        type="button"
        className={`voice-recorder-button ${isRecording ? 'recording' : ''} ${transcribing ? 'transcribing' : ''}`}
        aria-label={isRecording ? 'Parar gravação de áudio' : transcribing ? 'Áudio sendo transcrito' : 'Gravar mensagem de voz'}
        aria-pressed={isRecording}
        title={isRecording ? 'Parar gravação' : 'Gravar voz para transcrever no campo de mensagem'}
        disabled={disabled || transcribing || status === 'acquiring_media' || status === 'stopping'}
        onClick={() => {
          setTranscriptionError('')
          if (isRecording) stopRecording()
          else startRecording()
        }}
      >
        {transcribing
          ? <Icon name="loader-circle" size={19} className="voice-recorder-spinner" />
          : isRecording
            ? <><span className="voice-recorder-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span><Icon name="square" size={13} fill="currentColor" /></>
            : <Icon name="mic" size={19} />}
      </button>
      {label && <span className={`voice-recorder-status ${isRecording ? 'recording' : ''}`} role="status" aria-live="polite">{label}</span>}
      {errorMessage && <span className="voice-recorder-error" role="status">{errorMessage}</span>}
    </div>
  )
}