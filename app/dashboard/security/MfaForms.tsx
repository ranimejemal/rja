"use client";

import { useActionState } from "react";
import { finishMfaSetup, startMfaSetup, verifyMfaCode, type MfaState } from "./actions";
import { SubmitButton } from "@/components/client";

/** Turning on two-step verification: show the QR code, then check the first code from the app. */
export function MfaSetup({ next }: { next: string }) {
  const [started, start] = useActionState<MfaState, FormData>(startMfaSetup, {});
  const [state, finish] = useActionState<MfaState, FormData>(finishMfaSetup, {});
  const error = state.factorId === started.factorId ? state.error : undefined;
  if (!started.factorId) {
    return (
      <form action={start} className="stack">
        {started.error && <div className="notice danger" role="alert">{started.error}</div>}
        <SubmitButton className="btn accent" pendingText="Preparing…">Turn on two-step verification</SubmitButton>
      </form>
    );
  }
  return (
    <form action={finish} className="stack">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="factor_id" value={started.factorId} />
      <ol className="small stack" style={{ "--gap": "0.4rem", paddingLeft: "1.2rem", margin: 0 } as React.CSSProperties}>
        <li>Install an authenticator app on your phone: Google Authenticator, Microsoft Authenticator or 1Password.</li>
        <li>In the app, tap <strong>+</strong> and scan this QR code.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={started.qr} alt="QR code to add your account to the authenticator app" width={200} height={200}
        style={{ background: "#fff", padding: "0.75rem", borderRadius: "var(--radius-s)", width: 200, height: 200 }} />
      <p className="tiny muted">Cannot scan? Type this key in the app instead: <code>{started.secret}</code></p>
      <div className="field">
        <label htmlFor="code">3. Enter the 6-digit code the app shows</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123456" required
          style={{ letterSpacing: "0.3em", fontSize: "1.25rem", maxWidth: "12rem" }} />
      </div>
      {error && <div className="notice danger" role="alert">{error}</div>}
      <SubmitButton className="btn accent" pendingText="Checking…">Confirm and turn on</SubmitButton>
    </form>
  );
}

export function MfaCodeForm({ next }: { next: string }) {
  const [state, action] = useActionState<MfaState, FormData>(verifyMfaCode, {});
  return (
    <form action={action} className="stack card" style={{ maxWidth: "26rem" }}>
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="code">Code from your authenticator app</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123456" required autoFocus
          style={{ letterSpacing: "0.3em", fontSize: "1.25rem" }} />
      </div>
      {state.error && <div className="notice danger" role="alert">{state.error}</div>}
      <SubmitButton className="btn accent" pendingText="Checking…">Continue</SubmitButton>
    </form>
  );
}
