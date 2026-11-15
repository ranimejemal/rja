// Checks an automation before it can be tested or switched on. Rejects anything outside the approved blocks,
// fields the trigger does not provide, placeholders that are not allowed, links in messages, permissions the
// customer has not granted, customer messages without the customer's consent check, and critical actions
// without an approval step in front of them.

import { automationSpec, BLOCKS, FIELDS, TRIGGER_SCOPES, triggerKey, type AutomationSpec } from "@/lib/engine/spec";

export type Validation = { ok: true; spec: AutomationSpec; scopes: string[]; needsApproval: string[] } | { ok: false; errors: string[] };

const PLACEHOLDER = /\{\{\s*([^}]*?)\s*\}\}/g;
const MAX_TOTAL_WAIT_MIN = 30 * 24 * 60;

export function validateAutomation(raw: unknown, grantedScopes: string[]): Validation {
  const parsed = automationSpec.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".") || "spec"}: ${i.message}`) };
  const spec = parsed.data;
  const key = triggerKey(spec.trigger);
  const fields = new Set(FIELDS[key] ?? []);
  const errors: string[] = [];
  const scopes = new Set(TRIGGER_SCOPES[key] ?? []);
  const needsApproval: string[] = [];
  let waited = 0;
  let consentChecked = false;
  let approved = false;

  spec.steps.forEach((s, i) => {
    const at = `step ${i + 1} (${s.type})`;
    for (const sc of BLOCKS[s.type].scopes) scopes.add(sc);
    if (s.type === "condition") {
      if (!fields.has(s.field)) errors.push(`${at}: “${s.field}” is not available for this trigger`);
      if (["lt", "lte", "gt", "gte"].includes(s.op) && typeof s.value !== "number") errors.push(`${at}: needs a number`);
      if (["is_true", "is_false"].includes(s.op) && s.value !== undefined) errors.push(`${at}: takes no value`);
      if (s.field === "customer.accepts_marketing" && s.op === "is_true") consentChecked = true;
    }
    if (s.type === "dedupe") {
      if (!fields.has(s.key)) errors.push(`${at}: “${s.key}” is not available for this trigger`);
      if (s.resetWhen && !fields.has(s.resetWhen.field)) errors.push(`${at}: “${s.resetWhen.field}” is not available for this trigger`);
    }
    if (s.type === "wait") {
      waited += s.minutes;
      if (key === "inventory_levels/update") errors.push(`${at}: stock alerts must not wait`);
    }
    if (s.type === "approval") approved = true;
    if (s.type === "notify.owner" || s.type === "email.customer") {
      for (const t of [s.subject, s.body]) {
        for (const m of t.matchAll(PLACEHOLDER)) if (!fields.has(m[1])) errors.push(`${at}: unknown placeholder {{${m[1]}}}`);
        // Links are only allowed through the {{checkout.recovery_url}} placeholder, never typed in.
        if (/https?:\/\/|www\.|<[a-z/]/i.test(t.replace(PLACEHOLDER, ""))) errors.push(`${at}: messages cannot contain typed links or HTML`);
      }
    }
    if (s.type === "email.customer") {
      if (!consentChecked) errors.push(`${at}: customers can only be emailed after checking they accepted marketing emails`);
      needsApproval.push(`The text of “${s.subject}” before the first one is sent`);
    }
    if (BLOCKS[s.type].risk === "critical" && !approved) errors.push(`${at}: critical actions need an approval step first`);
  });
  if (waited > MAX_TOTAL_WAIT_MIN) errors.push("waits add up to more than 30 days");
  const missing = [...scopes].filter((s) => !grantedScopes.includes(s));
  if (missing.length) errors.push(`missing permissions: ${missing.join(", ")}`);
  return errors.length ? { ok: false, errors } : { ok: true, spec, scopes: [...scopes], needsApproval };
}

/** Fills {{placeholders}} from the event's fields; anything not in the event becomes empty. */
export function render(template: string, values: Record<string, unknown>) {
  return template.replace(PLACEHOLDER, (_, k: string) => (values[k] === undefined || values[k] === null ? "" : String(values[k])));
}
