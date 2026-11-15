import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { buildProfile, type Answers } from "@/lib/discovery";
import { analyseBusiness, type Analysis } from "@/lib/architect";
import { solutionById } from "@/lib/solutions";
import { formatMoney } from "@/lib/money";
import { SubmitButton } from "@/components/client";
import { Notice } from "@/components/ui";
import { decide } from "./actions";

export const metadata: Metadata = { title: "Your recommendations", robots: { index: false } };

const STATUS: Record<string, string> = { accepted: "Accepted", postponed: "Later", declined: "Not for me", proposed: "" };

// The proposal: what RJA recommends for this business, why, what each solution reads and may do, and what it
// costs. The customer accepts, postpones or declines each one; accepting charges nothing.
export default async function PlanPage() {
  const session = await requireUser("/plan");
  const supabase = await createClient();
  const { data: profile } = await supabase.from("business_profiles")
    .select("answers, completed_at, updated_at, analysis, analysed_at").limit(1).maybeSingle();
  if (!profile?.completed_at) redirect("/start");

  // Analyse again when the answers changed since the last analysis.
  let analysis = profile.analysis as Analysis | null;
  if (!analysis || !profile.analysed_at || profile.updated_at > profile.analysed_at) {
    if (rateLimit(`architect:${session.userId}`, 20, 60 * 60_000).ok) {
      const fresh = await analyseBusiness(buildProfile(profile.answers as Answers));
      const { items, ...summary } = fresh;
      const { error } = await supabase.rpc("store_analysis", { p_analysis: summary as never, p_items: items as never });
      if (!error) analysis = fresh;
    }
  }
  const [{ data: recs }, { data: prices }] = await Promise.all([
    supabase.from("solution_recommendations").select("solution_id, status, rank, reasons, explanation").order("rank"),
    supabase.from("solutions").select("id, setup_price_minor, monthly_price_minor, currency, active"),
  ]);
  const price = new Map((prices ?? []).map((p) => [p.id, p]));
  const accepted = (recs ?? []).filter((r) => r.status === "accepted");

  return (
    <section className="section">
      <div className="container stack" style={{ "--gap": "2rem", maxWidth: "52rem" } as React.CSSProperties}>
        <div className="stack">
          <Link className="tag" href="/start">← Your business profile</Link>
          <h1 className="h2">What we recommend for {buildProfile(profile.answers as Answers).name || "your business"}</h1>
          {analysis?.overview && <p className="lead">{analysis.overview}</p>}
          <p className="tiny muted">
            {analysis?.source === "ai" ? "Explained by RJA’s AI from your answers, and checked: it never promises savings." : "Based on your answers."}{" "}
            Accepting a solution charges nothing: you see the final price again before you pay.
          </p>
        </div>

        {(recs ?? []).length === 0 ? (
          <Notice>None of our solutions matches what you told us yet. <Link className="link" href="/quote">Tell us what you need</Link> and we’ll design it with you.</Notice>
        ) : (recs ?? []).map((r) => {
          const s = solutionById(r.solution_id);
          if (!s) return null;
          const p = price.get(s.id);
          const ex = (r.explanation ?? {}) as { why?: string; example?: string; blockers?: string[] };
          const reasons = (r.reasons ?? []) as string[];
          return (
            <article key={s.id} id={s.id} className={`card stack solution-card${r.status === "accepted" ? " accepted" : ""}`} aria-labelledby={`${s.id}-h`}>
              <div className="row between" style={{ alignItems: "baseline" }}>
                <h2 id={`${s.id}-h`} className="h3">{s.name}</h2>
                {STATUS[r.status] && <span className="badge">{STATUS[r.status]}</span>}
              </div>
              <p className="small">{s.tagline}</p>
              <p>{ex.why ?? reasons.join(" ")}</p>
              <p className="small muted">Example: {ex.example ?? s.example}</p>
              {ex.blockers?.length ? <Notice tone="warn">{ex.blockers.join(" ")}</Notice> : null}

              <div className="solution-grid">
                <div><h3 className="tag">What it does</h3><ul className="small">{s.does.map((d) => <li key={d}>{d}</li>)}</ul></div>
                <div><h3 className="tag">What it reads</h3><ul className="small">{s.reads.map((d) => <li key={d}>{d}</li>)}</ul></div>
                <div><h3 className="tag">Permissions it asks for</h3><ul className="small">{s.permissions.map((d) => <li key={d}>{d}</li>)}</ul></div>
                <div><h3 className="tag">Always asks you first</h3><ul className="small">{s.needsApproval.map((d) => <li key={d}>{d}</li>)}</ul></div>
                <div><h3 className="tag">Limits</h3><ul className="small">{s.limits.map((d) => <li key={d}>{d}</li>)}</ul></div>
                <div>
                  <h3 className="tag">Cost</h3>
                  <ul className="small">
                    <li>Setup: {p?.setup_price_minor != null ? formatMoney(p.setup_price_minor, p.currency) : "set before you pay"}</li>
                    <li>Monthly RJA service: {p?.monthly_price_minor != null ? formatMoney(p.monthly_price_minor, p.currency) : "set before you pay"}</li>
                    <li>Outside RJA: {s.externalCosts}</li>
                  </ul>
                </div>
              </div>
              {s.availability !== "milestone_1" && <p className="tiny muted">Coming after the first two solutions. Accept it to be first in line.</p>}

              <form action={decide} className="row">
                <input type="hidden" name="solution_id" value={s.id} />
                {r.status === "proposed" ? (
                  <>
                    {/* The clicked button's value comes first in the form data; Accept has none, so the hidden "accepted" is used. */}
                    <SubmitButton className="btn accent small">Accept</SubmitButton>
                    <button className="btn ghost small" name="decision" value="postponed">Not now</button>
                    <button className="btn ghost small" name="decision" value="declined">No thanks</button>
                    <input type="hidden" name="decision" value="accepted" />
                  </>
                ) : (
                  <button className="btn ghost small" name="decision" value="proposed">Change my answer</button>
                )}
              </form>
            </article>
          );
        })}

        <div className="card stack">
          <h2 className="h3">Next step</h2>
          {accepted.length ? (
            <p className="small">
              You accepted {accepted.map((a) => solutionById(a.solution_id)?.name).join(" and ")}. Next you connect your apps with their official
              sign-in (no passwords shared), test on example data, then switch on. We are opening this step to the first shops now: we’ll email
              you as soon as you can connect yours.
            </p>
          ) : (
            <p className="small">Accept the solutions you want, and we take you through connecting your apps and testing them before anything goes live.</p>
          )}
          <p className="small muted">Need something else? <Link className="link" href="/quote">Ask for a custom solution</Link>.</p>
        </div>
      </div>
    </section>
  );
}
