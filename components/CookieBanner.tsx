"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Cookie choice. Accepting stores a random visitor id (rja_vid) for a year, so visits from the same browser can
// be grouped in the admin visit log. Refusing keeps visits anonymous (page, time, country and device only).
// The choice itself is kept in rja_consent. "Cookie settings" in the footer opens the banner again.

const YEAR = 60 * 60 * 24 * 365;
const read = (name: string) => document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.split("=")[1];
const write = (name: string, value: string, maxAge: number) => {
  document.cookie = `${name}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
};

export function CookieBanner() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(!read("rja_consent"));
    const reopen = () => setOpen(true);
    window.addEventListener("rja:cookie-settings", reopen);
    return () => window.removeEventListener("rja:cookie-settings", reopen);
  }, []);
  if (!open) return null;
  const choose = (accept: boolean) => {
    write("rja_consent", accept ? "yes" : "no", YEAR);
    if (accept) { if (!read("rja_vid")) write("rja_vid", crypto.randomUUID(), YEAR); }
    else write("rja_vid", "", 0);
    setOpen(false);
  };
  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookies">
      <p className="small">
        We use one cookie to understand how visitors use the site (pages and time spent), only if you agree. No advertising,
        no third parties. <Link className="link" href="/legal/privacy">Privacy policy</Link>
      </p>
      <div className="row">
        <button type="button" className="btn ghost small" onClick={() => choose(false)}>Refuse</button>
        <button type="button" className="btn accent small" onClick={() => choose(true)}>Accept</button>
      </div>
    </div>
  );
}

export function CookieSettingsLink() {
  return <button type="button" className="link-plain" onClick={() => window.dispatchEvent(new Event("rja:cookie-settings"))}>Cookie settings</button>;
}
