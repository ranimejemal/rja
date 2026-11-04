import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { EmptyState, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "Orders" };

export default async function Orders({ searchParams }: { searchParams: Promise<{ buyer?: string; status?: string }> }) {
  const { buyer, status = "all" } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("orders")
    .select("id, buyer_id, status, total_minor, currency, provider, created_at, items:order_items(id, unit_price_minor, refunded_minor, product:products(name, slug))")
    .order("created_at", { ascending: false }).limit(300);
  if (buyer && /^[0-9a-f-]{36}$/.test(buyer)) query = query.eq("buyer_id", buyer);
  if (status !== "all") query = query.eq("status", status as never);
  const [{ data: orders }, { data: users }] = await Promise.all([query, supabase.rpc("admin_users")]);
  const emailOf = new Map((users ?? []).map((u) => [u.id, u.email]));
  const statuses = ["all", "paid", "pending", "failed", "partially_refunded", "refunded"];
  return (
    <>
      <div className="stack">
        <span className="tag">(Orders)</span>
        <h1 className="h2">Orders</h1>
        <div className="row small">
          {statuses.map((s) => <Link key={s} className={s === status ? "badge verified" : "badge"} href={`/admin/orders?status=${s}${buyer ? `&buyer=${buyer}` : ""}`}>{s.replace("_", " ")}</Link>)}
          {buyer && <Link className="link" href="/admin/orders">Show every customer</Link>}
        </div>
      </div>
      {orders?.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Customer</th><th>Automations</th><th>Status</th><th className="num">Total</th></tr></thead>
            <tbody>{orders.map((o) => (
              <tr key={o.id}>
                <td className="small">{new Date(o.created_at).toLocaleString("en-GB")}</td>
                <td className="small">{emailOf.get(o.buyer_id) ?? o.buyer_id.slice(0, 8)}</td>
                <td className="small">{(o.items ?? []).map((i) => i.product?.name).filter(Boolean).join(", ")}</td>
                <td><StatusPill status={o.status} /></td>
                <td className="num">{formatMoney(o.total_minor, o.currency)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <EmptyState title="No orders yet">Paid, pending and refunded orders appear here.</EmptyState>}
    </>
  );
}
