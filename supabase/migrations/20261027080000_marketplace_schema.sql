-- Ranime Jemal Agency marketplace: core schema.
-- Money is stored as integer minor units (cents) with an explicit ISO currency code.
-- Rates are basis points (2000 = 20%).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums
create type app_role as enum ('buyer', 'seller', 'admin');
create type seller_status as enum ('pending', 'approved', 'rejected', 'info_requested', 'suspended');
create type application_status as enum ('submitted', 'approved', 'rejected', 'info_requested');
create type agreement_kind as enum ('seller_agreement', 'buyer_license', 'terms', 'privacy', 'refund_policy');
create type product_ownership as enum ('platform', 'third_party');
create type product_status as enum (
  'draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'published', 'rejected', 'suspended', 'archived');
create type version_status as enum ('draft', 'submitted', 'approved', 'rejected');
create type difficulty as enum ('beginner', 'intermediate', 'advanced');
create type customization_mode as enum ('ready_to_use', 'configurable', 'guided_setup', 'paid_service');
create type license_type as enum ('personal', 'single_business', 'commercial', 'extended_commercial');
create type file_kind as enum ('workflow', 'readme', 'install_guide', 'example_config', 'changelog', 'screenshot', 'sample');
create type order_status as enum ('pending', 'paid', 'partially_refunded', 'refunded', 'failed', 'canceled');
create type ledger_entry_type as enum ('sale', 'commission', 'processing_fee', 'refund', 'commission_reversal', 'payout');
create type ledger_account as enum ('seller', 'platform');
create type payout_status as enum ('requested', 'approved', 'processing', 'paid', 'failed', 'canceled');
create type payout_method as enum ('manual', 'stripe_connect');
create type refund_status as enum ('requested', 'approved', 'rejected', 'processed');
create type ticket_status as enum ('open', 'answered', 'closed');
create type report_reason as enum ('intellectual_property', 'malicious', 'quality', 'misleading', 'other');
create type report_status as enum ('open', 'investigating', 'resolved', 'dismissed');

-- ---------------------------------------------------------------- users & roles
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_roles (
  user_id uuid not null references profiles (id) on delete cascade,
  role app_role not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Every new account is a buyer; selling is unlocked by an approved application.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  insert into user_roles (user_id, role) values (new.id, 'buyer');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create function has_role(r app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = r)
$$;

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select has_role('admin')
$$;

-- ---------------------------------------------------------------- settings
create table platform_settings (
  id smallint primary key default 1 check (id = 1),
  default_commission_bps integer not null default 2000 check (default_commission_bps between 0 and 10000),
  currency char(3) not null default 'EUR',
  min_price_minor integer not null default 0 check (min_price_minor >= 0),
  max_price_minor integer not null default 500000 check (max_price_minor > 0),
  max_upload_bytes integer not null default 5242880,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id)
);
insert into platform_settings (id) values (1);

-- ---------------------------------------------------------------- agreements (versioned, configurable, subject to legal review)
create table agreements (
  id uuid primary key default gen_random_uuid(),
  kind agreement_kind not null,
  version text not null,
  title text not null,
  body text not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (kind, version)
);
create unique index agreements_one_current on agreements (kind) where is_current;

-- ---------------------------------------------------------------- sellers
create table seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  display_name text not null check (length(display_name) between 2 and 80),
  contact_email text not null,
  country char(2) not null,
  profile text not null default '',
  experience text not null check (length(experience) between 20 and 2000),
  categories text[] not null default '{}',
  portfolio_url text,
  status application_status not null default 'submitted',
  admin_note text,
  reviewed_by uuid references profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on seller_applications (user_id);
create unique index seller_applications_one_open on seller_applications (user_id) where status in ('submitted', 'info_requested');

create table seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text not null,
  bio text not null default '',
  country char(2),
  categories text[] not null default '{}',
  portfolio_url text,
  status seller_status not null default 'pending',
  is_platform boolean not null default false,
  commission_bps_override integer check (commission_bps_override between 0 and 10000),
  payout_method payout_method not null default 'manual',
  stripe_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Exactly one platform-owned seller profile.
create unique index seller_profiles_one_platform on seller_profiles (is_platform) where is_platform;

create table seller_agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references seller_profiles (id) on delete cascade,
  agreement_id uuid not null references agreements (id),
  accepted_by uuid not null references profiles (id),
  accepted_at timestamptz not null default now(),
  user_agent text,
  unique (seller_id, agreement_id)
);

