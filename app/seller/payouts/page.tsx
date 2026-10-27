import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sellerFinance } from "@/lib/seller";
import { formatMoney, parsePriceToMinor } from "@/lib/money";
import { ConfirmSubmit } from "@/components/client";
import { EmptyState, Notice, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "Payouts" };

async function requestPayout(form: FormData) {
  "use server";
  await requireRole("seller");
  const amount = parsePriceToMinor(String(form.get("amount") ?? ""));
  if (!amount) redirect("/seller/payouts?error=Enter+an+amount.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_payout", { p_amount_minor: amount });
  redirect(`/seller/payouts?${error ? `error=${encodeURIComponent(error.message)}` : "notice=Payout+requested."}`);
}

export default async function PayoutsPage() {
  const session = await requireRole("seller");
  const supabase = await createClient();
  const [f, { data: payouts }] = await Promise.all([
    sellerFinance(session.sellerId!),
    supabase.from("payouts").select("id, amount_minor, currency, status, method, provider_reference, requested_at, paid_at").eq("seller_id", session.sellerId!).order("requested_at", { ascending: false }),
  ]);
  const available = Math.max(0, f.available);
  return (
    <>
      <div className="stack"><span className="tag">(Payouts)</span><h1 className="h2">Payouts</h1></div>
      <Notice>Payouts are currently processed manually by our team by bank transfer. A payout is marked paid only once the transfer is confirmed, with its reference.</Notice>
      <div className="grid" style={{ "--cols": 3 } as React.CSSProperties}>
        <div className="kpi"><span className="tag">Available</span><span className="value">{formatMoney(available)}</span></div>
        <div className="kpi"><span className="tag">Pending</span><span className="value">{formatMoney(f.pendingPayouts)}</span></div>
        <div className="kpi"><span className="tag">Paid out</span><span className="value">{formatMoney(f.completedPayouts)}</span></div>
      </div>
      {session.isPlatformSeller ? <p className="small muted">Platform revenue is not paid out through seller payouts.</p> : available > 0 ? (
        <form action={requestPayout} className="card row">
          <div className="field" style={{ maxWidth: "14rem" }}><label htmlFor="amount">Amount (EUR)</label><input id="amount" name="amount" inputMode="decimal" defaultValue={(available / 100).toFixed(2)} required /></div>
          <ConfirmSubmit className="btn accent" title="Request this payout?" message="Our team will review it and send the transfer to the account details on file.">Request payout</ConfirmSubmit>
        </form>
      ) : <p className="small muted">No balance available yet.</p>}
      {payouts?.length ? (
        <div className="table-wrap"><table>
          <thead><tr><th>Requested</th><th className="num">Amount</th><th>Method</th><th>Status</th><th>Reference</th><th>Paid</th></tr></thead>
          <tbody>{payouts.map((p) => (
            <tr key={p.id}><td>{new Date(p.requested_at).toLocaleDateString("en-GB")}</td><td className="num">{formatMoney(p.amount_minor, p.currency)}</td>
              <td>{p.method === "manual" ? "Bank transfer (manual)" : "Stripe Connect"}</td><td><StatusPill status={p.status} /></td>
              <td className="mono">{p.provider_reference ?? "—"}</td><td>{p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-GB") : "—"}</td></tr>
          ))}</tbody>
        </table></div>
      ) : <EmptyState title="No payouts">Requested payouts appear here.</EmptyState>}
    </>
  );
}
