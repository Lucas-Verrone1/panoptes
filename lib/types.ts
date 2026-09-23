export type Role = 'admin' | 'moderator' | 'user'

export type Project = {
  id: string
  name: string
  description: string
  source: string
  branch: string
  files: number
  status: 'Indexado' | 'Processando' | 'Falha'
  updated: string
}

export type DocumentItem = {
  id: string
  title: string
  summary: string
  project: string
  type: 'Markdown' | 'PDF'
  version: string
  updated: string
  generatedByAI: boolean
  sources: string[]
  sections: { title: string; paragraphs?: string[]; bullets?: string[] }[]
}
