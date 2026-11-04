-- Admin control center: visitor analytics, marketing consent, engagement promotions, and admin views of every
-- customer and the site's traffic.
--
-- Privacy by design:
-- - Page views of visitors who are not signed in carry no identifier at all (no cookie, no IP): only the page and
--   the time spent on it.
-- - Promotion emails go only to signed-in customers who ticked "send me offers" (marketing_opt_in), at most one
--   email per promotion and one per week, each with a one-click unsubscribe link.

-- ---------------------------------------------------------------- marketing consent
alter table profiles
  add column marketing_opt_in boolean not null default false,
  add column marketing_opt_in_at timestamptz,
  add column unsubscribe_token uuid not null default gen_random_uuid() unique;

-- The sign-up form can ask for consent: it arrives in the user metadata.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  opt_in boolean := coalesce((new.raw_user_meta_data ->> 'marketing_opt_in')::boolean, false);
begin
  insert into profiles (id, display_name, marketing_opt_in, marketing_opt_in_at)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
          opt_in, case when opt_in then now() end);
  insert into user_roles (user_id, role) values (new.id, 'buyer');
  return new;
end $$;

create function set_marketing_opt_in(p_opt_in boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  update profiles set marketing_opt_in = p_opt_in, marketing_opt_in_at = case when p_opt_in then now() end, updated_at = now()
  where id = auth.uid();
end $$;

-- One-click unsubscribe from an email link, without signing in: the token identifies the profile.
create function unsubscribe_marketing(p_token uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update profiles set marketing_opt_in = false, marketing_opt_in_at = null, updated_at = now()
  where unsubscribe_token = p_token and marketing_opt_in;
  get diagnostics n = row_count;
  return n > 0 or exists (select 1 from profiles where unsubscribe_token = p_token);
end $$;

-- ---------------------------------------------------------------- page views
create table page_views (
  id uuid primary key,
  path text not null check (path ~ '^/' and length(path) <= 300),
  seconds integer not null default 0 check (seconds between 0 and 7200),
  user_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on page_views (created_at desc);
create index on page_views (user_id, created_at desc) where user_id is not null;
alter table page_views enable row level security;
create policy "admins read page views" on page_views for select using (is_admin());

-- Called by the site while a page is open: the same view id is sent again with the growing time on the page.
-- Returns the signed-in visitor's time on the site today (0 for visitors who are not signed in).
create function record_page_view(p_id uuid, p_path text, p_seconds integer) returns integer
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  secs integer := least(greatest(coalesce(p_seconds, 0), 0), 7200);
begin
  if p_path !~ '^/' or length(p_path) > 300 then raise exception 'invalid path'; end if;
  insert into page_views (id, path, seconds, user_id) values (p_id, p_path, secs, uid)
  on conflict (id) do update set seconds = greatest(page_views.seconds, excluded.seconds), updated_at = now()
    where page_views.user_id is not distinct from uid and page_views.created_at > now() - interval '1 day';
  if uid is null then return 0; end if;
  return coalesce((select sum(seconds) from page_views where user_id = uid and created_at >= date_trunc('day', now())), 0);
end $$;

-- ---------------------------------------------------------------- promotions
create table promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 120),
  subject text not null check (length(subject) between 3 and 150),
  message text not null check (length(message) between 10 and 4000),
  cta_label text not null default 'See the offer' check (length(cta_label) between 2 and 60),
  cta_path text not null default '/explore' check (cta_path ~ '^/' and length(cta_path) <= 300),
  min_seconds integer not null default 300 check (min_seconds between 60 and 7200),
  active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table promotions enable row level security;
create policy "admins manage promotions" on promotions for all using (is_admin()) with check (is_admin());
grant select, insert, update, delete on promotions to authenticated;

create type promotion_send_status as enum ('sending', 'sent', 'failed');
create table promotion_sends (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references promotions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  status promotion_send_status not null default 'sending',
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (promotion_id, user_id)
);
create index on promotion_sends (user_id, created_at desc);
alter table promotion_sends enable row level security;
create policy "admins read promotion sends" on promotion_sends for select using (is_admin());

-- Reserves the promotion email for the signed-in customer when every condition holds: they opted in, a promotion
-- is running, they spent at least its minimum time on the site today, they never got this promotion, and they got
-- no promotion email in the last 7 days. Returns what the email needs, or nothing.
create function claim_promotion() returns table (send_id uuid, subject text, message text, cta_label text, cta_path text, unsubscribe_token uuid)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  promo promotions;
  token uuid;
  today integer;
  sid uuid;
begin
  if uid is null then return; end if;
  select p.unsubscribe_token into token from profiles p where p.id = uid and p.marketing_opt_in;
  if token is null then return; end if;
  select * into promo from promotions pr
  where pr.active and (pr.starts_at is null or pr.starts_at <= now()) and (pr.ends_at is null or pr.ends_at > now())
  order by pr.created_at desc limit 1;
  if promo.id is null then return; end if;
  select coalesce(sum(pv.seconds), 0) into today from page_views pv where pv.user_id = uid and pv.created_at >= date_trunc('day', now());
  if today < promo.min_seconds then return; end if;
  if exists (select 1 from promotion_sends s where s.user_id = uid and s.created_at > now() - interval '7 days') then return; end if;
  insert into promotion_sends (promotion_id, user_id) values (promo.id, uid)
  on conflict (promotion_id, user_id) do nothing returning id into sid;
  if sid is null then return; end if;
  return query select sid, promo.subject, promo.message, promo.cta_label, promo.cta_path, token;
end $$;

create function finish_promotion_send(p_send_id uuid, p_ok boolean, p_error text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update promotion_sends set status = case when p_ok then 'sent'::promotion_send_status else 'failed' end,
    sent_at = case when p_ok then now() end, error = left(p_error, 500)
  where id = p_send_id and user_id = auth.uid() and status = 'sending';
end $$;

-- ---------------------------------------------------------------- admin views
-- Every account with its email, roles, activity and purchases. Admins only.
create function admin_users() returns table (
  id uuid, email text, display_name text, roles text[], created_at timestamptz, last_sign_in_at timestamptz,
  email_confirmed boolean, marketing_opt_in boolean, paid_orders integer, spent_minor bigint, seconds_30d bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  return query
  select u.id, u.email::text, p.display_name,
    coalesce((select array_agg(r.role::text order by r.role) from user_roles r where r.user_id = u.id), '{}'),
    u.created_at, u.last_sign_in_at, u.email_confirmed_at is not null, coalesce(p.marketing_opt_in, false),
    (select count(*)::integer from orders o where o.buyer_id = u.id and o.status in ('paid', 'partially_refunded', 'refunded')),
    (select coalesce(sum(o.total_minor), 0)::bigint from orders o where o.buyer_id = u.id and o.status in ('paid', 'partially_refunded', 'refunded')),
    (select coalesce(sum(pv.seconds), 0)::bigint from page_views pv where pv.user_id = u.id and pv.created_at > now() - interval '30 days')
  from auth.users u left join profiles p on p.id = u.id
  order by u.created_at desc;
end $$;

-- Traffic for the last p_days days. Admins only.
create function admin_analytics(p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare since timestamptz := date_trunc('day', now()) - make_interval(days => greatest(1, least(p_days, 365)) - 1);
begin
  if not is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'views', (select count(*) from page_views where created_at >= since),
    'seconds', (select coalesce(sum(seconds), 0) from page_views where created_at >= since),
    'signed_in_views', (select count(*) from page_views where created_at >= since and user_id is not null),
    'engaged_customers', (select count(*) from (
        select user_id, date_trunc('day', created_at) from page_views
        where created_at >= since and user_id is not null group by 1, 2 having sum(seconds) >= 300) e),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d.day, 'views', d.views, 'seconds', d.seconds) order by d.day)
        from (select g.day::date as day, count(pv.id) as views, coalesce(sum(pv.seconds), 0) as seconds
              from generate_series(since, date_trunc('day', now()), interval '1 day') g(day)
              left join page_views pv on pv.created_at >= g.day and pv.created_at < g.day + interval '1 day'
              group by g.day) d), '[]'),
    'top_pages', coalesce((select jsonb_agg(t) from (
        select path, count(*) as views, round(avg(seconds)) as avg_seconds from page_views
        where created_at >= since group by path order by count(*) desc limit 15) t), '[]'),
    'signups', (select count(*) from auth.users where created_at >= since),
    'orders', (select count(*) from orders where created_at >= since and status in ('paid', 'partially_refunded', 'refunded')),
    'quotes', (select count(*) from quote_requests where created_at >= since),
    'promotion_emails', (select count(*) from promotion_sends where created_at >= since and status = 'sent')
  );
end $$;

-- ---------------------------------------------------------------- privileges
revoke all on function set_marketing_opt_in(boolean), unsubscribe_marketing(uuid), record_page_view(uuid, text, integer),
  claim_promotion(), finish_promotion_send(uuid, boolean, text), admin_users(), admin_analytics(integer) from public;
grant execute on function set_marketing_opt_in(boolean), claim_promotion(), finish_promotion_send(uuid, boolean, text),
  admin_users(), admin_analytics(integer) to authenticated;
grant execute on function unsubscribe_marketing(uuid), record_page_view(uuid, text, integer) to anon, authenticated;
