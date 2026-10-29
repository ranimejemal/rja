"use client";

import { useActionState } from "react";
import { submitQuote, type QuoteState } from "@/app/quote/actions";
import { SubmitButton } from "./client";

type Option = { slug: string; name: string };

/** Quote request form. With `product` it asks about that automation; with `options` the visitor picks one. */
export function QuoteForm({ product, options, defaults }: { product?: Option; options?: Option[]; defaults?: { name?: string; email?: string } }) {
  const [state, action] = useActionState<QuoteState, FormData>(submitQuote, {});
  if (state.sent) {
    return (
      <div className="stack" role="status" style={{ "--gap": "0.6rem" } as React.CSSProperties}>
        <strong>Thank you, your request is on its way.</strong>
        <p className="small muted">We reply within one business day with questions or a fixed quote. For anything urgent, message us on WhatsApp.</p>
      </div>
    );
  }
  return (
    <form action={action} className="stack" style={{ "--gap": "0.9rem" } as React.CSSProperties}>
      {product && <input type="hidden" name="product" value={product.slug} />}
      {options && (
        <div className="field">
          <label htmlFor="q-product">Automation</label>
          <select id="q-product" name="product" defaultValue="">
            <option value="">Not sure yet / something else</option>
            {options.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
          </select>
        </div>
      )}
      <div className="field"><label htmlFor="q-name">Name</label><input id="q-name" name="name" required minLength={2} maxLength={120} autoComplete="name" defaultValue={defaults?.name} /></div>
      <div className="field"><label htmlFor="q-email">Email</label><input id="q-email" name="email" type="email" required autoComplete="email" defaultValue={defaults?.email} /></div>
      <div className="field"><label htmlFor="q-phone">Phone or WhatsApp (optional)</label><input id="q-phone" name="phone" maxLength={40} autoComplete="tel" /></div>
      <div className="field"><label htmlFor="q-company">Business (optional)</label><input id="q-company" name="company" maxLength={160} autoComplete="organization" /></div>
      <div className="field">
        <label htmlFor="q-message">What do you want to automate?</label>
        <textarea id="q-message" name="message" required minLength={10} maxLength={4000} rows={4}
          placeholder="Your business, the tools you use, and what you would like the automation to do." />
      </div>
      {/* Honeypot for bots, hidden from people and screen readers. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }} />
      {state.error && <div className="notice danger" role="alert">{state.error}</div>}
      <SubmitButton className="btn accent" pendingText="Sending…">Request a quote</SubmitButton>
    </form>
  );
}
