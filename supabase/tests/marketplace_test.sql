-- Database tests for permissions, publishing rules, purchases, commissions, refunds and payouts.
-- Run with: sh supabase/tests/run.sh
\set ON_ERROR_STOP 1
\o /dev/null

create schema test;
create table test.ids (name text primary key, id uuid);
create table test.results (n serial, name text, ok boolean, detail text);

-- Switch the session to a user (or back to the superuser with null).
create function test.act_as(p_name text) returns void language plpgsql as $$
begin
  if p_name is null then
    perform set_config('request.jwt.claim.sub', '', false);
    execute 'reset role';
  elsif p_name = 'service' then
    perform set_config('request.jwt.claim.sub', '', false);
    execute 'set role service_role';
  else
    perform set_config('request.jwt.claim.sub', (select id::text from test.ids where name = p_name), false);
    execute 'set role authenticated';
  end if;
end $$;
create function test.id(p_name text) returns uuid language sql as $$ select id from test.ids where name = p_name $$;
grant usage on schema test to authenticated, service_role, anon;
grant select on test.ids to authenticated, service_role, anon;
grant all on test.results to authenticated, service_role, anon;
grant usage on sequence test.results_n_seq to authenticated, service_role, anon;
grant execute on all functions in schema test to authenticated, service_role, anon;

create function test.ok(p_name text, p_cond boolean, p_detail text default null) returns void language sql as $$
  insert into test.results (name, ok, detail) values (p_name, coalesce(p_cond, false), p_detail)
$$;
-- Runs a statement and records whether it failed with a message matching the pattern.
create function test.fails(p_name text, p_sql text, p_pattern text) returns void language plpgsql as $$
begin
  execute p_sql;
  perform test.ok(p_name, false, 'no error raised');
exception when others then
  perform test.ok(p_name, sqlerrm ~* p_pattern, sqlerrm);
end $$;

-- ---------------------------------------------------------------- users
insert into auth.users (email) values ('admin@example.test'), ('seller@example.test'), ('seller2@example.test'),
  ('buyer@example.test'), ('buyer2@example.test');
insert into test.ids select split_part(email, '@', 1), id from auth.users;
insert into user_roles (user_id, role) values (test.id('admin'), 'admin');

select test.ok('signup creates buyer role',
  (select count(*) from user_roles where role = 'buyer') = 5);

-- ---------------------------------------------------------------- platform seller
select test.act_as('admin');
select ensure_platform_seller();
select test.act_as(null);
select test.ok('admin claims the platform seller',
  (select user_id from seller_profiles where is_platform) = test.id('admin'));

-- ---------------------------------------------------------------- seller onboarding
select test.act_as('seller');
insert into seller_applications (user_id, display_name, contact_email, country, experience, categories)
values (test.id('seller'), 'Flow Lab', 'seller@example.test', 'FR', 'Five years building n8n automations for agencies.', '{lead-generation}');
select test.fails('buyer cannot approve own application',
  $q$select review_seller_application((select id from seller_applications limit 1), 'approved')$q$, 'forbidden');
select test.act_as('admin');
select test.fails('rejection needs a reason',
  $q$select review_seller_application((select id from seller_applications limit 1), 'rejected', '')$q$, 'reason');
select review_seller_application((select id from seller_applications limit 1), 'approved', null);
select test.act_as(null);
insert into test.ids select 'seller_profile', id from seller_profiles where user_id = test.id('seller');
select test.ok('approval creates seller profile and role',
  test.id('seller_profile') is not null and exists (select 1 from user_roles where user_id = test.id('seller') and role = 'seller'));

-- second seller (for isolation checks)
select test.act_as('seller2');
insert into seller_applications (user_id, display_name, contact_email, country, experience)
values (test.id('seller2'), 'Other Seller', 'seller2@example.test', 'FR', 'Experienced automation builder for e-commerce.');
select test.act_as('admin');
select review_seller_application((select id from seller_applications where user_id = test.id('seller2')), 'approved');
select test.act_as(null);

-- ---------------------------------------------------------------- product lifecycle
select test.act_as('seller');
insert into products (seller_id, slug, name, short_description, price_minor, license_types)
values (test.id('seller_profile'), 'lead-router', 'Lead Router', 'Routes leads.', 4900, '{single_business,commercial}');
select test.act_as(null);
insert into test.ids select 'p1', id from products where slug = 'lead-router';

