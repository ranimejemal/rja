"use client";

import { HumanCheck } from "@/components/HumanCheck";
import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "./actions";
import { SubmitButton } from "@/components/client";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, {});
  const signup = mode === "signup";
  return (
    <form action={action} className="auth-form" noValidate>
      <input type="hidden" name="next" value={next} />
      {signup && (
        <div className="auth-grid">
          <InputGroup id="firstName" label="First name" placeholder="Lina" autoComplete="given-name" maxLength={40} />
          <InputGroup id="lastName" label="Last name" placeholder="Ben Ali" autoComplete="family-name" maxLength={40} required={false} />
        </div>
      )}
      <InputGroup id="email" label="Email" type="email" placeholder="you@company.com" autoComplete="email" />
      <div className="auth-field">
        <div className="auth-label-row">
          <label htmlFor="password">Password</label>
          {!signup && <Link className="link small" href="/forgot-password">Forgot your password?</Link>}
        </div>
        <PasswordField signup={signup} />
        {signup && <span className="auth-hint">Requires at least 10 characters.</span>}
      </div>
      {signup && (
        <>
          <label className="check auth-check">
            <input type="checkbox" name="terms" required />
            <span>I accept the <Link className="link" href="/legal/terms">Terms of Service</Link> and <Link className="link" href="/legal/privacy">Privacy Policy</Link>.</span>
          </label>
          <label className="check auth-check">
            <input type="checkbox" name="marketing" />
            <span>Send me promotions and new automations by email (optional, unsubscribe anytime).</span>
          </label>
        </>
      )}
      {state.error && <div className="notice danger" role="alert">{state.error}</div>}
      {state.notice && <div className="notice ok" role="status">{state.notice}</div>}
      <HumanCheck resetKey={state} />
      <SubmitButton className="auth-submit">{signup ? "Create account" : "Log in"}</SubmitButton>
      <p className="auth-switch">
        {signup
          ? <>Already a member? <Link href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link></>
          : <>New here? <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link></>}
      </p>
    </form>
  );
}

function InputGroup({ id, label, placeholder, type = "text", autoComplete, maxLength, required = true }: {
  id: string; label: string; placeholder: string; type?: string; autoComplete: string; maxLength?: number; required?: boolean;
}) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} type={type} placeholder={placeholder} autoComplete={autoComplete} maxLength={maxLength} required={required} />
    </div>
  );
}

function PasswordField({ signup }: { signup: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-password">
      <input id="password" name="password" type={visible ? "text" : "password"} placeholder="••••••••••" required minLength={10} maxLength={128}
        autoComplete={signup ? "new-password" : "current-password"} />
      <button type="button" onClick={() => setVisible((v) => !v)} aria-controls="password" aria-pressed={visible} aria-label={visible ? "Hide password" : "Show password"}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="m2 2 20 20" />}
        </svg>
      </button>
    </div>
  );
}
