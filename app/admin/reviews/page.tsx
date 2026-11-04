import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ConfirmSubmit } from "@/components/client";
import { EmptyState, Rating } from "@/components/ui";
import { deleteReview } from "../actions";

export const metadata: Metadata = { title: "Reviews" };

export default async function Reviews() {
  const supabase = await createClient();
  const [{ data: reviews }, { data: users }] = await Promise.all([
    supabase.from("product_reviews").select("id, rating, body, created_at, user_id, product:products(name, slug)").order("created_at", { ascending: false }).limit(300),
    supabase.rpc("admin_users"),
  ]);
  const emailOf = new Map((users ?? []).map((u) => [u.id, u.email]));
  const avg = reviews?.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  return (
    <>
      <div className="stack">
        <span className="tag">(Reviews)</span>
        <h1 className="h2">Reviews <span className="muted">({reviews?.length ?? 0})</span></h1>
        <p className="small muted">
          Only customers who bought an automation can review it, so every review comes from a real purchase.
          {reviews?.length ? ` Average rating: ${avg.toFixed(1)} / 5.` : ""} Remove a review only if it breaks the rules (spam, insults, personal data).
        </p>
      </div>
      {reviews?.length ? reviews.map((r) => (
        <div key={r.id} className="card stack" style={{ "--gap": "0.5rem" } as React.CSSProperties}>
          <div className="row between">
            <Rating avg={r.rating} count={1} />
            <span className="tiny muted">{new Date(r.created_at).toLocaleString("en-GB")}</span>
          </div>
          <p className="small">{r.body || <span className="muted">No comment.</span>}</p>
          <p className="tiny muted">
            {emailOf.get(r.user_id) ?? "customer"} on {r.product ? <Link className="link" href={`/products/${r.product.slug}`}>{r.product.name}</Link> : "a product"}
          </p>
          <form action={deleteReview}>
            <input type="hidden" name="id" value={r.id} />
            <ConfirmSubmit className="btn ghost small" title="Remove this review?" message="The product's rating is recalculated without it. This cannot be undone." confirmLabel="Remove">Remove review</ConfirmSubmit>
          </form>
        </div>
      )) : <EmptyState title="No reviews yet">Customers can review an automation from its page in My automations, after buying it.</EmptyState>}
    </>
  );
}