select test.act_as('seller');
select test.fails('seller cannot set status directly',
  $q$update products set status = 'published' where slug = 'lead-router'$q$, 'permission denied');
select test.fails('seller cannot create platform products',
  $q$insert into products (seller_id, ownership, slug, name) values (my_seller_id(), 'platform', 'fake-platform', 'Fake')$q$, 'row-level security');
select test.fails('submit requires the seller agreement',
  $q$select change_product_status(test.id('p1'), 'submitted')$q$, 'seller agreement');
select accept_seller_agreement(current_agreement('seller_agreement'), 'test');
select test.fails('submit requires rights confirmation',
  $q$select change_product_status(test.id('p1'), 'submitted')$q$, 'right to distribute');
update products set rights_confirmed_at = now() where id = test.id('p1');
select test.fails('submit requires a workflow file',
  $q$select change_product_status(test.id('p1'), 'submitted')$q$, 'workflow file');
insert into product_versions (product_id, version, changelog) values (test.id('p1'), '1.0.0', 'First release');
select test.act_as(null);
-- Files are written by the server after validation.
insert into product_files (version_id, kind, storage_path, file_name, size_bytes, mime, sha256)
select id, 'workflow', 'seller/p1/1.0.0/workflow.json', 'workflow.json', 1200, 'application/json', 'abc'
from product_versions where product_id = test.id('p1');

select test.act_as('seller');
select change_product_status(test.id('p1'), 'submitted');
select test.fails('seller cannot publish an unapproved product',
  $q$select change_product_status(test.id('p1'), 'published')$q$, 'not allowed');
select test.fails('seller cannot approve own product',
  $q$select change_product_status(test.id('p1'), 'approved')$q$, 'not allowed');
select test.act_as('seller2');
select test.fails('other seller cannot touch the product',
  $q$select change_product_status(test.id('p1'), 'archived')$q$, 'not allowed');
select test.act_as('admin');
select change_product_status(test.id('p1'), 'under_review');
select test.fails('changes requested needs a reason',
  $q$select change_product_status(test.id('p1'), 'changes_requested', '')$q$, 'reason');
select change_product_status(test.id('p1'), 'approved');
select test.act_as('seller');
select change_product_status(test.id('p1'), 'published');
select test.act_as(null);
select test.ok('approved product published with current version',
  (select status = 'published' and current_version_id is not null from products where id = test.id('p1')));
select test.ok('status history recorded', (select count(*) from product_status_history where product_id = test.id('p1')) = 4);

-- platform product (no commission)
select test.act_as('admin');
insert into products (seller_id, ownership, slug, name, price_minor, license_types)
values ((select id from seller_profiles where is_platform), 'platform', 'platform-flow', 'Platform Flow', 2000, '{single_business}');
select test.act_as(null);
insert into test.ids select 'p2', id from products where slug = 'platform-flow';
insert into product_versions (product_id, version) values (test.id('p2'), '1.0.0');
insert into product_files (version_id, kind, storage_path, file_name, size_bytes, mime, sha256)
select id, 'workflow', 'platform/p2/workflow.json', 'workflow.json', 900, 'application/json', 'def' from product_versions where product_id = test.id('p2');
select test.act_as('admin');
select change_product_status(test.id('p2'), 'submitted');
select change_product_status(test.id('p2'), 'approved');
select change_product_status(test.id('p2'), 'published');

-- ---------------------------------------------------------------- orders & commission
select test.act_as('buyer');
select test.fails('buyer must accept the current license',
  $q$select create_order(('[{"product_id":"' || test.id('p1') || '","license_type":"commercial"}]')::jsonb, gen_random_uuid(), 'stripe')$q$, 'license agreement');
select test.fails('license type must be offered',
  $q$select create_order(('[{"product_id":"' || test.id('p2') || '","license_type":"commercial"}]')::jsonb, current_agreement('buyer_license'), 'stripe')$q$, 'not offered');
select test.fails('demo products cannot be bought',
  $q$select create_order(('[{"product_id":"' || (select id from products where is_demo and status = 'published' limit 1) || '","license_type":"single_business"}]')::jsonb, current_agreement('buyer_license'), 'stripe')$q$, 'demo');
select test.fails('quote-only products cannot be checked out',
  $q$select create_order(('[{"product_id":"' || (select id from products where quote_only limit 1) || '","license_type":"single_business"}]')::jsonb, current_agreement('buyer_license'), 'stripe')$q$, 'sold by quote');
