-- Demo catalog: clearly labelled sample data for development (is_demo = true).
-- Demo products cannot be bought; create_order rejects them.

insert into seller_profiles (slug, display_name, bio, status, is_platform, is_demo) values
  ('ranime-jemal-agency', 'Ranime Jemal Agency', 'Automations built and supported by the Ranime Jemal Agency team.', 'approved', true, true),
  ('demo-flowsmith', 'Flowsmith (demo creator)', 'Sample third-party creator used for demo data.', 'approved', false, true),
  ('demo-cartcraft', 'CartCraft (demo creator)', 'Sample third-party creator used for demo data.', 'approved', false, true);

-- The admin claims the platform seller created above.
create or replace function ensure_platform_seller() returns uuid
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if not is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update seller_profiles set user_id = auth.uid(), is_demo = false, updated_at = now()
   where is_platform and user_id is null returning id into sid;
  if sid is null then
    select id into sid from seller_profiles where is_platform;
  end if;
  if sid is null then
    insert into seller_profiles (user_id, slug, display_name, status, is_platform)
    values (auth.uid(), 'ranime-jemal-agency', 'Ranime Jemal Agency', 'approved', true) returning id into sid;
  end if;
  insert into user_roles (user_id, role) values (auth.uid(), 'seller') on conflict do nothing;
  perform audit('seller.platform_claimed', 'seller_profile', sid::text);
  return sid;
end $$;

-- Demo products are for display only.
create or replace function reject_demo_items() returns trigger language plpgsql as $$
begin
  if exists (select 1 from products where id = new.product_id and is_demo) then
    raise exception 'demo products cannot be purchased';
  end if;
  return new;
end $$;
create trigger order_items_no_demo before insert on order_items for each row execute function reject_demo_items();


with p as (
  insert into products (seller_id, ownership, slug, name, short_description, description, category_id, price_minor, currency,
    thumbnail_path, difficulty, platforms, integrations, prerequisites, install_instructions, support_policy,
    license_types, customization_mode, tags, status, is_featured, is_demo, rights_confirmed_at, published_at, sales_count)
  select s.id, 'platform', 'ai-lead-management-assistant', 'AI Lead Management Assistant', 'Receives customer enquiries, categorizes leads, drafts follow-up messages, and records information in a CRM.', 'Customer enquiries arrive from several channels and need to be sorted, answered, and recorded before leads go cold.

What it does:
- Categorizes enquiries
- Summarizes customer messages
- Drafts responses
- Creates CRM records
- Notifies team members

What it does not do:
- Send replies without the approval rules you configure
- Support CRMs other than those listed

Example input: A website form enquiry asking for a quote.
Example output: A lead tagged “high priority — quote request”, a drafted reply in your brand voice, and a new CRM contact.',
    (select id from product_categories where slug = 'lead-generation'), 14900, 'EUR',
    '/images/product-ai-lead-management-assistant.jpg', 'intermediate', '{n8n}', array['Email','Website forms','Google Sheets','HubSpot']::text[],
    'Accounts: Email account (Gmail or IMAP/SMTP), HubSpot or Google Sheets, OpenAI API key. n8n 1.x, self-hosted or n8n Cloud.', '1. Import the workflow JSON into n8n (Workflows > Import from file).
2. Create the credentials listed in the prerequisites.
3. Fill in the configuration values from your dashboard.
4. Run the workflow once with the sample input and check the output.',
    'Email support for installation questions within 3 business days.',
    array['single_business', 'commercial']::license_type[], 'configurable', array['lead management','enquiries','follow-up','crm']::text[],
    'published', true, true, now(), now() - interval '0 days', 0
  from seller_profiles s where s.slug = 'ranime-jemal-agency'
  returning id
), v as (
  insert into product_versions (product_id, version, changelog, status)
  select id, '1.0.0', 'First release.', 'approved' from p returning id, product_id
)
update products set current_version_id = v.id from v where products.id = v.product_id;

