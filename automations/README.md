# Ranime Jemal Agency: automation workflows

Ready-to-import **n8n** workflows for every automation listed on the marketplace: the seven setup services
(the "Top 7 AI automations to sell in 2026", 01 to 07) and the rest of the catalog (08 to 18).
Each folder holds the workflow, the Google Sheet templates it uses, and a setup guide you can follow for each client.

### Top 7 setup services

| # | Folder | What it does | Accounts it needs |
|---|---|---|---|
| 1 | [01-ai-lead-generation-follow-up](01-ai-lead-generation-follow-up/) | Captures leads (form, webhook, Facebook Lead Ads), scores them with AI, replies within minutes, follows up until they answer, alerts you about hot leads | OpenAI, Gmail, Google Sheets (Facebook optional) |
| 2 | [02-ai-customer-service-chatbot](02-ai-customer-service-chatbot/) | Website chat that answers from the client's FAQ sheet and hands off to a person by email | OpenAI, Google Sheets, Gmail |
| 3 | [03-ai-appointment-booking](03-ai-appointment-booking/) | Chat that checks the real calendar, books, finds and cancels appointments, and emails reminders 24 h before | OpenAI, Google Calendar, Gmail |
| 4 | [04-ai-social-media-automation](04-ai-social-media-automation/) | Writes a week of posts from a content plan, asks for approval, publishes approved posts to Facebook, Instagram and LinkedIn (X optional) | OpenAI, Google Sheets, Gmail, Meta, LinkedIn |
| 5 | [05-ai-voice-receptionist](05-ai-voice-receptionist/) | Back office for a Vapi phone agent: free times, bookings, messages, call log and summary emails | Vapi, Google Calendar, Google Sheets, Gmail |
| 6 | [06-ai-document-processing](06-ai-document-processing/) | Reads invoices and receipts (PDF or photo) from email or an upload form, extracts and checks the data, files them in Drive, logs them in a sheet | OpenAI, Gmail, Google Drive, Google Sheets |
| 7 | [07-ai-security-monitoring-workflows](07-ai-security-monitoring-workflows/) | Receives alerts (Wazuh, Grafana/Alertmanager, AWS GuardDuty via EventBridge, any JSON), mutes repeats, checks IPs on VirusTotal, triages with AI, emails urgent ones, weekly summary | OpenAI, VirusTotal, Google Sheets, Gmail |

### Catalog automations

| # | Folder | What it does | Accounts it needs |
|---|---|---|---|
| 8 | [08-ai-lead-management-assistant](08-ai-lead-management-assistant/) | Sorts every inbox or website enquiry (category, priority, summary, spam), logs it, drafts the reply in the Gmail thread, alerts on high priority | OpenAI, Gmail, Google Sheets |
| 9 | [09-lead-enrichment-qualification](09-lead-enrichment-qualification/) | Reads the lead's company website, describes the company, scores the fit, routes qualified leads to the right salesperson | OpenAI, Google Sheets, Gmail |
| 10 | [10-social-media-content-scheduler](10-social-media-content-scheduler/) | Publishes posts you wrote in a sheet at their scheduled time to Facebook, Instagram and LinkedIn (X optional) | Google Sheets, Meta, LinkedIn |
| 11 | [11-review-reputation-monitor](11-review-reputation-monitor/) | Daily Google review check: sentiment, summary, suggested reply, low-rating alerts, digest | Google Places API, OpenAI, Google Sheets, Gmail |
| 12 | [12-customer-support-ticket-triage](12-customer-support-ticket-triage/) | Turns support emails into triaged tickets (category, urgency, sentiment, language), drafts replies, alerts on urgent ones | OpenAI, Gmail, Google Sheets |
| 13 | [13-ecommerce-order-inventory-sync](13-ecommerce-order-inventory-sync/) | Logs Shopify/WooCommerce orders, reduces stock per SKU in a sheet, alerts on low stock and unknown SKUs | Shopify or WooCommerce, Google Sheets, Gmail |
| 14 | [14-abandoned-cart-recovery](14-abandoned-cart-recovery/) | Tracks Shopify checkouts, sends AI-written reminders on a schedule, stops when the order is placed | Shopify, OpenAI, Google Sheets, Gmail |
| 15 | [15-meeting-notes-task-assistant](15-meeting-notes-task-assistant/) | Transcript or notes in, summary, decisions, action items and open questions out, emailed and added to a task sheet | OpenAI, Gmail, Google Sheets |
| 16 | [16-invoice-receipt-data-extraction](16-invoice-receipt-data-extraction/) | Watches a Drive folder for invoices and receipts, extracts and checks the data, logs it, moves the file | OpenAI, Google Drive, Google Sheets, Gmail |
| 17 | (see 07) | *Security Alert Triage & Reporting* is delivered by **07**: alert triage, incident log and weekly report | |
| 18 | [18-website-uptime-incident-notifier](18-website-uptime-incident-notifier/) | Checks sites every 5 minutes (status and required text), emails DOWN after confirmed failures and RECOVERED with the downtime | Google Sheets, Gmail |

### Security suite

Ready-made security automations for companies: fill in Settings, connect the accounts, activate. 07 and 18 are part of the suite too.

