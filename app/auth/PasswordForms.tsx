"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, updatePassword, type AuthState } from "./actions";
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
      {state.notice && <div className="notice ok" role="status">{state.notice}</div>}
      <SubmitButton className="btn accent" pendingText="Sending…">Send me a link</SubmitButton>
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
