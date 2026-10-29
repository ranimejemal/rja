-- Quote requests for done-for-you setups (and general enquiries). Anyone can submit one through
-- submit_quote_request(); only admins can read and update them.

create type quote_status as enum ('new', 'contacted', 'won', 'lost', 'spam');

create table quote_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products (id) on delete set null,
  user_id uuid references profiles (id) on delete set null,
  name text not null check (length(name) between 2 and 120),
  email text not null check (length(email) <= 254 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  phone text not null default '' check (length(phone) <= 40),
  company text not null default '' check (length(company) <= 160),
  message text not null check (length(message) between 10 and 4000),
  status quote_status not null default 'new',
  admin_note text not null default '' check (length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on quote_requests (status, created_at desc);

alter table quote_requests enable row level security;
revoke all on quote_requests from anon, authenticated;
grant select on quote_requests to authenticated;
grant update (status, admin_note, updated_at) on quote_requests to authenticated;
create policy "admins read quotes" on quote_requests for select using (is_admin());
create policy "admins update quotes" on quote_requests for update using (is_admin()) with check (is_admin());

-- Validates and stores a request. p_product_slug is optional (general enquiry).
create function submit_quote_request(p_product_slug text, p_name text, p_email text, p_phone text, p_company text, p_message text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  pid uuid;
  qid uuid;
begin
  if coalesce(p_product_slug, '') <> '' then
    select id into pid from products where slug = p_product_slug and status = 'published';
    if pid is null then raise exception 'unknown product'; end if;
  end if;
  insert into quote_requests (product_id, user_id, name, email, phone, company, message)
  values (pid, auth.uid(), trim(p_name), lower(trim(p_email)), trim(coalesce(p_phone, '')), trim(coalesce(p_company, '')), trim(p_message))
  returning id into qid;
  return qid;
end $$;
revoke all on function submit_quote_request(text, text, text, text, text, text) from public;
grant execute on function submit_quote_request(text, text, text, text, text, text) to anon, authenticated;
