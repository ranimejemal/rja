import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditLog({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  const { before } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("audit_logs").select("id, actor_id, action, entity_type, entity_id, details, created_at").order("id", { ascending: false }).limit(100);
  if (before && /^\d+$/.test(before)) q = q.lt("id", Number(before));
  const { data } = await q;
  const actorIds = [...new Set((data ?? []).map((a) => a.actor_id).filter((x): x is string => Boolean(x)))];
  const { data: actors } = await supabase.from("profiles").select("id, display_name").in("id", actorIds);
  const name = new Map((actors ?? []).map((a) => [a.id, a.display_name]));
  const last = data?.at(-1)?.id;
  return (
    <>
      <div className="stack"><span className="tag">(Audit log)</span><h1 className="h2">Audit log</h1>
        <p className="small muted">Append-only record of administrative, seller, payment, refund and payout actions.</p></div>
      <div className="table-wrap"><table>
        <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
        <tbody>{(data ?? []).map((a) => (
          <tr key={a.id}><td>{new Date(a.created_at).toLocaleString("en-GB")}</td><td>{a.actor_id ? name.get(a.actor_id) ?? a.actor_id.slice(0, 8) : "system"}</td>
            <td className="mono">{a.action}</td><td className="small">{a.entity_type} <span className="mono tiny">{a.entity_id?.slice(0, 8)}</span></td>
            <td className="mono tiny" style={{ maxWidth: "22rem", overflowWrap: "anywhere" }}>{JSON.stringify(a.details)}</td></tr>
        ))}</tbody>
      </table></div>
      {data?.length === 100 && last && <a className="btn ghost small" href={`/admin/audit?before=${last}`}>Older entries</a>}
    </>
  );
}
