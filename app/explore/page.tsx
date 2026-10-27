import type { Metadata } from "next";
import Link from "next/link";
import { listCategories, listIntegrations, listProducts, parseFilters } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { ProductGrid } from "@/components/ProductCard";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Explore automations" };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const f = parseFilters(sp);
  const supabase = await createClient();
  const [products, categories, apps, { data: sellers }] = await Promise.all([
    listProducts(f),
    listCategories(),
    listIntegrations(),
    supabase.from("seller_profiles").select("slug, display_name").eq("status", "approved").order("display_name"),
  ]);
  const active = Object.entries(f).filter(([k, v]) => v && !(k === "sort" && v === "popular")).length;

  return (
    <>
      <section className="hero" style={{ paddingBottom: "2.5rem" }}>
        <div className="container stack">
          <span className="tag">(Explore automations)</span>
          <h1 className="h1">What do you want to <span className="serif accent">automate?</span></h1>
        </div>
      </section>
      <section className="section tight">
        <div className="container split sidebar">
          <form className="stack" action="/explore" aria-label="Filters" style={{ "--gap": "1.1rem" } as React.CSSProperties}>
            <div className="field">
              <label htmlFor="q">Search</label>
              <input id="q" name="q" defaultValue={f.q} placeholder="Name, use case or app" />
            </div>
            <div className="field">
              <label htmlFor="category">Category</label>
              <select id="category" name="category" defaultValue={f.category ?? ""}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name} ({c.count})</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="price">Price</label>
              <select id="price" name="price" defaultValue={f.price ?? ""}>
                <option value="">Any price</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
                <option value="under-150">Up to €150</option>
                <option value="150-250">€150 – €250</option>
                <option value="over-250">Over €250</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="rating">Rating</label>
              <select id="rating" name="rating" defaultValue={f.minRating?.toString() ?? ""}>
                <option value="">Any rating</option>
                <option value="4">4 stars &amp; up</option>
                <option value="3">3 stars &amp; up</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="app">Required app</label>
              <select id="app" name="app" defaultValue={f.app ?? ""}>
                <option value="">Any app</option>
                {apps.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="mode">Customization</label>
              <select id="mode" name="mode" defaultValue={f.mode ?? ""}>
                <option value="">Any</option>
                <option value="ready_to_use">Ready to use</option>
                <option value="configurable">Configurable</option>
                <option value="guided_setup">Guided setup</option>
                <option value="paid_service">Customization service</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="difficulty">Level</label>
              <select id="difficulty" name="difficulty" defaultValue={f.difficulty ?? ""}>
                <option value="">Any level</option>
                <option value="beginner">Beginner-friendly</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="platform">Workflow platform</label>
              <select id="platform" name="platform" defaultValue={f.platform ?? ""}>
                <option value="">Any platform</option>
                <option value="n8n">n8n</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="seller">Seller</label>
              <select id="seller" name="seller" defaultValue={f.seller ?? ""}>
                <option value="">Any seller</option>
                {(sellers ?? []).map((s) => <option key={s.slug} value={s.slug}>{s.display_name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sort">Sort by</label>
              <select id="sort" name="sort" defaultValue={f.sort}>
                <option value="popular">Most popular</option>
                <option value="recent">Recently published</option>
                <option value="rating">Highest rated</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </div>
            <div className="row">
              <button className="btn accent" type="submit">Apply</button>
              {active > 0 && <Link className="btn ghost" href="/explore">Clear</Link>}
            </div>
          </form>
          <div className="stack" style={{ "--gap": "1.25rem" } as React.CSSProperties}>
            <p className="tag" aria-live="polite">{products.length} {products.length === 1 ? "automation" : "automations"}</p>
            {products.length ? (
              <ProductGrid products={products} cols={2} />
            ) : (
              <EmptyState title="No results" action={<Link className="btn ghost small" href="/explore">Clear filters</Link>}>
                No automation matches these filters yet.
              </EmptyState>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
