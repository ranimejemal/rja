import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { EmptyState, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  const session = await requireUser("/dashboard/orders");
  const supabase = await createClient();
  const { data: orders } = await supabase.from("orders")
    .select("id, status, total_minor, currency, created_at, paid_at, items:order_items(product:products!order_items_product_id_fkey(name))")
    .eq("buyer_id", session.userId).order("created_at", { ascending: false });
  return (
    <>
      <div className="stack"><span className="tag">(Orders &amp; receipts)</span><h1 className="h2">Orders</h1></div>
      {orders?.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Items</th><th>Status</th><th className="num">Total</th><th /></tr></thead>
            <tbody>{orders.map((o) => (
              <tr key={o.id}>
                <td>{new Date(o.created_at).toLocaleDateString("en-GB")}</td>
                <td>{o.items.map((i) => i.product?.name).join(", ")}</td>
                <td><StatusPill status={o.status} /></td>
                <td className="num">{formatMoney(o.total_minor, o.currency)}</td>
                <td><Link className="btn small ghost" href={`/dashboard/orders/${o.id}`}>Receipt</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <EmptyState title="No orders">Your orders appear here.</EmptyState>}
    </>
  );
}
