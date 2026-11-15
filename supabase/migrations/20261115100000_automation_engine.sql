-- RJA Automation Engine: automations, their versions, the job queue, run history, the duplicate guard, and the
-- emergency stops.
--
-- Who can do what:
-- - Customers read their own automations and runs, save settings (a new version, which must be tested again),
--   switch on a version that passed its test, pause, resume and stop everything.
-- - Only RJA's servers (service role) record test runs, queue and run jobs, and write run history. A customer
--   therefore cannot fake a passed test, and nothing runs without the worker.
-- - Admins read everything and can pause the whole engine.
--
-- Rollback: drop the functions below, then tables engine_dedupe, executions, jobs, automation_versions,
--   automations, engine_controls; types automation_status, job_status, execution_status; and
--   alter table tenants drop column automations_paused.

create type automation_status as enum ('draft', 'tested', 'active', 'paused', 'error');
create type job_status as enum ('queued', 'running', 'done', 'dead');
create type execution_status as enum ('running', 'completed', 'stopped', 'waiting', 'awaiting_approval', 'failed');

alter table tenants add column automations_paused boolean not null default false;

create table engine_controls (
  id boolean primary key default true check (id),
  paused boolean not null default false,
  paused_at timestamptz,
  paused_by uuid references profiles (id) on delete set null
);
insert into engine_controls default values;

create table automations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  solution_id text not null references solutions (id),
  status automation_status not null default 'draft',
  current_version integer not null default 1,
  active_version integer,
  activated_at timestamptz,
  activated_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, solution_id)
);

create table automation_versions (
  automation_id uuid not null references automations (id) on delete cascade,
  version integer not null,
  settings jsonb not null check (jsonb_typeof(settings) = 'object' and length(settings::text) <= 8000),
  spec jsonb not null check (jsonb_typeof(spec) = 'object' and length(spec::text) <= 20000),
  test_passed boolean,
  test_report jsonb,
  tested_at timestamptz,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (automation_id, version)
);

create table jobs (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references tenants (id) on delete cascade,
  automation_id uuid references automations (id) on delete cascade,
  kind text not null check (kind ~ '^[a-z_.]{3,40}$'),
  payload jsonb not null default '{}' check (length(payload::text) <= 50000),
  idempotency_key text not null check (length(idempotency_key) <= 200),
  status job_status not null default 'queued',
  run_at timestamptz not null default now(),
  attempts smallint not null default 0,
  max_attempts smallint not null default 5 check (max_attempts between 1 and 10),
  locked_by text,
  locked_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);
create index jobs_ready on jobs (run_at) where status = 'queued';

