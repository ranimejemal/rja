import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import type { ScanReport } from "@/lib/workflow-scan";
import { ConfirmSubmit, SubmitButton } from "@/components/client";
import { LICENSE_LABEL, Notice, StatusPill } from "@/components/ui";
import { moderateProduct, reviewVersion, toggleFeatured } from "../../actions";

export const metadata: Metadata = { title: "Review product" };

export default async function ReviewProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase.from("products").select("*, seller:seller_profiles!products_seller_id_fkey(display_name, slug, status, is_platform), category:product_categories(name)").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [{ data: versions }, { data: history }, { data: reports }] = await Promise.all([
    supabase.from("product_versions").select("id, version, status, changelog, scan_report, created_at, files:product_files(id, kind, file_name, size_bytes, sha256), manifest:product_manifests(manifest)").eq("product_id", id).order("created_at", { ascending: false }),
    supabase.from("product_status_history").select("from_status, to_status, note, created_at").eq("product_id", id).order("created_at", { ascending: false }),
    supabase.from("product_reports").select("reason, details, status, created_at").eq("product_id", id).order("created_at", { ascending: false }),
  ]);
  const canReview = ["submitted", "under_review"].includes(p.status);
  return (
    <>
      <div className="stack">
        <Link className="tag" href="/admin/products">← Products</Link>
        <div className="row"><h1 className="h2">{p.name}</h1><StatusPill status={p.status} /></div>
        <p className="small muted">{p.ownership === "platform" ? "Platform-owned" : "Third-party"} · by {p.seller?.display_name} ({p.seller?.status}) · {p.category?.name} · {formatMoney(p.price_minor, p.currency)} · {p.license_types.map((l) => LICENSE_LABEL[l]).join(", ")}</p>
        <p className="small">Rights confirmed: {p.rights_confirmed_at ? new Date(p.rights_confirmed_at).toLocaleString("en-GB") : <strong>no</strong>} · <Link className="link" href={`/products/${p.slug}`}>Listing preview</Link></p>
      </div>
      <Notice>Review the files by downloading them; never import or run an unreviewed workflow on a production n8n. Automated scan results are hints, not a guarantee.</Notice>

      <section className="card stack">
        <h2 className="h3">Decision</h2>
        <form action={moderateProduct} className="stack">
          <input type="hidden" name="id" value={p.id} />
          <div className="field"><label htmlFor="note">Note to the seller (required for changes, rejection and suspension)</label><textarea id="note" name="note" rows={3} /></div>
          <div className="row">
            {p.status === "submitted" && <button className="btn ghost small" name="to" value="under_review">Start review</button>}
            {canReview && <button className="btn accent small" name="to" value="approved">Approve</button>}
            {canReview && <button className="btn ghost small" name="to" value="changes_requested">Request changes</button>}
            {canReview && <ConfirmSubmit className="btn danger small" name="to" value="rejected" title="Reject this product?" message="The seller sees your note.">Reject</ConfirmSubmit>}
            {p.status !== "suspended" && <ConfirmSubmit className="btn danger small" name="to" value="suspended" title="Suspend this product?" message="It is removed from the store immediately. Existing buyers keep access to their files.">Suspend</ConfirmSubmit>}
            {p.status === "suspended" && <button className="btn ghost small" name="to" value="under_review">Reopen review</button>}
          </div>
        </form>
        {p.status === "published" && (
          <form action={toggleFeatured} className="row">
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="featured" value={p.is_featured ? "0" : "1"} />
            <SubmitButton className="btn ghost small">{p.is_featured ? "Remove from featured" : "Feature on homepage"}</SubmitButton>
          </form>
        )}
      </section>

      <section className="card stack">
        <h2 className="h3">Listing</h2>
        <p className="small"><strong>Short description:</strong> {p.short_description}</p>
        <div className="prose small" style={{ whiteSpace: "pre-line" }}>{p.description}</div>
        <p className="small"><strong>Apps:</strong> {p.integrations.join(", ") || "—"} · <strong>Prerequisites:</strong> {p.prerequisites || "—"}</p>
        <p className="small"><strong>Support:</strong> {p.support_policy || "—"}</p>
      </section>

      {(versions ?? []).map((v) => {
        const scan = v.scan_report as Partial<ScanReport>;
        const manifest = (v.manifest as { manifest: unknown } | null)?.manifest;
        return (
          <section key={v.id} className="card stack">
            <div className="row between"><h2 className="h3">Version {v.version}</h2><StatusPill status={v.status} /></div>
            {v.changelog && <p className="small muted">{v.changelog}</p>}
            <div className="table-wrap"><table>
              <thead><tr><th>File</th><th>Type</th><th className="num">Size</th><th>SHA-256</th><th /></tr></thead>
              <tbody>{v.files.map((f) => (
                <tr key={f.id}><td>{f.file_name}</td><td>{f.kind}</td><td className="num">{Math.round(f.size_bytes / 1024)} KB</td><td className="mono tiny">{f.sha256.slice(0, 16)}…</td>
                  <td><a className="btn small ghost" href={`/api/downloads/${f.id}`}>Download</a></td></tr>
              ))}</tbody>
            </table></div>
            {scan?.findings ? (
              <div className="stack">
                <strong className="small">Automated scan: {scan.findings.length ? `${scan.findings.length} finding(s)` : "no findings"}</strong>
                {scan.findings.map((f, i) => <Notice key={i} tone={f.severity === "error" ? "danger" : f.severity === "warning" ? "warn" : "info"}>{f.message}{f.node ? ` — node “${f.node}”` : ""}</Notice>)}
                {scan.credentialTypes?.length ? <p className="small muted">Credentials the buyer must create: {scan.credentialTypes.join(", ")}</p> : null}
              </div>
            ) : <p className="small muted">No workflow scanned yet.</p>}
            {manifest ? <details><summary className="small">Configuration manifest</summary><pre className="mono tiny" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(manifest, null, 2)}</pre></details> : null}
            {v.status === "submitted" && p.status === "published" && (
              <form action={reviewVersion} className="stack">
                <input type="hidden" name="product_id" value={p.id} /><input type="hidden" name="version_id" value={v.id} />
                <div className="field"><label htmlFor={`vn-${v.id}`}>Note (required to reject)</label><input id={`vn-${v.id}`} name="note" /></div>
                <div className="row">
                  <button className="btn accent small" name="approve" value="1">Approve update</button>
                  <ConfirmSubmit className="btn danger small" name="approve" value="0" title="Reject this update?" message="Buyers keep the current version.">Reject update</ConfirmSubmit>
                </div>
              </form>
            )}
          </section>
        );
      })}

      {reports?.length ? (
        <section className="card stack">
          <h2 className="h3">Reports</h2>
          {reports.map((r, i) => <p key={i} className="small"><StatusPill status={r.status} /> {r.reason}: {r.details}</p>)}
        </section>
      ) : null}

      <section className="card stack">
        <h2 className="h3">History</h2>
        <ul className="prose small">{(history ?? []).map((h, i) => <li key={i}>{new Date(h.created_at).toLocaleString("en-GB")}: {h.from_status ?? "—"} → <strong>{h.to_status}</strong>{h.note ? ` — ${h.note}` : ""}</li>)}</ul>
      </section>
    </>
  );
}
