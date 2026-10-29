import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, StatusPill } from "@/components/ui";
import { updateQuote } from "../actions";

export const metadata: Metadata = { title: "Quote requests" };

const FILTERS = ["open", "new", "contacted", "won", "lost", "spam", "all"] as const;

export default async function Quotes({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show: raw } = await searchParams;
  const show = (FILTERS as readonly string[]).includes(raw ?? "") ? raw! : "open";
  const supabase = await createClient();
  let query = supabase.from("quote_requests")
    .select("id, name, email, phone, company, message, status, admin_note, created_at, product:products!quote_requests_product_id_fkey(name, slug)")
    .order("created_at", { ascending: false }).limit(200);
  if (show === "open") query = query.in("status", ["new", "contacted"]);
  else if (show !== "all") query = query.eq("status", show as "new" | "contacted" | "won" | "lost" | "spam");
  const { data } = await query;
  return (
    <>
      <div className="stack">
        <span className="tag">(Quote requests)</span>
        <h1 className="h2">Quote requests</h1>
        <p className="small muted">Requests sent from product pages and /quote. Reply by email or WhatsApp, then update the status.</p>
        <div className="row small">
          {FILTERS.map((f) => <Link key={f} className={f === show ? "badge verified" : "badge"} href={`/admin/quotes?show=${f}`}>{f}</Link>)}
        </div>
      </div>
      {data?.length ? data.map((q) => {
        const product = q.product as { name: string; slug: string } | null;
        const whatsapp = q.phone.replace(/[^\d]/g, "");
        return (
          <div key={q.id} className="card stack">
            <div className="row between">
              <strong>{q.name}{q.company ? ` · ${q.company}` : ""}</strong>
              <StatusPill status={q.status} />
            </div>
            <p className="small muted">
              {new Date(q.created_at).toLocaleString("en-GB")} · {product ? <Link className="link" href={`/products/${product.slug}`}>{product.name}</Link> : "General enquiry"}
            </p>
            <p className="small" style={{ whiteSpace: "pre-line" }}>{q.message}</p>
            <div className="row small">
              <a className="link" href={`mailto:${q.email}?subject=${encodeURIComponent(`Your quote request${product ? `: ${product.name}` : ""}`)}`}>{q.email}</a>
              {q.phone && <span>{q.phone}</span>}
              {whatsapp.length >= 8 && <a className="link" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener">WhatsApp ↗</a>}
            </div>
            <form action={updateQuote} className="stack" style={{ "--gap": "0.6rem" } as React.CSSProperties}>
              <input type="hidden" name="id" value={q.id} />
              <div className="field"><label htmlFor={`note-${q.id}`}>Private note</label><textarea id={`note-${q.id}`} name="note" rows={2} maxLength={2000} defaultValue={q.admin_note} /></div>
              <div className="row">
                {(["contacted", "won", "lost", "spam", "new"] as const).filter((s) => s !== q.status).map((s) => (
                  <button key={s} className={s === "won" ? "btn small" : "btn ghost small"} name="status" value={s}>{s === "new" ? "Back to new" : `Mark ${s}`}</button>
                ))}
              </div>
            </form>
          </div>
        );
      }) : <EmptyState title="No quote requests">Requests from the quote forms appear here.</EmptyState>}
    </>
  );
}
