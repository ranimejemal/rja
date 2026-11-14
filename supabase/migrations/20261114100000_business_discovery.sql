-- Phase 2: tenants and the business discovery profile.
--
-- A tenant is a business. Every account gets its own tenant the first time it needs one (ensure_my_tenant), and
-- existing accounts get one now, so nobody loses anything. Later phases hang integrations, solutions, workflows
-- and approvals on the tenant, so a business can have several staff accounts.
--
-- The business profile holds the customer's discovery answers. Customers never write the tables directly: the
-- functions below check who is calling, cap sizes and keep one profile per tenant. The app validates each
-- answer against its question before saving (lib/discovery.ts).
--
-- Rollback (nothing else depends on these yet):
--   drop function finish_discovery(); drop function save_discovery_answer(text, jsonb);
--   drop function ensure_my_tenant(); drop function my_tenant_id(); drop function is_tenant_member(uuid);
--   drop table business_profiles; drop table tenant_members; drop table tenants; drop type tenant_role;

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null default '' check (length(name) <= 120),
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type tenant_role as enum ('owner', 'member');
create table tenant_members (
  tenant_id uuid not null references tenants (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role tenant_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index on tenant_members (user_id, created_at);

create table business_profiles (
  tenant_id uuid primary key references tenants (id) on delete cascade,
  answers jsonb not null default '{}' check (jsonb_typeof(answers) = 'object' and length(answers::text) <= 20000),
  completed_at timestamptz,
  updated_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- tenant helpers
create function is_tenant_member(p_tenant_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from tenant_members m where m.tenant_id = p_tenant_id and m.user_id = auth.uid())
$$;

/** The caller's business (their first tenant), or null. */
create function my_tenant_id() returns uuid
language sql stable security definer set search_path = public as $$
  select m.tenant_id from tenant_members m where m.user_id = auth.uid() order by m.created_at limit 1
$$;

/** The caller's business, created on first use with the caller as owner. */
create function ensure_my_tenant() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  tid uuid;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  -- One at a time per person, so two tabs cannot create two businesses.
  perform pg_advisory_xact_lock(hashtext('tenant:' || uid::text));
  tid := my_tenant_id();
  if tid is null then
    insert into tenants (name, created_by) select coalesce(p.display_name, ''), uid from profiles p where p.id = uid
    returning id into tid;
    insert into tenant_members (tenant_id, user_id, role) values (tid, uid, 'owner');
  end if;
  return tid;
end $$;

-- Existing accounts get their business now.
do $$
declare p record; tid uuid;
begin
  for p in select id, display_name from profiles where not exists (select 1 from tenant_members m where m.user_id = profiles.id) loop
    insert into tenants (name, created_by) values (coalesce(p.display_name, ''), p.id) returning id into tid;
    insert into tenant_members (tenant_id, user_id, role) values (tid, p.id, 'owner');
  end loop;
end $$;

-- ---------------------------------------------------------------- discovery
/**
 * Saves one discovery answer in the caller's business profile (null removes it) and returns all answers.
 * Keys are question ids; the app checks each value against its question first.
 */
create function save_discovery_answer(p_key text, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  tid uuid;
  result jsonb;
begin
  if p_key !~ '^[a-z][a-z0-9_]{1,40}$' then raise exception 'invalid question'; end if;
  if p_value is not null and length(p_value::text) > 4000 then raise exception 'answer too long'; end if;
  tid := ensure_my_tenant();
  insert into business_profiles (tenant_id, answers, updated_by)
  values (tid, case when p_value is null or p_value = 'null'::jsonb then '{}'::jsonb else jsonb_build_object(p_key, p_value) end, auth.uid())
  on conflict (tenant_id) do update
    set answers = case when p_value is null or p_value = 'null'::jsonb then business_profiles.answers - p_key
                       else business_profiles.answers || jsonb_build_object(p_key, p_value) end,
        updated_by = auth.uid(), updated_at = now()
  returning answers into result;
  if p_key = 'business_name' and jsonb_typeof(p_value) = 'string' then
    update tenants set name = left(p_value #>> '{}', 120), updated_at = now() where id = tid;
  end if;
  return result;
end $$;

/** Marks the caller's discovery as finished (the app checks that every needed question is answered). */
create function finish_discovery() returns timestamptz
language plpgsql security definer set search_path = public as $$
declare done timestamptz;
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  update business_profiles set completed_at = coalesce(completed_at, now()), updated_at = now()
  where tenant_id = my_tenant_id() returning completed_at into done;
  if done is null then raise exception 'nothing to finish'; end if;
  return done;
end $$;

-- ---------------------------------------------------------------- access
alter table tenants enable row level security;
alter table tenant_members enable row level security;
alter table business_profiles enable row level security;
create policy "members and admins read their business" on tenants for select using (is_tenant_member(id) or is_admin());
create policy "people read their own memberships" on tenant_members for select using (user_id = auth.uid() or is_admin());
create policy "members and admins read the business profile" on business_profiles for select
  using (is_tenant_member(tenant_id) or is_admin());
-- Writes only through the functions above.
revoke insert, update, delete on tenants, tenant_members, business_profiles from anon, authenticated;

revoke all on function is_tenant_member(uuid), my_tenant_id(), ensure_my_tenant(), save_discovery_answer(text, jsonb),
  finish_discovery() from public, anon;
grant execute on function is_tenant_member(uuid), my_tenant_id(), ensure_my_tenant(), save_discovery_answer(text, jsonb),
  finish_discovery() to authenticated;
