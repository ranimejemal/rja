import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const csv = (v: unknown) => {
  const s = String(v ?? "");
  // Quote, and neutralise spreadsheet formulas.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replaceAll('"', '""')}"`;
};

export async function GET() {
  const session = await getSession();
  if (!session?.sellerId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const supabase = await createClient();
  const [{ data: items }, { data: ledger }] = await Promise.all([
    supabase.from("order_items").select("id, unit_price_minor, commission_bps, commission_minor, seller_share_minor, refunded_minor, currency, license_type, product:products!order_items_product_id_fkey(name)").eq("seller_id", session.sellerId),
    supabase.from("ledger_entries").select("order_item_id, created_at").eq("entry_type", "sale").eq("seller_id", session.sellerId),
  ]);
  const soldAt = new Map((ledger ?? []).map((l) => [l.order_item_id, l.created_at]));
  const rows = [["date", "product", "license", "currency", "price", "commission_rate_percent", "commission", "seller_share", "refunded"]];
  for (const i of items ?? []) {
    if (!soldAt.has(i.id)) continue;
    rows.push([soldAt.get(i.id)!, i.product?.name ?? "", i.license_type, i.currency, (i.unit_price_minor / 100).toFixed(2),
      (i.commission_bps / 100).toFixed(2), (i.commission_minor / 100).toFixed(2), (i.seller_share_minor / 100).toFixed(2), (i.refunded_minor / 100).toFixed(2)]);
  }
  return new NextResponse(rows.map((r) => r.map(csv).join(",")).join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="sales.csv"', "Cache-Control": "no-store" },
  });
}