with p as (
  insert into products (seller_id, ownership, slug, name, short_description, description, category_id, price_minor, currency,
    thumbnail_path, difficulty, platforms, integrations, prerequisites, install_instructions, support_policy,
    license_types, customization_mode, tags, status, is_featured, is_demo, rights_confirmed_at, published_at, sales_count)
  select s.id, 'third_party', 'lead-enrichment-qualification', 'Lead Enrichment & Qualification', 'Enriches new leads with company details, scores them against your criteria, and routes qualified leads to the right salesperson.', 'Sales teams waste time researching and qualifying leads by hand.

What it does:
- Adds company and role details
- Scores leads against your rules
- Assigns an owner
- Alerts the team in Slack

What it does not do:
- Buy or scrape contact lists
- Contact leads automatically

Example input: A new lead with a name and work email.
Example output: The lead with company size, industry, a score from 0–100, and an assigned owner.',
    (select id from product_categories where slug = 'lead-generation'), 18900, 'EUR',
    '/images/product-lead-enrichment-qualification.jpg', 'intermediate', '{n8n}', array['HubSpot','Google Sheets','Email','Slack']::text[],
    'Accounts: HubSpot or Google Sheets, Slack workspace, OpenAI API key. n8n 1.x, self-hosted or n8n Cloud.', '1. Import the workflow JSON into n8n (Workflows > Import from file).
2. Create the credentials listed in the prerequisites.
3. Fill in the configuration values from your dashboard.
4. Run the workflow once with the sample input and check the output.',
    'Email support for installation questions within 3 business days.',
    array['single_business', 'commercial']::license_type[], 'configurable', array['lead scoring','qualification','enrichment','routing']::text[],
    'published', false, true, now(), now() - interval '3 days', 0
  from seller_profiles s where s.slug = 'demo-flowsmith'
  returning id
), v as (
  insert into product_versions (product_id, version, changelog, status)
  select id, '1.0.0', 'First release.', 'approved' from p returning id, product_id
)
update products set current_version_id = v.id from v where products.id = v.product_id;

with p as (
  insert into products (seller_id, ownership, slug, name, short_description, description, category_id, price_minor, currency,
    thumbnail_path, difficulty, platforms, integrations, prerequisites, install_instructions, support_policy,
    license_types, customization_mode, tags, status, is_featured, is_demo, rights_confirmed_at, published_at, sales_count)
  select s.id, 'platform', 'social-media-content-scheduler', 'Social Media Content Scheduler', 'Turns a content calendar into ready-to-post captions and publishes them on schedule across your social accounts.', 'Posting consistently across platforms takes hours every week.

What it does:
- Reads your content calendar
- Drafts captions and hashtags in your brand voice
- Sends posts for approval
- Publishes at the scheduled time

What it does not do:
- Create images or videos
- Reply to comments or messages

Example input: A calendar row: topic, platform, date, image link.
Example output: An approved caption with hashtags, published at the scheduled time.',
    (select id from product_categories where slug = 'social-media'), 12900, 'EUR',
    '/images/product-social-media-content-scheduler.jpg', 'beginner', '{n8n}', array['Google Sheets','Instagram','Facebook','LinkedIn']::text[],
    'Accounts: Google account, Meta Business account, LinkedIn page, OpenAI API key. n8n 1.x, self-hosted or n8n Cloud.', '1. Import the workflow JSON into n8n (Workflows > Import from file).
2. Create the credentials listed in the prerequisites.
3. Fill in the configuration values from your dashboard.
4. Run the workflow once with the sample input and check the output.',
    'Email support for installation questions within 3 business days.',
    array['single_business', 'commercial']::license_type[], 'ready_to_use', array['social media','content calendar','captions','publishing']::text[],
    'published', true, true, now(), now() - interval '6 days', 0
  from seller_profiles s where s.slug = 'ranime-jemal-agency'
  returning id
), v as (
  insert into product_versions (product_id, version, changelog, status)
  select id, '1.0.0', 'First release.', 'approved' from p returning id, product_id
)
update products set current_version_id = v.id from v where products.id = v.product_id;

