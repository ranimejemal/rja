# RJA Automation Engine — foundations (15 November 2026)

RJA runs customer automations itself; n8n is not involved. This document covers what exists after the first
engine step and what milestone 1 still needs.

## The automation language (`lib/engine/spec.ts`)

An automation = one **trigger** + up to 20 **steps**, each an approved block:

| Block | Risk | Does |
| --- | --- | --- |
| `condition` | read | compares one allowed field with a value (no expressions) |
| `dedupe` | read | skips an event already handled (with an optional reset, e.g. stock back up) |
| `wait` | read | pauses the run; the worker resumes it later |
| `shopify.refresh_checkout` | read | re-reads a checkout before acting |
| `notify.owner` | controlled write | emails the business owner (and team) |
| `email.customer` | controlled write | sends an approved template to a customer |
| `approval` | — | stops and asks the owner; resumes only after their decision |
| `metric` | read | counts a real result for reports |

Fields and `{{placeholders}}` come from a fixed list per trigger. There is no code block, no HTTP block and no way
to type a URL, so SSRF and arbitrary code execution are impossible by construction.

## The checker (`lib/engine/validate.ts`)

Before a test or activation: schema, fields available for the trigger, placeholders, no typed links or HTML in
messages, consent check before any customer email, approval before any critical block, total waits ≤ 30 days,
and every permission the automation needs must be granted by the customer's connection.

## The interpreter (`lib/engine/run.ts`)

Runs the steps for one event through an `Effects` interface. Live mode sends; test mode sends nothing and reports
what would have happened. Waits and approvals return a resume point for the worker.

## The database (`20261115100000_automation_engine.sql`)

`automations` (one per business and solution) with `automation_versions` (settings, spec, test result);
`jobs` (queue: idempotency key per business, locking, retries with exponential backoff, dead after the last
attempt, no blind retry for uncertain irreversible actions); `executions` (run history, visible to the business);
`engine_dedupe`; emergency stops per automation, per business and for the whole engine (admin). Customers cannot
record test results or touch jobs; only RJA's servers can.

## Milestone 1: what is left

1. **Shopify connection** (phase 4): a Shopify app (created by RJA in the Shopify Partner dashboard), sign-in with
   state check, tokens encrypted outside the database's reach, webhook signature check (HMAC), disconnect.
2. **Worker** (phase 6): a small Node process (outside Vercel) that receives Shopify events through a queue,
   claims jobs, runs the interpreter with live effects, records executions.
3. **Screens**: settings, test report, activate, pause, run history (phase 6/8).

Tests: `tests/engine.test.ts` (validator + interpreter), 26 database tests.
