# Panoptes — Manual de Atalhos e Navegação Acessível

## Atalhos

| Atalho | Ação |
|---|---|
| `?` | Abrir o manual de atalhos |
| `/` | Focar a pesquisa global |
| `Ctrl + K` | Abrir a pesquisa global |
| `\` | Recolher ou expandir o menu lateral |
| `Shift + T` | Alternar tema claro/escuro |
| `Alt + P` | Focar o seletor de projeto ativo |
| `G` depois `D` | Ir para Início |
| `G` depois `A` | Ir para Assistente IA |
| `G` depois `O` | Ir para Documentações |
| `G` depois `Z` | Ir para Zendesk |
| `G` depois `P` | Ir para Projetos, quando o perfil possuir acesso |
| `Esc` | Fechar diálogo, menu ou pesquisa |

## Regras de uso

- Os atalhos globais não são executados enquanto a pessoa digita em `input`, `textarea`, `select` ou conteúdo editável.
- A navegação principal pode ser feita usando `Tab`, `Shift + Tab`, `Enter` e `Espaço`.
- O primeiro foco da página oferece o link “Pular para o conteúdo principal”.
- Diálogos mantêm o foco dentro da janela até o fechamento e devolvem o foco ao controle anterior.
- Mudanças de rota são anunciadas por uma região `aria-live`.
- A interface respeita `prefers-reduced-motion` e reduz animações quando essa preferência está ativa.
- O tema pode ser alternado sem depender de cor para comunicar estados importantes.

## Perfis

- **Administrador:** gestão de usuários, documentos, projetos, Zendesk, consultas, IA, ML, indicadores e configurações.
- **Moderador:** upload, documentos, curadoria Zendesk, consultas, IA e indicadores limitados.
- **Usuário:** IA, busca, documentações geradas, chamados Zendesk indexados e perfil/conquistas.

## Contexto por projeto

O seletor **Projeto ativo** define o contexto usado pelo Assistente IA. Ao trocar de projeto, novas perguntas passam a considerar apenas as fontes, documentações e conhecimento associados ao projeto selecionado. O atalho `Alt + P` leva o foco diretamente ao seletor.


## Onde encontrar os atalhos na interface

A interface não mantém mais um item permanente de atalhos no menu lateral. Para reduzir o ruído visual:

- pressione `?` para abrir a ajuda rápida;
- abra o menu da sua conta e escolha **Atalhos de teclado**;
- esta página continua sendo o manual completo.


## Acessibilidade

O botão de acessibilidade no cabeçalho reúne os controles de leitura e Libras.

- `Alt` + `-`: diminuir o tamanho do texto.
- `Alt` + `+`: aumentar o tamanho do texto.
- `Alt` + `0`: restaurar o tamanho padrão.
- O tamanho escolhido fica salvo neste navegador.
- Em **Libras**, é possível ativar o VLibras diretamente.
- Hand Talk aparece como alternativa quando o ambiente possui uma licença/token configurado.

Os dropdowns do sistema também aceitam teclado: `Enter` ou `Espaço` abre, setas navegam, `Home`/`End` pulam para o início/fim e `Esc` fecha.

## Acessibilidade — comportamento revisado

- `Alt` + `-`: diminui o texto.
- `Alt` + `+`: aumenta o texto.
- `Alt` + `0`: volta ao tamanho padrão.
- O botão de acessibilidade no cabeçalho abre as mesmas opções sem teclado.
- Ao escolher **VLibras**, o Panoptes carrega o widget e exibe o estado da integração. Use **Abrir tradutor** para abrir o avatar.
- Se o navegador, proxy ou extensão bloquear `vlibras.gov.br`, o menu apresenta a falha em vez de permanecer sem resposta.


## Ajustes de interface v12

- O controle de texto agora possui **7 níveis**: 88%, 94%, 100%, 106%, 113%, 125% e 138%.
- `Alt + -` e `Alt + +` percorrem esses níveis; `Alt + 0` retorna a 100%.
- Menus flutuantes, notificações, opções de acessibilidade e dropdowns fecham ao clicar fora.
- `Esc` fecha o menu ou dropdown ativo e, quando aplicável, devolve o foco ao botão que o abriu.
