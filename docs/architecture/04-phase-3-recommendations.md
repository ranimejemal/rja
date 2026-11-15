# Phase 3 — Recommendations (delivered 15 November 2026)

**What the customer sees.** After discovery, "See my recommendations" opens `/plan`: an overview of their business,
then one card per recommended solution with why it fits (their own answers), an example, what it does, what it
reads, the permissions it asks for, what always waits for their approval, its limits, and its cost (setup,
monthly RJA service, costs outside RJA). They accept, postpone or decline each one; accepting charges nothing.
Admins set prices at `/admin/solutions` (audited) and see how often each solution is accepted.

**How recommendations are made.**
1. Rules (`lib/solutions.ts → candidatesFor`) pick the solutions from the tasks and problem the customer gave, rank
   them, and list what is missing (e.g. "Needs a Shopify shop"). Only these can be recommended.
2. The AI Business Architect (`lib/architect.ts`) may write the overview and a "why" + example per solution. Its
   answer must be JSON in a fixed format, may only mention the matched solutions, and is rejected if it contains
   promised results, money or percentage figures, technical jargon or links (`lib/architect-rules.ts`). The
   customer's text is passed as tagged data, never as instructions.
3. If the AI is off, slow or rejected, a plain overview from the customer's own answers is used.
4. A new analysis runs when the answers change; decisions already taken are kept.

| Piece | File |
| --- | --- |
| Tables `solutions`, `solution_recommendations`; `store_analysis`, `decide_recommendation` | `supabase/migrations/20261115090000_solution_recommendations.sql` |
| Solution catalogue and matching | `lib/solutions.ts` |
| AI provider interface | `lib/ai.ts` |
| Architect and its output checks | `lib/architect.ts`, `lib/architect-rules.ts` |
| Pages | `app/plan/*`, `app/admin/solutions/page.tsx` |
| Tests | `tests/solutions.test.ts`, `tests/architect.test.ts`, 11 database tests |

**Configuration.** Run the migration. Optional: `ASSISTANT_AI_KEY` (already used by the setup assistant) for AI
explanations. Set monthly prices in Admin → Solutions when decided.

**Not yet.** Connecting apps after acceptance (phase 4: Shopify), running the solutions (phases 5–6).