-- ---------------------------------------------------------------- catalog
create table product_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references seller_profiles (id),
  ownership product_ownership not null default 'third_party',
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(name) between 3 and 120),
  short_description text not null default '' check (length(short_description) <= 280),
  description text not null default '',
  category_id uuid references product_categories (id),
  price_minor integer not null default 0 check (price_minor >= 0),
  currency char(3) not null default 'EUR',
  thumbnail_path text,
  preview_paths text[] not null default '{}',
  demo_video_url text,
  difficulty difficulty not null default 'beginner',
  platforms text[] not null default '{n8n}',
  integrations text[] not null default '{}',
  prerequisites text not null default '',
  install_instructions text not null default '',
  support_policy text not null default '',
  license_types license_type[] not null default '{single_business}' check (cardinality(license_types) > 0),
  customization_mode customization_mode not null default 'ready_to_use',
  tags text[] not null default '{}',
  status product_status not null default 'draft',
  is_featured boolean not null default false,
  is_demo boolean not null default false,
  rights_confirmed_at timestamptz,
  current_version_id uuid,
  sales_count integer not null default 0,
  rating_avg numeric(3, 2),
  rating_count integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on products (seller_id);
create index on products (status, published_at desc);
create index on products (category_id);
create function product_search_text(p_name text, p_short text, p_integrations text[], p_tags text[])
returns tsvector language sql immutable parallel safe as $$
  select to_tsvector('simple'::regconfig, coalesce(p_name, '') || ' ' || coalesce(p_short, '') || ' '
    || coalesce(array_to_string(p_integrations, ' '), '') || ' ' || coalesce(array_to_string(p_tags, ' '), ''))
$$;
create index products_search on products using gin (product_search_text(name, short_description, integrations, tags));

create table product_status_history (
  id bigint generated always as identity primary key,
  product_id uuid not null references products (id) on delete cascade,
  from_status product_status,
  to_status product_status not null,
  actor_id uuid references profiles (id),
  note text,
  created_at timestamptz not null default now()
);
create index on product_status_history (product_id, created_at);

create table product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  version text not null check (version ~ '^\d+\.\d+\.\d+$'),
  changelog text not null default '',
  status version_status not null default 'draft',
  scan_report jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (product_id, version)
);
alter table products add constraint products_current_version_fk
  foreign key (current_version_id) references product_versions (id);

create table product_files (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references product_versions (id) on delete cascade,
  kind file_kind not null,
  storage_path text not null unique,
  file_name text not null,
  size_bytes integer not null check (size_bytes > 0),
  mime text not null,
  sha256 text not null,
  created_at timestamptz not null default now()
);
create index on product_files (version_id);

create table product_manifests (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null unique references product_versions (id) on delete cascade,
  schema_version integer not null default 1,
  manifest jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- orders & money
create table orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles (id),
  status order_status not null default 'pending',
  currency char(3) not null,
  total_minor integer not null check (total_minor >= 0),
  provider text not null,
  provider_session_id text unique,
  provider_payment_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index on orders (buyer_id, created_at desc);

-- Price, commission rate and split are snapshotted per item at order time;
-- historical earnings never depend on the current settings.
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid not null references products (id),
  version_id uuid references product_versions (id),
  seller_id uuid not null references seller_profiles (id),
  ownership product_ownership not null,
  license_type license_type not null,
  unit_price_minor integer not null check (unit_price_minor >= 0),
  currency char(3) not null,
  commission_bps integer not null check (commission_bps between 0 and 10000),
  commission_minor integer not null check (commission_minor >= 0),
  seller_share_minor integer not null check (seller_share_minor >= 0),
  refunded_minor integer not null default 0 check (refunded_minor >= 0),
  check (commission_minor + seller_share_minor = unit_price_minor),
  check (ownership = 'third_party' or commission_bps = 0)
);
create index on order_items (order_id);
create index on order_items (seller_id);
create unique index order_items_one_per_product on order_items (order_id, product_id);

create table license_acceptances (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  user_id uuid not null references profiles (id),
  agreement_id uuid not null references agreements (id),
  accepted_at timestamptz not null default now(),
  unique (order_id, agreement_id)
);

