# PANOPTES — Mapa de integração do backend

## Rotas principais implementadas

### Autenticação e usuários
- `POST /auth/login`
- `GET /auth/me`
- `GET /users`
- `POST /users`

### Projetos, fontes e documentos
- `GET /projects`
- `POST /projects`
- `GET /projects/{project_id}`
- `POST /sources`
- `POST /sources/upload`
- `GET /sources/{source_id}`
- `GET /documents`
- `GET /documents/{document_id}`

### Assistente IA
- `POST /ai/chat`
- `GET /ai/conversations?project_id=...`
- `GET /ai/conversations/{session_id}?project_id=...`
- `DELETE /ai/conversations/{session_id}?project_id=...`
- `POST /ai/feedback`

O histórico é persistido em `chat_messages`, separado por `project_id`, `user_id` e `session_id`.

### Zendesk
- `GET /zendesk/status`
- `GET /zendesk/tickets?project_id=...`
- `POST /zendesk/demo-ticket`
- `POST /zendesk/tickets/{ticket_id}/approve`
- `POST /zendesk/tickets/{ticket_id}/reject`
- `POST /zendesk/tickets/{ticket_id}/index`

Chamados indexados viram `documents`/`document_chunks` com `source_type='zendesk'` e metadados do ticket.

### Análises e aprendizado de máquina
- `GET /analytics`
- `GET /ml/gaps`

Análises inclui contagem de chamados Zendesk indexados e de citações Zendesk nas respostas.

## RAG e rastreabilidade

`match_chunks()` devolve conteúdo, documento, URL, tipo de fonte, metadados e similaridade. O endpoint `/ai/chat` transforma os resultados em referências estruturadas e grava a relação em `chat_message_sources`.

Tipos atuais de fonte:

- `document`
- `zendesk`

## Integração n8n

Após uma ingestão concluída, `services/n8n.py` envia `source.ingested` para `N8N_WEBHOOK_URL` com `X-Panoptes-Webhook-Secret`. A entrega usa retry e registra o evento em `ingestion_events`.

Workflow recomendado:

`n8n/panoptes-source-ingested-v2.json`

## Integração Zendesk real

A UI, banco e pipeline RAG já estão preparados. A sincronização automática externa não é habilitada ainda porque é necessário definir a regra de associação Zendesk → projeto PANOPTES (por tag, campo customizado, organização ou outra regra de negócio). Quando essa regra for definida, o sincronizador deverá apenas fazer upsert em `zendesk_tickets`; aprovação, indexação e rastreabilidade já estão implementadas.
