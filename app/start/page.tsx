import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Discovery } from "@/components/Discovery";
import type { Answers } from "@/lib/discovery";

export const metadata: Metadata = { title: "Tell us about your business", robots: { index: false } };

// Business discovery: a short conversation about the customer's business, saved as their Business Profile.
export default async function StartPage() {
  await requireUser("/start");
  const supabase = await createClient();
  const [{ data: profile }, { data: products }] = await Promise.all([
    supabase.from("business_profiles").select("answers, completed_at").limit(1).maybeSingle(),
    supabase.from("products").select("slug, name, price_label, short_description").eq("status", "published").eq("ownership", "platform"),
  ]);
  return (
    <section className="section">
      <div className="container stack" style={{ "--gap": "2rem", maxWidth: "46rem" } as React.CSSProperties}>
        <div className="stack">
          <span className="tag">(Your business)</span>
          <h1 className="h2">Tell us about your business</h1>
          <p className="lead small">
            About 5 minutes, no technical words. We use your answers to find the automations that save you the most time.
            Never share passwords here: apps are connected later with a secure sign-in.
          </p>
        </div>
        <Discovery initial={(profile?.answers ?? {}) as Answers} completedAt={profile?.completed_at ?? null} products={products ?? []} />
      </div>
    </section>
  );
}
