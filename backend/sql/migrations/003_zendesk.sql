-- PANOPTES v12 — preparação da integração Zendesk e rastreabilidade de fontes.
-- Execute depois de 002_ingestion.sql.

alter table documents add column if not exists source_type text not null default 'document';
alter table documents add column if not exists external_ref text;
alter table documents add column if not exists source_metadata jsonb not null default '{}'::jsonb;

alter table document_chunks add column if not exists source_type text not null default 'document';
alter table document_chunks add column if not exists source_metadata jsonb not null default '{}'::jsonb;

update documents set source_type='document' where source_type is null or source_type='';
update document_chunks set source_type='document' where source_type is null or source_type='';

create unique index if not exists documents_external_source_idx
  on documents(project_id, source_type, external_ref)
  where external_ref is not null;

create table if not exists zendesk_tickets (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references projects(id) on delete cascade,
  external_id text not null,
  ticket_number text not null,
  subject text not null,
  description text not null default '',
  resolution text not null default '',
  ticket_status text not null default 'solved',
  knowledge_status text not null default 'new' check (knowledge_status in ('new','approved','indexed','rejected')),
  url text,
  created_at_zendesk timestamptz,
  solved_at timestamptz,
  synced_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references profiles(id) on delete set null,
  indexed_at timestamptz,
  document_id uuid references documents(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, external_id)
);

create index if not exists zendesk_tickets_project_idx on zendesk_tickets(project_id);
create index if not exists zendesk_tickets_knowledge_status_idx on zendesk_tickets(knowledge_status);

create table if not exists chat_message_sources (
  id uuid primary key default gen_random_uuid(),
  chat_message_id uuid not null references chat_messages(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  source_type text not null,
  document_id uuid references documents(id) on delete set null,
  zendesk_ticket_id uuid references zendesk_tickets(id) on delete set null,
  source_title text not null,
  source_url text,
  similarity float,
  created_at timestamptz not null default now()
);
create index if not exists chat_message_sources_message_idx on chat_message_sources(chat_message_id);
create index if not exists chat_message_sources_project_idx on chat_message_sources(project_id);
create index if not exists chat_message_sources_type_idx on chat_message_sources(source_type);

alter table zendesk_tickets enable row level security;
alter table chat_message_sources enable row level security;

-- A busca vetorial agora também devolve a origem real do conhecimento.
drop function if exists match_chunks(vector,text,int);
create function match_chunks(
  query_embedding vector(768),
  match_project_id text,
  match_count int default 6
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  source_url text,
  source_type text,
  source_metadata jsonb,
  document_title text,
  similarity float
)
language sql
stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.source_url,
    coalesce(dc.source_type, d.source_type, 'document') as source_type,
    case
      when dc.source_metadata <> '{}'::jsonb then dc.source_metadata
      else coalesce(d.source_metadata, '{}'::jsonb)
    end as source_metadata,
    d.title as document_title,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where dc.project_id = match_project_id
    and dc.embedding is not null
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
