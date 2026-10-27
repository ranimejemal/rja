"use client";

import { useActionState } from "react";
import { subscribe, type NewsletterState } from "@/app/newsletter";
import { SubmitButton } from "./client";

export function NewsletterForm() {
  const [state, action] = useActionState<NewsletterState, FormData>(subscribe, {});
  return (
    <form action={action} className="stack" style={{ maxWidth: "32rem" }}>
      <div className="search-bar">
        <label htmlFor="nl-email" className="sr-only">Email address</label>
        <input id="nl-email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
        <SubmitButton className="btn accent">Subscribe</SubmitButton>
      </div>
      <label className="check small">
        <input type="checkbox" name="consent" required />
        <span>Send me new automations and marketplace news. I can unsubscribe at any time.</span>
      </label>
      {state.message && <div className={`notice ${state.ok ? "ok" : "warn"}`} role="status">{state.message}</div>}
    </form>
  );
}
