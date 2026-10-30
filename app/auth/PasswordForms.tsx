"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, resendResetCode, resetPasswordWithCode, updatePassword, type AuthState } from "./actions";
import { PasswordInput, SubmitButton } from "@/components/client";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  return (
    <form action={action} className="stack card" style={{ maxWidth: "28rem" }} noValidate>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state.error && <div className="notice danger" role="alert">{state.error}</div>}
      <SubmitButton className="btn accent" pendingText="Sending…">Send me a code</SubmitButton>
      <p className="small muted">Remembered it? <Link className="link" href="/login">Log in</Link></p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState<AuthState, FormData>(updatePassword, {});
  return (
    <form action={action} className="stack card" style={{ maxWidth: "28rem" }} noValidate>
      <div className="field">
        <label htmlFor="password">New password</label>
        <PasswordInput id="password" name="password" autoComplete="new-password" />
        <span className="hint">At least 10 characters.</span>
      </div>
      <div className="field">
        <label htmlFor="confirm">Repeat the new password</label>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" />
      </div>
      {state.error && <div className="notice danger" role="alert">{state.error}</div>}
      <SubmitButton className="btn accent" pendingText="Saving…">Save the new password</SubmitButton>
    </form>
  );
}

/** Reset with the 6-digit code from the email: code and new password in one step. */
export function ResetWithCodeForm({ email }: { email: string }) {
  const [state, action] = useActionState<AuthState, FormData>(resetPasswordWithCode, {});
  const [resendState, resend] = useActionState<AuthState, FormData>(resendResetCode, {});
  return (
    <div className="stack card" style={{ maxWidth: "28rem" }}>
      <form action={action} className="stack" noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" defaultValue={email} required />
        </div>
        <div className="field">
          <label htmlFor="token">Code from the email</label>
          <input
            id="token" name="token" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*"
            maxLength={12} placeholder="123456" required autoFocus
            style={{ letterSpacing: "0.3em", fontSize: "1.25rem" }}
          />
          <span className="hint">It expires after one hour.</span>
        </div>
        <div className="field">
          <label htmlFor="password">New password</label>
          <PasswordInput id="password" name="password" autoComplete="new-password" />
          <span className="hint">At least 10 characters.</span>
        </div>
        <div className="field">
          <label htmlFor="confirm">Repeat the new password</label>
          <PasswordInput id="confirm" name="confirm" autoComplete="new-password" />
        </div>
        {state.error && <div className="notice danger" role="alert">{state.error}</div>}
        <SubmitButton className="btn accent" pendingText="Saving…">Save the new password</SubmitButton>
      </form>
      <form action={resend} className="stack">
        <input type="hidden" name="email" value={email} />
        {resendState.error && <div className="notice danger" role="alert">{resendState.error}</div>}
        {resendState.notice && <div className="notice ok" role="status">{resendState.notice}</div>}
        <p className="small muted">
          No email? Check your spam folder, or <SubmitButton className="link small" pendingText="Sending…">send a new code</SubmitButton>.
        </p>
      </form>
    </div>
  );
}
