-- Top 7 AI automations for 2026: done-for-you setup services from the platform store, sold by quote.
-- top_rank, audience, price_label and quote_only are set by the platform only (no column grants for sellers).

alter table products
  add column top_rank smallint unique check (top_rank between 1 and 20),
  add column audience text not null default '' check (length(audience) <= 200),
  add column price_label text check (length(price_label) <= 60),
  add column quote_only boolean not null default false;

comment on column products.top_rank is 'Position in the home page "Top automations" ranking; null = not ranked.';
comment on column products.price_label is 'Shown instead of the single price, e.g. "$300–$1,500 setup".';
comment on column products.quote_only is 'Sold by quote: no checkout, buyers request a quote.';

-- Quote-only products cannot go through checkout: the price depends on the scope agreed with the buyer.
create or replace function create_order(p_items jsonb, p_license_agreement_id uuid, p_provider text)
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
    if p.quote_only then raise exception '% is sold by quote; request a quote instead', p.name; end if;
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

insert into products (seller_id, ownership, slug, name, short_description, description, category_id, price_minor, currency,
  thumbnail_path, difficulty, platforms, integrations, prerequisites, install_instructions, support_policy,
  license_types, customization_mode, tags, status, is_featured, is_demo, rights_confirmed_at, published_at,
  top_rank, audience, price_label, quote_only)
select s.id, 'platform', v.slug, v.name, v.short, v.description, c.id, v.price_minor, 'USD',
  '/images/product-' || v.slug || '.jpg', v.difficulty::difficulty, '{n8n}', v.integrations, v.prerequisites,
  'Done-for-you setup by the Ranime Jemal Agency team:
1. Discovery call: your process, tools and goals.
2. Written scope and fixed quote.
3. Build and connect the automation in your accounts.
4. Testing with your real data.
5. Handover: walkthrough, documentation and admin access.',
  'Includes 30 days of fixes after handover. Ongoing maintenance is available on a monthly plan.',
  array['single_business']::license_type[], 'paid_service', v.tags, 'published', true, false, now(), now(),
  v.rank, v.audience, v.price_label, true
