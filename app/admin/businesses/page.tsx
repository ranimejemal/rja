import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui";
import { buildProfile, displayAnswer, questionById, type Answers } from "@/lib/discovery";

export const metadata: Metadata = { title: "Businesses" };

// Every business profile from discovery, newest first: what the business does, what takes its time, what it wants
// fixed. Read-only; customers change their own answers. Admin access is enforced by RLS (is_admin()).
export default async function Businesses() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("business_profiles")
    .select("tenant_id, answers, completed_at, updated_at, tenant:tenants(name)").order("updated_at", { ascending: false }).limit(200);
  const label = (a: Answers, id: string) => { const q = questionById(id); return q && a[id] !== undefined ? displayAnswer(q, a[id], a) : "—"; };
  return (
    <>
      <div className="stack">
        <span className="tag">(Businesses)</span>
        <h1 className="h2">Business profiles <span className="muted">({data?.length ?? 0})</span></h1>
        <p className="small muted">What each customer told us in “Tell us about your business”. Use it to prepare proposals and quotes.</p>
      </div>
      {error ? <EmptyState title="Could not load profiles">{error.message}</EmptyState> : data?.length ? (
        <div className="stack">
          {data.map((row) => {
            const a = (row.answers ?? {}) as Answers;
            const p = buildProfile(a);
            return (
              <details key={row.tenant_id} className="card">
                <summary className="row between" style={{ cursor: "pointer" }}>
                  <strong>{p.name || row.tenant?.name || "Unnamed business"}</strong>
                  <span className="tiny muted">{label(a, "industry")} · {row.completed_at ? "finished" : "in progress"} · {new Date(row.updated_at).toLocaleDateString("en-GB")}</span>
                </summary>
                <dl className="profile-list" style={{ marginTop: "0.75rem" }}>
                  {[["What they sell", p.offer], ["Team", label(a, "size")], ["Customers reach them by", label(a, "channels")],
                    ["Apps", [label(a, "apps"), p.otherApps].filter((v) => v && v !== "—").join(" · ")], ["Takes most time", label(a, "time_sinks")],
                    ["Hours a week", label(a, "hours")], ["Fix first", p.mainProblem], ["Goal", label(a, "goal")], ["Automations should", label(a, "involvement")],
                    ["Never automate", p.neverAutomate]].map(([k, v]) => (
                    <div key={k} className="profile-row" style={{ gridTemplateColumns: "minmax(8rem, 12rem) minmax(0, 1fr)" }}><dt>{k}</dt><dd>{v || "—"}</dd></div>
                  ))}
                </dl>
              </details>
            );
          })}
        </div>
      ) : <EmptyState title="No profiles yet">They appear here as customers answer the questions.</EmptyState>}
    </>
  );
}
