# Technical audit — RJA platform (14 November 2026)

Scope: the whole repository (`claude/automation-marketplace-prd-gv78mf`, 59 commits) and the live Supabase project.
Method: code read, automated checks run on this date, live database inspection (structure and counts only, no
customer data), Supabase security advisor, `npm audit`. No secret values are reproduced here.

**Verdict.** The marketplace is a sound base to build on: every table has row-level security, money and access
rules live in the database, and 243 automated tests pass. It is not yet the platform the new direction
describes: there is no tenant model, no stored integrations, no execution engine, no approval system and no
background workers. Nothing customers rely on blocks the change: the live database holds 0 orders, 0
entitlements, 4 accounts and 2 quote requests.

## 1. What exists

| Area | Implementation | Verified by |
| --- | --- | --- |
| Framework | Next.js 15.5 App Router, React 19, TypeScript, server actions; Vercel | `package.json`, build |
| Database | Supabase Postgres, 17 migrations, 36 tables, all with RLS | live query |
| Auth | Supabase Auth: email + password, 6-digit email codes (sign-up, reset), TOTP MFA | code, DB tests |
| Roles | `user_roles` (buyer, seller, admin); `is_admin()` requires the MFA level (aal2) once a factor exists | DB tests |
| Marketplace | catalogue, search, categories, product pages, reviews (buyers only), quotes | code, browser checks |
| Sellers | applications, agreement acceptance, versions submitted for review, commission ledger, payouts | DB tests |
| Payments | Stripe Checkout + signed webhook, idempotent; **switched off until keys are set** | code |
| Self-serve setup | 22 n8n workflows generated from source (`automations/src`), setup forms, personalised download | 124 unit tests |
| Setup assistant | chat + screenshot, 14 known problems, optional n8n API read/fix (key not stored), escalation | unit + browser |
| Admin | customers, orders, quotes, reviews, analytics, visitors, promotions, security log, audit log | code, browser |
| Security | security log + e-mail alerts, login lockout, Turnstile, CSP, probe trap, device list (pending migration) | DB + unit tests |
| Backups | nightly encrypted `pg_dump` (GitHub Actions), keep-alive ping | workflow file |

## 2. Status by feature

| Feature | Status | Note |
| --- | --- | --- |
| Catalogue, product pages, search | Works | |
| Accounts, codes, password reset | Works | e-mail templates must be pasted in Supabase |
| Admin MFA, security log, alerts | Works | |
| Personalised workflow download + guide | Works | still needs n8n skills from the customer: the friction the new direction removes |
| Setup assistant | Works | needs `ASSISTANT_AI_KEY`; without it only the 14 known answers |
| Payments and payouts | **Incomplete** | code and tests exist; no Stripe keys, never run against Stripe |
| Connected devices | **Incomplete** | migration `20261114090000` not yet applied |
| Backups | **Unverified** | workflow exists; secrets not confirmed; restore never tested |
| Legal pages | **Incomplete** | terms and privacy need the cookies, logs and marketing paragraphs |
| Human check (Turnstile) | **Unverified after fix** | failed after the 5 Nov redesign; fade-in removed on 14 Nov, needs a live check |
| Business discovery, recommendations, integrations, execution, approvals, reports | **Missing** | the new direction |

## 3. Keep as they are

- Row-level security model and security-definer functions that check the caller (`is_admin()`, `can_use_product()`).
- The money model: orders, ledger, commissions, refunds in SQL with tests.
- The workflow source generator (`automations/src`): workflows are built from code, not hand-edited JSON. It is the
  natural seed for template-based generation (phase 5).
- The security log, lockout, MFA, device list, CSP, Turnstile, probe trap.
- The marketplace and the seller programme: existing products and purchase flow stay available.

## 4. Security findings