create table executions (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references tenants (id) on delete cascade,
  automation_id uuid not null references automations (id) on delete cascade,
  version integer not null,
  mode text not null check (mode in ('live', 'test')),
  status execution_status not null,
  trigger_ref text check (length(trigger_ref) <= 200),
  log jsonb not null default '[]' check (length(log::text) <= 50000),
  error text check (length(error) <= 2000),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index on executions (tenant_id, started_at desc);
create index on executions (automation_id, started_at desc);

create table engine_dedupe (
  tenant_id uuid not null references tenants (id) on delete cascade,
  key text not null check (length(key) <= 300),
  expires_at timestamptz not null,
  primary key (tenant_id, key)
);

-- ---------------------------------------------------------------- access
alter table engine_controls enable row level security;
alter table automations enable row level security;
alter table automation_versions enable row level security;
alter table jobs enable row level security;
alter table executions enable row level security;
alter table engine_dedupe enable row level security;
create policy "admins read the engine switch" on engine_controls for select using (is_admin());
create policy "members and admins read automations" on automations for select using (is_tenant_member(tenant_id) or is_admin());
create policy "members and admins read versions" on automation_versions for select
  using (exists (select 1 from automations a where a.id = automation_id and (is_tenant_member(a.tenant_id) or is_admin())));
create policy "members and admins read runs" on executions for select using (is_tenant_member(tenant_id) or is_admin());
create policy "admins read jobs" on jobs for select using (is_admin());
revoke insert, update, delete on engine_controls, automations, automation_versions, jobs, executions, engine_dedupe from anon, authenticated;

-- ---------------------------------------------------------------- customer functions
/** Saves new settings for an accepted solution as a new version. The app validates the spec first. */
create function save_automation(p_solution_id text, p_settings jsonb, p_spec jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  tid uuid := my_tenant_id();
  aid uuid;
  v integer;
begin
  if auth.uid() is null or tid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if not exists (select 1 from solution_recommendations r where r.tenant_id = tid and r.solution_id = p_solution_id and r.status = 'accepted') then
    raise exception 'accept this solution first';
  end if;
  insert into automations (tenant_id, solution_id) values (tid, p_solution_id)
  on conflict (tenant_id, solution_id) do update set updated_at = now() returning id, current_version into aid, v;
  if exists (select 1 from automation_versions where automation_id = aid) then
    v := (select max(version) + 1 from automation_versions where automation_id = aid);
  end if;
  insert into automation_versions (automation_id, version, settings, spec, created_by) values (aid, v, p_settings, p_spec, auth.uid());
  -- A new version must be tested before it can run; the active version keeps running meanwhile.
  update automations set current_version = v, status = case when status = 'active' then 'active'::automation_status else 'draft' end,
    updated_at = now() where id = aid;
  return aid;
end $$;

/** Switches on the current version, only if it passed its test. */
create function activate_automation(p_automation_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a automations;
begin
  select * into a from automations where id = p_automation_id and is_tenant_member(tenant_id);
  if a.id is null then raise exception 'automation not found'; end if;
  if not coalesce((select test_passed from automation_versions where automation_id = a.id and version = a.current_version), false) then
    raise exception 'test this version first';
  end if;
  update automations set status = 'active', active_version = current_version, activated_at = now(), activated_by = auth.uid(), updated_at = now()
  where id = a.id;
end $$;

/** Pauses or resumes one automation. Resuming needs a version that was switched on before. */
create function set_automation_paused(p_automation_id uuid, p_paused boolean) returns automation_status
language plpgsql security definer set search_path = public as $$
declare a automations; result automation_status;
begin
  select * into a from automations where id = p_automation_id and is_tenant_member(tenant_id);
  if a.id is null then raise exception 'automation not found'; end if;
  if not p_paused and a.active_version is null then raise exception 'switch it on first'; end if;
  update automations set status = case when p_paused then 'paused'::automation_status else 'active' end, updated_at = now()
  where id = a.id returning status into result;
  return result;
end $$;

/** Emergency stop (or restart) of every automation of the caller's business. */
create function set_business_automations_paused(p_paused boolean) returns void
language plpgsql security definer set search_path = public as $$
declare tid uuid := my_tenant_id();
begin
  if auth.uid() is null or tid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  update tenants set automations_paused = p_paused, updated_at = now() where id = tid;
end $$;

/** Admin: stop (or restart) the whole engine for every business. */
create function set_engine_paused(p_paused boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  update engine_controls set paused = p_paused, paused_at = case when p_paused then now() end, paused_by = auth.uid();
end $$;

-- ---------------------------------------------------------------- worker functions (service role only)
/**
 * Hands up to p_limit due jobs to one worker, each locked for p_lock_seconds. Skips jobs of paused automations,
 * paused businesses, or everything when the engine is paused. Jobs whose lock expired (a crashed worker) are
 * picked up again.
 */
create function claim_jobs(p_worker text, p_limit integer default 10, p_lock_seconds integer default 120) returns setof jobs
language plpgsql security definer set search_path = public as $$
begin
  if (select paused from engine_controls) then return; end if;
  return query
  update jobs j set status = 'running', locked_by = p_worker, locked_until = now() + make_interval(secs => p_lock_seconds),
    attempts = j.attempts + 1, updated_at = now()
  where j.id in (
    select q.id from jobs q
    join tenants t on t.id = q.tenant_id
    left join automations a on a.id = q.automation_id
    where ((q.status = 'queued' and q.run_at <= now()) or (q.status = 'running' and q.locked_until < now()))
      and not t.automations_paused
      and (a.id is null or a.status in ('active', 'draft', 'tested'))
    order by q.run_at
    for update of q skip locked
    limit least(greatest(p_limit, 1), 100)
  )
  returning j.*;
end $$;

/**
 * Finishes a claimed job: done, or failed. A failure is retried with exponential backoff (30 s, 1 min, 2 min…,
 * at most 1 h) until max_attempts, then the job is dead and stays for review. p_retry = false marks it dead at
 * once (an irreversible action whose outcome is unknown must not be retried blindly).
 */
create function finish_job(p_job_id bigint, p_worker text, p_ok boolean, p_error text default null, p_retry boolean default true) returns job_status
language plpgsql security definer set search_path = public as $$
declare j jobs; result job_status;
begin
  select * into j from jobs where id = p_job_id and locked_by = p_worker and status = 'running' for update;
  if j.id is null then raise exception 'job not held by this worker'; end if;
  update jobs set
    status = case when p_ok then 'done'::job_status when not p_retry or j.attempts >= j.max_attempts then 'dead' else 'queued' end,
    run_at = case when p_ok then run_at else now() + make_interval(secs => least(3600, 30 * power(2, greatest(j.attempts - 1, 0))::integer)) end,
    last_error = case when p_ok then null else left(p_error, 2000) end,
    locked_by = null, locked_until = null, updated_at = now()
  where id = j.id returning status into result;
  return result;
end $$;

/** Duplicate guard: true if the key was already seen and is not expired; otherwise records it. */
create function engine_seen(p_tenant_id uuid, p_key text, p_window_hours integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare inserted integer;
begin
  delete from engine_dedupe where tenant_id = p_tenant_id and key = p_key and expires_at <= now();
  insert into engine_dedupe (tenant_id, key, expires_at) values (p_tenant_id, p_key, now() + make_interval(hours => p_window_hours))
  on conflict do nothing;
  get diagnostics inserted = row_count;
  return inserted = 0;
end $$;

revoke all on function save_automation(text, jsonb, jsonb), activate_automation(uuid), set_automation_paused(uuid, boolean),
  set_business_automations_paused(boolean), set_engine_paused(boolean) from public, anon;
grant execute on function save_automation(text, jsonb, jsonb), activate_automation(uuid), set_automation_paused(uuid, boolean),
  set_business_automations_paused(boolean), set_engine_paused(boolean) to authenticated;
revoke all on function claim_jobs(text, integer, integer), finish_job(bigint, text, boolean, text, boolean), engine_seen(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function claim_jobs(text, integer, integer), finish_job(bigint, text, boolean, text, boolean), engine_seen(uuid, text, integer)
  to service_role;
grant select, insert, update, delete on automations, automation_versions, jobs, executions, engine_dedupe to service_role;
