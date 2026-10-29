import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { thumbnailUrl } from "@/lib/catalog";
import { parseManifest } from "@/lib/manifest";
import { features } from "@/lib/env";
import { Badge, CUSTOMIZATION_LABEL, LICENSE_LABEL, Price, Rating, SellerBadge } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { QuoteForm } from "@/components/QuoteForm";
import { ContactLinks } from "@/components/ContactLinks";
import { reportProduct, startCheckout } from "./actions";

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("products")
    .select(`*, seller:seller_profiles!products_seller_id_fkey(slug, display_name, bio, is_platform, is_demo),
             category:product_categories(slug, name)`)
    .eq("slug", slug)
    .maybeSingle();
  return p;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: p.name, description: p.short_description } : {};
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  const supabase = await createClient();
  const session = await getSession();
  const [{ data: versions }, { data: reviews }, { data: license }, owned] = await Promise.all([
    supabase.from("product_versions").select("id, version, changelog, created_at, status").eq("product_id", p.id).eq("status", "approved").order("created_at", { ascending: false }),
    supabase.from("product_reviews").select("rating, body, created_at").eq("product_id", p.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("agreements").select("id, title, version").eq("kind", "buyer_license").eq("is_current", true).maybeSingle(),
    session ? supabase.rpc("owns_product", { p_product_id: p.id }).then((r) => r.data === true) : Promise.resolve(false),
  ]);
  const { data: manifestRow } = p.current_version_id
    ? await supabase.from("product_manifests").select("manifest").eq("version_id", p.current_version_id).maybeSingle()
    : { data: null };
  const manifest = manifestRow ? parseManifest(manifestRow.manifest) : null;
  const isPlatform = p.ownership === "platform";
  const seller = p.seller as { slug: string; display_name: string; bio: string; is_platform: boolean; is_demo: boolean } | null;
  const category = p.category as { slug: string; name: string } | null;
  const published = p.status === "published";

  return (
    <>
      <section className="hero" style={{ paddingBottom: "2.5rem" }}>
        <div className="container stack" style={{ "--gap": "1.1rem" } as React.CSSProperties}>
          <nav className="tag" aria-label="Breadcrumb"><Link href="/explore">Explore</Link>{category && <> / <Link href={`/explore?category=${category.slug}`}>{category.name}</Link></>}</nav>
          <div className="badges">
            <SellerBadge isPlatform={isPlatform} />
            <Badge kind="verified">Reviewed by our team</Badge>
            <Badge>{CUSTOMIZATION_LABEL[p.customization_mode]}</Badge>
            {p.top_rank && <Badge kind="verified">Top {p.top_rank} AI automation for 2026</Badge>}
            {p.is_demo && <Badge kind="demo">Demo data — not for sale</Badge>}
            {!published && <Badge kind="demo">Not published ({p.status.replaceAll("_", " ")})</Badge>}
          </div>
          <h1 className="h1" data-split="rolling">{p.name}</h1>
          <p className="lead">{p.short_description}</p>
          <div className="row small">
            <span>by {seller ? <Link className="link" href={`/sellers/${seller.slug}`}>{seller.display_name}</Link> : "Unknown"}</span>
            <Rating avg={p.rating_avg} count={p.rating_count} />
            {p.sales_count > 0 && !p.is_demo && <span className="muted">{p.sales_count} sales</span>}
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="container split">
          <div className="stack" style={{ "--gap": "2.5rem" } as React.CSSProperties}>
            <Image src={thumbnailUrl(p.thumbnail_path)} alt="" width={1200} height={800} style={{ borderRadius: "var(--radius)", border: "1px solid var(--line)", width: "100%", height: "auto" }} priority />
            {p.demo_video_url && <p><a className="link" href={p.demo_video_url} rel="noopener nofollow" target="_blank">Watch the demo video ↗</a></p>}

            <div className="stack">
              <span className="tag" data-scramble-loop="">(About this automation)</span>
              <div className="prose" style={{ whiteSpace: "pre-line" }}>{p.description}</div>
            </div>

            <div className="stack">
              <span className="tag">(Details)</span>
              <div className="table-wrap">
                <table>
                  <tbody>
                    {p.audience && <tr><th scope="row">Who buys it</th><td>{p.audience}</td></tr>}
                    {p.price_label && <tr><th scope="row">Price</th><td>{p.price_label}</td></tr>}
                    <tr><th scope="row">Platform</th><td>{p.platforms.join(", ")}</td></tr>
                    <tr><th scope="row">Required apps</th><td><div className="badges">{p.integrations.map((i) => <Badge key={i}>{i}</Badge>)}</div></td></tr>
                    <tr><th scope="row">Prerequisites</th><td>{p.prerequisites || "—"}</td></tr>
                    <tr><th scope="row">Level</th><td style={{ textTransform: "capitalize" }}>{p.difficulty}</td></tr>
                    <tr><th scope="row">Customization</th><td>{CUSTOMIZATION_LABEL[p.customization_mode]}</td></tr>
                    {!p.quote_only && <tr><th scope="row">Current version</th><td>{versions?.[0]?.version ?? "—"}</td></tr>}
                    <tr><th scope="row">Support</th><td>{p.support_policy || "—"}</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="small"><strong>You need your own accounts for the apps above. Their subscriptions and API usage costs are not included and are billed by those providers.</strong></p>
            </div>

            {!p.quote_only && <div className="stack">
              <span className="tag">(What you can customize)</span>
              {manifest?.ok && manifest.manifest.settings.length ? (
                <ul className="prose">
                  {manifest.manifest.settings.map((s) => <li key={s.key}><strong>{s.label}</strong>{s.required ? " (required)" : ""}{s.help ? ` — ${s.help}` : ""}</li>)}
                </ul>
              ) : (
                <p className="muted">This automation is ready to use; it has no buyer-editable settings beyond your own app connections.</p>
              )}
            </div>}

            <div className="stack">
              <span className="tag">{p.quote_only ? "(How the setup works)" : "(Installation)"}</span>
              <div className="prose" style={{ whiteSpace: "pre-line" }}>{p.install_instructions || "Instructions are included with the download."}</div>
            </div>

            {!p.quote_only && <div className="stack">
              <span className="tag">(Version history)</span>
              {versions?.length ? (
                <ul className="prose">{versions.map((v) => <li key={v.id}><strong>{v.version}</strong> — {v.changelog || "No notes."}</li>)}</ul>
              ) : <p className="muted">No published versions yet.</p>}
            </div>}

            <div className="stack" id="reviews">
              <span className="tag">(Reviews from verified buyers)</span>
              {reviews?.length ? reviews.map((r, i) => (
                <div key={i} className="card flat stack" style={{ "--gap": "0.4rem" } as React.CSSProperties}>
                  <Rating avg={r.rating} count={1} />
                  {r.body && <p className="small">{r.body}</p>}
                </div>
              )) : <p className="muted">No reviews yet. Only buyers of this automation can leave a review.</p>}
            </div>
          </div>

          <aside className="stack" style={{ position: "sticky", top: "5.5rem" }}>
            {p.quote_only ? <QuoteCard slug={p.slug} name={p.name} priceLabel={p.price_label} audience={p.audience} defaults={{ name: session?.displayName, email: session?.email }} /> : (
            <form action={startCheckout} className="card stack" id="buy">
              <input type="hidden" name="slug" value={p.slug} />
              <input type="hidden" name="agreement_id" value={license?.id ?? ""} />
              <span className="tag">(Purchase)</span>
              <div className="row between"><Price minor={p.price_minor} currency={p.currency} /><span className="tiny muted">one-time · VAT may apply</span></div>
              <fieldset>
                <legend>License</legend>
                <div className="stack" style={{ "--gap": "0.5rem" } as React.CSSProperties}>
                  {p.license_types.map((l, i) => (
                    <label key={l} className="check"><input type="radio" name="license" value={l} defaultChecked={i === 0} /> <span>{LICENSE_LABEL[l]}</span></label>
                  ))}
                </div>
              </fieldset>
              <div className="small muted stack" style={{ "--gap": "0.35rem" } as React.CSSProperties}>
                <span>You receive: the n8n workflow file, documentation and updates for this product.</span>
                <span>Not included: hosted execution, third-party app subscriptions and API costs.</span>
                <span>Redistribution or resale of the files is not allowed. <Link className="link" href="/legal/refund-policy">Refund policy</Link>.</span>
              </div>
              <label className="check small">
                <input type="checkbox" name="accept" required />
                <span>I accept the <Link className="link" href="/legal/buyer-license" target="_blank">{license?.title ?? "Buyer License Agreement"}</Link>{license ? ` (v${license.version})` : ""}.</span>
              </label>
              {owned ? (
                <Link className="btn accent" href={`/dashboard/products/${p.id}`}>Open in my automations</Link>
              ) : p.is_demo || !published ? (
                <button className="btn" type="button" disabled>Not available for purchase</button>
              ) : !session ? (
                <Link className="btn accent" href={`/login?next=/products/${p.slug}`}>Log in to buy</Link>
              ) : p.price_minor > 0 && !features.payments ? (
                <>
                  <button className="btn" type="button" disabled>Checkout opening soon</button>
                  <p className="tiny muted">Payments are being set up. Contact ranimejmal@gmail.com to buy now.</p>
                </>
              ) : (
                <SubmitButton className="btn accent" pendingText="Opening checkout…">{p.price_minor === 0 ? "Get it free" : "Buy now"}</SubmitButton>
              )}
            </form>
            )}

            {seller && (
              <div className="card stack">
                <span className="tag">(Seller)</span>
                <SellerBadge isPlatform={seller.is_platform} />
                <Link className="h3" style={{ textDecoration: "none" }} href={`/sellers/${seller.slug}`}>{seller.display_name}</Link>
                <p className="small muted">{seller.bio}</p>
              </div>
            )}

            {session && (
              <details className="card" id="report">
                <summary className="small">Report this product</summary>
                <form action={reportProduct} className="stack" style={{ marginTop: "1rem" }}>
                  <input type="hidden" name="slug" value={p.slug} />
                  <div className="field">
                    <label htmlFor="reason">Reason</label>
                    <select id="reason" name="reason" required>
                      <option value="intellectual_property">Intellectual property</option>
                      <option value="malicious">Malicious or unsafe</option>
                      <option value="misleading">Misleading description</option>
                      <option value="quality">Quality problem</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="field"><label htmlFor="details">Details</label><textarea id="details" name="details" required minLength={10} maxLength={5000} /></div>
                  <SubmitButton className="btn ghost small">Send report</SubmitButton>
                </form>
              </details>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}

/** Done-for-you setups are priced by scope, so buyers ask for a quote instead of checking out. */
function QuoteCard({ slug, name, priceLabel, audience, defaults }: { slug: string; name: string; priceLabel: string | null; audience: string; defaults: { name?: string; email?: string } }) {
  return (
    <div className="card stack" id="buy">
      <span className="tag">(Done-for-you setup)</span>
      {priceLabel && <span className="price">{priceLabel}</span>}
      {audience && <p className="small muted">Best for: {audience}.</p>}
      <p className="small">We build and connect this automation in your own accounts. Tell us about your business and you get a fixed quote before any work starts.</p>
      <QuoteForm product={{ slug, name }} defaults={defaults} />
      <ContactLinks />
      <p className="tiny muted">Third-party app subscriptions and API usage are billed by those providers and are not included.</p>
    </div>
  );
}
