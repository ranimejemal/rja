"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { securityEvent } from "@/lib/security";

export type MfaState = { error?: string; factorId?: string; qr?: string; secret?: string };

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/admin";
};

/** Step 1: creates an authenticator-app factor and returns its QR code and secret to scan or type. */
export async function startMfaSetup(): Promise<MfaState> {
  await requireUser("/dashboard/security");
  const supabase = await createClient();
  // Remove unfinished setups first, so they do not pile up.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `RJA ${new Date().toISOString().slice(0, 10)}` });
  if (error || !data) return { error: "Could not start the setup. Please try again." };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Step 2: checks the first code from the app, which turns two-step verification on. */
export async function finishMfaSetup(_: MfaState, form: FormData): Promise<MfaState> {
  const session = await requireUser("/dashboard/security");
  const factorId = String(form.get("factor_id") ?? "");
  if (!rateLimit(`mfa-setup:${session.userId}`, 10, 10 * 60_000).ok) return { factorId, error: "Too many attempts. Wait a few minutes." };
  const code = z.string().regex(/^\d{6}$/).safeParse(String(form.get("code") ?? "").replace(/\s/g, ""));
  if (!code.success || !/^[0-9a-f-]{36}$/.test(factorId)) return { factorId, error: "Enter the 6-digit code shown in your app." };
  const supabase = await createClient();
  // Supabase only accepts a factor of the signed-in account here.
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.data });
  if (error) return { factorId, error: "That code did not match. Check the time on your phone and try the newest code." };
  await securityEvent({ kind: "password_changed", severity: "medium", email: session.email, userId: session.userId, path: "/dashboard/security", details: { change: "two-step verification turned on" } });
  redirect(`${safeNext(form.get("next"))}?notice=${encodeURIComponent("Two-step verification is on.")}`);
}

/** At sign-in: the code from the app, for accounts with two-step verification. */
export async function verifyMfaCode(_: MfaState, form: FormData): Promise<MfaState> {
  const session = await requireUser("/login/mfa");
  if (!rateLimit(`mfa:${session.userId}`, 8, 10 * 60_000).ok) return { error: "Too many attempts. Wait a few minutes." };
  const code = z.string().regex(/^\d{6}$/).safeParse(String(form.get("code") ?? "").replace(/\s/g, ""));
  if (!code.success) return { error: "Enter the 6-digit code shown in your app." };
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.[0];
  if (!factor) redirect("/dashboard/security");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.data });
  if (error) {
    await securityEvent({ kind: "mfa_failed", severity: "high", email: session.email, userId: session.userId, path: "/login/mfa" });
    return { error: "That code did not match. Try the newest code in your app." };
  }
  redirect(safeNext(form.get("next")));
}

const back = (notice: string, tone: "notice" | "error" = "notice") =>
  redirect(`/dashboard/security?${tone}=${encodeURIComponent(notice)}#devices`);

/** Signs one of your other devices out (it must log in again). */
export async function signOutDevice(form: FormData) {
  const session = await requireUser("/dashboard/security");
  if (!rateLimit(`devices:${session.userId}`, 30, 60 * 60_000).ok) back("Too many requests. Try again later.", "error");
  const id = z.string().regex(/^[0-9a-f-]{36}$/i).safeParse(form.get("session_id"));
  if (!id.success) back("This device was not found.", "error");
  const supabase = await createClient();
  const { data: ok } = await supabase.rpc("sign_out_device", { p_session_id: id.data! });
  if (ok) await securityEvent({ kind: "session_revoked", severity: "info", email: session.email, userId: session.userId, path: "/dashboard/security", details: { scope: "one_device" } });
  back(ok ? "That device is signed out. It must log in again." : "That device was already signed out.");
}

/** Signs out every device except this one: use it if you think someone else is in your account. */
export async function signOutOtherDevices() {
  const session = await requireUser("/dashboard/security");
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (!error) await securityEvent({ kind: "session_revoked", severity: "info", email: session.email, userId: session.userId, path: "/dashboard/security", details: { scope: "other_devices" } });
  back(error ? "Could not sign the other devices out. Please try again." : "All your other devices are signed out.", error ? "error" : "notice");
}
