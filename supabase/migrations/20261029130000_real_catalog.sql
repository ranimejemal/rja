-- The whole catalog becomes real Ranime Jemal Agency listings, each backed by a built n8n workflow
-- (automations/ in the repo). Until online payments are switched on, every listing is sold by quote:
-- the product page shows the quote form instead of checkout.

-- 1. Listings from the sample creators move to the platform store; the sample creators are removed.
update products set seller_id = (select id from seller_profiles where is_platform), ownership = 'platform'
where seller_id in (select id from seller_profiles where is_demo and not is_platform);
delete from seller_profiles where is_demo and not is_platform;

-- 2. "Security Alert Triage & Reporting" is delivered by the AI Security Monitoring setup (top 7): archive the duplicate.
update products set status = 'archived', is_featured = false where slug = 'security-alert-triage-reporting';

-- 3. Catalog listings: descriptions that match the workflows, setup by quote, one price range each.
create temporary table catalog_update (slug text, short text, description text, price integer, label text, audience text,
  integrations text[], prerequisites text, difficulty difficulty);
insert into catalog_update values
('ai-lead-management-assistant', 'Sorts every enquiry from your inbox and website form: category, priority and summary, logged in a sheet, with a reply drafted in Gmail for you to send.',
'Enquiries arrive in several places and the important ones get lost. This assistant reads each one and gets it ready for you.

What it does:
- Reads new emails in your inbox and enquiries from your website form
- Sorts each one into your categories, sets a priority and writes a one-line summary
- Spots spam and newsletters
- Drafts a reply in the same Gmail thread, ready for you to check and send
- Logs every enquiry in Google Sheets and alerts you about high-priority ones

What it does not do: send replies on its own. You stay in control of every answer.',
25000, '$250–$900 setup', 'Small businesses, agencies, consultants', array['Gmail','Website forms','Google Sheets','OpenAI']::text[],
'A Gmail or Google Workspace inbox, a Google Sheet and an OpenAI API key.', 'beginner'),
('lead-enrichment-qualification', 'Reads each new lead''s company website, describes the company, scores the fit against your ideal customer and sends qualified leads to the right salesperson.',
'Sales teams lose time researching leads that were never a fit. This automation does the research first.

What it does:
- Finds the company website from the lead''s website field or email domain (free email addresses are skipped)
- Has the AI describe the company: industry, size, what they do
- Scores the fit from 0 to 100 against your ideal customer, with the reason
- Routes qualified leads to a salesperson by keyword rules (for example real estate to Anna)
- Logs every lead, qualified or not, in Google Sheets',
28000, '$280–$950 setup', 'B2B sales teams, agencies, SaaS', array['Website forms','Webhook','Google Sheets','Gmail','OpenAI']::text[],
'A Google Sheet, Gmail and an OpenAI API key. Leads arrive by form or webhook from your website or CRM.', 'intermediate'),
('social-media-content-scheduler', 'Publishes the posts you write in a Google Sheet at the time you choose, to Facebook, Instagram and LinkedIn, and records the result.',
'You write the posts; the scheduler publishes them on time on every network.

What it does:
- Reads your schedule from a Google Sheet (one column per network)
- Every hour publishes the next post whose time has come to Facebook, Instagram (with an image) and LinkedIn; X is optional
- Writes the result per network back to the sheet: published, partly published or failed, with the error
- One network failing never stops the others

For AI-written posts, AI images and automatic replies, see AI Social Media Automation.',
12000, '$120–$450 setup', 'Freelancers, small brands, local businesses', array['Google Sheets','Facebook','Instagram','LinkedIn','X']::text[],
'A Facebook page with a linked Instagram business account, a LinkedIn company page and a Google Sheet.', 'beginner'),
('review-reputation-monitor', 'Checks your Google reviews every morning, has the AI rate each new review and draft a public reply, alerts you about low ratings and sends a daily digest.',
'Unanswered bad reviews cost customers. This monitor makes sure you never miss one.

What it does:
- Reads your Google Business reviews every morning (Google Places API) and keeps only new ones
- Rates the sentiment, summarizes each review and lists its topics
- Drafts a polite public reply that never argues, promises compensation or admits fault
- Emails you at once about low ratings, with the suggested reply
- Sends a daily digest and logs everything in Google Sheets

Google returns up to 5 reviews per check, so a very busy place can miss some. Replies are posted by you.',
18000, '$180–$600 setup', 'Restaurants, hotels, clinics, shops', array['Google Places API','Google Sheets','Gmail','OpenAI']::text[],
'A Google Business Profile, a Google Cloud API key with the Places API, a Google Sheet, Gmail and an OpenAI API key.', 'beginner'),
('customer-support-ticket-triage', 'Turns every support email into a triaged ticket (category, urgency, sentiment, language) with a reply drafted from your policies, and alerts on urgent ones.',
'Support inboxes mix urgent problems with simple questions. This triage puts the urgent ones first.

What it does:
- Reads every email reaching your support inbox
- Sets category, urgency (urgent to low), sentiment and language, and writes a summary
- Logs it as a ticket in Google Sheets
- Drafts a reply in the same Gmail thread using only your own policies
- Alerts the person on duty about urgent and high-urgency tickets

Nothing is sent to customers automatically.',
26000, '$260–$1,100 setup', 'E-commerce stores, SaaS, service companies', array['Gmail','Google Sheets','OpenAI']::text[],
'A support mailbox on Gmail or Google Workspace, a Google Sheet and an OpenAI API key.', 'intermediate'),
('ecommerce-order-inventory-sync', 'Logs every Shopify or WooCommerce order, reduces stock per SKU in your inventory sheet and alerts you about low stock and unknown products.',
'Selling on a store while tracking stock in a spreadsheet leads to overselling. This sync keeps the sheet right.

What it does:
- Receives every new order from Shopify or WooCommerce
- Logs the order (number, customer, total, items)
- Reduces the stock of each SKU sold in your Google Sheet inventory
- Emails you when a product reaches its low-stock threshold, or when an order contains a SKU that is not in the sheet

Refunds and restocks are adjusted by you in the sheet.',
35000, '$350–$1,400 setup', 'Online stores on Shopify or WooCommerce', array['Shopify','WooCommerce','Google Sheets','Gmail']::text[],
'A Shopify store (custom app access token) or a WooCommerce store (REST API key), a Google Sheet and Gmail.', 'intermediate'),
('abandoned-cart-recovery', 'Tracks Shopify checkouts and sends friendly AI-written reminders to customers who left items behind, stopping as soon as they order.',
'Most carts are abandoned. A timely, personal reminder brings a share of those sales back.

What it does:
- Saves every Shopify checkout in a Google Sheet
- Every hour emails customers whose cart is still open: first after 1 hour, then every 24 hours, up to your limit
- The AI writes each email from the items in the cart, in your brand voice, with the link to finish the order
- Offers your discount code only from the second reminder (optional)
- Marks the cart recovered as soon as the order is placed, so reminders stop

Only email customers who agreed to marketing emails where the law requires it.',
32000, '$320–$1,200 setup', 'Shopify stores', array['Shopify','Gmail','Google Sheets','OpenAI']::text[],
'A Shopify store (custom app access token with checkout and order access), Gmail, a Google Sheet and an OpenAI API key.', 'intermediate'),
('meeting-notes-task-assistant', 'Turns a meeting transcript or rough notes into a summary, decisions, action items and open questions, emailed to attendees and added to a task sheet.',
'Meetings end and the action items get forgotten. This assistant writes them down and sends them out.

What it does:
- Takes a transcript or notes from a simple form, or from your recording tool by webhook
- Writes the summary, the decisions, the action items (with owner and due date when they were said) and open questions
- Emails the notes to every attendee
- Adds each action item to a Tasks sheet

It only writes what was said: no invented tasks or dates.',
15000, '$150–$500 setup', 'Teams, agencies, consultants', array['Form','Webhook','Gmail','Google Sheets','OpenAI']::text[],
'Gmail, a Google Sheet and an OpenAI API key. Optional: a recording tool that can send transcripts by webhook.', 'beginner'),
('invoice-receipt-data-extraction', 'Watches a Google Drive folder for invoices and receipts, extracts and checks the data with AI, logs it in a sheet and files the document.',
'Drop the documents in a folder; the data appears in a spreadsheet, checked.

What it does:
- Watches a Google Drive inbox folder for PDFs and photos of invoices and receipts
- Extracts supplier, VAT ID, number, dates, currency, subtotal, VAT, total and line items, including from scans and photos
- Checks that totals add up and flags missing or unclear values
- Logs each document in Google Sheets and moves it to a processed folder
- Emails you the documents that need a human check

For documents arriving by email, see AI Document Processing.',
27000, '$270–$1,300 setup', 'Accountants, bookkeepers, property managers', array['Google Drive','Google Sheets','Gmail','OpenAI']::text[],
'Google Drive, a Google Sheet, Gmail and an OpenAI API key.', 'beginner'),
('website-uptime-incident-notifier', 'Checks your websites every 5 minutes, emails a DOWN alert after confirmed failures and a RECOVERED notice with the downtime, and logs every incident.',
'Find out your site is down before your customers tell you.

What it does:
- Checks each website every 5 minutes, optionally that a key text (for example "Add to cart") is on the page
- Sends a DOWN alert only after two failed checks in a row, to avoid false alarms
- Sends a RECOVERED notice with the downtime in minutes
- Logs every incident in Google Sheets',
10000, '$100–$300 setup', 'Any business with a website or online shop', array['Google Sheets','Gmail']::text[],
'A Google Sheet and Gmail. n8n should run somewhere other than the websites it watches.', 'beginner');

