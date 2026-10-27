-- Business rules that touch money, publishing and roles.
-- They run inside Postgres (security definer) so they are atomic and cannot be bypassed from the browser.

alter table platform_settings
  add column processing_fee_bearer text not null default 'platform' check (processing_fee_bearer in ('platform', 'seller'));

-- ---------------------------------------------------------------- helpers
create function current_agreement(p_kind agreement_kind) returns uuid
language sql stable security definer set search_path = public as $$
  select id from agreements where kind = p_kind and is_current
$$;

create function my_seller_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from seller_profiles where user_id = auth.uid()
$$;

create function commission_bps_for(p_seller_id uuid) returns integer
language sql stable security definer set search_path = public as $$
  select case when s.is_platform then 0
              else coalesce(s.commission_bps_override, (select default_commission_bps from platform_settings where id = 1)) end
  from seller_profiles s where s.id = p_seller_id
$$;

-- Commission is rounded half-up on the minor unit; the seller gets the remainder so the split always adds up.
create function split_price(p_price integer, p_bps integer, out commission_minor integer, out seller_share_minor integer)
language sql immutable as $$
  select ((p_price::bigint * p_bps + 5000) / 10000)::integer,
         p_price - ((p_price::bigint * p_bps + 5000) / 10000)::integer
$$;

create function seller_has_current_agreement(p_seller_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from seller_agreement_acceptances a
    where a.seller_id = p_seller_id and a.agreement_id = current_agreement('seller_agreement'))
$$;

