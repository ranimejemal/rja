import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Customers" };

const minutes = (s: number) => (s < 60 ? `${s} s` : `${Math.round(s / 60)} min`);

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_users");
  const needle = q.trim().toLowerCase();
  const users = (data ?? []).filter((u) => !needle || u.email.toLowerCase().includes(needle) || (u.display_name ?? "").toLowerCase().includes(needle));
  const optedIn = (data ?? []).filter((u) => u.marketing_opt_in).length;
  return (
    <>
      <div className="stack">
        <span className="tag">(Customers)</span>
        <h1 className="h2">Customers <span className="muted">({data?.length ?? 0})</span></h1>
        <p className="small muted">Every account, with its roles, purchases and time on the site. {optedIn} accepted offers by email.</p>
        <form className="row" role="search">
          <input name="q" defaultValue={q} placeholder="Search by email or name" aria-label="Search customers" style={{ maxWidth: "22rem" }} />
          <button className="btn small">Search</button>
        </form>
      </div>
      {error ? <EmptyState title="Could not load customers">{error.message}</EmptyState> : users.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Roles</th><th>Joined</th><th>Last sign-in</th><th className="num">Orders</th><th className="num">Spent</th><th className="num">Time on site (30 d)</th><th>Offers</th></tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.display_name || "—"}</strong><br /><a className="link small" href={`mailto:${u.email}`}>{u.email}</a>{!u.email_confirmed && <span className="badge" style={{ marginLeft: "0.4rem" }}>unconfirmed</span>}</td>
                <td className="small">{u.roles.join(", ")}</td>
                <td className="small">{new Date(u.created_at).toLocaleDateString("en-GB")}</td>
                <td className="small">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("en-GB") : "never"}</td>
                <td className="num"><Link className="link" href={`/admin/orders?buyer=${u.id}`}>{u.paid_orders}</Link></td>
                <td className="num">{formatMoney(Number(u.spent_minor), "USD")}</td>
                <td className="num">{minutes(Number(u.seconds_30d))}</td>
                <td className="small">{u.marketing_opt_in ? "yes" : "no"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <EmptyState title="No customers found">Try another search.</EmptyState>}
    </>
  );
}
