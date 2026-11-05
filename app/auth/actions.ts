"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { HUMAN_CHECK_FAILED, verifyHuman } from "@/lib/human-check";
import { loginLocked, securityEvent } from "@/lib/security";

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

/** The address the user is on (so email links come back to the same domain), else the configured site URL. */
async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  return origin && /^https?:\/\/[^/]+$/.test(origin) ? origin : env.NEXT_PUBLIC_SITE_URL;
}

const credentials = z.object({
  email: z.email("Enter a valid email address").max(254),
  password: z.string().min(10, "Use at least 10 characters").max(128),
});

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  if (!rateLimit(await clientKey("login"), 10, 10 * 60_000).ok) return { error: "Too many attempts. Try again in a few minutes." };
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Email or password is incorrect." };
  if (!(await verifyHuman(form, "/login"))) return { error: HUMAN_CHECK_FAILED };
  const email = parsed.data.email.toLowerCase();
  // Too many failures for this account or network: refuse without even checking the password.
  if (await loginLocked(email)) {
    await securityEvent({ kind: "login_locked", severity: "high", email, path: "/login" });
    return { error: "Too many failed attempts. For your security, sign-in is paused for 15 minutes." };
  }
  const supabase = await createClient();
  const { data: signedIn, error } = await supabase.auth.signInWithPassword(parsed.data);
  // The audit log records who tried and from where, never the password.
  if (error) await securityEvent({ kind: "login_failed", severity: "low", email, path: "/login", details: { reason: error.code ?? error.message.slice(0, 80) } });
  else {
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", signedIn.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    await securityEvent({ kind: "login_success", severity: isAdmin ? "high" : "info", email, userId: signedIn.user.id, path: "/login", details: { admin: isAdmin } });
  }
  if (error?.code === "email_not_confirmed") {
    // Right password, unconfirmed email: send a fresh code and go to the code page.
    await supabase.auth.resend({ type: "signup", email: parsed.data.email });
    redirect(verifyUrl(parsed.data.email, form.get("next")));
  }
  // Same message for unknown email and wrong password.
  if (error) return { error: "Email or password is incorrect." };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  if (!rateLimit(await clientKey("signup"), 5, 60 * 60_000).ok) return { error: "Too many sign-ups from this network. Try again later." };
  const parsed = credentials.extend({ displayName: z.string().trim().min(2, "Enter your name").max(80) }).safeParse({
    email: form.get("email"), password: form.get("password"), displayName: form.get("displayName"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (form.get("terms") !== "on") return { error: "Please accept the Terms of Service and Privacy Policy." };
  if (!(await verifyHuman(form, "/signup"))) return { error: HUMAN_CHECK_FAILED };
  await securityEvent({ kind: "signup", severity: "info", email: parsed.data.email, path: "/signup" });
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName, marketing_opt_in: form.get("marketing") === "on" },
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(safeNext(form.get("next")))}`,
    },
  });
  if (error) return { error: error.message };
  if (data.session) redirect(safeNext(form.get("next")));
  redirect(verifyUrl(parsed.data.email, form.get("next")));
}

function verifyUrl(email: string, next: FormDataEntryValue | null) {
  return `/verify?${new URLSearchParams({ email, next: safeNext(next) })}`;
}

const codeForm = z.object({
  email: z.email().max(254),
  // Supabase codes are 6 to 10 digits (this project sends 8).
  token: z.string().transform((t) => t.replace(/\s/g, "")).pipe(z.string().regex(/^\d{6,10}$/)),
});

export async function verifyEmailCode(_: AuthState, form: FormData): Promise<AuthState> {
  if (!rateLimit(await clientKey("verify"), 10, 10 * 60_000).ok) return { error: "Too many attempts. Try again in a few minutes." };
  const parsed = codeForm.safeParse({ email: form.get("email"), token: form.get("token") });
  if (!parsed.success) return { error: "Enter the code from the email." };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: parsed.data.email, token: parsed.data.token, type: "email" });
  if (error) return { error: "This code is wrong or has expired. Check the latest email, or send a new code." };
  const next = safeNext(form.get("next"));
  redirect(`${next}${next.includes("?") ? "&" : "?"}notice=${encodeURIComponent("Your email is confirmed. Welcome!")}`);
}

export async function resendEmailCode(_: AuthState, form: FormData): Promise<AuthState> {
  if (!rateLimit(await clientKey("resend"), 3, 15 * 60_000).ok) return { error: "Please wait a few minutes before asking for another code." };
  const email = z.email().max(254).safeParse(form.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: email.data });
  if (error?.status === 429) {
    const wait = Number(error.message.match(/after (\d+) seconds/)?.[1] ?? 60);
    return { error: `A code was just sent. Please wait ${wait} seconds before asking for a new one.` };
  }
  // Same answer whether or not the account exists or is already confirmed.
  return { notice: "If this email needs confirming, a new code is on its way. Check your inbox (and spam)." };
}

async function sendResetCode(form: FormData): Promise<{ email?: string; error?: string }> {
  if (!rateLimit(await clientKey("reset"), 5, 60 * 60_000).ok) return { error: "Too many requests. Try again later." };
  const email = z.email().max(254).safeParse(form.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };
  await securityEvent({ kind: "password_reset_requested", severity: "info", email: email.data, path: "/forgot-password" });
  const supabase = await createClient();
  // The email holds a code ({{ .Token }}); the link fallback still works through /auth/callback.
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password` });
  // Supabase sends at most one email a minute per address: say so instead of pretending a new code left.
  if (error?.status === 429) {
    const wait = Number(error.message.match(/after (\d+) seconds/)?.[1] ?? 60);
    return { email: email.data, error: `A code was just sent. Please wait ${wait} seconds before asking for a new one.` };
  }
  return { email: email.data };
}

