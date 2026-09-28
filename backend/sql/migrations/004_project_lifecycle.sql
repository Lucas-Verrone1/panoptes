alter table projects add column if not exists is_active boolean not null default true;
alter table ingestion_events drop constraint if exists ingestion_events_document_id_fkey;
alter table ingestion_events add constraint ingestion_events_document_id_fkey
  foreign key(document_id) references documents(id) on delete cascade;

create table if not exists project_events (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  actor_id uuid references profiles(id) on delete set null,
  action text not null check (action in ('created', 'updated', 'deactivated', 'activated', 'deleted')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists project_events_project_idx on project_events(project_id, created_at desc);
create index if not exists project_events_actor_idx on project_events(actor_id, created_at desc);
alter table project_events enable row level security;

create or replace function create_project_audited(
  p_id text,
  p_name text,
  p_description text,
  p_source text,
  p_branch text,
  p_actor uuid
) returns jsonb
language plpgsql
security invoker
as $$
declare created projects;
begin
  insert into projects(id, name, description, source, branch, status, is_active)
  values (p_id, p_name, p_description, p_source, p_branch, 'Indexado', true)
  returning * into created;

  insert into project_events(project_id, actor_id, action, new_data)
  values (created.id, p_actor, 'created', to_jsonb(created));

  return to_jsonb(created);
end;
$$;

create or replace function update_project_audited(
  p_id text,
  p_name text,
  p_description text,
  p_source text,
  p_branch text,
  p_is_active boolean,
  p_actor uuid
) returns jsonb
language plpgsql
security invoker
as $$
declare
  previous projects;
  updated projects;
  change_action text;
begin
  select * into previous from projects where id = p_id for update;
  if not found then
    return null;
  end if;

  update projects
  set name = p_name,
      description = p_description,
      source = p_source,
      branch = p_branch,
      is_active = p_is_active,
      updated_at = now()
  where id = p_id
  returning * into updated;

  change_action := case
    when previous.is_active is distinct from updated.is_active and updated.is_active then 'activated'
    when previous.is_active is distinct from updated.is_active then 'deactivated'
    else 'updated'
  end;

  insert into project_events(project_id, actor_id, action, old_data, new_data)
  values (p_id, p_actor, change_action, to_jsonb(previous), to_jsonb(updated));

  return to_jsonb(updated);
end;
$$;

create or replace function delete_project_audited(p_id text, p_actor uuid)
returns boolean
language plpgsql
security invoker
as $$
declare previous projects;
begin
  select * into previous from projects where id = p_id for update;
  if not found then
    return false;
  end if;

  insert into project_events(project_id, actor_id, action, old_data)
  values (p_id, p_actor, 'deleted', to_jsonb(previous));
  delete from projects where id = p_id;
  return true;
end;
$$;

revoke all on function create_project_audited(text, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function update_project_audited(text, text, text, text, text, boolean, uuid) from public, anon, authenticated;
revoke all on function delete_project_audited(text, uuid) from public, anon, authenticated;
grant execute on function create_project_audited(text, text, text, text, text, uuid) to service_role;
grant execute on function update_project_audited(text, text, text, text, text, boolean, uuid) to service_role;
grant execute on function delete_project_audited(text, uuid) to service_role;