| # | Finding | Severity | Action |
| --- | --- | --- | --- |
| S1 | `nodemailer` ≤ 10.1.3 had known high-severity issues | High | **Fixed** in this phase: upgraded to 10.5 |
| S2 | Rate limits are in memory, per server instance; on Vercel each instance has its own counter | Medium | phase 7: move counters to Postgres (login lockout already uses the security log, so it is not affected) |
| S3 | Leaked-password check (HaveIBeenPwned) is off in Supabase Auth | Medium | dashboard switch: Auth → Providers → Email |
| S4 | The human check lets requests through if Cloudflare cannot be reached (fail-open by design) | Low | keep; lockout still applies; log it |
| S5 | CSP allows `'unsafe-inline'` scripts (needed by Next.js without nonces) | Low | phase 7: nonce-based CSP |
| S6 | `postcss` inside Next.js flagged high; build-time only, processes our own CSS | Low | comes with the next Next.js upgrade |
| S7 | Free Gemini tier may use prompts to improve Google's products; the assistant sends customer text and screenshots | Medium (privacy) | paid tier or OpenAI for customer data before launch; disclosed in the privacy policy |
| S8 | 35 admin/member functions are callable by any signed-in user (advisor warning) | Info | each checks the caller inside; covered by DB tests; keep |
| S9 | No CI: tests run only when someone runs them | Medium | **Fixed** in this phase: CI workflow on every push |
| S10 | Two sources of truth for setup forms (repo `setup.json` and `product_manifests`) | Low | repo wins today; phase 5 makes templates the single source |

Not found: secrets in the repository, service-role key in client code, SQL built from strings, unchecked
redirects (`safeNext` everywhere), HTML from AI or users rendered unescaped (the Markdown renderer emits React
nodes only).

## 5. Architectural gaps for the new direction

1. **No tenant.** Everything belongs to a user. A business with two staff accounts cannot share anything.
2. **No integration store.** Customers' credentials live only in their own n8n. That is the safest state today;
   storing tokens needs encryption and a key held outside the database (phase 4).
3. **No execution layer.** The platform never runs a workflow. Running, testing, pausing and monitoring need
   an execution adapter and a durable queue with workers outside Vercel's request time limits.
4. **No approvals, no tamper-evident audit.** `audit_logs` is append-only (update/delete trigger) but not
   hash-chained.
5. **AI calls are one-shot** and unstructured except the assistant. Phases 3–5 need schema-validated outputs.

## 6. The n8n licence constraint

The Sustainable Use License allows using n8n for your own business purposes and building workflows for clients.
It restricts offering n8n itself to customers for money (hosting it and charging for access, or white-labelling
it). n8n's FAQ also lists running n8n behind the scenes in your own product as allowed, so the boundary for a
SaaS that runs customers' automations on RJA's n8n is unclear. Sources:
[license FAQ](https://docs.n8n.io/n8n-community-license/community-license/license-faq),
[SUL text (mirror)](https://n8n-docs.teamlab.info/sustainable-use-license/). The official docs site could not
be opened from the build environment, so this is from search results that quote it.

Consequences for the design:

- **Allowed today:** customers keep their own n8n (Cloud or self-hosted); RJA configures it through the n8n
  API with the customer's key. This is the current model, with the key no longer typed by hand.
- **Needs written confirmation or an Embed licence:** RJA-managed n8n running many customers' workflows.
  Ask license@n8n.io with the exact model before building it.
- **Design response:** an `ExecutionAdapter` interface (deploy, test, activate, pause, rollback, status) with an
  `n8n-customer` adapter first. A managed adapter (n8n under licence, or another engine) can be added without
  touching the rest.

## 7. Database changes required (summary)

New: `tenants`, `tenant_members`, `business_profiles` (phase 2); `solution_recommendations` (3);
`integrations`, `credential_refs` (4); `workflow_specs`, `workflow_versions` (5); `deployments`,
`executions`, `approvals` (6); `audit_events` hash chain, `security_alerts`, kill switch (7); `usage_records`,
`subscriptions` (10). Adapted, not duplicated: `support_tickets`, `security_events`, `audit_logs`, `products`.

## 8. Complexity estimate

| Phase | Size | Main risk |
| --- | --- | --- |
| 1 Audit, CI, quick fixes | S | — |
| 2 Business discovery | M | question design for non-technical people |
| 3 Architect + solution designer | M | AI quality; must not invent savings |
| 4 Integration center | L | OAuth app verification (Google takes weeks for sensitive scopes) |
| 5 Workflow generation + validation | L | keeping AI inside templates |
| 6 Test, approval, deployment | L | n8n licence; worker hosting |
| 7 Guardian | M | key management |
| 8 Control center | M | — |
| 9 Assistant upgrade | S | builds on what exists |
| 10 Growth + subscriptions | M | Stripe recurring billing |
