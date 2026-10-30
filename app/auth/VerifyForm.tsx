"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resendEmailCode, verifyEmailCode, type AuthState } from "./actions";
import { SubmitButton } from "@/components/client";

export function VerifyForm({ email, next }: { email: string; next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(verifyEmailCode, {});
  const [resendState, resend] = useActionState<AuthState, FormData>(resendEmailCode, {});
  return (
    <div className="stack card" style={{ maxWidth: "28rem" }}>
      <form action={action} className="stack" noValidate>
        <input type="hidden" name="next" value={next} />
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" defaultValue={email} required />
        </div>
        <div className="field">
          <label htmlFor="token">Verification code</label>
          <input
            id="token" name="token" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*"
            maxLength={12} placeholder="12345678" required autoFocus
            style={{ letterSpacing: "0.3em", fontSize: "1.25rem" }}
          />
          <span className="hint">The code in the email we just sent. It expires after one hour.</span>
        </div>
        {state.error && <div className="notice danger" role="alert">{state.error}</div>}
        <SubmitButton className="btn accent" pendingText="Checking…">Confirm my email</SubmitButton>
      </form>
      <form action={resend} className="stack">
        <input type="hidden" name="email" value={email} />
        {resendState.error && <div className="notice danger" role="alert">{resendState.error}</div>}
        {resendState.notice && <div className="notice ok" role="status">{resendState.notice}</div>}
        <p className="small muted">
          No email? Check your spam folder, or <SubmitButton className="link small" pendingText="Sending…">send a new code</SubmitButton>.
        </p>
      </form>
      <p className="small muted">Wrong address? <Link className="link" href={`/signup?next=${encodeURIComponent(next)}`}>Sign up again</Link></p>
    </div>
  );
}
