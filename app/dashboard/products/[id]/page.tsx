import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { filesForBuyer } from "@/lib/entitlement";
import { parseManifest, type ConfigValues } from "@/lib/manifest";
import { features } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { ConfigForm } from "@/components/ConfigForm";
import { SubmitButton } from "@/components/client";
import { EmptyState, LICENSE_LABEL, Notice, SellerBadge, StatusPill } from "@/components/ui";
import { openTicket, requestRefund, submitReview } from "./actions";

export const metadata: Metadata = { title: "My automation" };

const KIND_LABEL: Record<string, string> = {
  workflow: "n8n workflow (JSON)", readme: "README", install_guide: "Installation guide", example_config: "Example configuration",
  changelog: "Changelog", screenshot: "Screenshot", sample: "Sample data",
};

export default async function PurchasedProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser(`/dashboard/products/${id}`);
  const supabase = await createClient();
  const { data: ent } = await supabase.from("entitlements")
    .select("license_type, granted_at, order_item_id, item:order_items(id, version_id, unit_price_minor, currency, refunded_minor, order_id)")
    .eq("user_id", session.userId).eq("product_id", id).is("revoked_at", null).order("granted_at", { ascending: false }).limit(1).maybeSingle();
  if (!ent) notFound();

  const [{ data: p }, { data: versions }, { data: configs }, { data: review }, { data: refunds }] = await Promise.all([
    supabase.from("products").select("id, slug, name, install_instructions, prerequisites, integrations, current_version_id, ownership, support_policy, seller:seller_profiles!products_seller_id_fkey(display_name, slug)").eq("id", id).single(),
    supabase.from("product_versions").select("id, version, changelog, created_at").eq("product_id", id).eq("status", "approved").order("created_at", { ascending: false }),
    supabase.from("product_configurations").select("id, revision, values, created_at").eq("user_id", session.userId).eq("product_id", id).order("revision", { ascending: false }),
    supabase.from("product_reviews").select("rating, body").eq("product_id", id).eq("user_id", session.userId).maybeSingle(),
    supabase.from("refunds").select("status, created_at").eq("order_item_id", ent.order_item_id).order("created_at", { ascending: false }).limit(1),
  ]);
  if (!p) notFound();
  const { data: manifestRow } = p.current_version_id
    ? await supabase.from("product_manifests").select("manifest").eq("version_id", p.current_version_id).maybeSingle()
    : { data: null };
  const manifest = manifestRow ? parseManifest(manifestRow.manifest) : null;
  const files = features.serverAdmin ? await filesForBuyer(session.userId, id) : null;
  const purchased = versions?.find((v) => v.id === ent.item?.version_id);
  const current = versions?.[0];
  const updateAvailable = current && purchased && current.id !== purchased.id;
  const lastRefund = refunds?.[0];

  return (
    <>
      <div className="stack">
        <Link className="tag" href="/dashboard">← My automations</Link>
        <div className="badges"><SellerBadge isPlatform={p.ownership === "platform"} /><span className="badge">{LICENSE_LABEL[ent.license_type]} license</span></div>
        <h1 className="h2">{p.name}</h1>
        <p className="small muted">by {p.seller?.display_name} · purchased {new Date(ent.granted_at).toLocaleDateString("en-GB")} · <Link className="link" href={`/products/${p.slug}`}>Product page</Link></p>
      </div>

      {updateAvailable && <Notice tone="warn">Version {current.version} is available (you bought {purchased.version}). Downloads below are the latest approved version. {current.changelog}</Notice>}

      <section className="card stack" aria-labelledby="files-h">
        <h2 id="files-h" className="h3">Files</h2>
        {!features.serverAdmin ? (
          <Notice tone="warn">Downloads are not available yet: the file service is being configured.</Notice>
        ) : files?.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>File</th><th>Type</th><th className="num">Size</th><th /></tr></thead>
              <tbody>{files.map((f) => (
                <tr key={f.id}><td>{f.file_name}</td><td>{KIND_LABEL[f.kind]}</td><td className="num">{Math.max(1, Math.round(f.size_bytes / 1024))} KB</td>
                  <td><a className="btn small" href={`/api/downloads/${f.id}`}>Download</a></td></tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No files">The seller has not attached files to this version yet. Contact them below.</EmptyState>
        )}
        <p className="tiny muted">Download links are created for you on request and expire after 60 seconds.</p>
      </section>

      <section className="card stack" aria-labelledby="setup-h">
        <h2 id="setup-h" className="h3">Setup instructions</h2>
        <p className="small muted">Requirements: {p.prerequisites || "see the installation guide"}</p>
        <div className="prose" style={{ whiteSpace: "pre-line" }}>{p.install_instructions || "See the installation guide in the files above."}</div>
        <Notice>Test the workflow in your own n8n before connecting it to live data. The marketplace does not run or monitor your workflows.</Notice>
      </section>

      <section className="card stack" aria-labelledby="cfg-h" id="configure">
        <h2 id="cfg-h" className="h3">Customize</h2>
        {manifest?.ok && manifest.manifest.settings.length ? (
          <>
            <p className="small muted">Only the settings the creator made configurable can be changed. Each save creates a new configuration version.</p>
            <ConfigForm productId={p.id} manifest={manifest.manifest} initial={configs?.[0]?.values as ConfigValues | undefined} />
            {configs?.length ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Version</th><th>Saved</th><th /></tr></thead>
                  <tbody>{configs.map((c) => (
                    <tr key={c.id}><td>r{c.revision}</td><td>{new Date(c.created_at).toLocaleString("en-GB")}</td>
                      <td><a className="btn small ghost" href={`/api/configurations/${c.id}`}>Download package</a></td></tr>
                  ))}</tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : (
          <p className="muted small">This automation is ready to use and has no buyer settings. Connect your own app credentials in n8n.</p>
        )}
      </section>

      <section className="card stack" aria-labelledby="ver-h">
        <h2 id="ver-h" className="h3">Versions</h2>
        <ul className="prose">{(versions ?? []).map((v) => <li key={v.id}><strong>{v.version}</strong>{v.id === purchased?.id ? " (purchased)" : ""} — {v.changelog || "No notes."}</li>)}</ul>
      </section>

      <div className="grid" style={{ "--cols": 2 } as React.CSSProperties}>
        <form action={submitReview} className="card stack" id="review">
          <h2 className="h3">{review ? "Update your review" : "Review this automation"}</h2>
          <input type="hidden" name="product_id" value={p.id} />
          <div className="field">
            <label htmlFor="rating">Rating</label>
            <select id="rating" name="rating" defaultValue={review?.rating ?? 5}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}</select>
          </div>
          <div className="field"><label htmlFor="body">Comment (optional)</label><textarea id="body" name="body" maxLength={2000} defaultValue={review?.body ?? ""} /></div>
          <SubmitButton className="btn small">Save review</SubmitButton>
        </form>

        <form action={openTicket} className="card stack" id="support">
          <h2 className="h3">Ask the seller</h2>
          <input type="hidden" name="product_id" value={p.id} />
          <p className="tiny muted">{p.support_policy}</p>
          <div className="field"><label htmlFor="subject">Subject</label><input id="subject" name="subject" required maxLength={160} /></div>
          <div className="field"><label htmlFor="msg">Message</label><textarea id="msg" name="body" required minLength={10} maxLength={5000} /></div>
          <SubmitButton className="btn small">Send request</SubmitButton>
        </form>
      </div>

      <section className="card stack" id="refund">
        <h2 className="h3">Refund</h2>
        {lastRefund ? (
          <p className="small">Refund request: <StatusPill status={lastRefund.status} /></p>
        ) : ent.item ? (
          <form action={requestRefund} className="stack">
            <input type="hidden" name="product_id" value={p.id} />
            <input type="hidden" name="order_item_id" value={ent.item.id} />
            <p className="small muted">Paid {formatMoney(ent.item.unit_price_minor, ent.item.currency)}. See the <Link className="link" href="/legal/refund-policy">Refund Policy</Link>. An approved refund removes access to this product.</p>
            <div className="field"><label htmlFor="reason">Why do you want a refund?</label><textarea id="reason" name="reason" required minLength={10} maxLength={2000} /></div>
            <SubmitButton className="btn ghost small">Request refund</SubmitButton>
          </form>
        ) : null}
      </section>
    </>
  );
}
