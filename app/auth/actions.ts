"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";

export type AuthState = { error?: string; notice?: string };

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  // Only same-site relative paths, never "//evil.com".
  return n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
}

async function clientKey(scope: string) {
  const h = await headers();
  return `${scope}:${h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"}`;
}

const credentials = z.object({
  email: z.email("Enter a valid email address").max(254),
  password: z.string().min(10, "Use at least 10 characters").max(128),
});

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  if (!rateLimit(await clientKey("login"), 10, 10 * 60_000).ok) return { error: "Too many attempts. Try again in a few minutes." };
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Email or password is incorrect." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Same message for unknown email and wrong password.
  if (error) return { error: error.message.includes("confirm") ? "Confirm your email address first." : "Email or password is incorrect." };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  if (!rateLimit(await clientKey("signup"), 5, 60 * 60_000).ok) return { error: "Too many sign-ups from this network. Try again later." };
  const parsed = credentials.extend({ displayName: z.string().trim().min(2, "Enter your name").max(80) }).safeParse({
    email: form.get("email"), password: form.get("password"), displayName: form.get("displayName"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (form.get("terms") !== "on") return { error: "Please accept the Terms of Service and Privacy Policy." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(safeNext(form.get("next")))}`,
    },
  });
  if (error) return { error: error.message };
  if (data.session) redirect(safeNext(form.get("next")));
  return { notice: "Check your inbox to confirm your email address, then log in." };
}
