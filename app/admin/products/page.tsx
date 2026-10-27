import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { EmptyState, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "Product moderation" };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const [{ data: queue }, { data: versions }, { data: all }] = await Promise.all([
    supabase.from("products").select("id, name, status, ownership, updated_at, seller:seller_profiles!products_seller_id_fkey(display_name)").in("status", ["submitted", "under_review"]).order("updated_at"),
    supabase.from("product_versions").select("id, version, created_at, product:products!product_versions_product_id_fkey!inner(id, name, status)").eq("status", "submitted").eq("product.status", "published"),
    supabase.from("products").select("id, name, status, ownership, price_minor, currency, is_featured, is_demo, seller:seller_profiles!products_seller_id_fkey(display_name)")
      .order("updated_at", { ascending: false }).limit(200).then((r) => status ? { data: r.data?.filter((p) => p.status === status) } : r),
  ]);
  return (
    <>
      <div className="stack"><span className="tag">(Moderation)</span><h1 className="h2">Products</h1></div>
      <section className="stack">
        <h2 className="h3">Awaiting review</h2>
        {queue?.length ? (
          <div className="table-wrap"><table>
            <thead><tr><th>Product</th><th>Seller</th><th>Type</th><th>Status</th><th>Submitted</th></tr></thead>
            <tbody>{queue.map((p) => (
              <tr key={p.id}><td><Link className="link" href={`/admin/products/${p.id}`}>{p.name}</Link></td><td>{p.seller?.display_name}</td><td>{p.ownership}</td><td><StatusPill status={p.status} /></td><td>{new Date(p.updated_at).toLocaleDateString("en-GB")}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <EmptyState title="Queue empty">No products waiting for review.</EmptyState>}
      </section>
      {versions?.length ? (
        <section className="stack">
          <h2 className="h3">Updates to published products</h2>
          <div className="table-wrap"><table><tbody>{versions.map((v) => (
            <tr key={v.id}><td><Link className="link" href={`/admin/products/${v.product?.id}`}>{v.product?.name}</Link></td><td>v{v.version}</td><td>{new Date(v.created_at).toLocaleDateString("en-GB")}</td></tr>
          ))}</tbody></table></div>
        </section>
      ) : null}
      <section className="stack">
        <div className="row between"><h2 className="h3">All products</h2>
          <form className="row"><select name="status" defaultValue={status ?? ""} aria-label="Filter by status">
            <option value="">All statuses</option>{["draft", "submitted", "under_review", "changes_requested", "approved", "published", "rejected", "suspended", "archived"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select><button className="btn small ghost">Filter</button></form></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Product</th><th>Seller</th><th>Type</th><th>Status</th><th className="num">Price</th><th>Flags</th></tr></thead>
          <tbody>{(all ?? []).map((p) => (
            <tr key={p.id}><td><Link className="link" href={`/admin/products/${p.id}`}>{p.name}</Link></td><td>{p.seller?.display_name}</td><td>{p.ownership}</td>
              <td><StatusPill status={p.status} /></td><td className="num">{formatMoney(p.price_minor, p.currency)}</td>
              <td className="small">{[p.is_featured && "featured", p.is_demo && "demo"].filter(Boolean).join(", ") || "—"}</td></tr>
          ))}</tbody>
        </table></div>
      </section>
    </>
  );
}
