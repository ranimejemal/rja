# Phase 2 — Business discovery (delivered 14 November 2026)

**What the customer sees.** `/start` ("Tell us about your business"), linked from the home page and the
dashboard: 12 to 14 short questions, one at a time, in plain language with examples. Answers are saved one by one,
so the customer can leave and come back; every answer can be changed. Text answers can be spoken (the browser's
own speech recognition, when it has one). At the end: the Business Profile and the ready-made automations that
match the tasks they picked. Admins read every profile at `/admin/businesses`.

**How it adapts.** Shops are asked which tool runs their shop; other businesses are first asked whether they sell
online. Apps mentioned in earlier answers are pre-ticked. Tasks and examples are ordered for the industry.
Answers to questions that no longer apply are kept but ignored.

**Safety.** No AI in this phase: the script is code (`lib/discovery.ts`), so it cannot be steered by what customers
type. Answers that look like passwords, API keys, tokens or card numbers are refused. Each answer is checked on
the server against its question (options, length) before it is saved through `save_discovery_answer`, which
checks the caller and size. Customers cannot write the tables directly; RLS limits reading to members of the
business and admins.

| Piece | File |
| --- | --- |
| Tables `tenants`, `tenant_members`, `business_profiles`; functions | `supabase/migrations/20261114100000_business_discovery.sql` |
| Questions, adaptation, validation, profile, matches | `lib/discovery.ts` |
| Server actions | `app/start/actions.ts` |
| Page and conversation | `app/start/page.tsx`, `components/Discovery.tsx` |
| Admin view | `app/admin/businesses/page.tsx` |
| Tests | `tests/discovery.test.ts` (10), `supabase/tests/marketplace_test.sql` (14 new) |

**Configuration.** One database migration to run (and the earlier connected-devices one). No new keys.

**Not in this phase.** AI recommendations, costs and plans (phase 3); inviting staff into a business.