create temp table o1 as select create_order(
  ('[{"product_id":"' || test.id('p1') || '","license_type":"commercial"},{"product_id":"' || test.id('p2') || '","license_type":"single_business"}]')::jsonb,
  current_agreement('buyer_license'), 'stripe') as id;
select test.act_as(null);
insert into test.ids select 'o1', id from o1;

select test.ok('order total computed from database prices', (select total_minor from orders where id = test.id('o1')) = 6900);
select test.ok('20% commission on third-party item',
  (select commission_bps = 2000 and commission_minor = 980 and seller_share_minor = 3920 from order_items where order_id = test.id('o1') and product_id = test.id('p1')));
select test.ok('no commission on platform item',
  (select commission_bps = 0 and commission_minor = 0 and seller_share_minor = 2000 from order_items where order_id = test.id('o1') and product_id = test.id('p2')));

-- commission changes do not rewrite existing orders
select test.act_as('admin');
select set_default_commission(2500);
select test.act_as(null);
select test.ok('existing order keeps its commission snapshot',
  (select commission_bps from order_items where order_id = test.id('o1') and product_id = test.id('p1')) = 2000);

-- payment confirmation is server-only and idempotent
select test.act_as('buyer');
select test.fails('buyer cannot confirm a payment',
  $q$select finalize_paid_order(test.id('o1'), 'stripe', 'evt_1', 'checkout.session.completed', 'pi_1', 6900, 'EUR', 230)$q$, 'permission denied');
select test.act_as('service');
select test.ok('payment recorded',
  finalize_paid_order(test.id('o1'), 'stripe', 'evt_1', 'checkout.session.completed', 'pi_1', 6900, 'EUR', 230) = 'paid');
select test.ok('retried webhook is a no-op',
  finalize_paid_order(test.id('o1'), 'stripe', 'evt_1', 'checkout.session.completed', 'pi_1', 6900, 'EUR', 230) = 'duplicate');
select test.ok('second event for a paid order is a no-op',
  finalize_paid_order(test.id('o1'), 'stripe', 'evt_2', 'checkout.session.async_payment_succeeded', 'pi_1', 6900, 'EUR', 230) = 'already_processed');
select test.act_as(null);
select test.ok('one sale and one commission entry per item',
  (select count(*) from ledger_entries where order_item_id in (select id from order_items where order_id = test.id('o1'))) = 3);
select test.ok('seller credited 3920, platform 980 + 2000 - fee',
  (select sum(amount_minor) from ledger_entries where account = 'seller' and seller_id = test.id('seller_profile')) = 3920
  and (select sum(amount_minor) from ledger_entries where account = 'platform') = 980 + 2000 - 230);
select test.ok('buyer entitled to both products', (select count(*) from entitlements where user_id = test.id('buyer')) = 2);

-- amount mismatch is refused
select test.act_as('buyer2');
create temp table o2 as select create_order(('[{"product_id":"' || test.id('p1') || '","license_type":"single_business"}]')::jsonb,
  current_agreement('buyer_license'), 'stripe') as id;
select test.act_as(null);
insert into test.ids select 'o2', id from o2;
select test.ok('new order uses the new 25% rate',
  (select commission_bps = 2500 and commission_minor = 1225 from order_items where order_id = test.id('o2')));
select test.act_as('service');
select test.ok('amount mismatch rejected',
  finalize_paid_order(test.id('o2'), 'stripe', 'evt_3', 'checkout.session.completed', 'pi_2', 100, 'EUR', 0) = 'amount_mismatch');
select test.act_as(null);
select test.ok('mismatched order not paid and no entitlement',
  (select status from orders where id = test.id('o2')) = 'failed'
  and not exists (select 1 from entitlements where user_id = test.id('buyer2')));

-- ---------------------------------------------------------------- logged-out visitors
set role anon;
select test.ok('visitors see published products only',
  (select count(*) from products) = (select count(*) from products where status = 'published') and (select count(*) from products) > 0);
select test.ok('visitors can read manifests of published products', (select count(*) from product_manifests) >= 1);
select test.ok('visitors see approved sellers', (select count(*) from seller_profiles) >= 3);
select test.ok('visitors see no orders', (select count(*) from orders) = 0);
select test.fails('visitors cannot read payout account ids', $q$select stripe_account_id from seller_profiles$q$, 'permission denied');
select test.act_as(null);

