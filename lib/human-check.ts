import "server-only";
import { headers } from "next/headers";
import { securityEvent } from "@/lib/security";

// "Verify you are human" with Cloudflare Turnstile (free). Active when TURNSTILE_SECRET_KEY and
// NEXT_PUBLIC_TURNSTILE_SITE_KEY are set; until then forms work without it. Failures go to the security log.
export const humanCheckEnabled = () => Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export async function verifyHuman(form: FormData, where: string): Promise<boolean> {
  if (!humanCheckEnabled()) return true;
  const token = String(form.get("cf-turnstile-response") ?? "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  let ok = false;
  if (token) {
    try {
      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token, ...(ip ? { remoteip: ip } : {}) }),
        signal: AbortSignal.timeout(5000),
      });
      ok = Boolean(((await res.json()) as { success?: boolean }).success);
    } catch {
      // Cloudflare unreachable: let people through rather than lock everyone out.
      ok = true;
    }
  }
  if (!ok) await securityEvent({ kind: "bot_blocked", severity: "low", path: where, details: { tokenPresent: Boolean(token) } });
  return ok;
}

export const HUMAN_CHECK_FAILED = "Please complete the “verify you are human” check and try again.";
