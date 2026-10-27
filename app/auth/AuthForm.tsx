"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "./actions";
import { SubmitButton } from "@/components/client";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, {});
  return (
    <form action={action} className="stack card" style={{ maxWidth: "28rem" }} noValidate>
      <input type="hidden" name="next" value={next} />
      {mode === "signup" && (
        <div className="field">
          <label htmlFor="displayName">Name</label>
          <input id="displayName" name="displayName" autoComplete="name" required maxLength={80} />
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={10} />
        {mode === "signup" && <span className="hint">At least 10 characters.</span>}
      </div>
      {mode === "signup" && (
        <label className="check">
          <input type="checkbox" name="terms" required />
          <span>I accept the <Link className="link" href="/legal/terms">Terms of Service</Link> and <Link className="link" href="/legal/privacy">Privacy Policy</Link>.</span>
        </label>
      )}
      {state.error && <div className="notice danger" role="alert">{state.error}</div>}
      {state.notice && <div className="notice ok" role="status">{state.notice}</div>}
      <SubmitButton className="btn accent">{mode === "login" ? "Log in" : "Create account"}</SubmitButton>
      <p className="small muted">
        {mode === "login"
          ? <>New here? <Link className="link" href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link></>
          : <>Already have an account? <Link className="link" href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link></>}
      </p>
    </form>
  );
}