with p as (
  insert into products (seller_id, ownership, slug, name, short_description, description, category_id, price_minor, currency,
    thumbnail_path, difficulty, platforms, integrations, prerequisites, install_instructions, support_policy,
    license_types, customization_mode, tags, status, is_featured, is_demo, rights_confirmed_at, published_at, sales_count)
  select s.id, 'third_party', 'review-reputation-monitor', 'Review & Reputation Monitor', 'Collects new customer reviews, flags negative ones, and drafts polite responses for your approval.', 'Unanswered reviews hurt your reputation, and checking every platform is tedious.

What it does:
- Detects new reviews
- Classifies sentiment
- Drafts responses
- Alerts you about negative reviews

What it does not do:
- Post replies without approval
- Remove or hide reviews

Example input: A new 2-star Google review.
Example output: A Slack alert with the review, its sentiment, and a suggested reply.',
    (select id from product_categories where slug = 'social-media'), 10900, 'EUR',
    '/images/product-review-reputation-monitor.jpg', 'beginner', '{n8n}', array['Google Business Profile','Email','Slack']::text[],
    'Accounts: Google Business Profile, Slack or email, OpenAI API key. n8n 1.x, self-hosted or n8n Cloud.', '1. Import the workflow JSON into n8n (Workflows > Import from file).
2. Create the credentials listed in the prerequisites.
3. Fill in the configuration values from your dashboard.
4. Run the workflow once with the sample input and check the output.',
    'Email support for installation questions within 3 business days.',
    array['single_business', 'commercial']::license_type[], 'ready_to_use', array['reviews','reputation','customer feedback']::text[],
    'published', false, true, now(), now() - interval '9 days', 0
  from seller_profiles s where s.slug = 'demo-flowsmith'
  returning id
), v as (
  insert into product_versions (product_id, version, changelog, status)
  select id, '1.0.0', 'First release.', 'approved' from p returning id, product_id
)
update products set current_version_id = v.id from v where products.id = v.product_id;

with p as (
  insert into products (seller_id, ownership, slug, name, short_description, description, category_id, price_minor, currency,
    thumbnail_path, difficulty, platforms, integrations, prerequisites, install_instructions, support_policy,
    license_types, customization_mode, tags, status, is_featured, is_demo, rights_confirmed_at, published_at, sales_count)
  select s.id, 'platform', 'customer-support-ticket-triage', 'Customer Support Ticket Triage', 'Reads incoming support emails, categorizes and prioritizes them, suggests answers from your FAQ, and assigns them to your team.', 'Support inboxes fill up and urgent requests get lost among routine questions.

What it does:
- Categorizes and prioritizes tickets
- Suggests answers from your FAQ
- Assigns tickets to team members
- Logs every ticket

What it does not do:
- Send answers without human approval
- Process refunds or account changes

Example input: A customer email: “My order arrived damaged.”
Example output: Ticket tagged “Order issue — high priority”, assigned to support, with a suggested reply.',
    (select id from product_categories where slug = 'customer-support'), 17900, 'EUR',
    '/images/product-customer-support-ticket-triage.jpg', 'intermediate', '{n8n}', array['Email','Slack','Google Sheets']::text[],
    'Accounts: Email account, Slack workspace, Google account, OpenAI API key. n8n 1.x, self-hosted or n8n Cloud.', '1. Import the workflow JSON into n8n (Workflows > Import from file).
2. Create the credentials listed in the prerequisites.
3. Fill in the configuration values from your dashboard.
4. Run the workflow once with the sample input and check the output.',
    'Email support for installation questions within 3 business days.',
    array['single_business', 'commercial']::license_type[], 'configurable', array['support','tickets','helpdesk','faq']::text[],
    'published', true, true, now(), now() - interval '12 days', 0
  from seller_profiles s where s.slug = 'ranime-jemal-agency'
  returning id
), v as (
  insert into product_versions (product_id, version, changelog, status)
  select id, '1.0.0', 'First release.', 'approved' from p returning id, product_id
)
update products set current_version_id = v.id from v where products.id = v.product_id;

