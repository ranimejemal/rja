// The engine's interpreter: runs an automation's steps for one event. All side effects go through `Effects`, so
// the same code runs live (worker) and in test mode, where nothing is sent and the report says what would have
// happened. A wait stops the run and returns where to resume; the worker schedules the continuation as a job.

import { render } from "@/lib/engine/validate";
import type { AutomationSpec, Step } from "@/lib/engine/spec";

export type Event = Record<string, unknown>; // normalised fields, e.g. {"inventory.available": 2, "product.id": "..."}

export interface Effects {
  /** True when this key was already seen inside the window (and records it otherwise). */
  seen(key: string, windowHours: number): Promise<boolean>;
  forget(key: string): Promise<void>;
  /** Fresh checkout fields from the connector (completed, accepts_marketing…). */
  refreshCheckout(event: Event): Promise<Event>;
  notifyOwner(subject: string, body: string, alsoTeam: boolean): Promise<void>;
  emailCustomer(templateId: string, subject: string, body: string, event: Event): Promise<void>;
  requestApproval(ask: string, expiresHours: number, event: Event): Promise<void>;
  metric(name: string): Promise<void>;
  publish(platform: string, draftId: string): Promise<void>;
}

export type LogLine = { step: number; type: Step["type"]; outcome: "passed" | "stopped" | "done" | "would_send" | "waiting" | "asked"; detail: string };
export type RunResult =
  | { status: "completed" | "stopped"; log: LogLine[] }
  | { status: "waiting"; resumeAt: number; resumeFromStep: number; event: Event; log: LogLine[] }
  | { status: "awaiting_approval"; resumeFromStep: number; event: Event; log: LogLine[] };

function compare(op: string, actual: unknown, expected: unknown) {
  switch (op) {
    case "lt": return typeof actual === "number" && actual < (expected as number);
    case "lte": return typeof actual === "number" && actual <= (expected as number);
    case "gt": return typeof actual === "number" && actual > (expected as number);
    case "gte": return typeof actual === "number" && actual >= (expected as number);
    case "eq": return actual === expected;
    case "neq": return actual !== expected;
    case "is_true": return actual === true;
    case "is_false": return actual === false;
    default: return false;
  }
}

export async function runAutomation(spec: AutomationSpec, event: Event, fx: Effects, opts: { fromStep?: number; mode: "live" | "test"; now?: number }): Promise<RunResult> {
  const log: LogLine[] = [];
  let ev = { ...event };
  // Resets first, on every new event: stock going back up must clear the "already alerted" mark even though
  // the threshold condition stops this run before the dedupe step.
  if (!opts.fromStep) {
    for (const s of spec.steps) {
      if (s.type === "dedupe" && s.resetWhen && compare(s.resetWhen.op, ev[s.resetWhen.field], s.resetWhen.value)) {
        await fx.forget(`${spec.solution}:${String(ev[s.key])}`);
      }
    }
  }
  for (let i = opts.fromStep ?? 0; i < spec.steps.length; i++) {
    const s = spec.steps[i];
    const n = i + 1;
    switch (s.type) {
      case "condition": {
        const ok = compare(s.op, ev[s.field], s.value);
        log.push({ step: n, type: s.type, outcome: ok ? "passed" : "stopped", detail: `${s.field} = ${JSON.stringify(ev[s.field])} (${s.op}${s.value !== undefined ? ` ${s.value}` : ""})` });
        if (!ok) return { status: "stopped", log };
        break;
      }
      case "dedupe": {
        const key = `${spec.solution}:${String(ev[s.key])}`;
        if (await fx.seen(key, s.windowHours)) {
          log.push({ step: n, type: s.type, outcome: "stopped", detail: `already handled ${String(ev[s.key])}` });
          return { status: "stopped", log };
        }
        log.push({ step: n, type: s.type, outcome: "passed", detail: `first time for ${String(ev[s.key])}` });
        break;
      }
      case "wait": {
        log.push({ step: n, type: s.type, outcome: "waiting", detail: `${s.minutes} minutes` });
        if (opts.mode === "test") break; // a test run skips the wait and says so
        return { status: "waiting", resumeAt: (opts.now ?? Date.now()) + s.minutes * 60_000, resumeFromStep: i + 1, event: ev, log };
      }
      case "shopify.refresh_checkout":
        ev = { ...ev, ...(await fx.refreshCheckout(ev)) };
        log.push({ step: n, type: s.type, outcome: "passed", detail: `completed = ${String(ev["checkout.completed"])}` });
        break;
      case "notify.owner": {
        const subject = render(s.subject, ev);
        if (opts.mode === "live") await fx.notifyOwner(subject, render(s.body, ev), s.alsoTeam);
        log.push({ step: n, type: s.type, outcome: opts.mode === "live" ? "done" : "would_send", detail: subject });
        break;
      }
      case "email.customer": {
        const subject = render(s.subject, ev);
        if (opts.mode === "live") await fx.emailCustomer(s.templateId, subject, render(s.body, ev), ev);
        log.push({ step: n, type: s.type, outcome: opts.mode === "live" ? "done" : "would_send", detail: `${subject} → ${String(ev["customer.first_name"] ?? "customer")}` });
        break;
      }
      case "approval":
        if (opts.mode === "live") {
          await fx.requestApproval(render(s.ask, ev), s.expiresHours, ev);
          log.push({ step: n, type: s.type, outcome: "asked", detail: render(s.ask, ev) });
          return { status: "awaiting_approval", resumeFromStep: i + 1, event: ev, log };
        }
        log.push({ step: n, type: s.type, outcome: "asked", detail: `would ask: ${render(s.ask, ev)}` });
        break;
      case "social.publish":
        if (opts.mode === "live") await fx.publish(s.platform, s.draftId);
        log.push({ step: n, type: s.type, outcome: opts.mode === "live" ? "done" : "would_send", detail: `${s.platform} post ${s.draftId}` });
        break;
      case "metric":
        if (opts.mode === "live") await fx.metric(s.name);
        log.push({ step: n, type: s.type, outcome: "done", detail: s.name });
        break;
    }
  }
  return { status: "completed", log };
}

/** Effects for test runs: an in-memory dedupe store and fixed checkout answers; nothing leaves RJA. */
export function testEffects(checkout: Event = {}): Effects & { seenKeys: Set<string> } {
  const seenKeys = new Set<string>();
  return {
    seenKeys,
    async seen(key) { if (seenKeys.has(key)) return true; seenKeys.add(key); return false; },
    async forget(key) { seenKeys.delete(key); },
    async refreshCheckout() { return checkout; },
    async notifyOwner() {}, async emailCustomer() {}, async requestApproval() {}, async metric() {}, async publish() {},
  };
}
