// Engine specifications of RJA solutions, built from the customer's settings. Milestone 1: Smart Inventory Manager
// and Smart Cart Recovery on Shopify.

import type { AutomationSpec } from "@/lib/engine/spec";

export type InventorySettings = { threshold: number; alertTeam: boolean };
export type CartSettings = { delayMinutes: number; subject: string; body: string };

export const DEFAULT_SETTINGS = {
  inventory_manager: { threshold: 2, alertTeam: false } satisfies InventorySettings,
  cart_recovery: {
    delayMinutes: 60,
    subject: "You left something in your cart",
    body: "Hello {{customer.first_name}},\n\nYou left {{checkout.first_item}} in your cart. It is still waiting for you: {{checkout.recovery_url}}\n\nSee you soon!",
  } satisfies CartSettings,
};

export function inventorySpec(s: InventorySettings, version = 1): AutomationSpec {
  return {
    solution: "inventory_manager", version,
    trigger: { type: "shopify.event", topic: "inventory_levels/update" },
    steps: [
      { type: "condition", field: "inventory.available", op: "lte", value: s.threshold },
      // One alert per product until stock goes back above the threshold.
      { type: "dedupe", key: "product.id", windowHours: 24 * 30, resetWhen: { field: "inventory.available", op: "gt", value: s.threshold } },
      {
        type: "notify.owner", channel: "email", alsoTeam: s.alertTeam,
        subject: "Low stock: {{product.title}}",
        body: "{{product.title}} {{variant.title}} is down to {{inventory.available}} in stock. Time to reorder?",
      },
      { type: "metric", name: "low_stock_alert" },
    ],
  };
}

export function cartRecoverySpec(s: CartSettings, version = 1): AutomationSpec {
  return {
    solution: "cart_recovery", version,
    trigger: { type: "shopify.event", topic: "checkouts/create" },
    steps: [
      { type: "dedupe", key: "checkout.id", windowHours: 24 * 7 },
      { type: "wait", minutes: s.delayMinutes },
      { type: "shopify.refresh_checkout" },
      { type: "condition", field: "checkout.completed", op: "is_false" },
      { type: "condition", field: "customer.accepts_marketing", op: "is_true" },
      { type: "email.customer", templateId: "cart_reminder", subject: s.subject, body: s.body },
      { type: "metric", name: "cart_reminder_sent" },
    ],
  };
}
