"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { features } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export type NewsletterState = { ok?: boolean; message?: string };

export async function subscribe(_: NewsletterState, form: FormData): Promise<NewsletterState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`newsletter:${ip}`, 5, 60 * 60_000).ok) return { message: "Too many attempts. Try again later." };
  const email = z.email().max(254).safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { message: "Enter a valid email address." };
  if (form.get("consent") !== "on") return { message: "Please confirm you want to receive the newsletter." };
  if (!features.serverAdmin) return { message: "The newsletter is not open yet. Please check back soon." };
  const { error } = await createAdminClient().from("newsletter_subscribers").upsert({ email: email.data }, { onConflict: "email", ignoreDuplicates: true });
  if (error) return { message: "Something went wrong. Please try again." };
  // Same answer whether or not the address was already subscribed.
  return { ok: true, message: "Thanks! You are on the list." };
}
