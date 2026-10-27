import { NextResponse, type NextRequest } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe webhook. The signature is verified before anything is read, and every database call is idempotent,
// so retried deliveries never create duplicate orders, commissions or entitlements.
export async function POST(request: NextRequest) {
  const provider = getPaymentProvider();
  if (!provider) return NextResponse.json({ error: "payments not configured" }, { status: 503 });

  const raw = await request.text();
  let event;
  try {
    event = await provider.parseWebhook(raw, request.headers);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  let result: string | null = null;
  let error: { message: string } | null = null;

  switch (event.type) {
    case "payment_succeeded": {
      ({ data: result, error } = await admin.rpc("finalize_paid_order", {
        p_order_id: event.orderId, p_provider: provider.id, p_event_id: event.eventId, p_event_type: event.eventType,
        p_payment_id: event.paymentId, p_amount_minor: event.amountMinor, p_currency: event.currency, p_fee_minor: event.feeMinor ?? 0,
      }));
      break;
    }
    case "payment_failed": {
      ({ data: result, error } = await admin.rpc("mark_order_failed", {
        p_order_id: event.orderId, p_provider: provider.id, p_event_id: event.eventId, p_event_type: event.eventType,
      }));
      break;
    }
    case "refund_succeeded": {
      const { data: refund } = await admin.from("refunds").select("status").eq("id", event.refundId).maybeSingle();
      if (refund?.status === "approved") {
        ({ data: result, error } = await admin.rpc("apply_refund", { p_refund_id: event.refundId, p_provider_refund_id: event.providerRefundId }));
      } else {
        result = refund ? "duplicate" : "unknown_refund";
      }
      break;
    }
    default:
      result = "ignored";
  }

  if (error) {
    // A 500 makes Stripe retry later; the database functions make the retry safe.
    console.error("webhook processing failed", event.type, error.message);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true, result });
}
