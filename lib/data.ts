import type { DocumentItem, Project, Role } from './types'

export const demoAccounts: Record<string, { password: string; role: Role; name: string }> = {
  'admin@panoptes.local': { password: 'admin123', role: 'admin', name: 'Victor' },
  'moderador@panoptes.local': { password: 'mod123', role: 'moderator', name: 'Marina' },
  'usuario@panoptes.local': { password: 'user123', role: 'user', name: 'Lucas' },
}

export const roleLabels: Record<Role, string> = {
  admin: 'Administrador',
  moderator: 'Moderador',
  user: 'Usuário',
}

export const projects: Project[] = [
  { id: 'protheus', name: 'Protheus TCC', description: 'Base principal do projeto, rotinas, documentação e integrações.', source: 'GitHub', branch: 'main', files: 1248, status: 'Indexado', updated: 'Hoje, 10:18' },
  { id: 'api', name: 'Integração API', description: 'Contratos OpenAPI, rotinas de integração e documentação técnica.', source: 'Swagger / OpenAPI', branch: 'v1', files: 342, status: 'Indexado', updated: 'Hoje, 09:45' },
  { id: 'financeiro', name: 'Módulo Financeiro', description: 'Regras, código e documentação das rotinas financeiras.', source: 'Azure DevOps', branch: 'develop', files: 823, status: 'Processando', updated: 'Ontem, 17:32' },
  { id: 'relatorios', name: 'Relatórios Gerenciais', description: 'Snapshot importado para análise documental.', source: 'ZIP', branch: 'snapshot', files: 156, status: 'Falha', updated: 'Ontem, 16:08' },
]
export const documents: DocumentItem[] = [
  {
    id: 'doc-fin', title: 'Módulo Financeiro', project: 'Protheus TCC', type: 'Markdown', version: '2.1', updated: 'Hoje, 10:20', generatedByAI: true,
    summary: 'Documentação consolidada das rotinas financeiras, contas a pagar e receber, fluxo de caixa, tesouraria e conciliação.',
    sources: ['Documentacao_API.md', 'Regras_Negocio.xlsx', 'Banco_de_Dados.sql', 'Zendesk · solução aprovada'],
    sections: [
      { title: 'Objetivo', paragraphs: ['Centralizar a visão técnica e funcional do módulo financeiro, mantendo rastreabilidade entre código, regras de negócio, dados e conhecimento humano validado.'] },
      { title: 'Principais funcionalidades', bullets: ['Gestão de contas a pagar e receber', 'Conciliação bancária automática e manual', 'Emissão e baixa de títulos', 'Integração com contabilidade e tesouraria', 'Relatórios financeiros e fluxo de caixa'] },
      { title: 'Fluxo resumido', bullets: ['Lançamento', 'Validação', 'Programação', 'Liquidação', 'Conciliação'] },
      { title: 'Integrações', bullets: ['Contabilidade: lançamentos e centros de custo', 'Tesouraria: previsões e desembolsos', 'Bancos: conciliação por APIs', 'Fiscal: retenções e notas fiscais'] },
    ],
  },
  {
    id: 'doc-api', title: 'Integração API', project: 'Protheus TCC', type: 'Markdown', version: '1.8', updated: 'Hoje, 09:47', generatedByAI: true,
    summary: 'Contratos, endpoints, schemas, autenticação e tratamento de erros das integrações do projeto.',
    sources: ['swagger.json', 'integracao_api.md', 'rotinas.prw'],
    sections: [
      { title: 'Visão geral', paragraphs: ['A documentação organiza os contratos de integração e relaciona endpoints às rotinas responsáveis pelo processamento.'] },
      { title: 'Itens documentados', bullets: ['Autenticação', 'Endpoints', 'Schemas', 'Códigos de erro', 'Logs e observabilidade'] },
    ],
  },
  {
    id: 'doc-estoque', title: 'Módulo Estoque', project: 'Protheus TCC', type: 'PDF', version: '1.4', updated: 'Ontem, 14:02', generatedByAI: true,
    summary: 'Rotinas de estoque, movimentações, reservas, saldos e integrações com faturamento.',
    sources: ['estoque.md', 'SIGAEST.prw', 'Zendesk · conteúdo aprovado'],
    sections: [
      { title: 'Escopo', paragraphs: ['Abrange movimentação de materiais, reservas, saldos e pontos de integração com faturamento.'] },
      { title: 'Componentes', bullets: ['Movimentações', 'Reservas', 'Saldos', 'Validações de duplicidade', 'Integrações com faturamento'] },
    ],
  },
]

export const zendeskKnowledgeStatuses = ['new', 'approved', 'indexed', 'rejected'] as const

export type ZendeskKnowledgeStatus = (typeof zendeskKnowledgeStatuses)[number]

