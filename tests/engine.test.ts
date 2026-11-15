import { describe, expect, it } from "vitest";
import { validateAutomation } from "@/lib/engine/validate";
import { cartRecoverySpec, DEFAULT_SETTINGS, inventorySpec } from "@/lib/engine/specs";
import { runAutomation, testEffects, type Effects } from "@/lib/engine/run";

const SHOPIFY = ["read_inventory", "read_products", "read_checkouts", "read_orders"];
const inv = inventorySpec(DEFAULT_SETTINGS.inventory_manager);
const cart = cartRecoverySpec(DEFAULT_SETTINGS.cart_recovery);
const lowStock = { "product.id": "p1", "product.title": "Brown Leather Bag", "variant.title": "", "inventory.available": 2 };

describe("validator", () => {
  it("accepts the milestone 1 solutions and lists their permissions and approvals", () => {
    const a = validateAutomation(inv, SHOPIFY);
    expect(a.ok && a.scopes.sort()).toEqual(["read_inventory", "read_products"]);
    const c = validateAutomation(cart, SHOPIFY);
    expect(c.ok && c.needsApproval.length).toBe(1);
  });

  it("refuses unknown blocks, code and free URLs", () => {
    expect(validateAutomation({ ...inv, steps: [{ type: "code", js: "fetch('http://169.254.169.254')" }] }, SHOPIFY).ok).toBe(false);
    expect(validateAutomation({ ...inv, steps: [{ type: "http.request", url: "http://10.0.0.1" }] }, SHOPIFY).ok).toBe(false);
    const link = validateAutomation({ ...inv, steps: [{ type: "notify.owner", channel: "email", subject: "x", body: "Go to https://evil.example" }] }, SHOPIFY);
    expect(!link.ok && link.errors.join()).toMatch(/links/);
  });

  it("refuses fields and placeholders the trigger does not provide", () => {
    const r = validateAutomation({ ...inv, steps: [{ type: "notify.owner", channel: "email", subject: "{{customer.password}}", body: "x" }] }, SHOPIFY);
    expect(!r.ok && r.errors.join()).toMatch(/unknown placeholder/);
    expect(validateAutomation({ ...inv, steps: [{ type: "condition", field: "order.total", op: "gt", value: 1 }] }, SHOPIFY).ok).toBe(false);
  });

  it("refuses customer emails without the consent check, and missing permissions", () => {
    const noConsent = { ...cart, steps: cart.steps.filter((s) => !(s.type === "condition" && s.field === "customer.accepts_marketing")) };
    const r = validateAutomation(noConsent, SHOPIFY);
    expect(!r.ok && r.errors.join()).toMatch(/accepted marketing/);
    const p = validateAutomation(cart, ["read_inventory"]);
    expect(!p.ok && p.errors.join()).toMatch(/missing permissions: read_checkouts/);
  });
});

describe("interpreter", () => {
  it("alerts once when stock reaches the threshold, again only after it went back up", async () => {
    const fx = testEffects();
    expect((await runAutomation(inv, lowStock, fx, { mode: "test" })).log.at(-2)).toMatchObject({ type: "notify.owner", outcome: "would_send", detail: "Low stock: Brown Leather Bag" });
    expect((await runAutomation(inv, { ...lowStock, "inventory.available": 1 }, fx, { mode: "test" })).status).toBe("stopped");
    expect((await runAutomation(inv, { ...lowStock, "inventory.available": 5 }, fx, { mode: "test" })).status).toBe("stopped");
    expect((await runAutomation(inv, lowStock, fx, { mode: "test" })).status).toBe("completed");
  });

  it("does nothing above the threshold", async () => {
    expect((await runAutomation(inv, { ...lowStock, "inventory.available": 3 }, testEffects(), { mode: "test" })).status).toBe("stopped");
  });

  it("waits, then reminds only if the cart is still unpaid and the customer agreed to emails", async () => {
    const ev = { "checkout.id": "c1", "customer.first_name": "Sarah", "checkout.first_item": "Brown Leather Bag", "checkout.recovery_url": "https://shop/x" };
    const sent: string[] = [];
    const live: Effects = { ...testEffects({ "checkout.completed": false, "customer.accepts_marketing": true }), emailCustomer: async (_t, _s, body) => { sent.push(body); } };
    const first = await runAutomation(cart, ev, live, { mode: "live", now: 0 });
    expect(first).toMatchObject({ status: "waiting", resumeAt: 3_600_000, resumeFromStep: 2 });
    if (first.status !== "waiting") return;
    const later = await runAutomation(cart, first.event, live, { mode: "live", fromStep: first.resumeFromStep });
    expect(later.status).toBe("completed");
    expect(sent[0]).toContain("Hello Sarah");
    const paid = await runAutomation(cart, ev, testEffects({ "checkout.completed": true, "customer.accepts_marketing": true }), { mode: "test" });
    expect(paid.status).toBe("stopped");
    const noConsent = await runAutomation(cart, { ...ev, "checkout.id": "c2" }, testEffects({ "checkout.completed": false, "customer.accepts_marketing": false }), { mode: "test" });
    expect(noConsent.status).toBe("stopped");
  });

  it("sends nothing in test mode", async () => {
    let called = false;
    const fx: Effects = { ...testEffects(), notifyOwner: async () => { called = true; } };
    await runAutomation(inv, lowStock, fx, { mode: "test" });
    expect(called).toBe(false);
  });
});
