import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/client";

export const metadata: Metadata = { title: "Seller profile" };

async function saveProfile(form: FormData) {
  "use server";
  const session = await requireRole("seller");
  const parsed = z.object({
    display_name: z.string().trim().min(2).max(80),
    bio: z.string().trim().max(600),
    portfolio_url: z.union([z.url({ protocol: /^https$/ }), z.literal("")]),
  }).safeParse({ display_name: form.get("display_name"), bio: form.get("bio") ?? "", portfolio_url: form.get("portfolio_url") ?? "" });
  if (!parsed.success) redirect("/seller/profile?error=Check+the+name+(2-80+characters)+and+https+portfolio+link.");
  const supabase = await createClient();
  const { error } = await supabase.from("seller_profiles")
    .update({ ...parsed.data, portfolio_url: parsed.data.portfolio_url || null }).eq("id", session.sellerId!);
  redirect(`/seller/profile?${error ? "error=Could+not+save." : "notice=Profile+saved."}`);
}

export default async function SellerProfilePage() {
  const session = await requireRole("seller");
  const supabase = await createClient();
  const { data: s } = await supabase.from("seller_profiles").select("slug, display_name, bio, portfolio_url").eq("id", session.sellerId!).single();
  return (
    <>
      <div className="stack"><span className="tag">(Seller profile)</span><h1 className="h2">Public profile</h1>
        {s && <Link className="link small" href={`/sellers/${s.slug}`}>View public page</Link>}</div>
      <form action={saveProfile} className="card stack" style={{ maxWidth: "40rem" }}>
        <div className="field"><label htmlFor="display_name">Display name</label><input id="display_name" name="display_name" required maxLength={80} defaultValue={s?.display_name} /></div>
        <div className="field"><label htmlFor="bio">Bio</label><textarea id="bio" name="bio" maxLength={600} defaultValue={s?.bio} /></div>
        <div className="field"><label htmlFor="portfolio_url">Portfolio (https)</label><input id="portfolio_url" name="portfolio_url" type="url" defaultValue={s?.portfolio_url ?? ""} /></div>
        <p className="tiny muted">Your contact email, country and payout details are never shown publicly.</p>
        <SubmitButton className="btn small">Save</SubmitButton>
      </form>
    </>
  );
}
