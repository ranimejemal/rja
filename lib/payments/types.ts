// Provider-neutral payment interface. The marketplace only talks to this, so a provider can be swapped
// without touching orders, commissions or the ledger (which live in the database).

export type CheckoutLine = { name: string; amountMinor: number; quantity: 1 };

export type CreateCheckoutInput = {
  orderId: string;
  currency: string;
  lines: CheckoutLine[];
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
};

/** Normalised webhook events. Anything else is "ignored". */
export type PaymentEvent =
  | { type: "payment_succeeded"; eventId: string; eventType: string; orderId: string; paymentId: string; amountMinor: number; currency: string; feeMinor: number | null }
  | { type: "payment_failed"; eventId: string; eventType: string; orderId: string }
  | { type: "refund_succeeded"; eventId: string; eventType: string; refundId: string; providerRefundId: string }
  | { type: "ignored"; eventId: string; eventType: string };

export interface PaymentProvider {
  readonly id: string;
  createCheckout(input: CreateCheckoutInput): Promise<{ sessionId: string; url: string }>;
  /** Verifies the signature and returns the normalised event. Throws when the signature is invalid. */
  parseWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent>;
  refund(input: { paymentId: string; amountMinor: number; refundId: string }): Promise<{ providerRefundId: string; status: "succeeded" | "pending" | "failed" }>;
}
