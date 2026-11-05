import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Visitors" };

const flag = (cc: string | null) => (cc ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "");
const dur = (s: number) => (s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60 ? `${s % 60} s` : ""}`);

export default async function Visitors({ searchParams }: { searchParams: Promise<{ visitor?: string; user?: string }> }) {
  const { visitor, user } = await searchParams;
  const ok = (v?: string) => (v && /^[0-9a-f-]{36}$/.test(v) ? v : null);
  const supabase = await createClient();
  const { data: visits, error } = await supabase.rpc("admin_visits", { p_limit: 500, p_visitor: ok(visitor), p_user: ok(user) });
  const people = new Set((visits ?? []).map((v) => v.user_id ?? v.visitor_id ?? v.id)).size;
  return (
    <>
      <div className="stack">
        <span className="tag">(Visitors)</span>
        <h1 className="h2">Visitor log</h1>
        <p className="small muted">
          Every page view, newest first: signed-in customers with their email, others as anonymous visitors. A visitor number
          appears only for people who accepted cookies, so their visits can be grouped. Country comes from the network;
          no IP address is stored for ordinary visits.
        </p>
        {(visitor || user) && <Link className="link small" href="/admin/visitors">← All visitors</Link>}
      </div>
      {error ? <EmptyState title="Could not load the visits">{error.message}</EmptyState> : visits?.length ? (
        <>
          <p className="small muted">{visits.length} page views shown · about {people} different visitors</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>When</th><th>Who</th><th>Page</th><th className="num">Time</th><th>Where</th><th>Device</th><th>Came from</th></tr></thead>
              <tbody>{visits.map((v) => (
                <tr key={v.id}>
                  <td className="small" style={{ whiteSpace: "nowrap" }}>{new Date(v.created_at).toLocaleString("en-GB")}</td>
                  <td className="small">
                    {v.email ? <Link className="link" href={`/admin/visitors?user=${v.user_id}`}>{v.email}</Link>
                      : v.visitor_id ? <Link className="link" href={`/admin/visitors?visitor=${v.visitor_id}`}>Visitor #{v.visitor_id.slice(0, 6)}</Link>
                        : <span className="muted">Anonymous</span>}
                  </td>
                  <td className="small"><Link className="link" href={v.path}>{v.path}</Link></td>
                  <td className="num small">{dur(v.seconds)}</td>
                  <td className="small">{v.country ? `${flag(v.country)} ${v.country}` : "—"}</td>
                  <td className="small">{[v.device, v.browser].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="small">{v.referrer ?? <span className="muted">direct</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      ) : <EmptyState title="No visits yet">Visits appear here as soon as people open the site.</EmptyState>}
    </>
  );
}
