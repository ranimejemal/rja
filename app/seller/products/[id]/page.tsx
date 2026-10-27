import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FILE_RULES } from "@/lib/files";
import type { ScanReport } from "@/lib/workflow-scan";
import { features } from "@/lib/env";
import { ProductFields } from "@/components/ProductFields";
import { ConfirmSubmit, SubmitButton } from "@/components/client";
import { Notice, StatusPill } from "@/components/ui";
import {
  changeStatus, confirmRights, createVersion, deleteFile, saveManifest, submitVersion, updateProduct, uploadFile, uploadThumbnail,
} from "../actions";

export const metadata: Metadata = { title: "Edit product" };

const EDITABLE = ["draft", "changes_requested", "rejected", "archived"];
const MANIFEST_EXAMPLE = (version: string) => JSON.stringify({
  schemaVersion: 1, productType: "n8n-workflow", workflowVersion: version,
  settings: [
    { key: "business_name", label: "Business name", type: "text", required: true },
    { key: "notification_email", label: "Notification email", type: "email", required: true },
  ],
}, null, 2);

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("seller");
  const supabase = await createClient();
  const { data: p } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (!p || (p.seller_id !== session.sellerId)) notFound();
  const [{ data: categories }, { data: versions }, { data: history }] = await Promise.all([
    supabase.from("product_categories").select("id, name").eq("is_active", true).order("sort_order"),
    supabase.from("product_versions").select("id, version, changelog, status, scan_report, created_at, files:product_files(id, kind, file_name, size_bytes), manifest:product_manifests(manifest)").eq("product_id", id).order("created_at", { ascending: false }),
    supabase.from("product_status_history").select("from_status, to_status, note, created_at").eq("product_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  const editable = EDITABLE.includes(p.status);
  const lastNote = history?.find((h) => h.note)?.note;
  const draftVersion = versions?.find((v) => v.status === "draft");

  return (
    <>
      <div className="stack">
        <Link className="tag" href="/seller/products">← My products</Link>
        <div className="row"><h1 className="h2">{p.name}</h1><StatusPill status={p.status} /></div>
        <p className="small muted">{p.ownership === "platform" ? "Platform-owned product" : "Third-party product"} · {p.status === "published" ? <Link className="link" href={`/products/${p.slug}`}>View listing</Link> : "Not public yet"}</p>
      </div>

      {["changes_requested", "rejected", "suspended"].includes(p.status) && lastNote && <Notice tone="warn">Reviewer note: {lastNote}</Notice>}
      {!features.serverAdmin && <Notice tone="warn">File uploads need the server storage key (SUPABASE_SERVICE_ROLE_KEY). Listing details can still be edited.</Notice>}

      <section className="card stack">
        <h2 className="h3">Publishing</h2>
        <ol className="prose small">
          <li>Complete the listing and confirm your distribution rights.</li>
          <li>Create a version, upload the workflow JSON and docs{p.customization_mode !== "ready_to_use" ? ", and add the configuration form" : ""}.</li>
          <li>Submit for review. After approval, publish it.</li>
        </ol>
        <div className="row">
          {["draft", "changes_requested", "rejected"].includes(p.status) && (
            <form action={changeStatus}><input type="hidden" name="product_id" value={p.id} /><input type="hidden" name="to" value="submitted" /><SubmitButton className="btn accent small">Submit for review</SubmitButton></form>
          )}
          {p.status === "approved" && (
            <form action={changeStatus}><input type="hidden" name="product_id" value={p.id} /><input type="hidden" name="to" value="published" /><SubmitButton className="btn accent small">Publish</SubmitButton></form>
          )}
          {["draft", "approved", "published"].includes(p.status) && (
            <form action={changeStatus}>
              <input type="hidden" name="product_id" value={p.id} /><input type="hidden" name="to" value="archived" />
              <ConfirmSubmit className="btn ghost small" title="Archive this product?" message="It will no longer be listed or sold. Buyers keep access to what they bought.">Archive</ConfirmSubmit>
            </form>
          )}
          {p.status === "archived" && (
            <form action={changeStatus}><input type="hidden" name="product_id" value={p.id} /><input type="hidden" name="to" value="draft" /><SubmitButton className="btn ghost small">Back to draft</SubmitButton></form>
          )}
        </div>
        {p.ownership === "third_party" && (
          p.rights_confirmed_at ? <p className="small muted">Distribution rights confirmed on {new Date(p.rights_confirmed_at).toLocaleDateString("en-GB")}.</p> : (
            <form action={confirmRights} className="stack">
              <input type="hidden" name="id" value={p.id} />
              <label className="check small"><input type="checkbox" name="confirm" required /> <span>I confirm I own or am authorized to distribute every file and material in this product, and that it contains no malicious code or third-party secrets.</span></label>
              <SubmitButton className="btn small">Confirm</SubmitButton>
            </form>
          )
        )}
      </section>

      <section className="card stack">
        <h2 className="h3">Listing</h2>
        {!editable && <p className="small muted">Published and in-review listings are locked. Ship changes as a new version below.</p>}
        <form action={updateProduct} className="stack">
          <input type="hidden" name="id" value={p.id} />
          <fieldset disabled={!editable} style={{ border: 0, padding: 0 }}>
            <ProductFields v={{ ...p, price_minor: p.price_minor }} categories={categories ?? []} slugLocked />
          </fieldset>
          {editable && <SubmitButton className="btn small">Save listing</SubmitButton>}
        </form>
        {editable && features.serverAdmin && (
          <form action={uploadThumbnail} className="row">
            <input type="hidden" name="product_id" value={p.id} />
            <label htmlFor="thumb" className="small">Thumbnail (png, jpg, webp — 3 MB)</label>
            <input id="thumb" name="file" type="file" accept=".png,.jpg,.jpeg,.webp" required style={{ maxWidth: "18rem" }} />
            <SubmitButton className="btn ghost small">Upload</SubmitButton>
          </form>
        )}
      </section>

      <section className="card stack">
        <h2 className="h3">Versions &amp; files</h2>
        {!draftVersion && (
          <form action={createVersion} className="form-grid">
            <input type="hidden" name="product_id" value={p.id} />
            <div className="field"><label htmlFor="version">New version</label><input id="version" name="version" required pattern="\d+\.\d+\.\d+" placeholder="1.0.0" /></div>
            <div className="field"><label htmlFor="changelog">Changelog</label><input id="changelog" name="changelog" maxLength={4000} placeholder="What changed" /></div>
            <div><SubmitButton className="btn small">Create version</SubmitButton></div>
          </form>
        )}
        {(versions ?? []).map((v) => {
          const scan = v.scan_report as Partial<ScanReport>;
          const manifest = (v.manifest as { manifest: unknown } | null)?.manifest;
          return (
            <div key={v.id} className="card flat stack">
              <div className="row between"><strong>Version {v.version}</strong><StatusPill status={v.status} /></div>
              {v.changelog && <p className="small muted">{v.changelog}</p>}
              {v.files.length ? (
                <div className="table-wrap"><table>
                  <thead><tr><th>File</th><th>Type</th><th className="num">Size</th><th /></tr></thead>
                  <tbody>{v.files.map((f) => (
                    <tr key={f.id}><td>{f.file_name}</td><td>{f.kind}</td><td className="num">{Math.max(1, Math.round(f.size_bytes / 1024))} KB</td>
                      <td className="row">
                        <a className="btn small ghost" href={`/api/downloads/${f.id}`}>Download</a>
                        {v.status === "draft" && (
                          <form action={deleteFile}><input type="hidden" name="product_id" value={p.id} /><input type="hidden" name="file_id" value={f.id} />
                            <ConfirmSubmit className="btn small ghost" title="Remove this file?" message={f.file_name}>Remove</ConfirmSubmit></form>
                        )}
                      </td></tr>
                  ))}</tbody>
                </table></div>
              ) : <p className="small muted">No files yet.</p>}
              {scan?.findings?.length ? (
                <Notice tone={scan.findings.some((f) => f.severity === "warning") ? "warn" : "info"}>
                  Automated scan (not a guarantee of safety): {scan.findings.map((f) => `${f.message}${f.node ? ` [${f.node}]` : ""}`).join(" · ")}
                </Notice>
              ) : null}
              {v.status === "draft" && features.serverAdmin && (
                <>
                  <form action={uploadFile} className="row">
                    <input type="hidden" name="product_id" value={p.id} />
                    <input type="hidden" name="version_id" value={v.id} />
                    <label className="sr-only" htmlFor={`kind-${v.id}`}>File type</label>
                    <select id={`kind-${v.id}`} name="kind" style={{ maxWidth: "16rem" }}>
                      {Object.entries(FILE_RULES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
                    </select>
                    <label className="sr-only" htmlFor={`file-${v.id}`}>File</label>
                    <input id={`file-${v.id}`} name="file" type="file" required style={{ maxWidth: "18rem" }} />
                    <SubmitButton className="btn small" pendingText="Checking…">Upload</SubmitButton>
                  </form>
                  <form action={saveManifest} className="stack">
                    <input type="hidden" name="product_id" value={p.id} />
                    <input type="hidden" name="version_id" value={v.id} />
                    <div className="field">
                      <label htmlFor={`m-${v.id}`}>Configuration form (manifest JSON) — only these settings will be editable by buyers</label>
                      <textarea id={`m-${v.id}`} name="manifest" rows={10} className="mono" defaultValue={manifest ? JSON.stringify(manifest, null, 2) : MANIFEST_EXAMPLE(v.version)} />
                      <span className="hint">Supported types: text, textarea, email, url, number, boolean, select, multiselect. Credentials are never collected here.</span>
                    </div>
                    <SubmitButton className="btn ghost small">Save configuration form</SubmitButton>
                  </form>
                  {p.status === "published" && (
                    <form action={submitVersion}><input type="hidden" name="product_id" value={p.id} /><input type="hidden" name="version_id" value={v.id} />
                      <SubmitButton className="btn accent small">Submit update for review</SubmitButton></form>
                  )}
                </>
              )}
            </div>
          );
        })}
      </section>

      <section className="card stack">
        <h2 className="h3">Status history</h2>
        {history?.length ? (
          <ul className="prose small">{history.map((h, i) => <li key={i}>{new Date(h.created_at).toLocaleString("en-GB")}: {h.from_status ?? "—"} → <strong>{h.to_status}</strong>{h.note ? ` — ${h.note}` : ""}</li>)}</ul>
        ) : <p className="small muted">No changes yet.</p>}
      </section>
    </>
  );
}