update products p set
  short_description = c.short, description = c.description, price_minor = c.price, currency = 'USD', price_label = c.label,
  audience = c.audience, integrations = c.integrations, prerequisites = c.prerequisites, difficulty = c.difficulty,
  customization_mode = 'paid_service', license_types = array['single_business']::license_type[], quote_only = true, is_demo = false,
  status = 'published', published_at = coalesce(p.published_at, now()), rights_confirmed_at = coalesce(p.rights_confirmed_at, now()),
  install_instructions = 'Done-for-you setup by the Ranime Jemal Agency team:
1. Short call: your tools, accounts and goals.
2. Written scope and fixed quote.
3. We install the workflow in your n8n and connect your accounts.
4. Testing with your real data.
5. Handover: walkthrough, setup guide and the workflow file.',
  support_policy = 'Includes 30 days of fixes after handover. Ongoing maintenance is available on a monthly plan.',
  updated_at = now()
from catalog_update c where p.slug = c.slug;
drop table catalog_update;

-- 4. Social media automation: now with AI images and replies to comments and messages.
update products set
  short_description = 'Writes a week of posts with AI images, asks for approval, publishes them on schedule, and answers comments and messages in your brand voice.',
  description = 'Posting and answering every day takes hours. This automation does both, with you in control.

What it does:
- Turns topics from your content plan into posts for Instagram, Facebook, LinkedIn and X, in your brand voice
- Creates an AI image for each post that does not have one
- Sends the drafts for approval before anything goes live
- Publishes approved posts on schedule and records the result per network
- Answers comments and direct messages on Facebook and Instagram from the facts you give it
- Sends complaints, refunds and anything uncertain to you with a suggested reply, and ignores spam