with p as (
  insert into products (seller_id, ownership, slug, name, short_description, description, category_id, price_minor, currency,
    thumbnail_path, difficulty, platforms, integrations, prerequisites, install_instructions, support_policy,
    license_types, customization_mode, tags, status, is_featured, is_demo, rights_confirmed_at, published_at, sales_count)
  select s.id, 'platform', 'ecommerce-order-inventory-sync', 'E-commerce Order & Inventory Sync', 'Syncs new orders and stock levels to a spreadsheet, alerts you on low stock, and sends order confirmations.', 'Manually tracking orders and stock leads to overselling and missed restocks.

What it does:
- Records every order
- Updates stock levels
- Sends low-stock alerts
- Sends daily sales summaries

What it does not do:
- Reorder stock from suppliers
- Change prices in your store

Example input: A new Shopify order for 3 items.
Example output: An order row in Google Sheets, updated stock counts, and an alert if any item is below threshold.',
    (select id from product_categories where slug = 'e-commerce'), 19900, 'EUR',
    '/images/product-ecommerce-order-inventory-sync.jpg', 'intermediate', '{n8n}', array['Shopify','Google Sheets','Email']::text[],
    'Accounts: Shopify store, Google account, Email account. n8n 1.x, self-hosted or n8n Cloud.', '1. Import the workflow JSON into n8n (Workflows > Import from file).
2. Create the credentials listed in the prerequisites.
3. Fill in the configuration values from your dashboard.
4. Run the workflow once with the sample input and check the output.',
    'Email support for installation questions within 3 business days.',
    array['single_business', 'commercial']::license_type[], 'configurable', array['orders','inventory','stock','shopify']::text[],
    'published', false, true, now(), now() - interval '15 days', 0
  from seller_profiles s where s.slug = 'ranime-jemal-agency'
  returning id
), v as (
  insert into product_versions (product_id, version, changelog, status)
  select id, '1.0.0', 'First release.', 'approved' from p returning id, product_id
)
update products set current_version_id = v.id from v where products.id = v.product_id;

with p as (
  insert into products (seller_id, ownership, slug, name, short_description, description, category_id, price_minor, currency,
    thumbnail_path, difficulty, platforms, integrations, prerequisites, install_instructions, support_policy,
    license_types, customization_mode, tags, status, is_featured, is_demo, rights_confirmed_at, published_at, sales_count)
  select s.id, 'third_party', 'abandoned-cart-recovery', 'Abandoned Cart Recovery', 'Sends personalized reminder emails to shoppers who left items in their cart.', 'Most online carts are abandoned before checkout.

What it does:
- Detects abandoned checkouts
- Waits a delay you choose
- Sends a personalized reminder
- Stops once the order is completed

What it does not do:
- Create discount codes automatically
- Email shoppers who did not consent to marketing

Example input: A checkout abandoned with 2 items.
Example output: A reminder email listing the items with a link back to the cart.',
    (select id from product_categories where slug = 'e-commerce'), 13900, 'EUR',
    '/images/product-abandoned-cart-recovery.jpg', 'beginner', '{n8n}', array['Shopify','Email']::text[],
    'Accounts: Shopify store, Email account. n8n 1.x, self-hosted or n8n Cloud.', '1. Import the workflow JSON into n8n (Workflows > Import from file).
2. Create the credentials listed in the prerequisites.
3. Fill in the configuration values from your dashboard.
4. Run the workflow once with the sample input and check the output.',
    'Email support for installation questions within 3 business days.',
    array['single_business', 'commercial']::license_type[], 'ready_to_use', array['abandoned cart','recovery','email marketing']::text[],
    'published', false, true, now(), now() - interval '18 days', 0
  from seller_profiles s where s.slug = 'demo-cartcraft'
  returning id
), v as (
  insert into product_versions (product_id, version, changelog, status)
  select id, '1.0.0', 'First release.', 'approved' from p returning id, product_id
)
update products set current_version_id = v.id from v where products.id = v.product_id;

