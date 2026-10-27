import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Earnings breakdown from the seller's own ledger entries (row-level security limits rows to this seller). */
export async function sellerFinance(sellerId: string) {
  const supabase = await createClient();
  const [{ data: items }, { data: ledger }, { data: payouts }] = await Promise.all([
    supabase.from("order_items").select("unit_price_minor, commission_minor, seller_share_minor, refunded_minor, currency, order:orders(status)").eq("seller_id", sellerId),
    supabase.from("ledger_entries").select("entry_type, amount_minor").eq("seller_id", sellerId).eq("account", "seller"),
    supabase.from("payouts").select("amount_minor, status").eq("seller_id", sellerId),
  ]);
  const paid = (items ?? []).filter((i) => i.order && ["paid", "partially_refunded", "refunded"].includes(i.order.status));
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const byType = (t: string) => sum((ledger ?? []).filter((l) => l.entry_type === t).map((l) => l.amount_minor));
  const pendingPayouts = sum((payouts ?? []).filter((p) => ["requested", "approved", "processing"].includes(p.status)).map((p) => p.amount_minor));
  const balance = sum((ledger ?? []).map((l) => l.amount_minor));
  return {
    sales: paid.length,
    gross: sum(paid.map((i) => i.unit_price_minor)),
    commission: sum(paid.map((i) => i.commission_minor)),
    refunds: -byType("refund"),
    fees: -byType("processing_fee"),
    net: byType("sale") + byType("refund") + byType("processing_fee"),
    completedPayouts: -byType("payout"),
    pendingPayouts,
    balance,
    available: balance - pendingPayouts,
  };
}
