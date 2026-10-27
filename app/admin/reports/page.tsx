import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, StatusPill } from "@/components/ui";
import { setReportStatus } from "../actions";

export const metadata: Metadata = { title: "Reports" };

export default async function Reports() {
  const supabase = await createClient();
  const { data } = await supabase.from("product_reports").select("id, reason, details, status, created_at, product:products(id, name)").order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <div className="stack"><span className="tag">(Reports)</span><h1 className="h2">Reported products</h1>
        <p className="small muted">Includes intellectual property complaints. Suspend a product from its review page if needed.</p></div>
      {data?.length ? data.map((r) => (
        <div key={r.id} className="card stack">
          <div className="row between"><Link className="link" href={`/admin/products/${r.product?.id}`}>{r.product?.name}</Link><StatusPill status={r.status} /></div>
          <p className="small"><strong>{r.reason.replaceAll("_", " ")}</strong> · {new Date(r.created_at).toLocaleDateString("en-GB")}</p>
          <p className="small">{r.details}</p>
          {["open", "investigating"].includes(r.status) && (
            <form action={setReportStatus} className="row">
              <input type="hidden" name="id" value={r.id} />
              {r.status === "open" && <button className="btn ghost small" name="status" value="investigating">Investigating</button>}
              <button className="btn small" name="status" value="resolved">Resolved</button>
              <button className="btn ghost small" name="status" value="dismissed">Dismiss</button>
            </form>
          )}
        </div>
      )) : <EmptyState title="No reports">Reports from users appear here.</EmptyState>}
    </>
  );
}