from (values
  (1, 'ai-lead-generation-follow-up', 'AI Lead Generation & Follow-up', 'lead-generation', 30000, '$300–$1,500 setup',
   'Agencies, real estate, consultants',
   'Captures leads from your website, ads and social channels, qualifies them with AI, and follows up automatically until they book a call.',
   'Leads go cold when nobody replies within minutes. This automation answers every new lead straight away and keeps following up.

What it does:
- Captures leads from website forms, Facebook/Instagram lead ads and email
- Scores and tags each lead with AI against your criteria
- Sends a personalised first reply within minutes
- Runs a follow-up sequence by email or WhatsApp until the lead replies or books
- Records everything in your CRM or Google Sheets and alerts your team about hot leads

Who buys it: agencies, real estate agents and consultants.',
   'intermediate', array['Website forms','Meta Lead Ads','Gmail','WhatsApp','HubSpot','Google Sheets','OpenAI']::text[],
   'A CRM or Google Sheet, an email account, an OpenAI API key. WhatsApp follow-up needs a WhatsApp Business account.',
   array['lead generation','follow-up','crm','real estate']::text[]),
  (2, 'ai-customer-service-chatbot', 'AI Customer Service Chatbot', 'chatbots', 20000, '$200–$1,000 setup',
   'E-commerce, service businesses',
   'A chatbot trained on your own FAQs, policies and products that answers customers 24/7 on your website, WhatsApp or Instagram, and hands off to a human when needed.',
   'Most customer questions are the same few: delivery, returns, prices, opening hours. This chatbot answers them instantly from your own content.

What it does:
- Answers from your FAQs, policies, product catalogue and documents
- Works on your website chat, WhatsApp and Instagram DMs
- Looks up order status in Shopify or WooCommerce (e-commerce setups)
- Hands the conversation to your team when it is unsure or the customer asks
- Logs conversations so you can see what customers ask most

Who buys it: e-commerce stores and service businesses.',
   'intermediate', array['Website chat','WhatsApp','Instagram','Shopify','WooCommerce','OpenAI']::text[],
   'Your FAQ and policy content, an OpenAI API key, and access to the channels you want covered.',
   array['chatbot','customer service','faq','e-commerce']::text[]),
  (3, 'ai-appointment-booking', 'AI Appointment Booking', 'business-operations', 20000, '$200–$800 setup',
   'Salons, clinics, consultants',
   'Lets clients book, reschedule and cancel by chat or message, checks your real availability, and sends reminders to cut no-shows.',
   'Phone tag and no-shows cost appointment businesses hours every week. This automation books clients into your real calendar and reminds them.

What it does:
- Takes booking requests from your website, WhatsApp or Instagram
- Checks live availability in Google Calendar or Calendly
- Confirms, reschedules and cancels without staff involvement
- Sends reminders by SMS, WhatsApp or email before each appointment
- Collects intake details before the visit

Who buys it: salons, clinics and consultants.',
   'beginner', array['Google Calendar','Calendly','WhatsApp','Twilio SMS','Gmail','OpenAI']::text[],
   'A Google Calendar or Calendly account. SMS reminders need a Twilio account.',
   array['booking','appointments','reminders','salon','clinic']::text[]),
  (4, 'ai-social-media-automation', 'AI Social Media Automation', 'social-media', 15000, '$150–$600/month',
   'Brands, marketing agencies',
   'Plans, writes and schedules posts across your social channels from a simple content calendar, with an approval step before anything goes live.',
   'Posting consistently takes time most teams do not have. This automation turns a content calendar into ready-to-approve posts.

What it does:
- Turns topics from your content calendar into captions in your brand voice
- Adapts each post for Instagram, Facebook, LinkedIn and X
- Suggests hashtags and posting times
- Sends drafts for approval before publishing
- Publishes on schedule and reports basic engagement each week

Monthly plan: setup plus content runs, monitoring and adjustments each month.

Who buys it: brands and marketing agencies.',
   'beginner', array['Instagram','Facebook','LinkedIn','X','Google Sheets','Notion','OpenAI']::text[],
   'Admin access to your social accounts and an OpenAI API key.',
   array['social media','content','scheduling','marketing']::text[]),
  (5, 'ai-voice-receptionist', 'AI Voice Receptionist', 'ai-agents', 30000, '$300–$1,500 setup',
   'Hotels, restaurants, service businesses',
   'An AI voice agent that answers your phone, handles common questions, takes bookings and messages, and passes urgent calls to your staff.',
   'Missed calls are missed bookings. This voice receptionist answers every call, day and night.

What it does:
- Answers calls in a natural voice, in the languages you choose
- Handles common questions: hours, prices, location, availability
- Takes reservations and appointments into your booking system
- Transfers urgent calls to your staff and takes messages otherwise
- Sends you a summary and transcript of every call

Who buys it: hotels, restaurants and service businesses.',
   'advanced', array['Twilio','Vapi','Retell AI','Google Calendar','OpenAI']::text[],
   'A phone number (new or forwarded), a voice AI provider account, and your booking system access. Call minutes are billed by those providers.',
   array['voice agent','receptionist','phone','hotel','restaurant']::text[]),
  (6, 'ai-document-processing', 'AI Document Processing', 'data-processing', 30000, '$300–$2,000 setup',
   'Accounting firms, property businesses',
   'Reads invoices, receipts, contracts and forms, extracts the data you need, checks it, and sends it to your accounting software or spreadsheets.',
   'Typing data from documents is slow and error-prone. This automation extracts it for you and flags anything that needs a human check.

What it does:
- Collects documents from email, Google Drive or an upload form
- Extracts fields with AI: amounts, dates, parties, line items, VAT
- Validates totals and flags missing or unusual values for review
- Sends clean data to your accounting software, CRM or Google Sheets
- Files the original document with a consistent name

Who buys it: accounting firms and property businesses.',
   'intermediate', array['Gmail','Google Drive','Google Sheets','Xero','QuickBooks','OpenAI']::text[],
   'Sample documents of each type, access to where they arrive, and to the system the data should go to.',
   array['documents','invoices','ocr','accounting','property']::text[]),
  (7, 'ai-security-monitoring-workflows', 'AI Security Monitoring Workflows', 'cybersecurity', 50000, '$500+ depending on scope',
   'Businesses with IT infrastructure',
   'Collects alerts from your servers, cloud and security tools, uses AI to triage and summarise them, and alerts the right person with clear next steps.',
   'Security tools produce more alerts than small teams can read. These workflows sort the noise from what needs action.

What it does:
- Collects alerts and logs from your servers, cloud accounts and security tools
- Enriches them with context (IP reputation, asset owner, recent changes)
- Triages and summarises each incident with AI, with a severity
- Alerts the right person on Slack, Teams or email, with suggested next steps
- Produces a weekly security summary

The scope and price depend on your infrastructure and the tools to connect.

Who buys it: businesses with IT infrastructure.',
   'advanced', array['Slack','Microsoft Teams','AWS','Google Cloud','Wazuh','VirusTotal','OpenAI']::text[],
   'Read access to the systems to monitor and a channel for alerts. Scope is agreed after a technical review.',
   array['security','monitoring','alerts','soc','it']::text[])
) as v(rank, slug, name, category, price_minor, price_label, audience, short, description, difficulty, integrations, prerequisites, tags)
join product_categories c on c.slug = v.category
cross join (select id from seller_profiles where is_platform) s;
