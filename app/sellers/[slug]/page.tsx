import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/ProductCard";
import { Badge, EmptyState, SellerBadge } from "@/components/ui";

type Params = { params: Promise<{ slug: string }> };

async function loadSeller(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("seller_profiles")
    .select("id, slug, display_name, bio, categories, portfolio_url, is_platform, is_demo, created_at")
    .eq("slug", slug).eq("status", "approved").maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const s = await loadSeller((await params).slug);
  return s ? { title: s.display_name, description: s.bio } : {};
}

export default async function SellerPage({ params }: Params) {
  const s = await loadSeller((await params).slug);
  if (!s) notFound();
  const products = await listProducts({ seller: s.slug, sort: "recent" });
  return (
    <>
      <section className="hero" style={{ paddingBottom: "2.5rem" }}>
        <div className="container stack">
          <span className="tag">(Creator)</span>
          <div className="badges"><SellerBadge isPlatform={s.is_platform} />{s.is_demo && <Badge kind="demo">Demo data</Badge>}</div>
          <h1 className="h1">{s.display_name}</h1>
          {s.bio && <p className="lead">{s.bio}</p>}
          <div className="row small muted">
            <span>Member since {new Date(s.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
            {s.portfolio_url && <a className="link" href={s.portfolio_url} rel="noopener nofollow" target="_blank">Portfolio ↗</a>}
          </div>
        </div>
      </section>
      <section className="section tight">
        <div className="container stack" style={{ "--gap": "1.5rem" } as React.CSSProperties}>
          <span className="tag">({products.length} automations)</span>
          {products.length ? <ProductGrid products={products} /> : <EmptyState title="No products">This creator has no published automations yet.</EmptyState>}
        </div>
      </section>
    </>
  );
}
