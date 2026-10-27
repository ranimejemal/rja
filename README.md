# Ranime Jemal Agency — AI Automation Marketplace

A two-sided marketplace for AI automations and n8n workflows:

- **First-party store** — products sold by Ranime Jemal Agency (labelled “Platform product”, no seller commission).
- **Third-party marketplace** — approved creators sell their own products; the platform keeps a configurable commission (default 20%).

The MVP sells **downloadable n8n workflow templates with guided customization**. Hosted execution is deliberately not built
(see “Not built yet”).

## Stack

| Part | Choice |
|---|---|
| App | Next.js 15 (App Router, server actions), TypeScript, plain CSS design system (`app/globals.css`) |
| Auth, database, files | Supabase (project `rja-marketplace`, region eu-west-3 Paris): Auth, Postgres, private storage |
| Payments | Provider-neutral interface (`lib/payments/types.ts`) with a Stripe adapter (`lib/payments/stripe.ts`) |
| Tests | Vitest (`tests/`), SQL tests on a throwaway local Postgres (`supabase/tests/`) |

## How the important rules are enforced

Money, publishing and roles are enforced **inside Postgres** (security-definer functions + row-level security), so the browser
can never set a price, a commission, a role, a payment status or a seller identity.

- **Prices & commission**: `create_order()` reads prices from `products` and the commission from settings / seller override,
  and stores price, currency, rate, commission and seller share on each `order_items` row. Historical earnings never use the current setting.
- **Platform vs third-party**: platform-owned items always get a 0% rate (also enforced by a check constraint).
- **Payments**: only `finalize_paid_order()` (service role, called by the signed webhook) marks an order paid, creates
  ledger entries and entitlements. It is idempotent per provider event id; a wrong amount marks the order failed.
  A browser redirect to the success page grants nothing.
- **Ledger**: `ledger_entries` is append-only (updates and deletes are rejected). Sales, commission, processing fees,
  refunds, commission reversals and payouts are separate entry types.
- **Refunds**: reverse seller share and commission in proportion to the original split and revoke access (`apply_refund()`, idempotent).
- **Payouts**: manual for now. A payout reaches `paid` only when an admin enters the transfer reference.
- **Publishing**: `change_product_status()` allows sellers only draft → submitted and approved → published, and only after
  accepting the current seller agreement, confirming distribution rights and uploading a workflow file. Approval is admin-only.
- **Files**: private bucket; downloads go through `/api/downloads/[id]`, which checks the entitlement server-side and
  redirects to a 60-second signed URL. Uploads are type/size/content-checked and n8n JSON is scanned (`lib/workflow-scan.ts`)
  for hard-coded secrets, embedded credentials, shell commands, risky code, exfiltration hosts and pinned data. Workflows are never executed.
- **Customization**: buyers can only set the fields declared in the product’s manifest (`lib/manifest.ts`), validated in the
  browser and again on the server. Unknown keys are rejected.
- **Audit**: admin, seller-agreement, payment, refund and payout actions are written to the append-only `audit_logs`.

## Run locally

```sh
npm install
cp .env.example .env.local        # then fill in the server-only values
npm run dev                       # http://localhost:3000
```

Checks:

```sh
npm run typecheck && npm run lint && npm test   # unit tests
npm run test:db                                 # migrations + 59 SQL tests on a local Postgres 16
npm run build
```

### Environment variables

| Variable | Where | Needed for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | everything (already in `.env.example`) |
| `NEXT_PUBLIC_SITE_URL` | public | auth email links, Stripe return URLs |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | uploads, downloads, configuration saves, newsletter, refunds, payment webhooks |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | **server only** | paid checkout and webhooks |

Without the server keys the site still works for browsing, accounts, seller applications, reviews and admin moderation;
features that need them are disabled with a clear message (nothing is faked).

## First-time setup

1. **Supabase Auth**: in the dashboard set *Site URL* to your domain and add `<site>/auth/callback` to the redirect URLs.
2. **Make yourself admin**: sign up on the site, then run in the Supabase SQL editor:
   ```sql
   insert into user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'ranimejmal@gmail.com';
   ```
3. Open **Admin → Platform store** and click *Manage the platform store*: your account now owns the first-party store
   (it currently holds demo products).
4. **Stripe** (France/EU): create the account, add the keys, and point a webhook at `<site>/api/webhooks/stripe` with events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
   `checkout.session.expired`, `refund.created`, `refund.updated`.
5. Replace the **draft legal documents** (table `agreements`, all marked `0.1-draft`) with lawyer-reviewed versions:
   insert a new version and set it as current; sellers are asked to accept the new seller agreement.

## Database

Migrations are in `supabase/migrations/` and are applied to the `rja-marketplace` project. The demo catalog
(`…_demo_catalog.sql`) inserts 11 products and two demo creators, all flagged `is_demo`: they are labelled
“Demo data” and cannot be purchased. Delete them before launch:

```sql
delete from product_versions where product_id in (select id from products where is_demo);
delete from products where is_demo;
delete from seller_profiles where is_demo and not is_platform;
```

## Not built yet / needs a decision

- **Payouts are manual** (admin enters the bank-transfer reference). Automated Stripe Connect payouts need a Connect
  platform account, seller onboarding (KYC) and a decision on charge type; the `payout_method` field is ready for it.
- **Invoices/VAT**: receipts are purchase records, not tax invoices. EU VAT on digital products (OSS) needs Stripe Tax or an accountant’s setup.
- **Hosted automations** (phase 3) are intentionally absent: no workflow is executed and no status claims a workflow is running.
- **n8n licensing**: selling downloadable workflow files is generally fine, but operating hosted n8n for customers falls
  under n8n’s Sustainable Use License restrictions — verify with n8n before building hosted features.
- **Legal documents** are drafts and must be reviewed for France/EU (and any other country you sell to).
- **Rate limiting** is in-memory per server instance; use a shared store if you run several instances.
- **Email notifications** (application decisions, sales, payouts) are not sent yet; Supabase Auth sends account emails only.
- **Design**: the app recreates the template’s visual language and interactions with the same libraries the template uses
  (GSAP SplitText/ScrambleText/ScrollTrigger and Lenis, installed from npm): rolling headings, scrambled labels, the full-screen
  menu, the cursor-follow list preview and the home intro (`components/Motion.tsx`, `SiteMenu.tsx`, `PreviewList.tsx`,
  `HomeIntro.tsx`). All motion is off for reduced-motion users. The original Webflow stylesheet itself is not included because its
  CDN host was blocked in the build environment.

## Automation workflows

The seven "Top AI automations for 2026" listings are delivered as n8n workflows in [`automations/`](automations/README.md),
with setup guides, Google Sheet templates and tests (`npm run build:workflows`, `npm run test:workflows`).

## Repository layout

```
app/                Next.js routes (public pages, /dashboard buyer, /seller, /admin, /api)
components/         UI components (product card, config form, dialogs, …)
lib/                domain logic: catalog, manifest, workflow scan, files, money, payments, auth
supabase/           migrations and SQL tests
automations/        the 7 n8n workflows sold as setup services, with sheet templates, guides and tests
tests/              unit tests
static-site/        previous static website (reference only)
```
