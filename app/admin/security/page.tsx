import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { features } from "@/lib/env";
import { EmptyState, Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Security" };

const KIND: Record<string, string> = {
  login_success: "Signed in", login_failed: "Failed sign-in", login_locked: "Sign-in blocked (too many failures)", signup: "New account",
  password_reset_requested: "Password reset asked", password_changed: "Password / security changed", mfa_failed: "Wrong 2-step code",
  admin_denied: "Admin area refused", probe: "Hacking scan blocked", bot_blocked: "Bot stopped by human check",
  rate_limited: "Too many requests", alert_sent: "Alert email sent",
};
const TONE: Record<string, string> = { info: "", low: "", medium: "warn", high: "danger", critical: "danger" };
const KINDS = ["all", "serious", "login_failed", "login_locked", "login_success", "probe", "bot_blocked", "admin_denied", "mfa_failed"];

type Summary = { by_kind: Record<string, number>; by_severity: Record<string, number>; top_ips: { ip: string; country: string | null; events: number; serious: number }[] };

export default async function Security({ searchParams }: { searchParams: Promise<{ kind?: string; ip?: string }> }) {
  const { kind = "all", ip } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("security_events").select("id, kind, severity, email, ip, country, user_agent, path, details, created_at")
    .neq("kind", "alert_sent").order("created_at", { ascending: false }).limit(300);
  if (kind === "serious") q = q.in("severity", ["medium", "high", "critical"]);
  else if (kind !== "all" && KIND[kind]) q = q.eq("kind", kind as never);
  if (ip) q = q.eq("ip", ip);
  const [{ data: events }, { data: summary }] = await Promise.all([q, supabase.rpc("admin_security_summary", { p_days: 7 })]);
  const s = (summary ?? { by_kind: {}, by_severity: {}, top_ips: [] }) as Summary;
  const serious = (s.by_severity.high ?? 0) + (s.by_severity.critical ?? 0);
  const kpis: [string, number][] = [
    ["Serious events (7 days)", serious], ["Failed sign-ins", s.by_kind.login_failed ?? 0], ["Blocked sign-ins", s.by_kind.login_locked ?? 0],
    ["Hacking scans blocked", s.by_kind.probe ?? 0], ["Bots stopped", s.by_kind.bot_blocked ?? 0], ["Admin area refused", s.by_kind.admin_denied ?? 0],
  ];
  return (
    <>
      <div className="stack">
        <span className="tag">(Security)</span>
        <h1 className="h2">Security log</h1>
        <p className="small muted">
          Sign-ins (successful and failed), blocked attackers, scans for weaknesses and bots, with IP address, country and browser,
          kept 90 days. Passwords are never recorded. Serious events are emailed to you at once (at most one email per kind every 30 minutes).
        </p>
      </div>
      {!features.serverAdmin && <Notice tone="warn">The security log needs SUPABASE_SERVICE_ROLE_KEY in Vercel to record events.</Notice>}
      {!features.email && <Notice tone="warn">Alert emails need the SMTP settings in Vercel.</Notice>}
      <div className="grid" style={{ "--cols": 3 } as React.CSSProperties}>
        {kpis.map(([label, value]) => (
          <div key={label} className="card stack" style={{ "--gap": "0.3rem" } as React.CSSProperties}>
            <span className="tag">{label}</span><strong className={`h3${label.startsWith("Serious") && value > 0 ? " danger-text" : ""}`}>{value}</strong>
          </div>
        ))}
      </div>
      {s.top_ips.length > 0 && (
        <section className="stack" aria-labelledby="ips-h">
          <h2 id="ips-h" className="h3">Most active addresses (7 days)</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>IP address</th><th>Country</th><th className="num">Events</th><th className="num">Serious</th></tr></thead>
              <tbody>{s.top_ips.map((r) => (
                <tr key={r.ip}><td><Link className="link" href={`/admin/security?ip=${encodeURIComponent(r.ip)}`}>{r.ip}</Link></td><td>{r.country ?? "—"}</td><td className="num">{r.events}</td><td className="num">{r.serious}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <p className="tiny muted">To block an address for good, add it in Vercel: Project → Firewall → IP Blocking.</p>
        </section>
      )}
      <div className="row small">
        {KINDS.map((k) => <Link key={k} className={k === kind ? "badge verified" : "badge"} href={`/admin/security?kind=${k}`}>{k === "all" ? "All" : k === "serious" ? "Serious only" : KIND[k]}</Link>)}
        {ip && <Link className="link" href="/admin/security">Clear IP filter ({ip})</Link>}
      </div>
      {events?.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>What</th><th>Account</th><th>IP · country</th><th>Page</th><th>Browser</th></tr></thead>
            <tbody>{events.map((e) => (
              <tr key={e.id}>
                <td className="small" style={{ whiteSpace: "nowrap" }}>{new Date(e.created_at).toLocaleString("en-GB")}</td>
                <td className="small"><span className={`sev sev-${TONE[e.severity] || "info"}`}>{e.severity}</span> {KIND[e.kind] ?? e.kind}</td>
                <td className="small">{e.email ?? <span className="muted">—</span>}</td>
                <td className="small">{e.ip ? <Link className="link" href={`/admin/security?ip=${encodeURIComponent(e.ip)}`}>{e.ip}</Link> : "—"}{e.country ? ` · ${e.country}` : ""}</td>
                <td className="small" style={{ wordBreak: "break-all" }}>{e.path ?? "—"}</td>
                <td className="tiny muted" style={{ maxWidth: "16rem", wordBreak: "break-word" }}>{e.user_agent ?? "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <EmptyState title="Nothing to report">Events appear here as they happen.</EmptyState>}
    </>
  );
}
