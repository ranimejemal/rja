import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bpsToPercent, formatMoney } from "@/lib/money";
import { EmptyState, LICENSE_LABEL, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "Sales" };

export default async function SalesPage() {
  const session = await requireRole("seller");
  const supabase = await createClient();
  // Sellers see their order items but never the buyer's identity.
  const { data } = await supabase.from("order_items")
    .select("id, unit_price_minor, commission_bps, commission_minor, seller_share_minor, refunded_minor, currency, license_type, product:products!order_items_product_id_fkey(name)")
    .eq("seller_id", session.sellerId!).order("id");
  const { data: ledger } = await supabase.from("ledger_entries").select("order_item_id, created_at").eq("entry_type", "sale").eq("seller_id", session.sellerId!);
  const soldAt = new Map((ledger ?? []).map((l) => [l.order_item_id, l.created_at]));
  const sales = (data ?? []).filter((i) => soldAt.has(i.id)).sort((a, b) => (soldAt.get(b.id) ?? "").localeCompare(soldAt.get(a.id) ?? ""));
  return (
    <>
      <div className="row between">
        <div className="stack"><span className="tag">(Sales)</span><h1 className="h2">Completed sales</h1></div>
        <a className="btn ghost small" href="/api/seller/sales.csv">Export CSV</a>
      </div>
      {sales.length ? (
        <div className="table-wrap"><table>
          <thead><tr><th>Date</th><th>Product</th><th>License</th><th className="num">Price</th><th className="num">Commission</th><th className="num">Your share</th><th>Refund</th></tr></thead>
          <tbody>{sales.map((s) => (
            <tr key={s.id}>
              <td>{new Date(soldAt.get(s.id)!).toLocaleDateString("en-GB")}</td>
              <td>{s.product?.name}</td>
              <td>{LICENSE_LABEL[s.license_type]}</td>
              <td className="num">{formatMoney(s.unit_price_minor, s.currency)}</td>
              <td className="num">−{formatMoney(s.commission_minor, s.currency)} ({bpsToPercent(s.commission_bps)})</td>
              <td className="num">{formatMoney(s.seller_share_minor, s.currency)}</td>
              <td>{s.refunded_minor ? <StatusPill status="refunded" label={`−${formatMoney(s.refunded_minor, s.currency)}`} /> : "—"}</td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <EmptyState title="No sales yet">Completed sales appear here once payments are confirmed.</EmptyState>}
    </>
  );
}
