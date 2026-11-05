"use client";

import { useEffect, useRef, useState } from "react";

// Cloudflare Turnstile widget ("verify you are human"). It adds a hidden `cf-turnstile-response` field to the
// form, checked on the server by verifyHuman(). Renders nothing until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
// `resetKey` changes after each submission, so a fresh check is ready for the next try.

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void; remove: (id: string) => void };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<void> | null = null;
function load() {
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT; s.async = true; s.onload = () => resolve(); s.onerror = () => { loading = null; reject(); };
    document.head.appendChild(s);
  });
  return loading;
}

export function HumanCheck({ resetKey }: { resetKey?: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    let cancelled = false;
    load().then(() => {
      if (cancelled || !box.current || !window.turnstile) return;
      widget.current = window.turnstile.render(box.current, {
        sitekey: SITE_KEY, theme: "dark", size: "flexible", language: "auto",
        // Always visible, so people see the check and its result.
        appearance: "always", retry: "auto", "refresh-expired": "auto",
        callback: () => setError(null),
        // Returning true tells Turnstile we show the problem ourselves.
        "error-callback": (code: string) => { setError(String(code || "unknown")); return true; },
      });
    }).catch(() => setError("load"));
    return () => { cancelled = true; if (widget.current && window.turnstile) window.turnstile.remove(widget.current); widget.current = null; };
  }, []);
  useEffect(() => { if (widget.current && window.turnstile) window.turnstile.reset(widget.current); }, [resetKey]);
  if (!SITE_KEY) return null;
  const retry = () => { setError(null); if (widget.current && window.turnstile) window.turnstile.reset(widget.current); };
  return (
    <div className="stack" style={{ "--gap": "0.4rem" } as React.CSSProperties}>
      <div ref={box} className="human-check" />
      {error && (
        <div className="notice danger small" role="alert">
          {humanCheckHelp(error)} <button type="button" className="link" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit" }} onClick={retry}>Try again</button>
          <span className="tiny muted"> (code {error})</span>
        </div>
      )}
    </div>
  );
}

/** What a Turnstile error code means for the visitor (https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/). */
function humanCheckHelp(code: string) {
  if (code === "load" || code.startsWith("200")) return "The check could not load. An ad blocker or privacy extension may block challenges.cloudflare.com: allow it for this site.";
  if (code.startsWith("1102")) return "This web address is not allowed for the check yet. Use rja-wd2u.vercel.app.";
  if (code.startsWith("1101") || code.startsWith("4")) return "The check is misconfigured on our side. Please tell us.";
  if (code.startsWith("3")) return "Your browser stopped the check from running. Turn off a VPN or privacy/ad-block extensions, check your computer's date and time, or try a private window, then try again.";
  if (code.startsWith("6")) return "Cloudflare could not confirm you are human. Turn off a VPN or browser extensions (or try a private window), then try again.";
  return "The check failed.";
}
