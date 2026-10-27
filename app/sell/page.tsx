import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listCategories } from "@/lib/catalog";
import { bpsToPercent, formatMoney, splitPrice } from "@/lib/money";
import { Notice, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { applyToSell } from "./actions";

export const metadata: Metadata = { title: "Become a seller" };

const COUNTRIES: [string, string][] = [["FR", "France"], ["TN", "Tunisia"], ["BE", "Belgium"], ["DE", "Germany"], ["ES", "Spain"], ["IT", "Italy"], ["NL", "Netherlands"], ["PT", "Portugal"], ["IE", "Ireland"], ["LU", "Luxembourg"], ["CH", "Switzerland"], ["GB", "United Kingdom"], ["MA", "Morocco"], ["DZ", "Algeria"], ["CA", "Canada"], ["US", "United States"]];

export default async function SellPage() {
  const session = await getSession();
  const supabase = await createClient();
  const [{ data: settings }, categories, applications] = await Promise.all([
    supabase.from("platform_settings").select("default_commission_bps").single(),
    listCategories(),
    session ? supabase.from("seller_applications").select("status, admin_note, created_at").eq("user_id", session.userId).order("created_at", { ascending: false }).limit(1) : Promise.resolve({ data: [] }),
  ]);
  const bps = settings?.default_commission_bps ?? 2000;
  const example = splitPrice(10000, bps);
  const latest = applications.data?.[0];
  const canApply = session && !session.sellerId && (!latest || latest.status === "rejected");

  return (
    <>
      <section className="hero">
        <div className="container stack" style={{ "--gap": "1.4rem" } as React.CSSProperties}>
          <span className="tag">(Become a seller)</span>
          <h1 className="display">Build once, <span className="serif accent">sell repeatedly.</span></h1>
          <p className="lead">Publish your AI automations and n8n workflows, set your own price, and earn from every sale. Keep ownership of your work.</p>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <div className="stack" style={{ "--gap": "2rem" } as React.CSSProperties}>
            <ol className="step-list">
              <li><strong>Apply</strong><span className="muted">Share your experience, categories and sample work. We only ask for what we need.</span></li>
              <li><strong>Accept the seller agreement</strong><span className="muted">Commission, payouts, ownership, originality, prohibited content, support and refunds. Required before publishing.</span></li>
              <li><strong>Create your product</strong><span className="muted">Upload the workflow JSON and docs, set your price and license, and declare which settings buyers may customize.</span></li>
              <li><strong>Submit for review</strong><span className="muted">We check the listing and the files before anything is published. Uploads are never executed.</span></li>
              <li><strong>Get paid</strong><span className="muted">Track gross sales, commission, refunds and earnings. Request a payout once you have a balance.</span></li>
            </ol>
            <div className="card stack">
              <span className="tag">(Commission example)</span>
              <table>
                <tbody>
                  <tr><td>Product price</td><td className="num">{formatMoney(10000)}</td></tr>
                  <tr><td>Platform commission ({bpsToPercent(bps)})</td><td className="num">−{formatMoney(example.commissionMinor)}</td></tr>
                  <tr><td><strong>Your share before other deductions</strong></td><td className="num"><strong>{formatMoney(example.sellerShareMinor)}</strong></td></tr>
                </tbody>
              </table>
              <p className="tiny muted">Payment processing fees, refunds, chargebacks and taxes are shown separately in your dashboard. The rate in force at the time of each sale is recorded with the order.</p>
            </div>
          </div>

          <div className="stack" id="apply">
            {!session ? (
              <div className="card stack">
                <h2 className="h3">Start with an account</h2>
                <p className="muted small">Your buyer account can also sell — no second account needed.</p>
                <div className="row"><Link className="btn accent" href="/signup?next=/sell">Sign up</Link><Link className="btn ghost" href="/login?next=/sell">Log in</Link></div>
              </div>
            ) : session.sellerId ? (
              <div className="card stack">
                <h2 className="h3">You are a seller</h2>
                <StatusPill status={session.sellerStatus ?? "approved"} />
                <Link className="btn accent" href="/seller">Open seller dashboard</Link>
              </div>
            ) : (
              <>
                {latest && (
                  <div className="card stack" id="status">
                    <span className="tag">(Application status)</span>
                    <StatusPill status={latest.status} />
                    {latest.admin_note && <Notice tone={latest.status === "rejected" ? "danger" : "warn"}>{latest.admin_note}</Notice>}
                    {latest.status === "info_requested" && <p className="small muted">Reply to ranimejmal@gmail.com with the requested information.</p>}
                  </div>
                )}
                {canApply && (
                  <form action={applyToSell} className="card stack">
                    <h2 className="h3">Seller application</h2>
                    <div className="field"><label htmlFor="display_name">Public display name</label><input id="display_name" name="display_name" required maxLength={80} /></div>
                    <div className="field"><label htmlFor="contact_email">Contact email (not shown publicly)</label><input id="contact_email" name="contact_email" type="email" required defaultValue={session.email} /></div>
                    <div className="field">
                      <label htmlFor="country">Country of residence or business registration</label>
                      <select id="country" name="country" required defaultValue="">
                        <option value="" disabled>Choose…</option>
                        {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                      </select>
                    </div>
                    <div className="field"><label htmlFor="profile">Creator or business profile</label><textarea id="profile" name="profile" maxLength={600} placeholder="Shown on your public profile once approved." /></div>
                    <div className="field"><label htmlFor="experience">Your experience</label><textarea id="experience" name="experience" required minLength={20} maxLength={2000} placeholder="What do you build, for whom, with which tools?" /></div>
                    <fieldset>
                      <legend>Product categories</legend>
                      <div className="form-grid">
                        {categories.map((c) => <label key={c.slug} className="check small"><input type="checkbox" name="categories" value={c.slug} /> {c.name}</label>)}
                      </div>
                    </fieldset>
                    <div className="field"><label htmlFor="portfolio_url">Portfolio or sample work (optional, https)</label><input id="portfolio_url" name="portfolio_url" type="url" placeholder="https://" /></div>
                    <p className="tiny muted">Tax and payout details are collected later, only when needed, through a secure process.</p>
                    <SubmitButton className="btn accent">Submit application</SubmitButton>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