export async function requestPasswordReset(_: AuthState, form: FormData): Promise<AuthState> {
  if (!(await verifyHuman(form, "/forgot-password"))) return { error: HUMAN_CHECK_FAILED };
  const sent = await sendResetCode(form);
  // A code sent less than a minute ago is still valid: go on to the code step.
  if (sent.error && !sent.email) return { error: sent.error };
  // Same result whether or not the account exists, so the form cannot be used to find accounts.
  redirect(`/reset-password?${new URLSearchParams({ email: sent.email! })}`);
}

export async function resendResetCode(_: AuthState, form: FormData): Promise<AuthState> {
  const sent = await sendResetCode(form);
  if (sent.error) return { error: sent.error };
  return { notice: "If an account exists for this email, a new code is on its way. Check your inbox (and spam)." };
}

/** Step 2 of "forgot password": checks the code from the email. A correct code signs the person in for the reset. */
export async function verifyResetCode(_: AuthState, form: FormData): Promise<AuthState> {
  if (!rateLimit(await clientKey("reset-code"), 10, 10 * 60_000).ok) return { error: "Too many attempts. Try again in a few minutes." };
  const code = codeForm.safeParse({ email: form.get("email"), token: form.get("token") });
  if (!code.success) return { error: "Enter the code from the email." };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: code.data.email, token: code.data.token, type: "recovery" });
  if (error) return { error: "This code is wrong or has expired. Check the latest email, or send a new code." };
  redirect("/reset-password?step=new");
}

export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 10 || password.length > 128) return { error: "Use at least 10 characters." };
  if (password !== form.get("confirm")) return { error: "The two passwords do not match." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "This link has expired. Ask for a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message.includes("different") ? "Choose a password different from the old one." : "Could not update the password. Try again." };
  await securityEvent({ kind: "password_changed", severity: "medium", email: data.user.email, userId: data.user.id, path: "/reset-password" });
  redirect("/dashboard?notice=Your+password+was+updated.");
}
