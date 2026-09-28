# Integração Zendesk

A área Zendesk permite consultar chamados associados a um projeto, aprovar ou rejeitar soluções e indexar chamados aprovados na base vetorial usada pelo Assistente IA. A sincronização automática com a API Zendesk permanece desabilitada até que exista uma regra de associação entre tickets e projetos.

## Preparar o banco

No SQL Editor do Supabase, execute as migrações em ordem, caso ainda não tenham sido aplicadas:

1. `backend/sql/migrations/002_ingestion.sql`
2. `backend/sql/migrations/003_zendesk.sql`

A migração 003 adiciona metadados de origem, a tabela de tickets Zendesk e atualiza `match_chunks` para devolver informações da fonte. Ela deve ser executada depois da 002.

## Configuração

Copie `backend/.env.example` para `backend/.env` e preencha as configurações Supabase e Gemini necessárias. As variáveis `ZENDESK_SUBDOMAIN`, `ZENDESK_EMAIL` e `ZENDESK_API_TOKEN` informam a presença das credenciais, mas ainda não habilitam sincronização automática.

## Fluxo de curadoria

Administradores e moderadores podem criar um chamado de exemplo, aprovar/rejeitar tickets e indexar chamados aprovados que tenham uma solução registrada. Usuários podem consultar apenas tickets indexados. A indexação também registra um evento de ingestão para o webhook n8n configurado.