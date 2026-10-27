import { describe, expect, it } from "vitest";
import Stripe from "stripe";
import { mapStripeEvent, StripeProvider } from "@/lib/payments/stripe";
import { rateLimit } from "@/lib/rate-limit";

const event = (type: string, object: Record<string, unknown>) => ({ id: "evt_1", type, data: { object } }) as unknown as Stripe.Event;

describe("mapStripeEvent", () => {
  it("records a paid checkout", () => {
    const e = mapStripeEvent(event("checkout.session.completed", {
      payment_status: "paid", metadata: { order_id: "ord_1" }, payment_intent: "pi_1", amount_total: 6900, currency: "eur",
    }));
    expect(e).toEqual({ type: "payment_succeeded", eventId: "evt_1", eventType: "checkout.session.completed", orderId: "ord_1", paymentId: "pi_1", amountMinor: 6900, currency: "EUR", feeMinor: null });
  });
  it("does not grant access while a payment is still pending", () => {
    const e = mapStripeEvent(event("checkout.session.completed", {
      payment_status: "unpaid", metadata: { order_id: "ord_1" }, payment_intent: "pi_1", amount_total: 6900, currency: "eur",
    }));
    expect(e.type).toBe("ignored");
  });
  it("maps failures, expiries and refunds", () => {
    expect(mapStripeEvent(event("checkout.session.expired", { client_reference_id: "ord_2" })).type).toBe("payment_failed");
    expect(mapStripeEvent(event("refund.updated", { id: "re_1", status: "succeeded", metadata: { refund_id: "rf_1" } })))
      .toMatchObject({ type: "refund_succeeded", refundId: "rf_1", providerRefundId: "re_1" });
    expect(mapStripeEvent(event("refund.updated", { id: "re_1", status: "pending", metadata: { refund_id: "rf_1" } })).type).toBe("ignored");
    expect(mapStripeEvent(event("customer.created", {})).type).toBe("ignored");
  });
});

describe("webhook signatures", () => {
  const secret = "whsec_test_secret";
  const provider = new StripeProvider("sk_test_dummy", secret);
  const body = JSON.stringify({ id: "evt_9", object: "event", type: "customer.created", data: { object: {} } });

  it("accepts a correctly signed payload", async () => {
    const header = Stripe.webhooks.generateTestHeaderString({ payload: body, secret });
    const e = await provider.parseWebhook(body, new Headers({ "stripe-signature": header }));
    expect(e).toEqual({ type: "ignored", eventId: "evt_9", eventType: "customer.created" });
  });
  it("rejects a forged or missing signature", async () => {
    const header = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: "whsec_wrong" });
    await expect(provider.parseWebhook(body, new Headers({ "stripe-signature": header }))).rejects.toThrow();
    await expect(provider.parseWebhook(body, new Headers())).rejects.toThrow(/missing signature/);
  });
});

describe("rateLimit", () => {
  it("blocks after the limit within the window", () => {
    const key = `t-${Math.random()}`;
    expect(rateLimit(key, 2, 1000, 0).ok).toBe(true);
    expect(rateLimit(key, 2, 1000, 1).ok).toBe(true);
    expect(rateLimit(key, 2, 1000, 2).ok).toBe(false);
    expect(rateLimit(key, 2, 1000, 1001).ok).toBe(true);
  });
});
