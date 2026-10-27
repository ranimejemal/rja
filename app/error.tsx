"use client";

import Link from "next/link";

// Shown when a page fails to load. The message stays generic so no internal details leak.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="section">
      <div className="container stack" style={{ maxWidth: "40rem" }}>
        <span className="tag">(Something went wrong)</span>
        <h1 className="h2">We couldn’t load this page.</h1>
        <p className="muted">Please try again. If it keeps happening, contact ranimejmal@gmail.com.</p>
        <div className="row">
          <button className="btn" onClick={reset}>Try again</button>
          <Link className="btn ghost" href="/">Home</Link>
        </div>
      </div>
    </section>
  );
}
