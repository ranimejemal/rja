-- Row-level security: buyers and sellers only ever see their own private data.
-- Writes that involve money, publishing or roles go through the security-definer functions instead of tables.

-- Demo sellers (clearly labelled) have no login.
alter table seller_profiles add column is_demo boolean not null default false;
alter table seller_profiles alter column user_id drop not null;
alter table seller_profiles add constraint seller_profiles_user_or_demo check (user_id is not null or is_demo);

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'user_roles', 'platform_settings', 'agreements', 'seller_applications', 'seller_profiles',
    'seller_agreement_acceptances', 'product_categories', 'products', 'product_status_history', 'product_versions',
    'product_files', 'product_manifests', 'orders', 'order_items', 'license_acceptances', 'payment_events', 'payments',
    'commissions', 'refunds', 'payouts', 'ledger_entries', 'entitlements', 'download_logs', 'product_configurations',
    'product_reviews', 'support_tickets', 'support_messages', 'product_reports', 'newsletter_subscribers', 'audit_logs']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke insert, update, delete on %I from anon, authenticated', t);
  end loop;
end $$;

-- Helper: is the product published (publicly visible)?
create function is_public_product(p_product_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from products where id = p_product_id and status = 'published')
$$;
create function is_my_product(p_product_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from products p join seller_profiles s on s.id = p.seller_id
                 where p.id = p_product_id and (s.user_id = auth.uid() or (s.is_platform and is_admin())))
$$;
grant execute on function is_public_product(uuid), is_my_product(uuid) to anon, authenticated;

-- profiles & roles
create policy "own profile" on profiles for select using (id = auth.uid() or is_admin());
grant update (display_name) on profiles to authenticated;
create policy "update own profile" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "own roles" on user_roles for select using (user_id = auth.uid() or is_admin());

-- settings & agreements & categories: public read
create policy "read settings" on platform_settings for select using (true);
create policy "read agreements" on agreements for select using (true);
create policy "read categories" on product_categories for select using (is_active or is_admin());

-- seller applications
create policy "own applications" on seller_applications for select using (user_id = auth.uid() or is_admin());
grant insert (user_id, display_name, contact_email, country, profile, experience, categories, portfolio_url) on seller_applications to authenticated;
create policy "apply" on seller_applications for insert with check (user_id = auth.uid());

-- seller profiles: approved ones are public (no private fields are stored here)
create policy "public sellers" on seller_profiles for select
  using (status = 'approved' or user_id = auth.uid() or is_admin());
grant update (display_name, bio, portfolio_url, categories) on seller_profiles to authenticated;
create policy "edit own seller profile" on seller_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Payout account ids and commission overrides are read by the server only.
revoke select on seller_profiles from anon, authenticated;
grant select (id, user_id, slug, display_name, bio, country, categories, portfolio_url, status, is_platform,
  payout_method, is_demo, created_at, updated_at) on seller_profiles to anon, authenticated;

create policy "own acceptances" on seller_agreement_acceptances for select
  using (seller_id = my_seller_id() or is_admin());

-- products: published ones are public; sellers manage their own drafts
create policy "read products" on products for select
  using (status = 'published' or is_my_product(id) or is_admin());
grant insert (seller_id, slug, name, short_description, description, category_id, price_minor, thumbnail_path,
  preview_paths, demo_video_url, difficulty, platforms, integrations, prerequisites, install_instructions,
  support_policy, license_types, customization_mode, tags, rights_confirmed_at, ownership) on products to authenticated;
create policy "create own products" on products for insert with check (
  (seller_id = my_seller_id() and ownership = 'third_party'
     and exists (select 1 from seller_profiles where id = seller_id and status = 'approved'))
  or (is_admin() and ownership = 'platform' and exists (select 1 from seller_profiles where id = seller_id and is_platform)));
grant update (name, short_description, description, category_id, price_minor, thumbnail_path, preview_paths,
  demo_video_url, difficulty, platforms, integrations, prerequisites, install_instructions, support_policy,
  license_types, customization_mode, tags, rights_confirmed_at) on products to authenticated;
-- Listing edits are only possible before publication; a published product changes through new versions.
create policy "edit own unpublished products" on products for update
  using (is_my_product(id) and status in ('draft', 'changes_requested', 'rejected', 'archived'))
  with check (is_my_product(id));
create policy "admin edits products" on products for update using (is_admin()) with check (is_admin());

