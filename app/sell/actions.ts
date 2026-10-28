"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  display_name: z.string().trim().min(2, "Display name is too short").max(80),
  contact_email: z.email("Enter a valid contact email"),
  country: z.string().regex(/^[A-Z]{2}$/, "Choose your country"),
  profile: z.string().trim().max(600).default(""),
  experience: z.string().trim().min(20, "Tell us a bit more about your experience (20+ characters)").max(2000),
  categories: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(15),
  portfolio_url: z.union([z.url({ protocol: /^https$/ }), z.literal("")]).optional(),
});

export async function applyToSell(form: FormData) {
  const session = await requireUser("/sell");
  if (!rateLimit(`apply:${session.userId}`, 3, 24 * 60 * 60_000).ok) redirect("/sell?error=Too+many+applications+today.");
  const parsed = schema.safeParse({
    display_name: form.get("display_name"),
    contact_email: form.get("contact_email"),
    country: String(form.get("country") ?? "").toUpperCase(),
    profile: form.get("profile") ?? "",
    experience: form.get("experience"),
    categories: form.getAll("categories").map(String),
    portfolio_url: form.get("portfolio_url") ?? "",
  });
  if (!parsed.success) redirect(`/sell?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  const supabase = await createClient();
  const { error } = await supabase.from("seller_applications").insert({
    user_id: session.userId,
    ...parsed.data,
    portfolio_url: parsed.data.portfolio_url || null,
  });
  if (error) {
    const msg = error.code === "23505" ? "You already have an application in review." : "Could not submit your application.";
    redirect(`/sell?error=${encodeURIComponent(msg)}`);
  }
  redirect("/sell?notice=Application+received.+We+will+email+you+after+review.");
}
