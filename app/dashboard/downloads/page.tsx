import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Download history" };

export default async function DownloadsPage() {
  const session = await requireUser("/dashboard/downloads");
  const supabase = await createClient();
  const { data } = await supabase.from("download_logs").select("id, file_id, created_at").eq("user_id", session.userId)
    .order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <div className="stack"><span className="tag">(Download history)</span><h1 className="h2">Downloads</h1></div>
      {data?.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>File</th></tr></thead>
            <tbody>{data.map((d) => <tr key={d.id}><td>{new Date(d.created_at).toLocaleString("en-GB")}</td><td className="mono">{d.file_id}</td></tr>)}</tbody>
          </table>
        </div>
      ) : <EmptyState title="No downloads">Files you download appear here.</EmptyState>}
    </>
  );
}
