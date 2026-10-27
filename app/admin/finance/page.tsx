import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { bpsToPercent, formatMoney } from "@/lib/money";
import { ConfirmSubmit } from "@/components/client";
import { EmptyState, Notice, StatusPill } from "@/components/ui";
import { decideRefund, processRefund, setDefaultCommission, setPayoutStatus } from "../actions";

export const metadata: Metadata = { title: "Finance" };

export default async function Finance() {
  const supabase = await createClient();
  const [{ data: settings }, { data: refunds }, { data: payouts }, { data: ledger }] = await Promise.all([
    supabase.from("platform_settings").select("default_commission_bps, processing_fee_bearer, min_price_minor, max_price_minor").single(),
    supabase.from("refunds").select("id, amount_minor, currency, reason, status, created_at, order:orders(id, provider)").order("created_at", { ascending: false }).limit(50),
    supabase.from("payouts").select("id, amount_minor, currency, status, method, provider_reference, requested_at, seller:seller_profiles!payouts_seller_id_fkey(display_name)").order("requested_at", { ascending: false }).limit(50),
    supabase.from("ledger_entries").select("id, entry_type, account, amount_minor, currency, created_at, seller:seller_profiles(display_name)").order("created_at", { ascending: false }).limit(50),
  ]);
  return (
    <>
      <div className="stack"><span className="tag">(Finance)</span><h1 className="h2">Commission, refunds &amp; payouts</h1></div>

      <section className="card stack">
        <h2 className="h3">Default commission</h2>
        <p className="small muted">Current: {bpsToPercent(settings?.default_commission_bps ?? 2000)} · processing fees borne by: {settings?.processing_fee_bearer} · price limits {formatMoney(settings?.min_price_minor ?? 0)} – {formatMoney(settings?.max_price_minor ?? 0)}</p>
        <form action={setDefaultCommission} className="row" style={{ alignItems: "flex-end" }}>
          <div className="field" style={{ maxWidth: "10rem" }}><label htmlFor="percent">New rate (%)</label><input id="percent" name="percent" inputMode="decimal" required defaultValue={(settings?.default_commission_bps ?? 2000) / 100} /></div>
          <ConfirmSubmit className="btn small" title="Change the default commission?" message="Applies to future sales of third-party products. Recorded orders keep their rate. This is logged in the audit log.">Save</ConfirmSubmit>
        </form>
      </section>

      <section className="stack">
        <h2 className="h3">Refunds</h2>
        {refunds?.length ? refunds.map((r) => (
          <div key={r.id} className="card stack">
            <div className="row between"><strong>{formatMoney(r.amount_minor, r.currency)}</strong><StatusPill status={r.status} /></div>
            <p className="small muted">Order {r.order?.id} · {r.order?.provider} · {new Date(r.created_at).toLocaleDateString("en-GB")}</p>
            <p className="small">{r.reason}</p>
            {r.status === "requested" && (
              <form action={decideRefund} className="row" style={{ alignItems: "flex-end" }}>
                <input type="hidden" name="id" value={r.id} />
                <div className="field"><label htmlFor={`rn-${r.id}`}>Note</label><input id={`rn-${r.id}`} name="note" /></div>
                <button className="btn ghost small" name="approve" value="0">Reject</button>
                <ConfirmSubmit className="btn small" name="approve" value="1" title="Approve this refund?" message="You will then send it to the payment provider.">Approve</ConfirmSubmit>
              </form>
            )}
            {r.status === "approved" && (
              <form action={processRefund}>
                <input type="hidden" name="id" value={r.id} />
                <ConfirmSubmit className="btn danger small" title="Send this refund?" message={`${formatMoney(r.amount_minor, r.currency)} is returned to the buyer and their access is removed. Seller share and commission are reversed in proportion.`}>Send refund</ConfirmSubmit>
              </form>
            )}
          </div>
        )) : <EmptyState title="No refunds">Refund requests appear here.</EmptyState>}
      </section>

      <section className="stack">
        <h2 className="h3">Payouts</h2>
        <Notice>Payouts are manual: send the bank transfer, then mark the payout paid with the transfer reference. Never mark a payout paid before the transfer is confirmed.</Notice>
        {payouts?.length ? payouts.map((p) => (
          <div key={p.id} className="card stack">
            <div className="row between"><strong>{p.seller?.display_name} · {formatMoney(p.amount_minor, p.currency)}</strong><StatusPill status={p.status} /></div>
            <p className="small muted">Requested {new Date(p.requested_at).toLocaleDateString("en-GB")} · {p.method}{p.provider_reference ? ` · ref ${p.provider_reference}` : ""}</p>
            {["requested", "approved", "processing"].includes(p.status) && (
              <form action={setPayoutStatus} className="row" style={{ alignItems: "flex-end" }}>
                <input type="hidden" name="id" value={p.id} />
                <div className="field"><label htmlFor={`ref-${p.id}`}>Transfer reference</label><input id={`ref-${p.id}`} name="reference" /></div>
                <div className="field"><label htmlFor={`pn-${p.id}`}>Note</label><input id={`pn-${p.id}`} name="note" /></div>
                {p.status === "requested" && <button className="btn ghost small" name="status" value="approved">Approve</button>}
                <button className="btn ghost small" name="status" value="processing">Processing</button>
                <ConfirmSubmit className="btn small" name="status" value="paid" title="Mark this payout paid?" message="Only do this once the bank confirms the transfer. The seller's balance is debited.">Mark paid</ConfirmSubmit>
                <ConfirmSubmit className="btn danger small" name="status" value="canceled" title="Cancel this payout?" message="The amount becomes available to the seller again.">Cancel</ConfirmSubmit>
              </form>
            )}
          </div>
        )) : <EmptyState title="No payouts">Payout requests appear here.</EmptyState>}
      </section>

      <section className="stack">
        <h2 className="h3">Ledger (latest 50 entries)</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>Date</th><th>Type</th><th>Account</th><th>Seller</th><th className="num">Amount</th></tr></thead>
          <tbody>{(ledger ?? []).map((l) => (
            <tr key={l.id}><td>{new Date(l.created_at).toLocaleString("en-GB")}</td><td className="mono">{l.entry_type}</td><td>{l.account}</td><td>{l.seller?.display_name ?? "—"}</td>
              <td className="num">{formatMoney(l.amount_minor, l.currency)}</td></tr>
          ))}</tbody>
        </table></div>
      </section>
    </>
  );
}
