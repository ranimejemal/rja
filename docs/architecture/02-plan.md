# Implementation plan — from marketplace to business automation platform

Principle: grow the existing app, never replace it. The marketplace and the downloadable workflows stay; the new
experience is added beside them and becomes the default entry point once it can deliver.

## Target architecture

```
Browser ── Next.js on Vercel (UI, server actions, short API calls)
              │  Supabase Auth (MFA)          │  AI provider interface (Gemini | OpenAI)
              ▼                               ▼
         Supabase Postgres  ◄── RLS per tenant ──  structured outputs, validated with zod
              │  jobs table (durable queue)
              ▼
         Worker (small container, outside Vercel) ── ExecutionAdapter
              │                                     ├─ n8n-customer (customer's own n8n, via API)
              │                                     └─ managed (only once licensing is settled)
              ▼
         Secrets: tokens encrypted with libsodium sealed boxes, key in the worker's secret store, never in Postgres
```

Why a jobs table instead of a queue service: one less paid dependency; `select … for update skip locked` gives
exactly-once pickup, retries and dead letters in plain SQL. Swap for a managed queue when volume needs it.

## Phases

| Phase | Delivers | Main tables | Gate before the next |
| --- | --- | --- | --- |
| 1 | Audit, CI on every push, dependency fix, this plan | — | done |
| 2 | Conversational business discovery, saved Business Profile, tenants | `tenants`, `tenant_members`, `business_profiles` | a non-technical tester finishes it in under 10 minutes |
| 3 | AI Business Architect + Solution Designer: opportunities, matched solutions, costs, approve/reject | `solution_recommendations` | proposals reviewed by RJA for 10 real profiles |
| 4 | Integration Center: Google, Shopify, Slack first; OAuth with state + PKCE; encrypted tokens; revoke | `integrations`, `credential_refs` | Google OAuth app verified |
| 5 | Workflow specs from templates, validator (node allowlist, URL/SSRF checks, credential refs), versions | `workflow_specs`, `workflow_versions` | 100 % of the 22 templates pass the validator |
| 6 | Test run on synthetic data, report, activation approval, rollback, pause | `deployments`, `executions`, `approvals`, `jobs` | licence answer from n8n |
| 7 | Guardian: hash-chained audit, alerts, kill switch, Postgres rate limits, nonce CSP | `audit_events`, `security_alerts` | external penetration test |
| 8 | Customer Control Center (My Business, Solutions, Activity, Approvals, Reports, Security, Support) | views | usability test on phone |
| 9 | Assistant reads authorised execution logs, proposes tested fixes, applies after approval | — | — |
| 10 | Growth insights from real execution data; Starter / Growth / Enterprise plans on Stripe | `usage_records`, `subscriptions` | — |

## Decisions taken in this plan (challenge them if you disagree)

1. **Tenant = a business.** Each account gets its own tenant on first use; invitations come later. Existing users
   are migrated automatically and lose nothing.
2. **Discovery questions are a fixed, adaptive script, not free AI chat.** Cheaper, predictable, works without an
   AI key, never asks for secrets. AI enters in phase 3, where reasoning is needed, with validated JSON output.
3. **No customer credentials are stored before phase 4's encryption design is in place.** Until then the customer's
   own n8n keeps them.
4. **No managed n8n before licensing is confirmed in writing.**
5. **Brand colours.** The brief asks for navy and sapphire; the site was switched to green on your request on
   5 November. Colours are unchanged until you choose.

## Data migration and rollback

Each migration is additive (new tables, new columns with defaults); no existing column is dropped or renamed.
Rollback = the matching `down` statements kept in the migration's header comment, tested against a copy restored
from the nightly backup.
