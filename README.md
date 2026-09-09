# Panoptes — Next.js

Protótipo responsivo do Panoptes migrado para Next.js com App Router e TypeScript.

## Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Contas de demonstração

- Administrador: `admin@panoptes.local` / `admin123`
- Moderador: `moderador@panoptes.local` / `mod123`
- Usuário: `usuario@panoptes.local` / `user123`

Também é possível alternar o perfil no menu da conta para revisar as permissões do layout.

## Perfis e fluxo

### Administrador
- Início
- Assistente IA
- Busca
- Documentações
- Fórum
- Projetos e interna de projeto
- Upload
- Consultas
- Usuários
- Machine Learning
- Analytics
- Configurações

### Moderador
- Início
- Assistente IA
- Busca
- Documentações
- Fórum / moderação
- Projetos em modo de acompanhamento
- Upload
- Consultas somente leitura
- Analytics

### Usuário
- Início minimalista com chat
- Assistente IA
- Busca
- **Visualização das documentações geradas pela IA**
- Fórum
- Perfil, títulos e emblemas

## Acessibilidade

- Link para pular diretamente ao conteúdo principal.
- Navegação completa por teclado.
- Foco visível em controles interativos.
- Diálogos com retenção e restauração de foco.
- Região `aria-live` para mudanças de rota e respostas dinâmicas.
- Labels e nomes acessíveis em formulários e botões de ícone.
- Layout sem depender exclusivamente de cor para estados importantes.
- Suporte a `prefers-reduced-motion`.
- Suporte adicional a `prefers-contrast: more`.
- Atalhos globais desativados enquanto a pessoa digita em campos editáveis.

Consulte `MANUAL_ATALHOS.md` ou a rota `/manual`.

## Tema e responsividade

O projeto possui tema claro/escuro persistido no navegador, menu lateral retrátil no desktop e drawer no mobile. O conteúdo usa grids fluidos e breakpoints para desktop, notebook, tablet e celular.

## Observação sobre backend

Este pacote é um protótipo frontend funcional. Login, upload, consulta, fórum, feedback e alterações administrativas usam estado local para demonstrar comportamento e permissões. A integração com os endpoints reais pode ser conectada depois nos mesmos componentes sem alterar a arquitetura visual.


## Ajustes de contexto e interface

- Seletor global de projeto disponível para todos os perfis.
- O Assistente IA usa o projeto ativo como contexto e leva essa informação pela URL ao abrir uma conversa.
- Documentações geradas pela IA continuam disponíveis para o perfil Usuário.
- Indicador percentual de confiança removido das documentações.
- Transições de rota, menu e tema refinadas, respeitando `prefers-reduced-motion`.
- Ao recolher o menu, é exibido apenas o símbolo oficial do Panoptes.


## Ajustes v9 — hierarquia e navegação

- Menu lateral simplificado para os fluxos principais.
- Funções administrativas e menos frequentes agrupadas em **Ferramentas**.
- A busca global deixou de ocupar espaço no menu porque já possui campo persistente no topo.
- Seletor de projeto movido para junto do contexto do usuário no cabeçalho.
- Em telas muito pequenas, o seletor passa para o menu da conta.
- Atalhos removidos do menu lateral; `?` continua abrindo a ajuda rápida e o manual completo permanece disponível.
- Tipografia alterada para **Manrope**, com fallback para fontes do sistema.
- Larguras, espaçamentos, cabeçalhos, cards e navegação foram recalibrados para reduzir ruído visual.


## Ajustes v10 — acessibilidade e componentes

- Correção da estrutura de scroll do shell, menus, tabelas, fórum, modais e painéis laterais.
- Dropdowns nativos substituídos por selects customizados com navegação por teclado e ARIA.
- O seletor de projeto foi removido da tela inicial; o projeto ativo continua no cabeçalho e contextualiza o chat.
- Controle global de tamanho de texto em quatro níveis, persistido no navegador.
- Integração oficial do **VLibras Widget** disponível pelo menu de acessibilidade.
- Integração opcional do **Hand Talk Plugin** pronta para uso quando `NEXT_PUBLIC_HANDTALK_TOKEN` estiver configurado.
- O Hand Talk é inicializado com `doNotTrack: true` nesta implementação.

### Hand Talk

Copie `.env.example` para `.env.local` e informe o token fornecido para o domínio:

```env
NEXT_PUBLIC_HANDTALK_TOKEN=seu_token
```

Sem token, a opção Hand Talk permanece desabilitada e o VLibras continua disponível normalmente.

## Correções v11 — acessibilidade funcional

- Corrigidos seletores CSS inválidos que impediam a escala de fonte de ser aplicada.
- Tamanho de texto agora usa 15px / 16px / 18px / 20px na raiz, refletindo em toda a interface baseada em `rem`.
- Preferência de fonte é aplicada antes da hidratação para evitar piscar no tamanho padrão.
- Menu de acessibilidade ganhou estado de carregamento, sucesso e erro para tradutores de Libras.
- VLibras usa a estrutura oficial do widget, fica inicializado no DOM e pode ser aberto pelo próprio menu do Panoptes.
- A integração não engole mais erros silenciosamente: falhas de rede/bloqueador são apresentadas no menu.
- Hand Talk continua opcional e só é habilitada quando `NEXT_PUBLIC_HANDTALK_TOKEN` está configurado.
- Rolagem principal foi corrigida removendo `height:100%` conflitante dentro do grid da aplicação.


## Ajustes v12 — simetria e interação

- Logo do menu recolhido renderizada como asset independente, centralizada e sem recorte.
- Cabeçalho recolhido reorganizado em um único eixo para manter simetria entre marca e controle de expansão.
- Login força a variante branca da marca sobre o painel visual escuro, inclusive quando o tema geral está claro.
- Conta, notificações, acessibilidade e selects fecham ao clicar fora; `Esc` também fecha os elementos flutuantes.
- Escala de texto ampliada de quatro para sete níveis, entre 88% e 138%.
# panoptes
