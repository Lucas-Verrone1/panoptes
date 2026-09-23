# PANOPTES + Zendesk — integração preparada

Esta versão substitui a experiência de Fórum pela área **Zendesk** e permite transformar chamados resolvidos em conhecimento rastreável do RAG.

## O que já funciona

- Área `/zendesk` separada por projeto.
- Estados de curadoria: **Novo**, **Aprovado**, **Indexado** e **Rejeitado**.
- Admin e moderador podem criar um chamado de teste, aprovar e indexar.
- Usuário comum visualiza apenas chamados já indexados.
- Um chamado indexado vira um documento/chunks do RAG com embeddings Gemini.
- Abaixo da resposta do Assistente IA aparece **Fontes utilizadas**.
- Para Zendesk, a fonte mostra **Respondida no Zendesk**, número do chamado, data e assunto.
- A relação entre a mensagem e suas fontes é salva em `chat_message_sources`.
- Análises contam chamados Zendesk e quantas vezes fontes Zendesk foram citadas nas respostas.
- A indexação de chamado dispara o mesmo evento `source.ingested` utilizado pelas documentações no n8n.

## Banco existente

Se seu banco já foi criado com `schema.sql` + `002_ingestion.sql` de uma versão anterior, execute:

`backend/sql/migrations/003_zendesk.sql`

Não execute novamente o schema inteiro em um banco já em uso.

## Teste completo sem API externa

1. Abra **Zendesk**.
2. Selecione o projeto desejado.
3. Como admin/moderador, clique em **Criar chamado de teste**.
4. Abra o chamado e clique em **Aprovar conhecimento**.
5. Clique em **Indexar na IA**.
6. Confira uma execução verde do workflow `source.ingested` no n8n.
7. Abra **Assistente IA** no mesmo projeto.
8. Pergunte sobre a solução registrada no chamado.
9. A resposta deve mostrar a referência Zendesk logo abaixo.
10. Atualize a página e abra a conversa pelo histórico para confirmar que a referência foi persistida.

## Preparação para a API real

O backend reconhece:

```env
ZENDESK_SUBDOMAIN=
ZENDESK_EMAIL=
ZENDESK_API_TOKEN=
```

A sincronização automática ainda permanece desativada até existir uma regra explícita para mapear cada ticket ao projeto correto do PANOPTES. Isso evita importar chamados de clientes/módulos diferentes para a base errada.

Quando a regra for definida, o conector externo só precisa criar/atualizar registros em `zendesk_tickets`. O fluxo de aprovação, indexação, RAG, n8n e rastreabilidade já está pronto.
