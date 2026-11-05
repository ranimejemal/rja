"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Counts how long each page is actually looked at (visible tab only) and reports it every 30 s and when the
// visitor leaves. No cookie and nothing stored in the browser: each page view gets a random id kept in memory.
// The server attaches the account only for signed-in visitors (see /api/track).
export function EngagementTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/api")) return;
    const id = crypto.randomUUID();
    let seconds = 0;
    let visibleSince = document.visibilityState === "visible" ? Date.now() : 0;
    let sent = -1;
    // The site the visitor came from (its host name only), on the first report of the visit.
    let referrer: string | null = null;
    try { const r = document.referrer ? new URL(document.referrer).hostname : ""; referrer = r && r !== location.hostname ? r : null; } catch { referrer = null; }
    const total = () => seconds + (visibleSince ? Math.round((Date.now() - visibleSince) / 1000) : 0);
    const send = (leaving = false) => {
      const s = total();
      if (s === sent && !leaving) return;
      sent = s;
      const body = JSON.stringify({ id, path: pathname, seconds: s, ...(referrer ? { referrer } : {}) });
      if (leaving && navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      else fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") visibleSince = Date.now();
      else { seconds = total(); visibleSince = 0; send(true); }
    };
    send();
    const timer = window.setInterval(() => send(), 30_000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onVisibility);
      seconds = total(); visibleSince = 0; send(true);
    };
  }, [pathname]);
  return null;
}