-- ---------------------------------------------------------------- isolation
select test.act_as('buyer2');
select test.ok('buyer cannot see other buyers orders', (select count(*) from orders where buyer_id = test.id('buyer')) = 0);
select test.ok('buyer cannot read product files', (select count(*) from product_files) = 0);
select test.ok('buyer cannot read the ledger', (select count(*) from ledger_entries) = 0);
select test.ok('buyer cannot read audit logs', (select count(*) from audit_logs) = 0);
select test.fails('non-owner cannot review',
  $q$insert into product_reviews (product_id, user_id, rating) values (test.id('p1'), test.id('buyer2'), 5)$q$, 'row-level security');
select test.act_as('seller2');
select test.ok('seller cannot see another sellers ledger', (select count(*) from ledger_entries) = 0);
select test.ok('seller cannot see another sellers draft files', (select count(*) from product_files) = 0);
select test.act_as('seller');
select test.ok('seller sees own sale without buyer orders', (select count(*) from order_items) >= 1 and (select count(*) from orders) = 0);
select test.act_as('buyer');
insert into product_reviews (product_id, user_id, rating, body) values (test.id('p1'), test.id('buyer'), 5, 'Works well.');
select test.act_as(null);
select test.ok('rating aggregated', (select rating_count = 1 and rating_avg = 5 from products where id = test.id('p1')));
select test.act_as('admin');
select test.fails('ledger is append-only', $q$delete from ledger_entries$q$, 'permission denied|append-only');
select test.act_as(null);
select test.fails('ledger is append-only even for the owner', $q$update ledger_entries set amount_minor = 0$q$, 'append-only');

-- ---------------------------------------------------------------- payouts
select test.act_as('seller');
select test.fails('payout above balance refused', $q$select request_payout(5000)$q$, 'exceeds');
create temp table po as select request_payout(3000) as id;
select test.fails('pending payouts reserve the balance', $q$select request_payout(1000)$q$, 'exceeds');
select test.act_as(null);
insert into test.ids select 'po', id from po;
select test.act_as('admin');
select test.fails('paid needs a reference', $q$select set_payout_status(test.id('po'), 'paid')$q$, 'reference');
select set_payout_status(test.id('po'), 'paid', 'SEPA-2026-001');
select test.act_as(null);
select test.ok('payout debits the seller balance',
  (select sum(amount_minor) from ledger_entries where account = 'seller' and seller_id = test.id('seller_profile')) = 920);

-- ---------------------------------------------------------------- refunds
select test.act_as('buyer');
create temp table rf as select request_refund((select id from order_items where order_id = test.id('o1') and product_id = test.id('p1')),
  'The workflow does not match the description.') as id;
select test.act_as(null);
insert into test.ids select 'rf', id from rf;
select test.act_as('admin');
select decide_refund(test.id('rf'), true, 'ok');
select test.act_as('service');
select test.ok('refund applied', apply_refund(test.id('rf'), 're_1') = 'processed');
select test.ok('refund is idempotent', apply_refund(test.id('rf'), 're_1') = 'duplicate');
select test.act_as(null);
select test.ok('refund reverses seller share and commission',
  (select sum(amount_minor) from ledger_entries where refund_id = test.id('rf') and account = 'seller') = -3920
  and (select sum(amount_minor) from ledger_entries where refund_id = test.id('rf') and account = 'platform') = -980);
select test.ok('refunded item loses entitlement',
  (select revoked_at is not null from entitlements where product_id = test.id('p1') and user_id = test.id('buyer')));
select test.ok('order partially refunded', (select status from orders where id = test.id('o1')) = 'partially_refunded');
select test.ok('audit log records admin actions', (select count(*) from audit_logs where actor_id = test.id('admin')) >= 6);

select test.act_as(null);
select test.ok('top 7 automations are ranked 1 to 7',
  (select array_agg(top_rank order by top_rank) from products where top_rank is not null) = array[1,2,3,4,5,6,7]::smallint[]);
select test.act_as('seller');
select test.fails('sellers cannot set quote-only or ranking fields',
  $q$update products set top_rank = 9 where id = test.id('p2')$q$, 'permission denied');
select test.act_as(null);

-- ---------------------------------------------------------------- report
\o
select name, ok, detail from test.results where not ok;
select format('%s passed, %s failed', count(*) filter (where ok), count(*) filter (where not ok)) as summary from test.results;
do $$ begin
  if exists (select 1 from test.results where not ok) then raise exception 'database tests failed'; end if;
end $$;