Monthly plan: setup plus content runs, monitoring and adjustments each month.

Who buys it: brands and marketing agencies.',
  integrations = array['Instagram','Facebook','LinkedIn','X','Google Sheets','OpenAI']::text[],
  updated_at = now()
where slug = 'ai-social-media-automation';

-- 5. The security suite.
insert into products (seller_id, ownership, slug, name, short_description, description, category_id, price_minor, currency,
  thumbnail_path, difficulty, platforms, integrations, prerequisites, install_instructions, support_policy, license_types,
  customization_mode, tags, status, is_featured, is_demo, rights_confirmed_at, published_at, audience, price_label, quote_only)
select s.id, 'platform', v.slug, v.name, v.short, v.description, (select id from product_categories where slug = 'cybersecurity'), v.price, 'USD',
  '/images/product-' || v.slug || '.jpg', v.difficulty::difficulty, '{n8n}', v.integrations, v.prerequisites,
  'Done-for-you setup by the Ranime Jemal Agency team:
1. Short call: your systems, accounts and who should get alerts.
2. Written scope and fixed quote.
3. We install the workflow in your n8n and connect your accounts.
4. Testing with real data.
5. Handover: walkthrough, setup guide and the workflow file.',
  'Includes 30 days of fixes after handover. Ongoing monitoring support is available on a monthly plan.',
  array['single_business']::license_type[], 'paid_service', v.tags, 'published', true, false, now(), now(), v.audience, v.label, true
