# PANOPTES V12 — Next.js + FastAPI + Supabase + Gemini + n8n

PANOPTES é uma aplicação de conhecimento por projeto com frontend Next.js, backend FastAPI, RAG com Gemini/pgvector, persistência no Supabase e eventos de ingestão entregues ao n8n.

## O que esta versão inclui

- Login e perfis `admin`, `moderator` e `user`.
- Projetos e documentações indexadas por projeto.
- Upload/ingestão e embeddings de 768 dimensões.
- Assistente IA em formato de chat, com histórico persistente **separado por projeto e usuário**.
- Tela **Configurar IA** com estilo de resposta, modelo Gemini, prompt adicional e hand-off.
- Respostas naturais: perguntas simples recebem respostas diretas; procedimentos e perguntas complexas são estruturados quando necessário.
- Área **Zendesk** no lugar do antigo Fórum.
- Curadoria de chamados: `Novo → Aprovado → Indexado` ou `Rejeitado`.
- Chamados indexados entram no mesmo RAG das documentações.
- Rastreabilidade das respostas: abaixo de cada resposta são exibidas as fontes realmente entregues ao modelo.
- Quando a fonte é Zendesk, são exibidos número do chamado, data e assunto.
- Relação mensagem → fonte persistida em `chat_message_sources` para auditoria e Análises.
- Análises com quantidade de chamados Zendesk indexados e citações Zendesk em respostas.
- Evento `source.ingested` enviado ao workflow n8n também quando um chamado Zendesk é indexado.

## Requisitos

- Node.js 20.9+ (Node 24 também é compatível com o projeto atual)
- Python 3.12+
- Docker Desktop para o n8n local
- Projeto Supabase
- Chave Gemini

## Banco de dados

Para um Supabase novo, execute no SQL Editor nesta ordem:

1. `backend/sql/schema.sql`
2. `backend/sql/migrations/002_ingestion.sql`

O `schema.sql` desta entrega já contém a estrutura Zendesk. Em um banco criado com uma versão anterior do PANOPTES, execute também:

3. `backend/sql/migrations/003_zendesk.sql`

A migração `003_zendesk.sql` é idempotente e adiciona a rastreabilidade de origem sem apagar documentos existentes.

## Preparação automática no Windows

Na raiz do projeto, `setup-local.ps1` cria o `.venv`, instala o backend, instala o Chromium do Playwright e instala as dependências npm. Ele não sobrescreve um `.env` existente.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup-local.ps1
```

Depois, use `start-backend.ps1` e `start-frontend.ps1` em dois terminais separados.

## Backend

Crie `backend/.env` a partir de `backend/.env.example` e preencha suas chaves. Não versione o `.env`.

No PowerShell:

```powershell
cd backend
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m playwright install chromium
uvicorn app.main:app --reload --port 8000
```

Swagger: `http://localhost:8000/docs`

Health: `http://localhost:8000/health`

## Frontend

Na raiz do projeto:

```powershell
npm install
npm run dev
```

Abra `http://localhost:3000`.

## n8n

O workflow atual está em:

`n8n/panoptes-source-ingested-v2.json`

O backend envia eventos para `N8N_WEBHOOK_URL` usando o header `X-Panoptes-Webhook-Secret`.

## Zendesk

A área `/zendesk` já funciona em modo de preparação sem a API externa. Admin/moderador pode criar um chamado de teste, aprovar e indexar para validar o fluxo completo RAG → resposta → fonte.

As variáveis abaixo já estão reservadas para a integração real:

```env
ZENDESK_SUBDOMAIN=
ZENDESK_EMAIL=
ZENDESK_API_TOKEN=
```

A sincronização automática com a API do Zendesk ainda não é executada nesta entrega porque o mapeamento entre chamados e projetos PANOPTES precisa ser definido antes de importar tickets reais. O restante do pipeline (curadoria, indexação, rastreabilidade e Análises) já está pronto.

Consulte `ZENDESK_INTEGRACAO.md` para o fluxo de teste.

## Contas de demonstração

Quando `SEED_DEMO_ACCOUNTS=true` no `backend/.env` e a tabela `profiles` estiver vazia:

- Administrador: `admin@panoptes.local` / `admin123`
- Moderador: `moderador@panoptes.local` / `mod123`
- Usuário: `usuario@panoptes.local` / `user123`

Para uso fora do ambiente local, mantenha `SEED_DEMO_ACCOUNTS=false` e troque `JWT_SECRET` por um segredo forte.

## Segurança

- `.env`, `.env.local`, `.venv`, `node_modules`, caches e backups estão ignorados pelo Git.
- O backend usa a `SUPABASE_SERVICE_ROLE_KEY`; ela deve permanecer somente no servidor/backend.
- O frontend nunca deve receber a service-role key.
- A aprovação humana é obrigatória antes de um chamado Zendesk entrar no RAG.

## Acessibilidade e interface

O projeto mantém navegação por teclado, foco visível, suporte a `prefers-reduced-motion`, escala tipográfica, tema claro/escuro, VLibras e integração opcional com Hand Talk.