with p as (
  insert into products (seller_id, ownership, slug, name, short_description, description, category_id, price_minor, currency,
    thumbnail_path, difficulty, platforms, integrations, prerequisites, install_instructions, support_policy,
    license_types, customization_mode, tags, status, is_featured, is_demo, rights_confirmed_at, published_at, sales_count)
  select s.id, 'platform', 'meeting-notes-task-assistant', 'Meeting Notes & Task Assistant', 'Summarizes meeting transcripts, extracts action items, and creates tasks for each owner.', 'Decisions and action items from meetings get forgotten.

What it does:
- Summarizes transcripts
- Extracts decisions and action items
- Creates tasks in Notion
- Shares the summary in Slack

What it does not do:
- Record or transcribe meetings
- Join calls

Example input: A meeting transcript saved to Google Drive.
Example output: A summary page in Notion, a task for each action item, and a Slack message to attendees.',
    (select id from product_categories where slug = 'productivity'), 11900, 'EUR',
    '/images/product-meeting-notes-task-assistant.jpg', 'beginner', '{n8n}', array['Google Drive','Notion','Slack']::text[],
    'Accounts: Google account, Notion workspace, Slack workspace, OpenAI API key. n8n 1.x, self-hosted or n8n Cloud.', '1. Import the workflow JSON into n8n (Workflows > Import from file).
2. Create the credentials listed in the prerequisites.
3. Fill in the configuration values from your dashboard.
4. Run the workflow once with the sample input and check the output.',
    'Email support for installation questions within 3 business days.',
    array['single_business', 'commercial']::license_type[], 'ready_to_use', array['meetings','notes','tasks','summary']::text[],
    'published', false, true, now(), now() - interval '21 days', 0
  from seller_profiles s where s.slug = 'ranime-jemal-agency'
  returning id
), v as (
  insert into product_versions (product_id, version, changelog, status)
  select id, '1.0.0', 'First release.', 'approved' from p returning id, product_id
)
update products set current_version_id = v.id from v where products.id = v.product_id;

with p as (
  insert into products (seller_id, ownership, slug, name, short_description, description, category_id, price_minor, currency,
    thumbnail_path, difficulty, platforms, integrations, prerequisites, install_instructions, support_policy,
    license_types, customization_mode, tags, status, is_featured, is_demo, rights_confirmed_at, published_at, sales_count)
  select s.id, 'platform', 'invoice-receipt-data-extraction', 'Invoice & Receipt Data Extraction', 'Extracts supplier, amounts, dates, and tax from invoices and receipts and records them in a spreadsheet.', 'Typing invoice data by hand is slow and error-prone.

What it does:
- Reads PDF and image invoices
- Extracts key fields
- Flags missing or suspicious values
- Records data in Google Sheets

What it does not do:
- Pay invoices
- Replace your accountant or file taxes

Example input: A PDF invoice emailed to your accounts inbox.
Example output: A spreadsheet row with supplier, invoice number, date, subtotal, tax, and total.',
    (select id from product_categories where slug = 'finance-administration'), 22900, 'EUR',
    '/images/product-invoice-receipt-data-extraction.jpg', 'intermediate', '{n8n}', array['Email','Google Drive','Google Sheets']::text[],
    'Accounts: Email account, Google account, OpenAI API key. n8n 1.x, self-hosted or n8n Cloud.', '1. Import the workflow JSON into n8n (Workflows > Import from file).
2. Create the credentials listed in the prerequisites.
3. Fill in the configuration values from your dashboard.
4. Run the workflow once with the sample input and check the output.',
    'Email support for installation questions within 3 business days.',
    array['single_business', 'commercial']::license_type[], 'configurable', array['invoices','receipts','accounting','documents','ocr']::text[],
    'published', true, true, now(), now() - interval '24 days', 0
  from seller_profiles s where s.slug = 'ranime-jemal-agency'
  returning id
), v as (
  insert into product_versions (product_id, version, changelog, status)
  select id, '1.0.0', 'First release.', 'approved' from p returning id, product_id
)
update products set current_version_id = v.id from v where products.id = v.product_id;

