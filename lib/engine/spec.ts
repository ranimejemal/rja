// RJA Automation Engine — the language automations are written in.
//
// An automation is a trigger followed by a short list of steps, each one an approved building block. There is no
// code, no free URL and no expression language: conditions compare one allowed field with a value, and messages
// are templates whose {{placeholders}} come from a fixed list. Anything else fails validation and cannot run.
// Every block declares its risk level and the connector permissions it needs (lib/engine/validate.ts checks them).

import { z } from "zod";

export type Risk = "read" | "controlled_write" | "critical";

// ---------------------------------------------------------------- triggers
export const SHOPIFY_TOPICS = ["inventory_levels/update", "checkouts/create", "checkouts/update", "orders/create"] as const;
const trigger = z.discriminatedUnion("type", [
  z.object({ type: z.literal("shopify.event"), topic: z.enum(SHOPIFY_TOPICS) }),
  z.object({ type: z.literal("schedule"), everyMinutes: z.number().int().min(15).max(7 * 24 * 60) }),
]);

// Fields a condition or a template may use, per trigger. Values come from the connector, already normalised.
export const FIELDS: Record<string, readonly string[]> = {
  "inventory_levels/update": ["product.title", "product.id", "variant.title", "variant.sku", "inventory.available", "inventory.location"],
  "checkouts/create": ["checkout.id", "checkout.total", "checkout.currency", "checkout.items_count", "checkout.first_item",
    "customer.first_name", "customer.accepts_marketing", "checkout.completed", "checkout.recovery_url"],
  "orders/create": ["order.id", "order.name", "order.total", "order.currency", "customer.first_name"],
  schedule: ["now.date"],
};
FIELDS["checkouts/update"] = FIELDS["checkouts/create"];

const field = z.string().regex(/^[a-z_]+\.[a-z_]+$/);
const text = (max: number) => z.string().min(1).max(max);

// ---------------------------------------------------------------- steps
export const step = z.discriminatedUnion("type", [
  z.object({ type: z.literal("condition"), field, op: z.enum(["lt", "lte", "gt", "gte", "eq", "neq", "is_true", "is_false"]), value: z.union([z.number(), z.string().max(200), z.boolean()]).optional() }),
  z.object({ type: z.literal("dedupe"), key: field, windowHours: z.number().int().min(1).max(24 * 90), resetWhen: z.object({ field, op: z.enum(["gt", "gte"]), value: z.number() }).optional() }),
  z.object({ type: z.literal("wait"), minutes: z.number().int().min(1).max(30 * 24 * 60) }),
  z.object({ type: z.literal("shopify.refresh_checkout") }),
  z.object({ type: z.literal("notify.owner"), channel: z.enum(["email"]), subject: text(150), body: text(2000), alsoTeam: z.boolean().default(false) }),
  z.object({ type: z.literal("email.customer"), templateId: z.string().regex(/^[a-z0-9_-]{2,60}$/), subject: text(150), body: text(4000) }),
  z.object({ type: z.literal("approval"), ask: text(300), expiresHours: z.number().int().min(1).max(24 * 14) }),
  z.object({ type: z.literal("metric"), name: z.enum(["low_stock_alert", "cart_reminder_sent", "cart_recovered", "question_answered"]) }),
]);
export type Step = z.infer<typeof step>;

export const automationSpec = z.object({
  solution: z.string().regex(/^[a-z][a-z0-9_]{2,40}$/),
  version: z.number().int().min(1),
  trigger,
  steps: z.array(step).min(1).max(20),
});
export type AutomationSpec = z.infer<typeof automationSpec>;

/** What each block may do, and what it needs from the customer's connected apps. */
export const BLOCKS: Record<Step["type"], { risk: Risk; scopes: string[]; label: string }> = {
  condition: { risk: "read", scopes: [], label: "Check a condition" },
  dedupe: { risk: "read", scopes: [], label: "Skip repeats" },
  wait: { risk: "read", scopes: [], label: "Wait" },
  "shopify.refresh_checkout": { risk: "read", scopes: ["read_checkouts", "read_orders"], label: "Check whether the order was completed" },
  "notify.owner": { risk: "controlled_write", scopes: [], label: "Alert the owner" },
  "email.customer": { risk: "controlled_write", scopes: [], label: "Email the customer" },
  approval: { risk: "read", scopes: [], label: "Ask the owner" },
  metric: { risk: "read", scopes: [], label: "Count a result" },
};

export const TRIGGER_SCOPES: Record<string, string[]> = {
  "inventory_levels/update": ["read_inventory", "read_products"],
  "checkouts/create": ["read_checkouts"],
  "checkouts/update": ["read_checkouts"],
  "orders/create": ["read_orders"],
  schedule: [],
};

export const triggerKey = (t: AutomationSpec["trigger"]) => (t.type === "shopify.event" ? t.topic : "schedule");
