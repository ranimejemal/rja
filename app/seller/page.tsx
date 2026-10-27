import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sellerFinance } from "@/lib/seller";
import { formatMoney } from "@/lib/money";
import { Notice, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "Seller dashboard" };

export default async function SellerOverview() {
  const session = await requireRole("seller");
  const supabase = await createClient();
  const sellerId = session.sellerId!;
  const [f, { data: products }, { data: acceptance }, { data: current }, { data: reviews }] = await Promise.all([
    sellerFinance(sellerId),
    supabase.from("products").select("id, name, status, sales_count, rating_avg").eq("seller_id", sellerId).order("updated_at", { ascending: false }),
    supabase.from("seller_agreement_acceptances").select("agreement_id").eq("seller_id", sellerId),
    supabase.rpc("current_agreement", { p_kind: "seller_agreement" }),
    supabase.from("product_reviews").select("rating, body, created_at, product:products!inner(name, seller_id)").eq("product.seller_id", sellerId).order("created_at", { ascending: false }).limit(5),
  ]);
  const accepted = session.isPlatformSeller || (acceptance ?? []).some((a) => a.agreement_id === current);
  const kpis: [string, string][] = [
    ["Sales", String(f.sales)],
    ["Gross revenue", formatMoney(f.gross)],
    ["Platform commission", `−${formatMoney(f.commission)}`],
    ["Refunds", `−${formatMoney(f.refunds)}`],
    ["Processing fees", `−${formatMoney(f.fees)}`],
    ["Net earnings", formatMoney(f.net)],
    ["Pending payouts", formatMoney(f.pendingPayouts)],
    ["Completed payouts", formatMoney(f.completedPayouts)],
  ];
  return (
    <>
      <div className="stack">
        <span className="tag">(Seller dashboard)</span>
        <h1 className="h2">Overview</h1>
        {session.isPlatformSeller && <p className="small muted">You manage the platform-owned store. Platform products carry no seller commission.</p>}
      </div>
      {!accepted && (
        <Notice tone="warn">Accept the current seller agreement before submitting or publishing products. <Link className="link" href="/seller/agreement">Review the agreement</Link></Notice>
      )}
      {session.sellerStatus === "suspended" && <Notice tone="danger">Your seller account is suspended. Contact ranimejmal@gmail.com.</Notice>}
      <div className="grid" style={{ "--cols": 4 } as React.CSSProperties}>
        {kpis.map(([k, v]) => <div key={k} className="kpi"><span className="tag">{k}</span><span className="value">{v}</span></div>)}
      </div>
      <p className="tiny muted">Available to request: {formatMoney(Math.max(0, f.available))}. Amounts are calculated from the recorded commission at the time of each sale.</p>

      <section className="stack">
        <div className="row between"><h2 className="h3">Products</h2><Link className="btn small accent" href="/seller/products/new">Add product</Link></div>
        {products?.length ? (
          <div className="table-wrap"><table>
            <thead><tr><th>Product</th><th>Status</th><th className="num">Sales</th><th className="num">Rating</th></tr></thead>
            <tbody>{products.map((p) => (
              <tr key={p.id}><td><Link className="link" href={`/seller/products/${p.id}`}>{p.name}</Link></td><td><StatusPill status={p.status} /></td>
                <td className="num">{p.sales_count}</td><td className="num">{p.rating_avg ?? "—"}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <p className="muted small">No products yet.</p>}
      </section>

      <section className="stack">
        <h2 className="h3">Latest reviews</h2>
        {reviews?.length ? reviews.map((r, i) => (
          <div key={i} className="card flat small"><strong>{r.rating}/5</strong> on {r.product?.name} — {r.body || "No comment."}</div>
        )) : <p className="muted small">No reviews yet.</p>}
      </section>
    </>
  );
}
