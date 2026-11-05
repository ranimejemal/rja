-- Visitor log and security events.
--
-- Visitor log: every page view now also records coarse, non-identifying context (country, device type, browser,
-- the site the visitor came from). A visitor id is added only when the visitor accepted analytics cookies, and the
-- account only when they are signed in. No IP address is stored for ordinary visits.
--
-- Security events: failed and successful logins, password resets, bots stopped by the human check, scans for
-- hacking targets (/wp-admin, /.env…), refused admin access. They keep the IP address and browser for 90 days,
-- which the GDPR allows for protecting the service (legitimate interest). Written only by the server (service
-- role); admins read them. Passwords are never recorded.

-- ---------------------------------------------------------------- visitor context
alter table page_views
  add column visitor_id uuid,
  add column country text check (country ~ '^[A-Z]{2}$'),
  add column device text check (device in ('desktop', 'mobile', 'tablet', 'bot')),
  add column browser text check (length(browser) <= 40),
  add column referrer text check (length(referrer) <= 200);
create index on page_views (visitor_id, created_at desc) where visitor_id is not null;

drop function record_page_view(uuid, text, integer);
create function record_page_view(
  p_id uuid, p_path text, p_seconds integer,
  p_visitor_id uuid default null, p_country text default null, p_device text default null,
  p_browser text default null, p_referrer text default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  secs integer := least(greatest(coalesce(p_seconds, 0), 0), 7200);
begin
  if p_path !~ '^/' or length(p_path) > 300 then raise exception 'invalid path'; end if;
  insert into page_views (id, path, seconds, user_id, visitor_id, country, device, browser, referrer)
  values (p_id, p_path, secs, uid, p_visitor_id,
    case when p_country ~ '^[A-Z]{2}$' then p_country end,
    case when p_device in ('desktop', 'mobile', 'tablet', 'bot') then p_device end,
    left(p_browser, 40), left(p_referrer, 200))
  on conflict (id) do update set seconds = greatest(page_views.seconds, excluded.seconds), updated_at = now()
    where page_views.user_id is not distinct from uid and page_views.created_at > now() - interval '1 day';
  if uid is null then return 0; end if;
  return coalesce((select sum(seconds) from page_views where user_id = uid and created_at >= date_trunc('day', now())), 0);
end $$;
revoke all on function record_page_view(uuid, text, integer, uuid, text, text, text, text) from public;
grant execute on function record_page_view(uuid, text, integer, uuid, text, text, text, text) to anon, authenticated;

-- The visit log for admins, with the email of signed-in visitors.
create function admin_visits(p_limit integer default 300, p_visitor uuid default null, p_user uuid default null)
returns table (id uuid, created_at timestamptz, path text, seconds integer, user_id uuid, email text,
  visitor_id uuid, country text, device text, browser text, referrer text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  return query
  select v.id, v.created_at, v.path, v.seconds, v.user_id, u.email::text, v.visitor_id, v.country, v.device, v.browser, v.referrer
  from page_views v left join auth.users u on u.id = v.user_id
  where (p_visitor is null or v.visitor_id = p_visitor) and (p_user is null or v.user_id = p_user)
  order by v.created_at desc limit least(greatest(p_limit, 1), 2000);
end $$;
revoke all on function admin_visits(integer, uuid, uuid) from public, anon;
grant execute on function admin_visits(integer, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------- security events
create type security_event_kind as enum (
  'login_success', 'login_failed', 'login_locked', 'signup', 'password_reset_requested', 'password_changed',
  'mfa_failed', 'admin_denied', 'probe', 'bot_blocked', 'rate_limited', 'alert_sent'
);
create type security_severity as enum ('info', 'low', 'medium', 'high', 'critical');

create table security_events (
  id bigint generated always as identity primary key,
  kind security_event_kind not null,
  severity security_severity not null default 'info',
  email text check (length(email) <= 254),
  user_id uuid references profiles (id) on delete set null,
  ip text check (length(ip) <= 64),
  country text,
  user_agent text check (length(user_agent) <= 300),
  path text check (length(path) <= 300),
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on security_events (created_at desc);
create index on security_events (kind, created_at desc);
create index on security_events (ip, created_at desc);
alter table security_events enable row level security;
create policy "admins read security events" on security_events for select using (is_admin());
-- Only the server writes (service role bypasses RLS); nobody can change or delete history through the API.
revoke insert, update, delete on security_events from anon, authenticated;

-- Admins see the newest events with counts per kind for the security page.
create function admin_security_summary(p_days integer default 7) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 90)));
begin
  if not is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'by_kind', coalesce((select jsonb_object_agg(kind, n) from (select kind, count(*) n from security_events where created_at >= since group by kind) k), '{}'),
    'by_severity', coalesce((select jsonb_object_agg(severity, n) from (select severity, count(*) n from security_events where created_at >= since group by severity) s), '{}'),
    'top_ips', coalesce((select jsonb_agg(t) from (
        select ip, country, count(*) as events, count(*) filter (where severity in ('high', 'critical')) as serious
        from security_events where created_at >= since and ip is not null and kind <> 'login_success'
        group by ip, country order by count(*) desc limit 10) t), '[]')
  );
end $$;
revoke all on function admin_security_summary(integer) from public, anon;
grant execute on function admin_security_summary(integer) to authenticated;

-- Retention: security events are kept 90 days, page views 13 months.
create function purge_old_logs() returns void language sql security definer set search_path = public as $$
  delete from security_events where created_at < now() - interval '90 days';
  delete from page_views where created_at < now() - interval '13 months';
$$;
revoke all on function purge_old_logs() from public, anon, authenticated;
grant execute on function purge_old_logs() to service_role;

-- ---------------------------------------------------------------- admin two-step verification
-- Once an admin has turned on two-step verification (an authenticator app), their admin rights only work in a
-- session where the code was entered (assurance level aal2). A stolen password alone then gives no admin access,
-- not even through the API. Before they turn it on, admin rights work as before (the site asks them to set it up).
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select has_role('admin') and (
    coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
  )
$$;

-- ---------------------------------------------------------------- member-only functions (also in 20261105090000)
-- Supabase grants EXECUTE on new functions to anon by default; these are for signed-in people only.
revoke execute on function
  admin_users(), admin_analytics(integer), claim_promotion(), finish_promotion_send(uuid, boolean, text),
  set_marketing_opt_in(boolean), can_use_product(uuid), save_configuration(uuid, jsonb),
  admin_visits(integer, uuid, uuid), admin_security_summary(integer)
from anon;
