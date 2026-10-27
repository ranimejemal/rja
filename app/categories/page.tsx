import type { Metadata } from "next";
import Link from "next/link";
import { listCategories } from "@/lib/catalog";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await listCategories();
  return (
    <section className="section">
      <div className="container stack" style={{ "--gap": "2.5rem" } as React.CSSProperties}>
        <div className="stack">
          <span className="tag">(Categories)</span>
          <h1 className="h1">Every part of your <span className="serif">business.</span></h1>
        </div>
        <div>
          {categories.map((c) => (
            <Link key={c.id} className="category-card" href={`/explore?category=${c.slug}`}>
              <span>{c.name}</span>
              <span className="count">{c.count} {c.count === 1 ? "automation" : "automations"} →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
