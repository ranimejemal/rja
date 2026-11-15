-- Phase 3: solutions and the recommendations made to each business.
--
-- `solutions` is the agency's price list for RJA solutions (texts live in lib/solutions.ts). Setup prices start
-- from the matching marketplace automation; the monthly price is null until the agency sets it, and the page then
-- says so instead of inventing one.
--
-- `solution_recommendations` holds what was proposed to a business, why (the customer's own answers, plus an
-- explanation the AI may have written within checks), and the customer's decision. Decisions survive a new
-- analysis: re-analysing never resets "accepted" or "declined".
--
-- Rollback: drop function decide_recommendation(text, text); drop function store_analysis(jsonb, jsonb);
--   drop table solution_recommendations; drop type recommendation_status; drop table solutions;
--   alter table business_profiles drop column analysis, drop column analysed_at;

create table solutions (
  id text primary key check (id ~ '^[a-z][a-z0-9_]{2,40}$'),
  name text not null check (length(name) between 2 and 120),
  setup_price_minor integer check (setup_price_minor >= 0),
  monthly_price_minor integer check (monthly_price_minor >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into solutions (id, name, setup_price_minor) values
  ('inventory_manager', 'Smart Inventory Manager', (select price_minor from products where slug = 'ecommerce-order-inventory-sync')),
  ('cart_recovery', 'Smart Cart Recovery', (select price_minor from products where slug = 'abandoned-cart-recovery')),
  ('customer_assistant', 'AI Customer Assistant', (select price_minor from products where slug = 'ai-customer-service-chatbot'));

alter table solutions enable row level security;
create policy "everyone signed in reads the price list" on solutions for select using (auth.uid() is not null);
create policy "admins manage the price list" on solutions for all using (is_admin()) with check (is_admin());
grant select, insert, update, delete on solutions to authenticated;

alter table business_profiles add column analysis jsonb, add column analysed_at timestamptz;

create type recommendation_status as enum ('proposed', 'accepted', 'postponed', 'declined');
create table solution_recommendations (
  tenant_id uuid not null references tenants (id) on delete cascade,
  solution_id text not null references solutions (id),
  status recommendation_status not null default 'proposed',
  rank smallint not null default 0,
  reasons jsonb not null default '[]' check (jsonb_typeof(reasons) = 'array' and length(reasons::text) <= 4000),
  explanation jsonb not null default '{}' check (jsonb_typeof(explanation) = 'object' and length(explanation::text) <= 4000),
  decided_at timestamptz,
  decided_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, solution_id)
);
alter table solution_recommendations enable row level security;
create policy "members and admins read recommendations" on solution_recommendations for select
  using (is_tenant_member(tenant_id) or is_admin());
revoke insert, update, delete on solution_recommendations from anon, authenticated;

/**
 * Stores a new analysis for the caller's business: the overview and the recommended solutions
 * (`[{solution_id, rank, reasons, explanation}]`). Existing decisions are kept; solutions no longer recommended
 * and still only "proposed" are removed.
 */
create function store_analysis(p_analysis jsonb, p_items jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  tid uuid := my_tenant_id();
  item jsonb;
begin
  if auth.uid() is null or tid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if jsonb_typeof(p_analysis) <> 'object' or length(p_analysis::text) > 8000 then raise exception 'invalid analysis'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 10 then raise exception 'invalid recommendations'; end if;
  update business_profiles set analysis = p_analysis, analysed_at = now() where tenant_id = tid;
  delete from solution_recommendations r where r.tenant_id = tid and r.status = 'proposed'
    and not exists (select 1 from jsonb_array_elements(p_items) i where i ->> 'solution_id' = r.solution_id);
  for item in select * from jsonb_array_elements(p_items) loop
    insert into solution_recommendations (tenant_id, solution_id, rank, reasons, explanation)
    values (tid, item ->> 'solution_id', coalesce((item ->> 'rank')::smallint, 0), coalesce(item -> 'reasons', '[]'), coalesce(item -> 'explanation', '{}'))
    on conflict (tenant_id, solution_id) do update
      set rank = excluded.rank, reasons = excluded.reasons, explanation = excluded.explanation, updated_at = now();
  end loop;
end $$;

/** The customer's decision on one recommendation: accepted, postponed, declined (or proposed to undo). */
create function decide_recommendation(p_solution_id text, p_decision text) returns recommendation_status
language plpgsql security definer set search_path = public as $$
declare
  tid uuid := my_tenant_id();
  result recommendation_status;
begin
  if auth.uid() is null or tid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if p_decision not in ('proposed', 'accepted', 'postponed', 'declined') then raise exception 'invalid decision'; end if;
  update solution_recommendations set status = p_decision::recommendation_status,
    decided_at = case when p_decision = 'proposed' then null else now() end,
    decided_by = case when p_decision = 'proposed' then null else auth.uid() end, updated_at = now()
  where tenant_id = tid and solution_id = p_solution_id returning status into result;
  if result is null then raise exception 'recommendation not found'; end if;
  return result;
end $$;

revoke all on function store_analysis(jsonb, jsonb), decide_recommendation(text, text) from public, anon;
grant execute on function store_analysis(jsonb, jsonb), decide_recommendation(text, text) to authenticated;
