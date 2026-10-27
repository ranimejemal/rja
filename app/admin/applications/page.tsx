import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ConfirmSubmit } from "@/components/client";
import { EmptyState, StatusPill } from "@/components/ui";
import { reviewApplication } from "../actions";

export const metadata: Metadata = { title: "Seller applications" };

export default async function Applications() {
  const supabase = await createClient();
  const { data } = await supabase.from("seller_applications").select("*").order("created_at", { ascending: false }).limit(100);
  const open = (data ?? []).filter((a) => ["submitted", "info_requested"].includes(a.status));
  const closed = (data ?? []).filter((a) => !["submitted", "info_requested"].includes(a.status));
  return (
    <>
      <div className="stack"><span className="tag">(Seller applications)</span><h1 className="h2">Applications</h1></div>
      {open.length === 0 && <EmptyState title="Inbox zero">No applications waiting.</EmptyState>}
      {open.map((a) => (
        <div key={a.id} className="card stack">
          <div className="row between"><h2 className="h3">{a.display_name}</h2><StatusPill status={a.status} /></div>
          <p className="small muted">{a.contact_email} · {a.country} · {new Date(a.created_at).toLocaleDateString("en-GB")}</p>
          <p className="small"><strong>Experience:</strong> {a.experience}</p>
          {a.profile && <p className="small"><strong>Profile:</strong> {a.profile}</p>}
          {a.categories.length > 0 && <p className="small"><strong>Categories:</strong> {a.categories.join(", ")}</p>}
          {a.portfolio_url && <p className="small"><a className="link" href={a.portfolio_url} rel="noopener nofollow noreferrer" target="_blank">Portfolio ↗</a></p>}
          <form action={reviewApplication} className="stack">
            <input type="hidden" name="id" value={a.id} />
            <div className="field"><label htmlFor={`note-${a.id}`}>Note to the applicant (required to reject or ask for information)</label><textarea id={`note-${a.id}`} name="note" rows={2} defaultValue={a.admin_note ?? ""} /></div>
            <div className="row">
              <button className="btn accent small" name="decision" value="approved">Approve</button>
              <button className="btn ghost small" name="decision" value="info_requested">Request information</button>
              <ConfirmSubmit className="btn danger small" name="decision" value="rejected" title={`Reject ${a.display_name}?`} message="The applicant sees your note. They can apply again later.">Reject</ConfirmSubmit>
            </div>
          </form>
        </div>
      ))}
      {closed.length > 0 && (
        <section className="stack">
          <h2 className="h3">Decided</h2>
          <div className="table-wrap"><table>
            <thead><tr><th>Name</th><th>Status</th><th>Note</th><th>Reviewed</th></tr></thead>
            <tbody>{closed.map((a) => <tr key={a.id}><td>{a.display_name}</td><td><StatusPill status={a.status} /></td><td className="small">{a.admin_note ?? "—"}</td><td>{a.reviewed_at ? new Date(a.reviewed_at).toLocaleDateString("en-GB") : "—"}</td></tr>)}</tbody>
          </table></div>
        </section>
      )}
    </>
  );
}
