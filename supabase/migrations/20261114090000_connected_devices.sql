-- Connected devices: every signed-in person sees the sessions of their own account (device, place, last activity)
-- and can sign one out. The site signs people in from its server, so Supabase stores the server's address and
-- browser for the session; the real ones come from the login event, which records the session id
-- (security_events.details.session_id).

-- Signing a device out is recorded in the security log.
alter type security_event_kind add value if not exists 'session_revoked';

create function my_sessions()
returns table (id uuid, created_at timestamptz, last_active timestamptz, aal text, user_agent text, ip text, country text, current boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cur text := auth.jwt() ->> 'session_id';
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  return query
  select s.id, s.created_at, greatest(s.updated_at, s.refreshed_at::timestamptz, s.created_at), s.aal::text,
    coalesce(e.user_agent, s.user_agent), coalesce(e.ip, host(s.ip)), e.country, s.id::text = cur
  from auth.sessions s
  left join lateral (
    select ev.user_agent, ev.ip, ev.country from security_events ev
    where ev.user_id = uid and ev.kind = 'login_success' and ev.details ->> 'session_id' = s.id::text
    order by ev.created_at desc limit 1
  ) e on true
  where s.user_id = uid and (s.not_after is null or s.not_after > now())
  order by (s.id::text = cur) desc, 3 desc;
end $$;

-- Signs one of your own devices out (its refresh tokens go with the session). Your current session is signed out
-- with the normal "Sign out" instead.
create function sign_out_device(p_session_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  delete from auth.sessions s
  where s.id = p_session_id and s.user_id = auth.uid() and s.id::text is distinct from (auth.jwt() ->> 'session_id');
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke all on function my_sessions(), sign_out_device(uuid) from public, anon;
grant execute on function my_sessions(), sign_out_device(uuid) to authenticated;
