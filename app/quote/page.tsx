import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { QuoteForm } from "@/components/QuoteForm";
import { ContactLinks } from "@/components/ContactLinks";

export const metadata: Metadata = { title: "Request a quote" };

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const supabase = await createClient();
  const [session, { data: products }, { product }] = await Promise.all([
    getSession(),
    supabase.from("products").select("slug, name").eq("status", "published").eq("quote_only", true).order("top_rank", { nullsFirst: false }).order("name"),
    searchParams,
  ]);
  const options = (products ?? []).map((p) => ({ slug: p.slug, name: p.name }));
  const chosen = options.find((o) => o.slug === product);
  return (
    <section className="section">
      <div className="container split">
        <div className="stack" style={{ "--gap": "1.25rem" } as React.CSSProperties}>
          <span className="tag">(Request a quote)</span>
          <h1 className="h1">Tell us what to <span className="serif">automate.</span></h1>
          <p className="lead">We build and connect the automation in your own accounts. Describe your business and the result you want, and you get a fixed quote before any work starts.</p>
          <ContactLinks />
        </div>
        <div className="card">
          <QuoteForm product={chosen} options={chosen ? undefined : options} defaults={{ name: session?.displayName, email: session?.email }} />
        </div>
      </div>
    </section>
  );
}
