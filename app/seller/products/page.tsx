import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { EmptyState, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "My products" };

export default async function SellerProducts() {
  const session = await requireRole("seller");
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("id, name, slug, status, price_minor, currency, updated_at, sales_count")
    .eq("seller_id", session.sellerId!).order("updated_at", { ascending: false });
  return (
    <>
      <div className="row between"><div className="stack"><span className="tag">(My products)</span><h1 className="h2">Products</h1></div><Link className="btn accent small" href="/seller/products/new">Add product</Link></div>
      {data?.length ? (
        <div className="table-wrap"><table>
          <thead><tr><th>Product</th><th>Status</th><th className="num">Price</th><th className="num">Sales</th><th>Updated</th></tr></thead>
          <tbody>{data.map((p) => (
            <tr key={p.id}><td><Link className="link" href={`/seller/products/${p.id}`}>{p.name}</Link></td><td><StatusPill status={p.status} /></td>
              <td className="num">{formatMoney(p.price_minor, p.currency)}</td><td className="num">{p.sales_count}</td><td>{new Date(p.updated_at).toLocaleDateString("en-GB")}</td></tr>
          ))}</tbody>
        </table></div>
      ) : <EmptyState title="No products" action={<Link className="btn accent small" href="/seller/products/new">Create your first product</Link>}>Your listings appear here.</EmptyState>}
    </>
  );
}