-- Raw provider events, unique per provider event id: retried webhooks are no-ops.
create table payment_events (
  id bigint generated always as identity primary key,
  provider text not null,
  event_id text not null,
  event_type text not null,
  order_id uuid references orders (id),
  processed_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders (id),
  provider text not null,
  provider_payment_id text not null unique,
  amount_minor integer not null,
  fee_minor integer not null default 0,
  currency char(3) not null,
  created_at timestamptz not null default now()
);

create table commissions (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references order_items (id),
  rate_bps integer not null,
  amount_minor integer not null,
  currency char(3) not null,
  created_at timestamptz not null default now()
);

create table refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id),
  order_item_id uuid references order_items (id),
  amount_minor integer not null check (amount_minor > 0),
  currency char(3) not null,
  reason text not null default '',
  status refund_status not null default 'requested',
  provider_refund_id text unique,
  requested_by uuid references profiles (id),
  decided_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index on refunds (order_id);

create table payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references seller_profiles (id),
  amount_minor integer not null check (amount_minor > 0),
  currency char(3) not null,
  status payout_status not null default 'requested',
  method payout_method not null default 'manual',
  provider_reference text,
  note text,
  requested_at timestamptz not null default now(),
  decided_by uuid references profiles (id),
  paid_at timestamptz
);
create index on payouts (seller_id);

-- Append-only financial ledger. Positive amounts credit the account.
create table ledger_entries (
  id bigint generated always as identity primary key,
  entry_type ledger_entry_type not null,
  account ledger_account not null,
  seller_id uuid references seller_profiles (id),
  order_item_id uuid references order_items (id),
  refund_id uuid references refunds (id),
  payout_id uuid references payouts (id),
  amount_minor integer not null,
  currency char(3) not null,
  created_at timestamptz not null default now()
);
create index on ledger_entries (seller_id, created_at);
-- A sale or commission is recorded once per order item, whatever the number of webhook retries.
create unique index ledger_one_sale on ledger_entries (order_item_id, entry_type, account)
  where entry_type in ('sale', 'commission');
create unique index ledger_one_refund on ledger_entries (refund_id, entry_type, account) where refund_id is not null;
create unique index ledger_one_payout on ledger_entries (payout_id) where payout_id is not null;

create function forbid_ledger_changes() returns trigger language plpgsql as $$
begin
  raise exception 'ledger entries are append-only';
end $$;
create trigger ledger_append_only before update or delete on ledger_entries
  for each row execute function forbid_ledger_changes();

create table entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  product_id uuid not null references products (id),
  order_item_id uuid not null unique references order_items (id),
  license_type license_type not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index on entitlements (user_id, product_id);

create table download_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id),
  file_id uuid not null references product_files (id),
  created_at timestamptz not null default now()
);
create index on download_logs (user_id, created_at desc);

create table product_configurations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  product_id uuid not null references products (id),
  version_id uuid not null references product_versions (id),
  revision integer not null,
  values jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id, revision)
);

-- ---------------------------------------------------------------- community & support
create table product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '' check (length(body) <= 2000),
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id),
  buyer_id uuid not null references profiles (id),
  seller_id uuid not null references seller_profiles (id),
  subject text not null check (length(subject) between 3 and 160),
  status ticket_status not null default 'open',
  created_at timestamptz not null default now()
);

create table support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets (id) on delete cascade,
  author_id uuid not null references profiles (id),
  body text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table product_reports (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id),
  reporter_id uuid references profiles (id),
  reason report_reason not null,
  details text not null check (length(details) between 10 and 5000),
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);

create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now()
);

create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles (id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on audit_logs (created_at desc);
create trigger audit_append_only before update or delete on audit_logs
  for each row execute function forbid_ledger_changes();

create function audit(p_action text, p_entity_type text, p_entity_id text, p_details jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'))
$$;

-- ---------------------------------------------------------------- views
create view seller_balances with (security_invoker = true) as
select
  seller_id,
  currency,
  coalesce(sum(amount_minor) filter (where entry_type = 'sale'), 0) as gross_share_minor,
  coalesce(-sum(amount_minor) filter (where entry_type in ('refund')), 0) as refunds_minor,
  coalesce(-sum(amount_minor) filter (where entry_type = 'payout'), 0) as paid_out_minor,
  coalesce(sum(amount_minor), 0) as balance_minor
from ledger_entries
where account = 'seller'
group by seller_id, currency;
