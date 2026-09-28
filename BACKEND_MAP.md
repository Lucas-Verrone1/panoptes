# Panoptes - Mapa de integração com backend

Rotas previstas no fluxo funcional fornecido:

- `POST /auth/login`
- `POST /admin/users`
- `POST /moderator/documents/upload`
- `GET /moderator/queries/...`
- API de curadoria Zendesk
- `POST /ai/chat`
- `POST /ai/feedback`
- `GET /documents/{id}`
- `GET /zendesk/status` e `GET /zendesk/tickets`
- `POST /zendesk/tickets/{id}/approve`, `/reject` e `/index`

## Contratos implementados

- `POST /auth/login` e `GET /auth/me`: JWT, Argon2 e Turnstile opcional.
- `POST /sources`: registra URL e cria uma ingestao persistente em `ingestion_jobs`.
- `GET /sources/{id}`: acompanha validacao, scraping, embeddings e indexacao.
- `GET /documents` e `GET /documents/{id}`: biblioteca e detalhe indexados.
- `POST /ai/chat`: busca pgvector por projeto, gera resposta Gemini e grava conversa.
- `POST /ai/feedback`: grava avaliacao da resposta.
- `GET /users` e `POST /users`: administracao de usuarios.
- `GET /ml/gaps`: deteccao de gaps para administradores.

## Integração n8n

O FastAPI continua sendo a API pública e o dono do índice. Depois de uma fonte ser indexada, `services/n8n.py` envia `source.ingested` para o webhook configurado em `N8N_WEBHOOK_URL`, usando `X-Panoptes-Webhook-Secret`, retry e `eventId`. O workflow robusto está em `n8n/panoptes-source-ingested-v2.json`.

Consultas administrativas ainda usam dados locais no frontend e precisam de tabelas e endpoints próprios antes de serem consideradas persistentes. A curadoria Zendesk usa a migração `backend/sql/migrations/003_zendesk.sql`; a sincronização automática ainda depende da regra de associação entre tickets e projetos.
