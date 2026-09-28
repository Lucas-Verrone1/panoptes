import { PortalPage } from '@/components/PortalPage'
import { PageHeader } from '@/components/PageHeader'
import { shortcuts } from '@/lib/shortcuts'

const sections = [
  {
    title: '1. Escolha o projeto certo',
    description: 'Antes de perguntar algo ao assistente, confirme no seletor de projeto qual contexto está ativo. Isso garante que a resposta use o conjunto de documentação correto.',
    bullets: [
      'Acesse a aba Projeto ou use o seletor no topo da aplicação.',
      'Verifique o nome do projeto ativo antes de iniciar a conversa.',
      'Quando houver alterações recentes, atualize as fontes para refletir o estado atual.',
    ],
  },
  {
    title: '2. Use o assistente com perguntas claras',
    description: 'O Panoptes IA funciona melhor quando a pergunta indica objetivo, contexto e resultado esperado.',
    bullets: [
      'Perguntas gerais: “Explique o módulo financeiro”.',
      'Perguntas específicas: “Quais fontes alimentam este projeto e qual é o status de cada uma?”.',
      'Perguntas de comparação: “Qual a diferença entre a documentação atual e a versão anterior?”.',
    ],
  },
  {
    title: '3. Consulte a documentação gerada',
    description: 'A aba Documentações reúne conteúdos gerados pela IA e materiais úteis para revisão.',
    bullets: [
      'Use documentações já processadas como referência principal.',
      'Revise o conteúdo para validar se o projeto está alinhado com a realidade.',
      'Se descobrir lacunas, retorne às fontes e reindexe o material.',
    ],
  },
  {
    title: '4. Registre fontes para enriquecer o conhecimento',
    description: 'No perfil de administração e moderação, a aba Fontes permite incluir conteúdo em arquivos ou URLs para alimentar o banco documental.',
    bullets: [
      'Cadastre URLs oficiais, manuais e wikis do sistema.',
      'Faça upload de PDF, DOCX ou ZIP quando houver documentação em arquivos.',
      'Acompanhe o status do processamento até que a informação fique disponível para consulta.',
    ],
  },
]

const profileGuides = [
  {
    title: 'Administrador',
    tone: 'Gestão completa',
    items: ['Gerenciar usuários, fontes e projetos.', 'Acompanhar os indicadores e revisar o estado do ambiente.', 'Definir os contextos que o assistente deve consultar.'],
  },
  {
    title: 'Moderador',
    tone: 'Fontes e curadoria',
    items: ['Registrar e acompanhar novas fontes.', 'Revisar chamados Zendesk e validar soluções para a base de conhecimento.', 'Apoiar a organização do conhecimento por projeto.'],
  },
  {
    title: 'Usuário',
    tone: 'Consulta e colaboração',
    items: ['Consultar documentação e responder perguntas com a IA.', 'Consultar chamados Zendesk indexados para seu projeto.', 'Buscar informações do projeto sem alterar o ambiente.'],
  },
]

export default function ManualPage() {
  return (
    <PortalPage>
      <div className="page">
        <PageHeader
          title="Guia do Panoptes IA"
          description="Uma orientação prática para usar a plataforma, entender os módulos e aproveitar melhor o assistente de IA."
        />

        <section className="panel panel-pad manual-card">
          <div className="manual-intro">
            <h2>Como começar</h2>
            <p>
              O Panoptes IA centraliza projetos, fontes, documentação e respostas inteligentes em um único ambiente.
              Em geral, o fluxo ideal começa pela seleção do projeto ativo e, em seguida, pelo uso do assistente para obter respostas com contexto real.
            </p>
          </div>

          <div className="manual-grid">
            {sections.map((section) => (
              <article className="manual-tips" key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="manual-tips">
            <h2>Exemplos de prompts úteis</h2>
            <ul>
              <li>“Resuma os principais pontos da documentação do projeto atual.”</li>
              <li>“Quais fontes foram usadas para gerar a documentação do módulo financeiro?”</li>
              <li>“Liste os próximos passos para validar o conteúdo recém-importado.”</li>
              <li>“Qual é o status das fontes por projeto e o que está pendente?”</li>
            </ul>
          </div>

          <div className="manual-tips">
            <h2>Resumo por perfil</h2>
            <div className="manual-grid">
              {profileGuides.map((profile) => (
                <article className="profile-guide-card" key={profile.title}>
                  <h3>{profile.title}</h3>
                  <p className="profile-guide-tone">{profile.tone}</p>
                  <ul>
                    {profile.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>

          <div className="shortcut-table">
            {shortcuts.map((item) => (
              <div className="shortcut-row" key={item.action}>
                <span>{item.action}</span>
                <span className="shortcut-keys">
                  {item.keys.map((key) => (
                    <kbd key={key}>{key}</kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PortalPage>
  )
}
