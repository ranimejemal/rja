import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SOLUTIONS } from "@/lib/solutions";
import { formatMoney } from "@/lib/money";
import { SubmitButton } from "@/components/client";
import { Notice } from "@/components/ui";
import { saveSolutionPrice } from "../actions";

export const metadata: Metadata = { title: "Solutions" };

// The price list of RJA solutions and how often each one is accepted. Customers see these prices on their
// recommendations; an empty monthly price shows "set before you pay".
export default async function AdminSolutions({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: prices }, { data: recs }] = await Promise.all([
    supabase.from("solutions").select("id, name, setup_price_minor, monthly_price_minor, currency, active"),
    supabase.from("solution_recommendations").select("solution_id, status"),
  ]);
  const count = (id: string, st: string) => (recs ?? []).filter((r) => r.solution_id === id && r.status === st).length;
  return (
    <>
      <div className="stack">
        <span className="tag">(Solutions)</span>
        <h1 className="h2">Solutions and prices</h1>
        <p className="small muted">Prices customers see on their recommendations. Leave a price empty to show “set before you pay”.</p>
      </div>
      {notice && <Notice tone="ok">{notice}</Notice>}
      {error && <Notice tone="danger">{error}</Notice>}
      {!prices ? <Notice tone="warn">Run the solutions migration (20261115090000) in Supabase first.</Notice> : (
        <div className="stack">
          {SOLUTIONS.map((s) => {
            const p = prices.find((x) => x.id === s.id);
            return (
              <form key={s.id} action={saveSolutionPrice} className="card stack">
                <input type="hidden" name="id" value={s.id} />
                <div className="row between"><h2 className="h3">{s.name}</h2>
                  <span className="tiny muted">proposed {count(s.id, "proposed")} · accepted {count(s.id, "accepted")} · later {count(s.id, "postponed")} · declined {count(s.id, "declined")}</span></div>
                <div className="row">
                  <div className="field"><label htmlFor={`${s.id}-setup`}>Setup ({p?.currency ?? "USD"})</label>
                    <input id={`${s.id}-setup`} name="setup" type="number" min={0} step="0.01" defaultValue={p?.setup_price_minor != null ? p.setup_price_minor / 100 : ""} /></div>
                  <div className="field"><label htmlFor={`${s.id}-monthly`}>Monthly ({p?.currency ?? "USD"})</label>
                    <input id={`${s.id}-monthly`} name="monthly" type="number" min={0} step="0.01" defaultValue={p?.monthly_price_minor != null ? p.monthly_price_minor / 100 : ""} /></div>
                </div>
                <p className="tiny muted">Now: setup {p?.setup_price_minor != null ? formatMoney(p.setup_price_minor, p.currency) : "not set"} · monthly {p?.monthly_price_minor != null ? formatMoney(p.monthly_price_minor, p.currency) : "not set"}</p>
                <SubmitButton className="btn small">Save prices</SubmitButton>
              </form>
            );
          })}
        </div>
      )}
    </>
  );
}
