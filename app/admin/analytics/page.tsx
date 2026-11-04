import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Traffic" };

type Analytics = {
  views: number; seconds: number; signed_in_views: number; engaged_customers: number;
  daily: { day: string; views: number; seconds: number }[];
  top_pages: { path: string; views: number; avg_seconds: number }[];
  signups: number; orders: number; quotes: number; promotion_emails: number;
};

const duration = (s: number) => (s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`);

export default async function Traffic({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: raw } = await searchParams;
  const days = [7, 30, 90].includes(Number(raw)) ? Number(raw) : 30;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_analytics", { p_days: days });
  const a = data as Analytics | null;
  const max = Math.max(1, ...(a?.daily ?? []).map((d) => d.views));
  const kpis: [string, string | number][] = a ? [
    ["Page views", a.views], ["Time spent on the site", duration(a.seconds)],
    ["Average time per page", duration(a.views ? a.seconds / a.views : 0)],
    ["Views by signed-in customers", `${a.views ? Math.round((a.signed_in_views / a.views) * 100) : 0}%`],
    ["Customers who stayed 5 min or more", a.engaged_customers], ["New accounts", a.signups],
    ["Paid orders", a.orders], ["Quote requests", a.quotes], ["Promotion emails sent", a.promotion_emails],
  ] : [];
  return (
    <>
      <div className="stack">
        <span className="tag">(Traffic)</span>
        <h1 className="h2">Traffic and engagement</h1>
        <p className="small muted">
          Counted on our own servers, without cookies or third-party trackers. Visitors who are not signed in are counted
          anonymously (page and time only).
        </p>
        <div className="row small">{[7, 30, 90].map((d) => <Link key={d} className={d === days ? "badge verified" : "badge"} href={`/admin/analytics?days=${d}`}>Last {d} days</Link>)}</div>
      </div>
      {error || !a ? <EmptyState title="Could not load the traffic">{error?.message}</EmptyState> : (
        <>
          <div className="grid" style={{ "--cols": 3 } as React.CSSProperties}>
            {kpis.map(([label, value]) => (
              <div key={label} className="card stack" style={{ "--gap": "0.3rem" } as React.CSSProperties}>
                <span className="tag">{label}</span><strong className="h3">{value}</strong>
              </div>
            ))}
          </div>
          <section className="card stack" aria-labelledby="daily-h">
            <h2 id="daily-h" className="h3">Page views per day</h2>
            <div className="bars" role="img" aria-label={`Page views per day over the last ${days} days`}>
              {a.daily.map((d) => (
                <div key={d.day} className="bar" title={`${new Date(d.day).toLocaleDateString("en-GB")}: ${d.views} views, ${duration(d.seconds)}`}>
                  <span style={{ height: `${(d.views / max) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="row between tiny muted"><span>{new Date(a.daily[0]?.day).toLocaleDateString("en-GB")}</span><span>today</span></div>
          </section>
          <section className="stack" aria-labelledby="pages-h">
            <h2 id="pages-h" className="h3">Most visited pages</h2>
            {a.top_pages.length ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Page</th><th className="num">Views</th><th className="num">Average time</th></tr></thead>
                  <tbody>{a.top_pages.map((p) => (
                    <tr key={p.path}><td><Link className="link" href={p.path}>{p.path}</Link></td><td className="num">{p.views}</td><td className="num">{duration(p.avg_seconds)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="muted small">No visits counted yet.</p>}
          </section>
        </>
      )}
    </>
  );
}
