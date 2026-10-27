import Link from "next/link";
import { listCategories, listProducts } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { ProductGrid } from "@/components/ProductCard";
import { EmptyState, SectionHead, SellerBadge } from "@/components/ui";
import { NewsletterForm } from "@/components/NewsletterForm";
import { HomeIntro } from "@/components/HomeIntro";
import { thumbnailUrl } from "@/lib/catalog";

export default async function HomePage() {
  const supabase = await createClient();
  const [featured, best, recent, categories, { data: creators }] = await Promise.all([
    listProducts({ featured: true, sort: "recent" }, 3),
    listProducts({ sort: "popular" }, 3),
    listProducts({ sort: "recent" }, 3),
    listCategories(),
    supabase.from("seller_profiles").select("slug, display_name, bio, is_platform, is_demo").eq("status", "approved").order("is_platform", { ascending: false }).limit(6),
  ]);
  const popularCategories = [...categories].sort((a, b) => b.count - a.count).slice(0, 8);
  const anyDemo = [...featured, ...best, ...recent].some((p) => p.is_demo);

  return (
    <>
      <HomeIntro images={[...featured, ...best, ...recent].map((p) => thumbnailUrl(p.thumbnail_path)).filter((v, i, a) => a.indexOf(v) === i)} />
      <section className="hero">
        <div className="container stack" style={{ "--gap": "1.75rem" } as React.CSSProperties}>
          <span className="tag" data-scramble-loop="">(AI automation marketplace)</span>
          <h1 className="display" data-split="rolling">Automate more. <span className="serif accent">Build less.</span> Grow faster.</h1>
          <p className="lead">
            Discover ready-to-use AI automations and workflows built by creators to help businesses save time,
            streamline operations, and work smarter.
          </p>
          <form action="/explore" className="search-bar" role="search">
            <label htmlFor="hero-q" className="sr-only">Search automations</label>
            <input id="hero-q" name="q" placeholder="What do you want to automate?" />
            <button className="btn accent" type="submit">Search</button>
          </form>
          {anyDemo && <p className="tiny muted">Listings marked “Demo data” are sample products for development and cannot be purchased.</p>}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead tag="Featured automations" title={<>Hand-picked <span className="serif">by our team.</span></>}>
            <Link className="btn ghost small" href="/explore" style={{ alignSelf: "flex-start" }}>Explore all</Link>
          </SectionHead>
          {featured.length ? <ProductGrid products={featured} /> : <EmptyState title="Featured">Featured automations appear here.</EmptyState>}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <SectionHead tag="Best-selling" title={<>What businesses <span className="serif">buy most.</span></>} />
          {best.length ? <ProductGrid products={best} /> : <EmptyState title="Best-selling">No sales yet.</EmptyState>}
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((k) => (
            <span key={k} style={{ display: "inline-flex", gap: "2.5rem" }}>
              <span>Discover</span><span className="dot">●</span><span className="serif">customize</span><span className="dot">●</span>
              <span>Download</span><span className="dot">●</span><span className="serif">automate</span><span className="dot">●</span>
            </span>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="container">
          <SectionHead tag="Recently added" title={<>Fresh from <span className="serif">our creators.</span></>} />
          {recent.length ? <ProductGrid products={recent} /> : <EmptyState title="Recently added">New products appear here.</EmptyState>}
        </div>
      </section>

      <section className="section" style={{ background: "var(--surface)" }}>
        <div className="container">
          <SectionHead tag="Popular categories" title={<>Search by the problem, <span className="serif">not the tech.</span></>}>
            <Link className="btn ghost small" href="/categories" style={{ alignSelf: "flex-start" }}>All categories</Link>
          </SectionHead>
          <div>
            {popularCategories.map((c) => (
              <Link key={c.id} className="category-card" data-scramble-hover="" href={`/explore?category=${c.slug}`}>
                <span>{c.name}</span><span className="count">{c.count} {c.count === 1 ? "automation" : "automations"} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead tag="Featured creators" title={<>The people <span className="serif">behind the flows.</span></>} />
          {creators?.length ? (
            <div className="grid">
              {creators.map((c) => (
                <Link key={c.slug} href={`/sellers/${c.slug}`} className="card stack" style={{ textDecoration: "none" }}>
                  <div className="badges"><SellerBadge isPlatform={c.is_platform} />{c.is_demo && <span className="badge demo">Demo data</span>}</div>
                  <h3 className="h3">{c.display_name}</h3>
                  <p className="small muted">{c.bio || "Automation creator."}</p>
                </Link>
              ))}
            </div>
          ) : <EmptyState title="Creators">Creator profiles appear here.</EmptyState>}
        </div>
      </section>

      <section className="section" style={{ background: "var(--surface)" }}>
        <div className="container split">
          <div className="stack">
            <span className="tag">(How buying works)</span>
            <h2 className="h2" data-split="rolling">From search to a <span className="serif">working automation.</span></h2>
            <ol className="step-list">
              <li><strong>Find it</strong><span className="muted">Search by problem, category or app. Every listing shows what it does, what it doesn’t, and what it needs.</span></li>
              <li><strong>Check the terms</strong><span className="muted">See the full price, the license, required accounts and third-party costs before you pay.</span></li>
              <li><strong>Buy securely</strong><span className="muted">Pay through our payment provider. Access is granted only once the payment is confirmed.</span></li>
              <li><strong>Customize</strong><span className="muted">Fill in the settings the creator made configurable — no workflow code to edit.</span></li>
              <li><strong>Download &amp; set up</strong><span className="muted">Get the workflow files and guided instructions, then run it in your own n8n.</span></li>
            </ol>
          </div>
          <div className="stack">
            <span className="tag">(How selling works)</span>
            <h2 className="h2" data-split="rolling">Build once, <span className="serif">sell repeatedly.</span></h2>
            <ol className="step-list">
              <li><strong>Apply</strong><span className="muted">Tell us about your experience and the automations you build.</span></li>
              <li><strong>Accept the agreement</strong><span className="muted">Commission, payouts, ownership and support rules — clearly written.</span></li>
              <li><strong>Upload &amp; describe</strong><span className="muted">Workflow JSON, docs, previews and the settings buyers can customize.</span></li>
              <li><strong>Get reviewed</strong><span className="muted">Every product is checked before it is published.</span></li>
              <li><strong>Earn</strong><span className="muted">Track sales, commission and payouts in your seller dashboard.</span></li>
            </ol>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container card stack" style={{ background: "var(--accent)", color: "var(--accent-ink)", borderColor: "var(--accent)", padding: "clamp(2rem, 5vw, 4rem)", "--gap": "1.25rem" } as React.CSSProperties}>
          <span className="tag" style={{ color: "rgba(29,29,27,0.65)" }}>(For creators)</span>
          <h2 className="h1" data-split="rolling">Sell your <span className="serif">automations.</span></h2>
          <p style={{ maxWidth: "38rem" }}>Publish your n8n workflows, set your price, define what buyers can customize, and earn from every sale. The platform takes a transparent commission per successful sale.</p>
          <div className="row">
            <Link className="btn" href="/sell">Become a seller</Link>
            <Link className="btn ghost" style={{ color: "var(--accent-ink)" }} href="/pricing">See commission &amp; licensing</Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container split">
          <div className="stack">
            <span className="tag">(Newsletter)</span>
            <h2 className="h2" data-split="rolling">New automations, <span className="serif">once a month.</span></h2>
            <p className="muted">No spam. Unsubscribe any time.</p>
          </div>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
