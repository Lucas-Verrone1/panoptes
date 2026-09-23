-- Run before starting the updated backend. Existing documents are preserved.
alter table documents add column if not exists full_text text;
alter table documents add column if not exists content_hash text;
alter table sources add column if not exists extraction_report jsonb;
create table if not exists ingestion_events (
 id uuid primary key default gen_random_uuid(),
 document_id uuid not null references documents(id),
 payload jsonb not null,
 delivered_at timestamptz,
 last_error text,
 attempts int not null default 0
);
alter table ingestion_events enable row level security;

create or replace function register_source(p_project text, p_url text, p_user uuid)
returns jsonb language plpgsql security invoker as $$
declare s sources; j ingestion_jobs;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_project || ':' || p_url, 0));
 select * into s from sources where project_id=p_project and url=p_url order by created_at limit 1;
 if not found then
  insert into sources(project_id,url,created_by) values(p_project,p_url,p_user) returning * into s;
 end if;
 select * into j from ingestion_jobs where source_id=s.id for update;
 if found and j.status not in ('indexed','failed') then
  return jsonb_build_object('source',to_jsonb(s),'job_id',j.id,'start',false);
 end if;
 insert into ingestion_jobs(source_id,project_id) values(s.id,p_project)
 on conflict(source_id) do update set status='pending',stage=0,error=null,updated_at=now() returning * into j;
 update sources set status='pending',stage=0,error=null where id=s.id returning * into s;
 return jsonb_build_object('source',to_jsonb(s),'job_id',j.id,'start',true);
end $$;

create or replace function publish_source(p_source uuid,p_job uuid,p_title text,p_url text,p_summary text,p_text text,p_hash text,p_report jsonb,p_chunks jsonb)
returns uuid language plpgsql security invoker as $$
declare d uuid; proj text;
begin
 select project_id into strict proj from sources where id=p_source for update;
 select id into d from documents where source_id=p_source order by created_at limit 1;
 if d is null then
  insert into documents(project_id,source_id,title) values(proj,p_source,p_title) returning id into d;
 end if;
 update documents set title=p_title,summary=p_summary,source_url=p_url,full_text=p_text,
 content_hash=p_hash,updated_at=now(),generated_by_ai=false where id=d;
 delete from document_chunks where document_id=d;
 insert into document_chunks(document_id,project_id,chunk_index,content,source_url,embedding)
 select d,proj,(x->>'chunk_index')::int,x->>'content',x->>'source_url',(x->>'embedding')::vector(768)
 from jsonb_array_elements(p_chunks) x;
 update sources set status='indexed',stage=6,error=null,extraction_report=p_report,updated_at=now() where id=p_source;
 update ingestion_jobs set status='indexed',stage=6,error=null,updated_at=now() where id=p_job;
 update projects set status='Indexado',updated_at=now() where id=proj;
 insert into ingestion_events(document_id,payload) values(d,jsonb_build_object('event','source.ingested','sourceId',p_source,'projectId',proj,'documentId',d,'title',p_title,'url',p_url,'chunkCount',jsonb_array_length(p_chunks)));
 return d;
end $$;
revoke all on function register_source(text,text,uuid) from public,anon,authenticated;
revoke all on function publish_source(uuid,uuid,text,text,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function register_source(text,text,uuid) to service_role;
grant execute on function publish_source(uuid,uuid,text,text,text,text,text,jsonb,jsonb) to service_role;
