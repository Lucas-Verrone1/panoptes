# Conexão Supabase, FastAPI e n8n

## 1. Supabase

1. Abra o projeto no Supabase e entre em `SQL Editor`.
2. Cole e execute todo o conteúdo de `backend/sql/schema.sql`.
3. Em `Project Settings > API`, copie a `Project URL` e a chave `service_role`.
4. Nunca coloque a `service_role` em `.env.local` ou em código do Next.

## 2. FastAPI local

Na raiz do projeto:

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Preencha `backend/.env`:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=uma-string-longa-e-aleatoria
GEMINI_API_KEY=...
```

Para desenvolvimento sem n8n, deixe `N8N_WEBHOOK_URL` vazio. Inicie com:

```bash
uvicorn app.main:app --reload --port 8000
```

Teste `http://localhost:8000/health`. O campo `supabase` deve aparecer como `true`.

## 3. n8n

Importe `n8n/panoptes-source-ingested-v2.json` em `Workflows > Import from File`.

No ambiente do processo n8n, defina o mesmo segredo usado pelo FastAPI:

```env
N8N_WEBHOOK_SECRET=troque-este-segredo
```

Em instalação Docker, recrie o container depois de alterar variáveis. Ative o workflow e copie a URL de produção exibida no node Webhook. Ela será parecida com:

```text
https://seu-n8n.example.com/webhook/panoptes/source-ingested-v2
```

No `backend/.env`, configure:

```env
N8N_WEBHOOK_URL=https://seu-n8n.example.com/webhook/panoptes/source-ingested-v2
N8N_WEBHOOK_SECRET=troque-este-segredo
```

O FastAPI envia o evento somente depois de salvar os chunks. O n8n responde `202`; ele não recebe texto bruto, não gera embeddings e não é a API pública do browser.

## 4. Teste ponta a ponta

1. Faça login pelo Next.
2. Cadastre uma URL em `/upload`.
3. Acompanhe o status até `indexed`.
4. Confirme a linha em `sources`, o job em `ingestion_jobs`, o documento em `documents` e os chunks em `document_chunks`.
5. Faça uma pergunta em `/ai` e confirme `chat_messages` e `ai_feedback` no Supabase.
6. No n8n, verifique uma execução do webhook `Source ingested webhook`.

Para usar um n8n local sem domínio público, o FastAPI precisa alcançar a URL dele. Se estiverem em máquinas ou redes diferentes, use um túnel HTTPS ou hospede o n8n; não exponha o webhook sem o segredo.

## Atualização da ingestão
Execute `backend/sql/migrations/002_ingestion.sql` no SQL Editor antes de iniciar esta versão.
A migração preserva documentos existentes. Reenvie a URL para preencher o texto integral.
Duplicatas históricas não são apagadas automaticamente. A mesma URL normalizada no mesmo projeto reutiliza a fonte.
Jobs interrompidos em scraping/embedding devem ser marcados como failed apenas depois de confirmar que o worker parou; reenvie a URL para tentar novamente.
O coletor GitHub suporta repositórios públicos e URLs tree/blob, com prioridade para README e docs.
Limites configuráveis: SCRAPE_MAX_PAGES=20, GITHUB_MAX_FILES=60, SCRAPE_MAX_CHARACTERS=500000.
SEED_DEMO_ACCOUNTS=false é o padrão. Não habilite contas demo em produção.
Eventos n8n são persistidos em ingestion_events, com eventId estável, tentativas e erro.
Eventos pendentes são reenviados na inicialização ou após nova ingestão. O consumidor precisa ser idempotente por eventId.
A entrega é pelo menos uma vez; o estado estático do n8n não garante exclusão concorrente.
Páginas que exigem JavaScript ainda precisam de um renderizador. O relatório extraction_report informa descartes e limites.
A validação dos redirecionamentos não substitui bloqueio de saída para redes privadas no ambiente de produção (DNS rebinding).
