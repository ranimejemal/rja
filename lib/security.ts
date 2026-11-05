import "server-only";
import { headers } from "next/headers";
import { env, features } from "@/lib/env";
import { requestInfo } from "@/lib/request-info";
import { countRecentEvents, writeSecurityEvent, type SecurityEvent } from "@/lib/security-log";

// Security log for server actions and pages: adds who is asking (IP, country, browser) and emails the agency when
// something serious happens (at most one alert of each kind every 30 minutes).

export async function securityEvent(e: Omit<SecurityEvent, "ip" | "country" | "userAgent">) {
  const info = requestInfo(await headers());
  const event: SecurityEvent = { ...e, ip: info.ip, country: info.country, userAgent: info.userAgent };
  await writeSecurityEvent(event);
  if (e.severity === "high" || e.severity === "critical") await alert(event);
}

/** Too many failed logins for this email or from this IP in the last 15 minutes: block further attempts. */
export async function loginLocked(email: string) {
  const { ip } = requestInfo(await headers());
  const [byEmail, byIp] = await Promise.all([
    countRecentEvents({ kind: "login_failed", minutes: 15, email }),
    ip ? countRecentEvents({ kind: "login_failed", minutes: 15, ip }) : Promise.resolve(0),
  ]);
  return byEmail >= 5 || byIp >= 20;
}

const LABEL: Partial<Record<SecurityEvent["kind"], string>> = {
  login_locked: "Repeated failed logins: login blocked for 15 minutes",
  admin_denied: "Someone tried to open the admin area",
  mfa_failed: "Wrong two-step verification codes on the admin account",
  probe: "A scanner is probing the site for weaknesses",
  bot_blocked: "Bots are being stopped by the human check",
  login_success: "Admin sign-in",
};

async function alert(e: SecurityEvent) {
  if (!features.email || !env.SMTP_USER) return;
  if (await countRecentEvents({ kind: "alert_sent", minutes: 30 }) >= 3) return;
  const recentSame = await countRecentEvents({ kind: "alert_sent", minutes: 30, email: `alert:${e.kind}` });
  if (recentSame > 0) return;
  await writeSecurityEvent({ kind: "alert_sent", severity: "info", email: `alert:${e.kind}`, details: { about: e.kind } });
  const { brandedEmail, sendMail } = await import("@/lib/mailer");
  const title = LABEL[e.kind] ?? `Security event: ${e.kind}`;
  const mail = brandedEmail({
    title,
    paragraphs: [
      `When: ${new Date().toUTCString()}`,
      `Account: ${e.email ?? "none"} · IP: ${e.ip ?? "unknown"} · Country: ${e.country ?? "unknown"}`,
      `Page: ${e.path ?? "-"} · Browser: ${e.userAgent ?? "unknown"}`,
      "Open the security page for details. If this was not you, change your password and check your two-step verification.",
    ],
    cta: { label: "Open the security page", url: `${env.NEXT_PUBLIC_SITE_URL}/admin/security` },
  });
  await sendMail(env.SMTP_USER, `[Security] ${title}`, mail.html, mail.text);
}