| # | Folder | What it does | Accounts it needs |
|---|---|---|---|
| 19 | [19-phishing-email-analyzer](19-phishing-email-analyzer/) | Employees forward suspicious emails; links are checked on VirusTotal, the AI gives a verdict, the employee gets advice, the security team gets phishing alerts | OpenAI, VirusTotal, Gmail, Google Sheets |
| 20 | [20-website-security-ssl-scanner](20-website-security-ssl-scanner/) | Weekly passive scan of your websites (HTTPS, redirects, security headers, cookies, version leaks, certificate expiry) with an A-F grade and fixes; on-demand form | Google Sheets, Gmail |
| 21 | [21-vulnerability-watch-cve-kev](21-vulnerability-watch-cve-kev/) | Daily: exploited vulnerabilities (CISA KEV) and new CVEs (NVD) matching your products, with an AI advisory | OpenAI, Google Sheets, Gmail |
| 22 | [22-data-breach-monitor](22-data-breach-monitor/) | Weekly Have I Been Pwned check of your team's addresses, new breaches only, advice and optional personal notices | Have I Been Pwned, Google Sheets, Gmail |
| 23 | [23-lookalike-domain-monitor](23-lookalike-domain-monitor/) | Daily Certificate Transparency search for new domains imitating your brand, with risk levels | Google Sheets, Gmail |

## Setting one up for a client

1. **n8n**: use n8n Cloud or a self-hosted n8n. The workflows were built and tested on **n8n 1.123**; use that version or newer.
2. **Import**: in n8n, *Workflows → Add workflow → … → Import from file* and pick `workflow.json`.
3. **Settings**: open the yellow **Settings** node and replace every placeholder (business name, emails, sheet URL…).
   Everything the client needs to change is in that one node.
4. **Google Sheet**: create one spreadsheet for the client. For each `*.csv` in the folder, add a tab with the name given
   in the folder's guide and import the CSV into it (*File → Import → Replace current sheet*). Paste the sheet URL in Settings.
5. **Credentials**: open each node with a red warning triangle and select or create the credential (see below).
6. **Test**, then switch the workflow to **Active**.

### Credentials

| Credential | Where to get it |
|---|---|
| OpenAI | platform.openai.com → API keys. In n8n: *Credentials → OpenAI*. Usage is billed by OpenAI to the client's account. |
| Gmail, Google Sheets, Google Calendar, Google Drive | n8n Cloud: *Sign in with Google*. Self-hosted: create an OAuth client in Google Cloud, enable the Gmail, Sheets, Calendar and Drive APIs, and use the redirect URL n8n shows. |
| Facebook Graph API (social media) | A Meta app with a long-lived **page access token** that has `pages_manage_posts`, `instagram_basic` and `instagram_content_publish`. The Instagram account must be a Business account linked to the page. |
| LinkedIn (social media) | A LinkedIn app with the Community Management API, signed in as an admin of the company page. |
| Shopify (13, 14) | A custom app in the Shopify admin (*Settings → Apps → Develop apps*) with `read_orders` (and `read_checkouts` for 14); use its Admin API access token. |
| WooCommerce (13) | *WooCommerce → Settings → Advanced → REST API*: a key with read/write access. |
| Google Places API (11) | A Google Cloud API key with **Places API (New)** enabled, stored as a Header Auth credential named `X-Goog-Api-Key`. |
| Have I Been Pwned (22) | An API key from haveibeenpwned.com/API/Key, stored as a Header Auth credential named `hibp-api-key`. |
| VirusTotal (security) | Free API key from virustotal.com (account → API key). Free tier: 4 lookups per minute. |
| Header Auth (voice and security webhooks) | Create a *Header Auth* credential with a long random value. Give the same header to whatever calls the webhook. |

The AI model is set in **Settings → openAiModel** (default `gpt-4.1-mini`). `openAiBaseUrl` can point to any
OpenAI-compatible API (Azure OpenAI, a proxy) if the client needs that.

## How the files are made

`src/build.mjs` generates every `workflow.json` and CSV: `node automations/src/build.mjs`.
The JavaScript inside the Code nodes comes from `src/logic.mjs`, which has unit tests in `tests/automations.test.ts`
(`npm test`). Edit those files and rebuild rather than editing the JSON by hand.

### Checks

- `npm test` runs the logic unit tests and checks that each workflow passes the marketplace's upload scan and has valid connections.
- `automations/test/validate.cjs` checks every node against n8n's own node definitions: node types and versions exist,
  every parameter name is known, and required fields are filled (the same check the n8n editor uses for warnings).
- `automations/test/run-all.cjs` runs 101 end-to-end checks **inside a real n8n**: each trigger is replaced by sample data,
  Google/Gmail/Meta/LinkedIn/VirusTotal nodes are replaced by stand-ins that still evaluate the node's real parameters,
  and the OpenAI requests go to a local mock. It covers every branch: new leads with and without email, auto-send and
  draft mode, follow-ups, replies, chat answers and the tools offered to the AI, reminders, drafting and publishing with
  failures on some networks, every Vapi tool call and call reports, PDFs and photos from email and the upload form,
  public and private IPs, muted repeats, the weekly summaries, and for 08 to 18: inbox and form enquiries, website
  enrichment and routing, scheduled publishing, new and already-seen reviews, ticket triage, Shopify and WooCommerce
  stock updates, cart tracking, recovery and reminders, meeting notes and tasks, Drive extraction, and uptime
  down/recovered transitions across consecutive runs.

```bash
mkdir -p ~/n8n-test && cd ~/n8n-test && npm init -y >/dev/null && npm i n8n@1.123
cd /path/to/rja
N8N_DIR=~/n8n-test node automations/test/validate.cjs automations/*/workflow.json
N8N_DIR=~/n8n-test node automations/test/run-all.cjs        # all workflows, or add numbers: 1 4 7
```

These tests do not call Google, Meta, LinkedIn, Vapi or OpenAI for real. The first run for a client should be a
manual test with their real accounts.
