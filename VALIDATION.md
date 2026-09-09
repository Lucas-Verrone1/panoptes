# Validação da entrega v8

- `package.json`: JSON válido.
- Estrutura do App Router preservada.
- CSS: chaves e parênteses balanceados.
- TS/TSX: 56 arquivos analisados com o parser do TypeScript 5.8.3, sem erros de sintaxe.
- Referências visuais de porcentagem de confiança removidas das documentações.
- Seletor global de projeto integrado ao Dashboard, menu lateral e Assistente IA.
- Contexto de projeto persistido em `localStorage` e transportado ao abrir uma conversa pelo parâmetro `project`.
- Logo compacta gerada a partir da marca oficial para evitar corte quando o menu lateral é recolhido.
- `prefers-reduced-motion` continua respeitado nas novas animações e na troca de tema.

## Limitação do ambiente de validação

A tentativa de `npm install` excedeu o tempo disponível deste ambiente e não gerou `node_modules`. Portanto, não foi possível executar `next build` aqui. Em um ambiente com acesso normal ao registry do npm, execute:

```bash
npm install
npm run build
npm run dev
```


## Validação v9

- Componentes alterados verificados com o parser do TypeScript (`tsc`).
- Nenhum diagnóstico de sintaxe TS/TSX foi encontrado.
- Estrutura conferida para garantir:
  - seletor de projeto junto ao usuário;
  - remoção do seletor e manual do menu lateral;
  - agrupamento de funções secundárias em Ferramentas;
  - regras responsivas para desktop, tablet e mobile.
- O `next build` completo ainda depende da instalação das dependências do projeto.


## Validação v10

- Parser TypeScript executado sobre arquivos TS/TSX: nenhum erro de sintaxe encontrado.
- Verificado que não restaram elementos `<select>` nativos nas telas do protótipo.
- Seletor de projeto removido da tela inicial e mantido no contexto global/cabeçalho e no chat.
- Shell de scroll revisado com `100dvh`, `min-height: 0` e regiões de overflow explícitas.
- Dropdowns customizados possuem `role=combobox`, `role=listbox`, navegação por setas, Home/End, Enter/Espaço e Escape.
- VLibras segue o snippet oficial do Widget e é carregado apenas quando ativado.
- Hand Talk é opcional e só é inicializado quando existe `NEXT_PUBLIC_HANDTALK_TOKEN`.

O `next build` completo continua dependendo da instalação das dependências npm do projeto.

## Revisão v11

Foram revisados especificamente:

- estado e persistência de tamanho de fonte;
- CSS dos seletores `data-font-size`;
- abertura/fechamento do menu de acessibilidade;
- carregamento do script oficial do VLibras;
- inicialização do `window.VLibras.Widget`;
- feedback de erro ao usuário;
- rolagem da área principal e regiões internas;
- z-index do VLibras, popovers e dropdowns.


### Checagens executadas na v11

- `tinycss2`: CSS parseado sem erros.
- `tsc --noResolve`: nenhum diagnóstico de sintaxe TS/TSX; apenas dependências externas não instaladas neste ambiente.
- Verificação de regressão: nenhum seletor CSS com `\\"` permaneceu no arquivo.
- Verificação estrutural: o DOM oficial do VLibras (`vw`, `vw-access-button`, `vw-plugin-wrapper`) permanece presente.
- A Home não possui seletor de projeto duplicado; o contexto continua vindo do projeto ativo do cabeçalho.


## Validação v12

- Componentes alterados verificados pelo parser TypeScript, sem erro de sintaxe TS/TSX.
- CSS processado com `tinycss2`, sem erros de parse.
- Conferido fechamento por clique externo e `Esc` em conta, notificações, acessibilidade e selects.
- Conferida a variante branca da logo no painel escuro do login e o asset isolado no menu recolhido.
- Conferidos os sete níveis de escala tipográfica e a leitura da preferência antes da hidratação.