with p as (
  insert into products (seller_id, ownership, slug, name, short_description, description, category_id, price_minor, currency,
    thumbnail_path, difficulty, platforms, integrations, prerequisites, install_instructions, support_policy,
    license_types, customization_mode, tags, status, is_featured, is_demo, rights_confirmed_at, published_at, sales_count)
  select s.id, 'platform', 'security-alert-triage-reporting', 'Security Alert Triage & Reporting', 'Collects security alerts, removes duplicates, rates severity, and sends a clear summary to your IT team.', 'Alert fatigue makes it hard to spot the incidents that matter.

What it does:
- Receives alerts by webhook or email
- Groups duplicates
- Rates severity with your rules
- Sends summaries and urgent alerts

What it does not do:
- Block traffic or change systems
- Replace a security team

Example input: Several alerts from your monitoring tool for the same host.
Example output: One grouped incident rated “High”, posted to the IT Slack channel.',
    (select id from product_categories where slug = 'cybersecurity'), 34900, 'EUR',
    '/images/product-security-alert-triage-reporting.jpg', 'advanced', '{n8n}', array['Webhook','Email','Slack']::text[],
    'Accounts: Monitoring tool with webhooks, Slack workspace, Email account. n8n 1.x, self-hosted or n8n Cloud.', '1. Import the workflow JSON into n8n (Workflows > Import from file).
2. Create the credentials listed in the prerequisites.
3. Fill in the configuration values from your dashboard.
4. Run the workflow once with the sample input and check the output.',
    'Email support for installation questions within 3 business days.',
    array['single_business', 'commercial']::license_type[], 'guided_setup', array['security','alerts','incident','soc','it']::text[],
    'published', false, true, now(), now() - interval '27 days', 0
  from seller_profiles s where s.slug = 'ranime-jemal-agency'
  returning id
), v as (
  insert into product_versions (product_id, version, changelog, status)
  select id, '1.0.0', 'First release.', 'approved' from p returning id, product_id
)
update products set current_version_id = v.id from v where products.id = v.product_id;

with p as (
  insert into products (seller_id, ownership, slug, name, short_description, description, category_id, price_minor, currency,
    thumbnail_path, difficulty, platforms, integrations, prerequisites, install_instructions, support_policy,
    license_types, customization_mode, tags, status, is_featured, is_demo, rights_confirmed_at, published_at, sales_count)
  select s.id, 'third_party', 'website-uptime-incident-notifier', 'Website Uptime & Incident Notifier', 'Checks your websites on a schedule and notifies your team when a site goes down or recovers.', 'Downtime often goes unnoticed until customers complain.

What it does:
- Checks URLs on a schedule
- Detects downtime and slow responses
- Notifies your team
- Logs incidents

What it does not do:
- Fix the outage
- Monitor servers that aren''t reachable from the internet

Example input: A list of website URLs.
Example output: A Telegram message when a site is down, and another when it recovers.',
    (select id from product_categories where slug = 'cybersecurity'), 10000, 'EUR',
    '/images/product-website-uptime-incident-notifier.jpg', 'beginner', '{n8n}', array['Webhook','Email','Slack','Telegram']::text[],
    'Accounts: Slack, Telegram, or email. n8n 1.x, self-hosted or n8n Cloud.', '1. Import the workflow JSON into n8n (Workflows > Import from file).
2. Create the credentials listed in the prerequisites.
3. Fill in the configuration values from your dashboard.
4. Run the workflow once with the sample input and check the output.',
    'Email support for installation questions within 3 business days.',
    array['single_business', 'commercial']::license_type[], 'ready_to_use', array['uptime','monitoring','downtime','it']::text[],
    'published', false, true, now(), now() - interval '30 days', 0
  from seller_profiles s where s.slug = 'demo-cartcraft'
  returning id
), v as (
  insert into product_versions (product_id, version, changelog, status)
  select id, '1.0.0', 'First release.', 'approved' from p returning id, product_id
)
update products set current_version_id = v.id from v where products.id = v.product_id;

insert into product_manifests (version_id, schema_version, manifest)
select v.id, 1, '{
  "schemaVersion": 1, "productType": "n8n-workflow", "workflowVersion": "1.0.0",
  "settings": [
    {"key": "business_name", "label": "Business name", "type": "text", "required": true},
    {"key": "notification_email", "label": "Notification email", "type": "email", "required": true},
    {"key": "lead_source", "label": "Lead source", "type": "select", "required": true,
     "options": [{"label": "Website form", "value": "website"}, {"label": "CRM", "value": "crm"}]}
  ]}'::jsonb
from product_versions v join products p on p.id = v.product_id where p.slug = 'ai-lead-management-assistant';
