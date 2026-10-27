import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { bpsToPercent, formatMoney, splitPrice } from "@/lib/money";
import { LICENSE_LABEL } from "@/components/ui";

export const metadata: Metadata = { title: "Pricing and licensing" };

const LICENSE_TERMS: Record<string, string> = {
  personal: "Use the automation for yourself, not for a business or clients.",
  single_business: "Use it inside one business you own or work for.",
  commercial: "Use it in your business and in projects you deliver to clients.",
  extended_commercial: "Commercial use plus inclusion in products or services you sell to many customers. Reselling the workflow files themselves is still not allowed.",
};

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: s } = await supabase.from("platform_settings").select("default_commission_bps").single();
  const bps = s?.default_commission_bps ?? 2000;
  const ex = splitPrice(10000, bps);
  return (
    <section className="section">
      <div className="container stack" style={{ "--gap": "3.5rem" } as React.CSSProperties}>
        <div className="stack">
          <span className="tag">(Pricing &amp; licensing)</span>
          <h1 className="h1">Clear prices, <span className="serif">clear rights.</span></h1>
          <p className="lead">Every product page shows the full price, the license you get and the third-party costs to expect — before you pay.</p>
        </div>

        <div className="grid" style={{ "--cols": 2 } as React.CSSProperties}>
          <div className="card stack">
            <span className="tag">(For buyers)</span>
            <h2 className="h3">One-time purchase</h2>
            <ul className="prose">
              <li>You pay the listed price once, plus VAT where applicable.</li>
              <li>You receive the workflow files, documentation and updates for that product.</li>
              <li>Third-party apps and API usage (e.g. OpenAI, HubSpot) are billed by those providers.</li>
              <li>Hosted execution is not part of the current offer: you run workflows in your own n8n.</li>
            </ul>
          </div>
          <div className="card stack">
            <span className="tag">(For sellers)</span>
            <h2 className="h3">{bpsToPercent(bps)} commission per successful sale</h2>
            <p className="small muted">Example for a {formatMoney(10000)} product: platform commission {formatMoney(ex.commissionMinor)}, creator share {formatMoney(ex.sellerShareMinor)} before processing fees, refunds and taxes.</p>
            <p className="small muted">Platform-owned products carry no seller commission. The commission rate is recorded with each order.</p>
            <Link className="btn ghost small" href="/sell" style={{ alignSelf: "flex-start" }}>Become a seller</Link>
          </div>
        </div>

        <div className="stack">
          <span className="tag">(License types)</span>
          <div className="table-wrap">
            <table>
              <thead><tr><th>License</th><th>What it allows</th></tr></thead>
              <tbody>{Object.entries(LICENSE_TERMS).map(([k, v]) => <tr key={k}><td><strong>{LICENSE_LABEL[k]}</strong></td><td>{v}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="small muted">Creators choose which licenses they offer and may only offer licenses they are authorized to grant. Buying a license does not transfer the creator’s intellectual property. Full terms: <Link className="link" href="/legal/buyer-license">Buyer License Agreement</Link> · <Link className="link" href="/legal/refund-policy">Refund Policy</Link>.</p>
        </div>
      </div>
    </section>
  );
}
