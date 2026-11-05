"use client";

import { useEffect, useRef } from "react";

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
  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    let cancelled = false;
    load().then(() => {
      if (cancelled || !box.current || !window.turnstile) return;
      widget.current = window.turnstile.render(box.current, { sitekey: SITE_KEY, theme: "dark", size: "flexible" });
    }).catch(() => {});
    return () => { cancelled = true; if (widget.current && window.turnstile) window.turnstile.remove(widget.current); widget.current = null; };
  }, []);
  useEffect(() => { if (widget.current && window.turnstile) window.turnstile.reset(widget.current); }, [resetKey]);
  if (!SITE_KEY) return null;
  return <div ref={box} className="human-check" />;
}
