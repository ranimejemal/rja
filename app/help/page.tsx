import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Help center" };

const FAQ: [string, [string, string][]][] = [
  ["Buying", [
    ["What do I get when I buy an automation?", "The n8n workflow file (JSON), its documentation and installation guide, and updates for that product. You run it in your own n8n instance (self-hosted or n8n Cloud)."],
    ["When do I get access?", "As soon as the payment provider confirms your payment. The product then appears in My automations with its download and setup steps."],
    ["Are app subscriptions included?", "No. Each product lists the accounts it needs (for example OpenAI or HubSpot). Their subscriptions and usage are billed by those providers."],
    ["Can I customize a workflow?", "Products marked Configurable or Guided setup have a settings form defined by the creator. You fill it in from your dashboard and download a configured package. Only the settings the creator declared can be changed."],
    ["Does the marketplace run my workflows?", "Not today. We never show a workflow as running, because we do not execute it. Hosted automations may come later."],
  ]],
  ["Refunds & support", [
    ["How do I get help with a product?", "Open the product in My automations and send a support request to its seller."],
    ["How do refunds work?", "Request a refund from your order page. Refunds follow the Refund Policy; an approved refund removes access to the product."],
  ]],
  ["Selling", [
    ["Who can sell?", "Anyone with an account can apply. Applications are reviewed, and the seller agreement must be accepted before publishing."],
    ["How much does the platform take?", "A commission on each successful sale, shown on the Pricing page and recorded with every order. Platform-owned products have no seller commission."],
    ["How are uploads checked?", "Files are type- and size-checked, stored privately and scanned for obvious risks such as hard-coded secrets or shell commands. They are never executed. Automated checks do not guarantee a workflow is safe, so every product is also reviewed by our team."],
    ["How do payouts work?", "Request a payout from your dashboard. Payouts are processed by our team and marked paid only once the transfer is confirmed."],
  ]],
];

export default function HelpPage() {
  return (
    <section className="section">
      <div className="container stack" style={{ "--gap": "3rem", maxWidth: "56rem" } as React.CSSProperties}>
        <div className="stack">
          <span className="tag">(Help center)</span>
          <h1 className="h1">How can we <span className="serif">help?</span></h1>
          <p className="lead">Still stuck? Email <a className="link" href="mailto:ranimejmal@gmail.com">ranimejmal@gmail.com</a> or call +216 97 017 061 / +33 6 24 97 99 41.</p>
        </div>
        {FAQ.map(([group, items]) => (
          <div key={group} className="stack">
            <span className="tag">({group})</span>
            {items.map(([q, a]) => (
              <details key={q} className="card">
                <summary><strong>{q}</strong></summary>
                <p className="muted" style={{ marginTop: "0.75rem" }}>{a}</p>
              </details>
            ))}
          </div>
        ))}
        <p className="small muted">Legal: <Link className="link" href="/legal/terms">Terms</Link> · <Link className="link" href="/legal/privacy">Privacy</Link> · <Link className="link" href="/legal/buyer-license">Buyer license</Link> · <Link className="link" href="/legal/seller-agreement">Seller agreement</Link> · <Link className="link" href="/legal/refund-policy">Refunds</Link></p>
      </div>
    </section>
  );
}