from seller_profiles s
cross join (values
  ('phishing-email-analyzer', 'Phishing Email Analyzer', 45000, '$450–$1,800 setup', 'Companies with email users, IT teams, MSPs', 'intermediate',
   'Employees forward suspicious emails; every link is checked on VirusTotal, the AI gives a verdict, the employee gets clear advice in minutes and the security team is alerted about phishing.',
   'Phishing is the most common way into a company. This analyzer turns every employee into an early warning.

What it does:
- Employees forward suspicious emails to one reporting address
- Every link is checked on VirusTotal; a link flagged as malicious always means phishing
- The AI judges the email: phishing, suspicious, spam or safe, with the reasons
- The employee gets a reply within minutes with the verdict and what to do
- The security team gets an alert with concrete actions (block the domain, search other mailboxes, reset passwords)
- Every report is logged',
   array['Gmail','VirusTotal','Google Sheets','OpenAI']::text[], 'A reporting mailbox on Google Workspace, a VirusTotal API key (free tier works), a Google Sheet and an OpenAI API key.',
   array['phishing','email security','virustotal','security awareness']::text[]),
  ('website-security-ssl-scanner', 'Website Security & SSL Scanner', 22000, '$220–$700 setup', 'Businesses with websites or web shops, agencies', 'beginner',
   'Every week grades your websites from A to F on HTTPS, security headers, cookies, version leaks and certificate expiry, with the exact fixes. Includes an on-demand scan form.',
   'Most websites are missing basic protections that take minutes to fix. This scanner tells you which ones, every week.

What it does:
- Checks each website weekly: HTTPS, redirect from HTTP, HSTS, Content-Security-Policy, clickjacking protection, other security headers, cookie flags and leaked software versions
- Warns before the SSL certificate expires
- Gives each site a grade from A to F and the exact fix for every failed check
- Emails the report and logs every scan
- Includes a "free security check" form that emails a report to whoever asks

Checks are passive: public responses only, nothing is attacked.',
   array['Google Sheets','Gmail','crt.sh']::text[], 'A Google Sheet and Gmail.',
   array['website security','ssl','security headers','certificate']::text[]),
  ('vulnerability-watch-cve-kev', 'Vulnerability Watch (CVE + CISA KEV)', 40000, '$400–$1,500 setup', 'IT teams, MSPs, companies with servers or firewalls', 'intermediate',
   'Every morning checks actively exploited vulnerabilities (CISA KEV) and new CVEs (NVD) against the products you use, and emails an AI advisory with what to patch first.',
   'New vulnerabilities appear every day. This watch tells you only about the ones that concern you.

What it does:
- Reads the CISA catalog of vulnerabilities exploited in the wild and the new CVEs from the NIST NVD every morning
- Keeps those that match your watchlist (your firewall, mail server, CMS, VPN and so on) and your minimum severity
- The AI writes a short advisory for your environment: what is affected, how urgent, what to do
- Exploited vulnerabilities come first, with CISA''s due date
- Only new matches are reported; everything is logged',
   array['CISA KEV','NIST NVD','Google Sheets','Gmail','OpenAI']::text[], 'A Google Sheet, Gmail and an OpenAI API key. The vulnerability sources are public.',
   array['vulnerability management','cve','patching','cisa kev']::text[]),
  ('data-breach-monitor', 'Data Breach Monitor', 30000, '$300–$900 setup', 'Companies of any size, HR and IT teams', 'beginner',
   'Every week checks your team''s email addresses against Have I Been Pwned, reports new breaches with what was exposed and what to do, and can notify each affected person.',
   'Stolen passwords from other sites are used to break into company accounts. This monitor tells you when your team is affected.

What it does:
- Checks each work email address against Have I Been Pwned every week
- Reports only new breaches, with the kind of data exposed (passwords, phone numbers, addresses…)
- Gives clear advice, for example change the password everywhere it was reused and turn on two-factor authentication
- Sends the security contact a summary, flagging exposed passwords
- Optionally sends each affected person a short personal notice',
   array['Have I Been Pwned','Google Sheets','Gmail']::text[], 'A Have I Been Pwned API key (paid, from a few dollars a month), a Google Sheet and Gmail.',
   array['data breach','credentials','have i been pwned','account security']::text[]),
  ('lookalike-domain-monitor', 'Lookalike Domain Monitor', 26000, '$260–$850 setup', 'Brands, banks, e-commerce, any company targeted by impersonation', 'beginner',
   'Every day searches public certificate logs for new domains that imitate your brand (acme-login.com, acrne.com, lookalike characters) and alerts you with a risk level.',
   'Phishing sites need a domain that looks like yours, and they usually get a certificate first. This monitor spots them early.

What it does:
- Searches public Certificate Transparency logs every day for domains containing or imitating your brand
- Ignores your own domains and an allowlist of partners
- Rates each new domain: lookalike spelling, lookalike characters (punycode), phishing words like login or verify
- Emails new domains with their risk level and logs them
- Tells you what to do: block, warn staff, report for takedown',
   array['crt.sh','Google Sheets','Gmail']::text[], 'A Google Sheet and Gmail.',
   array['brand protection','phishing domains','typosquatting','certificate transparency']::text[])
) as v(slug, name, price, label, audience, difficulty, short, description, integrations, prerequisites, tags)
where s.is_platform
on conflict (slug) do nothing;
