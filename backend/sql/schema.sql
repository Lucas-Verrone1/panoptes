-- Cole este script no SQL Editor do Supabase (uma vez).
create extension if not exists vector;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'moderator', 'user')),
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id text primary key,
  name text not null,
  description text not null default '',
  source text not null default 'URL',
  branch text not null default 'main',
  status text not null default 'Indexado',
  updated_at timestamptz not null default now()
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references projects(id) on delete cascade,
  url text not null,
  title text,
  status text not null default 'pending',
  stage int not null default 0,
  error text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references projects(id) on delete cascade,
  source_id uuid references sources(id) on delete set null,
  title text not null,
  summary text not null default '',
  source_url text,
  generated_by_ai boolean not null default true,
  version text not null default '1.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  source_url text,
  embedding vector(768)
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  project_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb not null default '[]'::jsonb,
  session_id text,
  created_at timestamptz not null default now()
);

create table if not exists ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null unique references sources(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  status text not null default 'pending',
  stage int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table chat_messages add column if not exists session_id text;

create table if not exists ai_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  project_id text,
  message_excerpt text,
  rating text not null check (rating in ('positive', 'negative')),
  created_at timestamptz not null default now()
);

create index if not exists document_chunks_project_idx on document_chunks (project_id);
create index if not exists sources_project_idx on sources (project_id);

create or replace function match_chunks(
  query_embedding vector(768),
  match_project_id text,
  match_count int default 6
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  source_url text,
  similarity float
)
language sql
stable
as $$
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    document_chunks.source_url,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where document_chunks.project_id = match_project_id
    and document_chunks.embedding is not null
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;

alter table profiles enable row level security;
alter table projects enable row level security;
alter table sources enable row level security;
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table chat_messages enable row level security;
alter table ai_feedback enable row level security;
alter table ingestion_jobs enable row level security;

insert into projects (id, name, description, source, branch, status)
values
  ('protheus', 'Protheus TCC', 'Base principal do projeto, rotinas, documentação e integrações.', 'URL', 'main', 'Indexado'),
  ('api', 'Integração API', 'Contratos OpenAPI, rotinas de integração e documentação técnica.', 'URL', 'v1', 'Indexado'),
  ('financeiro', 'Módulo Financeiro', 'Regras, código e documentação das rotinas financeiras.', 'URL', 'develop', 'Processando'),
  ('relatorios', 'Relatórios Gerenciais', 'Snapshot importado para análise documental.', 'URL', 'snapshot', 'Falha')
on conflict (id) do nothing;
