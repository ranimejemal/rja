import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { features } from "@/lib/env";
import { Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminOverview() {
  const supabase = await createClient();
  const count = async (table: "profiles" | "seller_profiles" | "seller_applications" | "products" | "orders" | "product_reports" | "refunds" | "payouts" | "quote_requests", f?: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    let q = supabase.from(table).select("id", { count: "exact", head: true });
    if (f) q = f(q);
    const { count: n } = await q;
    return n ?? 0;
  };
  const [newQuotes, users, sellers, pendingApps, published, awaiting, orders, reports, openRefunds, openPayouts, { data: paid }, { data: platformLedger }, { data: audit }] = await Promise.all([
    count("quote_requests", (q) => q.eq("status", "new")),
    count("profiles"),
    count("seller_profiles", (q) => q.eq("status", "approved").eq("is_demo", false)),
    count("seller_applications", (q) => q.in("status", ["submitted", "info_requested"])),
    count("products", (q) => q.eq("status", "published")),
    count("products", (q) => q.in("status", ["submitted", "under_review"])),
    count("orders", (q) => q.in("status", ["paid", "partially_refunded", "refunded"])),
    count("product_reports", (q) => q.in("status", ["open", "investigating"])),
    count("refunds", (q) => q.in("status", ["requested", "approved"])),
    count("payouts", (q) => q.in("status", ["requested", "approved", "processing"])),
    supabase.from("orders").select("total_minor").in("status", ["paid", "partially_refunded", "refunded"]),
    supabase.from("ledger_entries").select("entry_type, amount_minor").eq("account", "platform"),
    supabase.from("audit_logs").select("id, action, entity_type, created_at").order("created_at", { ascending: false }).limit(8),
  ]);
  const gmv = (paid ?? []).reduce((a, o) => a + o.total_minor, 0);
  const commission = (platformLedger ?? []).filter((l) => ["commission", "commission_reversal"].includes(l.entry_type)).reduce((a, l) => a + l.amount_minor, 0);
  const kpis: [string, string | number, string?][] = [
    ["New quote requests", newQuotes, "/admin/quotes"], ["Total users", users], ["Active sellers", sellers], ["Pending applications", pendingApps, "/admin/applications"],
    ["Published products", published], ["Awaiting review", awaiting, "/admin/products"], ["Paid orders", orders],
    ["Gross merchandise value", formatMoney(gmv)], ["Commission revenue (net)", formatMoney(commission)],
    ["Open refunds", openRefunds, "/admin/finance"], ["Open payouts", openPayouts, "/admin/finance"], ["Open reports", reports, "/admin/reports"],
  ];
  return (
    <>
      <div className="stack"><span className="tag">(Admin)</span><h1 className="h2">Marketplace overview</h1></div>
      {!features.serverAdmin && <Notice tone="warn">SUPABASE_SERVICE_ROLE_KEY is not set: downloads, uploads, refunds and category edits are disabled.</Notice>}
      {!features.payments && <Notice tone="warn">Stripe is not configured: paid checkout is disabled. Free products and all other features work.</Notice>}
      <div className="grid" style={{ "--cols": 4 } as React.CSSProperties}>
        {kpis.map(([k, v, href]) => (
          <div key={k} className="kpi"><span className="tag">{k}</span><span className="value">{v}</span>{href && <Link className="tiny link" href={href}>Open →</Link>}</div>
        ))}
      </div>
      <section className="stack">
        <div className="row between"><h2 className="h3">Recent activity</h2><Link className="small link" href="/admin/audit">Full audit log</Link></div>
        <div className="table-wrap"><table>
          <tbody>{(audit ?? []).map((a) => <tr key={a.id}><td>{new Date(a.created_at).toLocaleString("en-GB")}</td><td className="mono">{a.action}</td><td>{a.entity_type}</td></tr>)}</tbody>
        </table></div>
      </section>
    </>
  );
}
