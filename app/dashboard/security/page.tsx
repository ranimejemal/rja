import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Notice } from "@/components/ui";
import { MfaSetup } from "./MfaForms";
import { signOutDevice, signOutOtherDevices } from "./actions";
import { SubmitButton } from "@/components/client";

export const metadata: Metadata = { title: "Account security", robots: { index: false } };

export default async function SecuritySettings({ searchParams }: { searchParams: Promise<{ setup?: string; next?: string; notice?: string; error?: string }> }) {
  const { setup, next = "/dashboard", notice, error } = await searchParams;
  await requireUser("/dashboard/security");
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const on = (factors?.totp ?? []).length > 0;
  const { data: devices } = await supabase.rpc("my_sessions");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return (
    <>
      <div className="stack"><span className="tag">(Account)</span><h1 className="h2">Account security</h1></div>
      {setup === "admin" && !on && (
        <Notice tone="warn">The admin area needs two-step verification. Turn it on below (2 minutes), then you are taken back.</Notice>
      )}
      <section className="card stack" style={{ maxWidth: "36rem" }}>
        <h2 className="h3">Two-step verification</h2>
        {on ? (
          <p className="small">On. When you sign in, you also enter a code from your authenticator app. Lost your phone? Write to ranimejmal@gmail.com from your account email.</p>
        ) : (
          <>
            <p className="small">
              Adds a second lock to your account: after your password, a 6-digit code from an app on your phone. Even someone who
              steals your password cannot get in.
            </p>
            <MfaSetup next={safeNext} />
          </>
        )}
      </section>

      <section className="card stack" id="devices" aria-labelledby="devices-h" style={{ maxWidth: "48rem" }}>
        <div className="row between" style={{ alignItems: "baseline" }}>
          <h2 id="devices-h" className="h3">Connected devices</h2>
          {(devices?.length ?? 0) > 1 && (
            <form action={signOutOtherDevices}><SubmitButton className="btn small ghost">Sign out everywhere else</SubmitButton></form>
          )}
        </div>
        <p className="small muted">
          Every phone or computer signed in to your account. Don’t recognise one? Sign it out, then change your password
          {on ? "" : " and turn on two-step verification"}.
        </p>
        {notice && <Notice tone="ok">{notice}</Notice>}
        {error && <Notice tone="danger">{error}</Notice>}
        {devices === null ? (
          <p className="small muted">The device list is not available yet.</p>
        ) : (
          <ul className="devices">
            {devices.map((d) => (
              <li key={d.id} className="device-row">
                <span className="device-icon" aria-hidden="true">{deviceIcon(d.user_agent)}</span>
                <div className="stack device-info" style={{ "--gap": "0.15rem" } as React.CSSProperties}>
                  <strong className="small">
                    {deviceName(d.user_agent)}
                    {d.current && <span className="badge" style={{ marginLeft: "0.5rem" }}>This device</span>}
                    {d.aal === "aal2" && <span className="badge" style={{ marginLeft: "0.5rem" }}>2-step verified</span>}
                  </strong>
                  <span className="tiny muted">
                    {[d.country && countryName(d.country), known(d.user_agent) && d.ip].filter(Boolean).join(" · ") || "Place unknown"} · signed in {when(d.created_at, true)} · last active {when(d.last_active)}
                  </span>
                </div>
                {!d.current && (
                  <form action={signOutDevice} className="device-action">
                    <input type="hidden" name="session_id" value={d.id} />
                    <SubmitButton className="btn small ghost">Sign out</SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/** "Chrome on Windows", "Safari on iPhone"… from the browser's user agent. */
// Sessions created before devices were recorded only carry the website server's details, not the device's.
const known = (ua: string | null) => Boolean(ua && !/^node|undici|supabase/i.test(ua));

function deviceName(ua: string | null) {
  if (!known(ua) || !ua) return "Device (details unknown)";
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /CrOS/.test(ua) ? "Chromebook" : /Linux/.test(ua) ? "Linux" : "an unknown system";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /SamsungBrowser/.test(ua) ? "Samsung Internet"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${browser} on ${os}`;
}
function deviceIcon(ua: string | null) {
  return ua && /iPhone|Android.*Mobile|Mobile/.test(ua) ? "📱" : ua && /iPad|Tablet/.test(ua) ? "📲" : "💻";
}
function countryName(code: string) {
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code; } catch { return code; }
}
function when(iso: string, on = false) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)} h ago`;
  return `${on ? "on " : ""}${new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}
