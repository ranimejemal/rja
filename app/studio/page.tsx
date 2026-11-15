import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { Studio } from "@/components/Studio";

export const metadata: Metadata = { title: "Social Media Studio", robots: { index: false } };

export default async function StudioPage() {
  await requireUser("/studio");
  return (
    <section className="section">
      <div className="container stack" style={{ "--gap": "2rem", maxWidth: "60rem" } as React.CSSProperties}>
        <div className="stack">
          <span className="tag">(Social Media Studio · beta)</span>
          <h1 className="h2">Learn from your best posts, then create more like them</h1>
          <p className="lead small">
            Upload the statistics export of your Instagram, Facebook or TikTok account. We show what works for you (formats, best times,
            caption habits, top posts), then write new posts and reel plans in your style: same voice, more ideas.
          </p>
        </div>
        <Studio />
      </div>
    </section>
  );
}
