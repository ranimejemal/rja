import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "Support requests" };

export default async function SupportList() {
  const session = await requireUser("/dashboard/support");
  const supabase = await createClient();
  const { data } = await supabase.from("support_tickets").select("id, subject, status, created_at, product:products(name)")
    .eq("buyer_id", session.userId).order("created_at", { ascending: false });
  return (
    <>
      <div className="stack"><span className="tag">(Support)</span><h1 className="h2">Support requests</h1></div>
      {data?.length ? (
        <div className="table-wrap"><table>
          <thead><tr><th>Subject</th><th>Product</th><th>Status</th><th>Opened</th></tr></thead>
          <tbody>{data.map((t) => (
            <tr key={t.id}><td><Link className="link" href={`/dashboard/support/${t.id}`}>{t.subject}</Link></td><td>{t.product?.name}</td>
              <td><StatusPill status={t.status} /></td><td>{new Date(t.created_at).toLocaleDateString("en-GB")}</td></tr>
          ))}</tbody>
        </table></div>
      ) : <EmptyState title="No requests">Open a request from any product in My automations.</EmptyState>}
    </>
  );
}
