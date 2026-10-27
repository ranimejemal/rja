import Stripe from "stripe";
import type { CreateCheckoutInput, PaymentEvent, PaymentProvider } from "./types";

/** Maps a verified Stripe event to a marketplace event. Pure, so it is unit-tested without the network. */
export function mapStripeEvent(event: Stripe.Event): PaymentEvent {
  const base = { eventId: event.id, eventType: event.type };
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object as Stripe.Checkout.Session;
      const orderId = s.metadata?.order_id ?? s.client_reference_id;
      // "completed" can arrive before the money is captured (e.g. bank debits): only "paid" grants access.
      if (!orderId || s.payment_status !== "paid") return { type: "ignored", ...base };
      const paymentId = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
      if (!paymentId || s.amount_total == null || !s.currency) return { type: "ignored", ...base };
      return { type: "payment_succeeded", ...base, orderId, paymentId, amountMinor: s.amount_total, currency: s.currency.toUpperCase(), feeMinor: null };
    }
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const s = event.data.object as Stripe.Checkout.Session;
      const orderId = s.metadata?.order_id ?? s.client_reference_id;
      return orderId ? { type: "payment_failed", ...base, orderId } : { type: "ignored", ...base };
    }
    case "refund.updated":
    case "refund.created": {
      const r = event.data.object as Stripe.Refund;
      const refundId = r.metadata?.refund_id;
      if (r.status !== "succeeded" || !refundId) return { type: "ignored", ...base };
      return { type: "refund_succeeded", ...base, refundId, providerRefundId: r.id };
    }
    default:
      return { type: "ignored", ...base };
  }
}

export class StripeProvider implements PaymentProvider {
  readonly id = "stripe";
  private stripe: Stripe;

  constructor(secretKey: string, private webhookSecret: string) {
    this.stripe = new Stripe(secretKey);
  }

  async createCheckout(input: CreateCheckoutInput) {
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: input.orderId,
        customer_email: input.customerEmail,
        metadata: { order_id: input.orderId },
        payment_intent_data: { metadata: { order_id: input.orderId } },
        line_items: input.lines.map((l) => ({
          quantity: 1,
          price_data: { currency: input.currency.toLowerCase(), unit_amount: l.amountMinor, product_data: { name: l.name } },
        })),
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      },
      { idempotencyKey: `checkout-${input.orderId}` },
    );
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { sessionId: session.id, url: session.url };
  }

  async parseWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent> {
    const signature = headers.get("stripe-signature");
    if (!signature) throw new Error("missing signature");
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    const mapped = mapStripeEvent(event);
    if (mapped.type === "payment_succeeded") {
      mapped.feeMinor = await this.processingFee(mapped.paymentId);
    }
    return mapped;
  }

  /** Stripe's fee for the payment, from its balance transaction (null if not available yet). */
  private async processingFee(paymentIntentId: string): Promise<number | null> {
    try {
      const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge.balance_transaction"] });
      const charge = pi.latest_charge as Stripe.Charge | null;
      const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null;
      return bt?.fee ?? null;
    } catch {
      return null;
    }
  }

  async refund(input: { paymentId: string; amountMinor: number; refundId: string }) {
    const r = await this.stripe.refunds.create(
      { payment_intent: input.paymentId, amount: input.amountMinor, metadata: { refund_id: input.refundId } },
      { idempotencyKey: `refund-${input.refundId}` },
    );
    const status = r.status === "succeeded" ? "succeeded" : r.status === "failed" || r.status === "canceled" ? "failed" : "pending";
    return { providerRefundId: r.id, status } as const;
  }
}