-- ---------------------------------------------------------------- seller onboarding
create function review_seller_application(p_application_id uuid, p_decision application_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  app seller_applications;
  base_slug text;
  final_slug text;
  n integer := 1;
begin
  if not is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_decision = 'submitted' then raise exception 'invalid decision'; end if;
  if p_decision in ('rejected', 'info_requested') and coalesce(trim(p_note), '') = '' then
    raise exception 'a reason is required';
  end if;
  select * into app from seller_applications where id = p_application_id for update;
  if not found then raise exception 'application not found'; end if;
  if app.status not in ('submitted', 'info_requested') then raise exception 'application already decided'; end if;

  update seller_applications
     set status = p_decision, admin_note = p_note, reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_application_id;

  if p_decision = 'approved' then
    base_slug := trim(both '-' from regexp_replace(lower(app.display_name), '[^a-z0-9]+', '-', 'g'));
    if base_slug = '' then base_slug := 'seller'; end if;
    final_slug := base_slug;
    while exists (select 1 from seller_profiles where slug = final_slug) loop
      n := n + 1; final_slug := base_slug || '-' || n;
    end loop;
    insert into seller_profiles (user_id, slug, display_name, bio, country, categories, portfolio_url, status)
    values (app.user_id, final_slug, app.display_name, app.profile, app.country, app.categories, app.portfolio_url, 'approved')
    on conflict (user_id) do update set status = 'approved', updated_at = now();
    insert into user_roles (user_id, role) values (app.user_id, 'seller') on conflict do nothing;
  end if;

  perform audit('seller_application.' || p_decision, 'seller_application', p_application_id::text,
                jsonb_build_object('note', p_note));
end $$;

create function set_seller_status(p_seller_id uuid, p_status seller_status, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'a reason is required'; end if;
  update seller_profiles set status = p_status, updated_at = now() where id = p_seller_id and not is_platform;
  if not found then raise exception 'seller not found'; end if;
  if p_status = 'suspended' then
    update products set status = 'suspended', updated_at = now() where seller_id = p_seller_id and status = 'published';
  end if;
  perform audit('seller.' || p_status, 'seller_profile', p_seller_id::text, jsonb_build_object('note', p_note));
end $$;

create function accept_seller_agreement(p_agreement_id uuid, p_user_agent text default null)
returns void language plpgsql security definer set search_path = public as $$
declare sid uuid := my_seller_id();
begin
  if sid is null then raise exception 'not a seller' using errcode = '42501'; end if;
  if p_agreement_id is distinct from current_agreement('seller_agreement') then
    raise exception 'only the current seller agreement can be accepted';
  end if;
  insert into seller_agreement_acceptances (seller_id, agreement_id, accepted_by, user_agent)
  values (sid, p_agreement_id, auth.uid(), left(p_user_agent, 300))
  on conflict (seller_id, agreement_id) do nothing;
  perform audit('seller_agreement.accepted', 'seller_profile', sid::text, jsonb_build_object('agreement_id', p_agreement_id));
end $$;

-- ---------------------------------------------------------------- product lifecycle
create function change_product_status(p_product_id uuid, p_to product_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  p products;
  s seller_profiles;
  admin boolean := is_admin();
  owner boolean;
  allowed boolean := false;
begin
  select * into p from products where id = p_product_id for update;
  if not found then raise exception 'product not found'; end if;
  select * into s from seller_profiles where id = p.seller_id;
  owner := s.user_id = auth.uid() or (s.is_platform and admin);

  -- Owner transitions
  if owner and (
       (p.status in ('draft', 'changes_requested', 'rejected') and p_to = 'submitted')
    or (p.status = 'approved' and p_to = 'published')
    or (p.status in ('published', 'approved', 'draft') and p_to = 'archived')
    or (p.status = 'archived' and p_to = 'draft')) then
    allowed := true;
  end if;
  -- Review transitions (admin only)
  if admin and (
       (p.status = 'submitted' and p_to = 'under_review')
    or (p.status in ('submitted', 'under_review') and p_to in ('approved', 'changes_requested', 'rejected'))
    or (p_to = 'suspended' and p.status <> 'suspended')
    or (p.status = 'suspended' and p_to in ('under_review', 'archived'))) then
    allowed := true;
  end if;
  if not allowed then
    raise exception 'transition % -> % not allowed', p.status, p_to using errcode = '42501';
  end if;
  if p_to in ('changes_requested', 'rejected', 'suspended') and coalesce(trim(p_note), '') = '' then
    raise exception 'a reason is required';
  end if;

  if p_to in ('submitted', 'published') then
    if s.status <> 'approved' then raise exception 'seller account is not approved'; end if;
    if not s.is_platform and not seller_has_current_agreement(s.id) then
      raise exception 'the current seller agreement must be accepted first';
    end if;
    if not s.is_platform and p.rights_confirmed_at is null then
      raise exception 'confirm you have the right to distribute this product';
    end if;
    if p.price_minor > 0 and p.price_minor not between (select min_price_minor from platform_settings) and (select max_price_minor from platform_settings) then
      raise exception 'price outside platform limits';
    end if;
    if not exists (
      select 1 from product_versions v join product_files f on f.version_id = v.id
      where v.product_id = p.id and f.kind = 'workflow') then
      raise exception 'upload a workflow file first';
    end if;
  end if;

  if p_to = 'submitted' then
    update product_versions set status = 'submitted' where product_id = p.id and status = 'draft';
  elsif p_to = 'approved' then
    update product_versions set status = 'approved' where product_id = p.id and status = 'submitted';
    update products set current_version_id = (
      select id from product_versions where product_id = p.id and status = 'approved'
      order by string_to_array(version, '.')::int[] desc limit 1) where id = p.id;
  elsif p_to = 'rejected' then
    update product_versions set status = 'rejected' where product_id = p.id and status = 'submitted';
  end if;

  update products set status = p_to, updated_at = now(),
         published_at = case when p_to = 'published' then coalesce(published_at, now()) else published_at end
   where id = p.id;
  insert into product_status_history (product_id, from_status, to_status, actor_id, note)
  values (p.id, p.status, p_to, auth.uid(), p_note);
  perform audit('product.' || p_to, 'product', p.id::text, jsonb_build_object('from', p.status, 'note', p_note));
end $$;

-- Updated versions of published products also go through review before buyers get them.
create function approve_product_version(p_version_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v product_versions;
begin
  if not is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v from product_versions where id = p_version_id for update;
  if v.status <> 'submitted' then raise exception 'version is not awaiting review'; end if;
  if p_approve then
    update product_versions set status = 'approved' where id = v.id;
    update products set current_version_id = v.id, updated_at = now() where id = v.product_id;
  else
    if coalesce(trim(p_note), '') = '' then raise exception 'a reason is required'; end if;
    update product_versions set status = 'rejected' where id = v.id;
  end if;
  perform audit(case when p_approve then 'version.approved' else 'version.rejected' end, 'product_version', v.id::text,
                jsonb_build_object('note', p_note, 'product_id', v.product_id));
end $$;

create function submit_product_version(p_version_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v product_versions; p products;
begin
  select * into v from product_versions where id = p_version_id for update;
  select * into p from products where id = v.product_id;
  if p.seller_id is distinct from my_seller_id() and not (is_admin() and p.ownership = 'platform') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.status <> 'draft' then raise exception 'only draft versions can be submitted'; end if;
  if not exists (select 1 from product_files where version_id = v.id and kind = 'workflow') then
    raise exception 'upload a workflow file first';
  end if;
  update product_versions set status = 'submitted' where id = v.id;
  perform audit('version.submitted', 'product_version', v.id::text, jsonb_build_object('product_id', p.id));
end $$;

-- ---------------------------------------------------------------- settings
create function set_default_commission(p_bps integer)
returns void language plpgsql security definer set search_path = public as $$
declare old integer;
begin
  if not is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_bps not between 0 and 10000 then raise exception 'invalid rate'; end if;
  select default_commission_bps into old from platform_settings where id = 1;
  update platform_settings set default_commission_bps = p_bps, updated_at = now(), updated_by = auth.uid() where id = 1;
  perform audit('settings.commission', 'platform_settings', '1', jsonb_build_object('from_bps', old, 'to_bps', p_bps));
end $$;

create function set_seller_commission_override(p_seller_id uuid, p_bps integer, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_bps is not null and p_bps not between 0 and 10000 then raise exception 'invalid rate'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'a reason is required'; end if;
  update seller_profiles set commission_bps_override = p_bps, updated_at = now() where id = p_seller_id and not is_platform;
  perform audit('seller.commission_override', 'seller_profile', p_seller_id::text, jsonb_build_object('bps', p_bps, 'note', p_note));
end $$;

-- ---------------------------------------------------------------- orders
-- Creates a pending order. Prices and commission come from the database, never from the client.
create function create_order(p_items jsonb, p_license_agreement_id uuid, p_provider text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  oid uuid;
  item jsonb;
  p products;
  lic license_type;
  bps integer;
  sp record;
  cur char(3);
  total integer := 0;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if p_license_agreement_id is distinct from current_agreement('buyer_license') then
    raise exception 'accept the current buyer license agreement';
  end if;
  if jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then raise exception 'invalid cart'; end if;

  insert into orders (buyer_id, currency, total_minor, provider) values (uid, 'EUR', 0, p_provider) returning id into oid;

  for item in select * from jsonb_array_elements(p_items) loop
    select * into p from products where id = (item ->> 'product_id')::uuid and status = 'published';
    if not found then raise exception 'product not available'; end if;
    lic := (item ->> 'license_type')::license_type;
    if not lic = any (p.license_types) then raise exception 'license not offered for this product'; end if;
    if exists (select 1 from entitlements where user_id = uid and product_id = p.id and revoked_at is null) then
      raise exception 'you already own %', p.name;
    end if;
    if cur is null then cur := p.currency; elsif cur <> p.currency then raise exception 'mixed currencies'; end if;
    bps := case when p.ownership = 'platform' then 0 else commission_bps_for(p.seller_id) end;
    select * into sp from split_price(p.price_minor, bps);
    insert into order_items (order_id, product_id, version_id, seller_id, ownership, license_type,
                             unit_price_minor, currency, commission_bps, commission_minor, seller_share_minor)
    values (oid, p.id, p.current_version_id, p.seller_id, p.ownership, lic,
            p.price_minor, p.currency, bps, sp.commission_minor, sp.seller_share_minor);
    total := total + p.price_minor;
  end loop;

  update orders set total_minor = total, currency = cur where id = oid;
  insert into license_acceptances (order_id, user_id, agreement_id) values (oid, uid, p_license_agreement_id);
  return oid;
end $$;

-- Records a confirmed payment. Called only by the server after verifying the provider's webhook signature.
-- Safe to call repeatedly with the same event: duplicates return 'duplicate' and change nothing.
create function finalize_paid_order(
  p_order_id uuid, p_provider text, p_event_id text, p_event_type text,
  p_payment_id text, p_amount_minor integer, p_currency text, p_fee_minor integer default 0)
returns text language plpgsql security definer set search_path = public as $$
declare
  o orders;
  it order_items;
  inserted integer;
  bearer text;
  platform_seller uuid;
  third_party_total integer;
  fee_left integer;
  fee_part integer;
begin
  insert into payment_events (provider, event_id, event_type, order_id)
  values (p_provider, p_event_id, p_event_type, p_order_id) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return 'duplicate'; end if;

  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if o.status <> 'pending' then return 'already_processed'; end if;
  if o.total_minor <> p_amount_minor or o.currency <> upper(p_currency) then
    update orders set status = 'failed' where id = o.id;
    insert into audit_logs (action, entity_type, entity_id, details)
    values ('order.amount_mismatch', 'order', o.id::text,
            jsonb_build_object('expected', o.total_minor, 'received', p_amount_minor, 'currency', p_currency));
    return 'amount_mismatch';
  end if;

  update orders set status = 'paid', paid_at = now(), provider_payment_id = p_payment_id where id = o.id;
  insert into payments (order_id, provider, provider_payment_id, amount_minor, fee_minor, currency)
  values (o.id, p_provider, p_payment_id, p_amount_minor, coalesce(p_fee_minor, 0), o.currency);

  select id into platform_seller from seller_profiles where is_platform;
  for it in select * from order_items where order_id = o.id loop
    if it.ownership = 'third_party' then
      insert into ledger_entries (entry_type, account, seller_id, order_item_id, amount_minor, currency)
      values ('sale', 'seller', it.seller_id, it.id, it.seller_share_minor, it.currency),
             ('commission', 'platform', it.seller_id, it.id, it.commission_minor, it.currency);
      insert into commissions (order_item_id, rate_bps, amount_minor, currency)
      values (it.id, it.commission_bps, it.commission_minor, it.currency);
    else
      -- Platform-owned: the full price is platform revenue, no seller commission.
      insert into ledger_entries (entry_type, account, seller_id, order_item_id, amount_minor, currency)
      values ('sale', 'platform', it.seller_id, it.id, it.unit_price_minor, it.currency);
    end if;
    insert into entitlements (user_id, product_id, order_item_id, license_type)
    values (o.buyer_id, it.product_id, it.id, it.license_type);
    update products set sales_count = sales_count + 1 where id = it.product_id;
  end loop;

  -- Processing fee: absorbed by the platform, or shared pro rata by third-party sellers (configurable).
  if coalesce(p_fee_minor, 0) > 0 then
    select processing_fee_bearer into bearer from platform_settings where id = 1;
    select coalesce(sum(unit_price_minor), 0) into third_party_total from order_items where order_id = o.id and ownership = 'third_party';
    fee_left := p_fee_minor;
    if bearer = 'seller' and third_party_total > 0 then
      for it in select * from order_items where order_id = o.id and ownership = 'third_party' and unit_price_minor > 0 loop
        fee_part := (p_fee_minor::bigint * it.unit_price_minor / o.total_minor)::integer;
        insert into ledger_entries (entry_type, account, seller_id, order_item_id, amount_minor, currency)
        values ('processing_fee', 'seller', it.seller_id, it.id, -fee_part, o.currency);
        fee_left := fee_left - fee_part;
      end loop;
    end if;
    if fee_left > 0 then
      insert into ledger_entries (entry_type, account, amount_minor, currency)
      values ('processing_fee', 'platform', -fee_left, o.currency);
    end if;
  end if;

  insert into audit_logs (action, entity_type, entity_id, details)
  values ('order.paid', 'order', o.id::text, jsonb_build_object('provider', p_provider, 'amount', p_amount_minor));
  return 'paid';
end $$;

-- Free products need no payment provider.
create function claim_free_order(p_order_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where id = p_order_id;
  if o.buyer_id is distinct from auth.uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  if o.total_minor <> 0 then raise exception 'order is not free'; end if;
  return finalize_paid_order(o.id, 'free', 'free:' || o.id, 'free', 'free:' || o.id, 0, o.currency, 0);
end $$;

create function mark_order_failed(p_order_id uuid, p_provider text, p_event_id text, p_event_type text)
returns text language plpgsql security definer set search_path = public as $$
declare inserted integer;
begin
  insert into payment_events (provider, event_id, event_type, order_id)
  values (p_provider, p_event_id, p_event_type, p_order_id) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return 'duplicate'; end if;
  update orders set status = case when p_event_type like '%expired%' then 'canceled'::order_status else 'failed'::order_status end
   where id = p_order_id and status = 'pending';
  return 'recorded';
end $$;

-- ---------------------------------------------------------------- refunds
create function request_refund(p_order_item_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare it order_items; o orders; rid uuid;
begin
  select * into it from order_items where id = p_order_item_id;
  select * into o from orders where id = it.order_id;
  if o.buyer_id is distinct from auth.uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  if o.status not in ('paid', 'partially_refunded') then raise exception 'order is not refundable'; end if;
  if it.unit_price_minor - it.refunded_minor <= 0 then raise exception 'already refunded'; end if;
  if length(coalesce(p_reason, '')) < 10 then raise exception 'please explain the reason'; end if;
  insert into refunds (order_id, order_item_id, amount_minor, currency, reason, requested_by)
  values (o.id, it.id, it.unit_price_minor - it.refunded_minor, it.currency, p_reason, auth.uid()) returning id into rid;
  perform audit('refund.requested', 'refund', rid::text, jsonb_build_object('order_item_id', it.id));
  return rid;
end $$;

create function decide_refund(p_refund_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update refunds set status = case when p_approve then 'approved'::refund_status else 'rejected'::refund_status end,
         decided_by = auth.uid()
   where id = p_refund_id and status = 'requested';
  if not found then raise exception 'refund is not awaiting a decision'; end if;
  perform audit(case when p_approve then 'refund.approved' else 'refund.rejected' end, 'refund', p_refund_id::text,
                jsonb_build_object('note', p_note));
end $$;

-- Applies a refund to the ledger once the provider confirms it (or for manual refunds, an admin).
-- Seller and platform shares are reversed in proportion to the original split. Idempotent.
create function apply_refund(p_refund_id uuid, p_provider_refund_id text)
returns text language plpgsql security definer set search_path = public as $$
declare r refunds; it order_items; seller_part integer; platform_part integer; o orders; remaining integer;
begin
  select * into r from refunds where id = p_refund_id for update;
  if not found then raise exception 'refund not found'; end if;
  if r.status = 'processed' then return 'duplicate'; end if;
  if r.status <> 'approved' then raise exception 'refund is not approved'; end if;
  select * into it from order_items where id = r.order_item_id for update;
  if r.amount_minor > it.unit_price_minor - it.refunded_minor then raise exception 'refund exceeds amount paid'; end if;

  if it.ownership = 'third_party' and it.unit_price_minor > 0 then
    seller_part := (r.amount_minor::bigint * it.seller_share_minor / it.unit_price_minor)::integer;
    platform_part := r.amount_minor - seller_part;
    insert into ledger_entries (entry_type, account, seller_id, order_item_id, refund_id, amount_minor, currency)
    values ('refund', 'seller', it.seller_id, it.id, r.id, -seller_part, r.currency),
           ('commission_reversal', 'platform', it.seller_id, it.id, r.id, -platform_part, r.currency);
  else
    insert into ledger_entries (entry_type, account, seller_id, order_item_id, refund_id, amount_minor, currency)
    values ('refund', 'platform', it.seller_id, it.id, r.id, -r.amount_minor, r.currency);
  end if;

  update order_items set refunded_minor = refunded_minor + r.amount_minor where id = it.id;
  if it.refunded_minor + r.amount_minor >= it.unit_price_minor then
    update entitlements set revoked_at = now() where order_item_id = it.id and revoked_at is null;
  end if;
  select coalesce(sum(unit_price_minor - refunded_minor), 0) into remaining from order_items where order_id = r.order_id;
  update orders set status = case when remaining = 0 then 'refunded'::order_status else 'partially_refunded'::order_status end
   where id = r.order_id;
  update refunds set status = 'processed', provider_refund_id = p_provider_refund_id, processed_at = now() where id = r.id;
  insert into audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'refund.processed', 'refund', r.id::text, jsonb_build_object('amount', r.amount_minor));
  return 'processed';
end $$;

-- ---------------------------------------------------------------- payouts
create function request_payout(p_amount_minor integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid := my_seller_id(); available integer; pid uuid; s seller_profiles;
begin
  if sid is null then raise exception 'not a seller' using errcode = '42501'; end if;
  select * into s from seller_profiles where id = sid;
  if s.status <> 'approved' then raise exception 'seller account is not approved'; end if;
  perform 1 from seller_profiles where id = sid for update;
  select coalesce(sum(amount_minor), 0) into available from ledger_entries where account = 'seller' and seller_id = sid;
  select available - coalesce(sum(amount_minor), 0) into available
    from payouts where seller_id = sid and status in ('requested', 'approved', 'processing');
  if p_amount_minor <= 0 or p_amount_minor > available then raise exception 'amount exceeds available balance'; end if;
  insert into payouts (seller_id, amount_minor, currency, method)
  values (sid, p_amount_minor, 'EUR', s.payout_method) returning id into pid;
  perform audit('payout.requested', 'payout', pid::text, jsonb_build_object('amount', p_amount_minor));
  return pid;
end $$;

-- A payout only reaches 'paid' when an admin (or the payout provider integration) confirms it.
create function set_payout_status(p_payout_id uuid, p_status payout_status, p_reference text default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare po payouts;
begin
  if not is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into po from payouts where id = p_payout_id for update;
  if not found then raise exception 'payout not found'; end if;
  if po.status in ('paid', 'canceled', 'failed') then raise exception 'payout already closed'; end if;
  if p_status = 'paid' and coalesce(trim(p_reference), '') = '' then raise exception 'a payment reference is required'; end if;
  update payouts set status = p_status, provider_reference = coalesce(p_reference, provider_reference),
         note = coalesce(p_note, note), decided_by = auth.uid(),
         paid_at = case when p_status = 'paid' then now() else paid_at end
   where id = po.id;
  if p_status = 'paid' then
    insert into ledger_entries (entry_type, account, seller_id, payout_id, amount_minor, currency)
    values ('payout', 'seller', po.seller_id, po.id, -po.amount_minor, po.currency);
  end if;
  perform audit('payout.' || p_status, 'payout', po.id::text, jsonb_build_object('reference', p_reference, 'amount', po.amount_minor));
end $$;

-- ---------------------------------------------------------------- reviews keep product ratings in sync
create function refresh_product_rating() returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.product_id, old.product_id);
begin
  update products set rating_avg = (select round(avg(rating)::numeric, 2) from product_reviews where product_id = pid),
                      rating_count = (select count(*) from product_reviews where product_id = pid)
   where id = pid;
  return null;
end $$;
create trigger product_reviews_rating after insert or update or delete on product_reviews
  for each row execute function refresh_product_rating();

create function owns_product(p_product_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from entitlements where user_id = auth.uid() and product_id = p_product_id and revoked_at is null)
$$;

-- ---------------------------------------------------------------- function privileges
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function has_role(app_role), is_admin(), my_seller_id(), owns_product(uuid), current_agreement(agreement_kind),
  review_seller_application(uuid, application_status, text), set_seller_status(uuid, seller_status, text),
  accept_seller_agreement(uuid, text), change_product_status(uuid, product_status, text),
  approve_product_version(uuid, boolean, text), submit_product_version(uuid),
  set_default_commission(integer), set_seller_commission_override(uuid, integer, text),
  create_order(jsonb, uuid, text), claim_free_order(uuid), request_refund(uuid, text), decide_refund(uuid, boolean, text),
  request_payout(integer), set_payout_status(uuid, payout_status, text, text)
  to authenticated;
-- Row-level policies call these for logged-out visitors too (they simply return false / null).
grant execute on function current_agreement(agreement_kind), is_admin(), has_role(app_role), my_seller_id(), owns_product(uuid) to anon;
-- Used by the products search index, so any role that writes or searches products needs it.
grant execute on function product_search_text(text, text, text[], text[]) to anon, authenticated;
-- Payment confirmation and refund application are server-only (service role).
revoke execute on function finalize_paid_order(uuid, text, text, text, text, integer, text, integer),
  mark_order_failed(uuid, text, text, text), apply_refund(uuid, text), audit(text, text, text, jsonb),
  commission_bps_for(uuid), handle_new_user() from authenticated;
grant execute on function finalize_paid_order(uuid, text, text, text, text, integer, text, integer),
  mark_order_failed(uuid, text, text, text), apply_refund(uuid, text) to service_role;
