"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

// Shown when a page fails to load. Server errors only expose Next.js's digest (a reference to the server log),
// never internal details. Errors raised in the browser show their message, which helps when reporting a problem.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { console.error(error); }, [error]);
  const reference = error.digest ? `server ${error.digest}` : `browser: ${error.message}`.slice(0, 160);
  const retry = () => startTransition(() => { router.refresh(); reset(); });
  return (
    <section className="section">
      <div className="container stack" style={{ maxWidth: "40rem" }}>
        <span className="tag">(Something went wrong)</span>
        <h1 className="h2">We couldn’t load this page.</h1>
        <p className="muted">Please try again. If it keeps happening, contact ranimejmal@gmail.com and include the reference below.</p>
        <p className="tiny muted" style={{ fontFamily: "var(--font-mono)" }}>Reference: {reference}</p>
        <div className="row">
          <button className="btn" onClick={retry}>Try again</button>
          <button className="btn ghost" onClick={() => window.location.reload()}>Reload page</button>
          <Link className="btn ghost" href="/">Home</Link>
        </div>
      </div>
    </section>
  );
}
