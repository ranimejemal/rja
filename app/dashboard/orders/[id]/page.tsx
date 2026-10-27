import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { LICENSE_LABEL, Notice, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "Receipt" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser(`/dashboard/orders/${id}`);
  const supabase = await createClient();
  const { data: o } = await supabase.from("orders")
    .select(`id, status, total_minor, currency, created_at, paid_at, provider,
      items:order_items(id, unit_price_minor, currency, license_type, refunded_minor, product:products!order_items_product_id_fkey(id, name)),
      accepted:license_acceptances(accepted_at, agreement:agreements(title, version))`)
    .eq("id", id).eq("buyer_id", session.userId).maybeSingle();
  if (!o) notFound();
  return (
    <>
      <div className="stack">
        <Link className="tag" href="/dashboard/orders">← Orders</Link>
        <h1 className="h2">Receipt</h1>
        <p className="mono muted">Order {o.id}</p>
      </div>
      {o.status === "pending" && <Notice>Waiting for the payment provider to confirm your payment. This page updates once it does — access is only granted after confirmation.</Notice>}
      {o.status === "failed" && <Notice tone="danger">The payment did not go through. You have not been charged for this order.</Notice>}
      <div className="card stack">
        <div className="row between"><span>Status</span><StatusPill status={o.status} /></div>
        <div className="row between"><span>Created</span><span>{new Date(o.created_at).toLocaleString("en-GB")}</span></div>
        {o.paid_at && <div className="row between"><span>Paid</span><span>{new Date(o.paid_at).toLocaleString("en-GB")}</span></div>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Item</th><th>License</th><th className="num">Price</th><th className="num">Refunded</th></tr></thead>
            <tbody>{o.items.map((i) => (
              <tr key={i.id}>
                <td>{i.product ? <Link className="link" href={`/dashboard/products/${i.product.id}`}>{i.product.name}</Link> : "—"}</td>
                <td>{LICENSE_LABEL[i.license_type]}</td>
                <td className="num">{formatMoney(i.unit_price_minor, i.currency)}</td>
                <td className="num">{i.refunded_minor ? formatMoney(i.refunded_minor, i.currency) : "—"}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr><td colSpan={2}><strong>Total</strong></td><td className="num"><strong>{formatMoney(o.total_minor, o.currency)}</strong></td><td /></tr></tfoot>
          </table>
        </div>
        {o.accepted.map((a, i) => (
          <p key={i} className="tiny muted">Accepted {a.agreement?.title} v{a.agreement?.version} on {new Date(a.accepted_at).toLocaleString("en-GB")}.</p>
        ))}
        <p className="tiny muted">This is a purchase record, not a tax invoice. VAT invoices are issued by the payment provider where supported.</p>
      </div>
    </>
  );
}