create function set_product_featured(p_product_id uuid, p_featured boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update products set is_featured = p_featured, updated_at = now() where id = p_product_id;
  perform audit(case when p_featured then 'product.featured' else 'product.unfeatured' end, 'product', p_product_id::text);
end $$;
revoke execute on function set_product_featured(uuid, boolean) from public, anon;
grant execute on function set_product_featured(uuid, boolean) to authenticated;

create policy "product history" on product_status_history for select using (is_my_product(product_id) or is_admin());

create policy "read versions" on product_versions for select
  using ((status = 'approved' and is_public_product(product_id)) or is_my_product(product_id) or is_admin());
grant insert (product_id, version, changelog) on product_versions to authenticated;
create policy "add versions" on product_versions for insert with check (is_my_product(product_id));
grant update (changelog) on product_versions to authenticated;
create policy "edit draft versions" on product_versions for update
  using (is_my_product(product_id) and status = 'draft') with check (is_my_product(product_id));

-- File metadata: owner and admin only. Buyers download through the server after an entitlement check.
create policy "own files" on product_files for select
  using (is_admin() or exists (select 1 from product_versions v where v.id = version_id and is_my_product(v.product_id)));

create policy "read manifests" on product_manifests for select using (
  exists (select 1 from product_versions v where v.id = version_id
          and ((v.status = 'approved' and is_public_product(v.product_id)) or is_my_product(v.product_id) or owns_product(v.product_id)))
  or is_admin());

-- orders: buyers see their own; sellers see the items they sold (no buyer identity)
create policy "own orders" on orders for select using (buyer_id = auth.uid() or is_admin());
create policy "order items" on order_items for select using (
  exists (select 1 from orders o where o.id = order_id and o.buyer_id = auth.uid())
  or seller_id = my_seller_id() or is_admin());
create policy "own license acceptances" on license_acceptances for select using (user_id = auth.uid() or is_admin());
create policy "payment events admin" on payment_events for select using (is_admin());
create policy "payments" on payments for select using (
  is_admin() or exists (select 1 from orders o where o.id = order_id and o.buyer_id = auth.uid()));
create policy "commissions" on commissions for select using (
  is_admin() or exists (select 1 from order_items i where i.id = order_item_id and i.seller_id = my_seller_id()));
create policy "refunds" on refunds for select using (
  is_admin() or requested_by = auth.uid()
  or exists (select 1 from order_items i where i.id = order_item_id and i.seller_id = my_seller_id()));
create policy "payouts" on payouts for select using (seller_id = my_seller_id() or is_admin());
create policy "ledger" on ledger_entries for select using (
  (account = 'seller' and seller_id = my_seller_id()) or is_admin());
create policy "entitlements" on entitlements for select using (user_id = auth.uid() or is_admin());
create policy "downloads" on download_logs for select using (user_id = auth.uid() or is_admin());
create policy "configurations" on product_configurations for select using (user_id = auth.uid());

-- reviews: public; only owners of the product can post one
create policy "read reviews" on product_reviews for select using (true);
grant insert (product_id, user_id, rating, body) on product_reviews to authenticated;
create policy "owners review" on product_reviews for insert with check (user_id = auth.uid() and owns_product(product_id));
grant update (rating, body) on product_reviews to authenticated;
create policy "edit own review" on product_reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
grant delete on product_reviews to authenticated;
create policy "delete own review" on product_reviews for delete using (user_id = auth.uid() or is_admin());

-- support: the buyer, the product's seller and admins
create policy "tickets" on support_tickets for select using (buyer_id = auth.uid() or seller_id = my_seller_id() or is_admin());
grant insert (product_id, buyer_id, seller_id, subject) on support_tickets to authenticated;
create policy "open ticket" on support_tickets for insert with check (
  buyer_id = auth.uid() and owns_product(product_id)
  and seller_id = (select seller_id from products where id = product_id));
create policy "messages" on support_messages for select using (
  exists (select 1 from support_tickets t where t.id = ticket_id
          and (t.buyer_id = auth.uid() or t.seller_id = my_seller_id() or is_admin())));
grant insert (ticket_id, author_id, body) on support_messages to authenticated;
create policy "reply" on support_messages for insert with check (
  author_id = auth.uid() and exists (select 1 from support_tickets t where t.id = ticket_id
    and (t.buyer_id = auth.uid() or t.seller_id = my_seller_id() or is_admin())));

-- reports
grant insert (product_id, reporter_id, reason, details) on product_reports to authenticated;
create policy "report" on product_reports for insert with check (reporter_id = auth.uid());
create policy "read reports" on product_reports for select using (is_admin() or reporter_id = auth.uid());

-- audit log: admins only
create policy "audit" on audit_logs for select using (is_admin());

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-files', 'product-files', false, 5242880,
        array['application/json', 'text/markdown', 'text/plain', 'image/png', 'image/jpeg', 'image/webp', 'text/csv']),
       ('product-media', 'product-media', true, 3145728, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Private files are written by the server after validation; nobody reads them directly.
-- Public media: sellers write into their own folder (<seller_id>/...).
create policy "seller media upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-media' and (storage.foldername(name))[1] = my_seller_id()::text);
create policy "seller media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-media' and (storage.foldername(name))[1] = my_seller_id()::text);
