import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { ResetCodeForm, ResetPasswordForm } from "@/app/auth/PasswordForms";

export const metadata: Metadata = { title: "Reset your password" };

// "Forgot your password?" in three steps: 1. email (/forgot-password) sends a code, 2. the code is confirmed here
// (?email=…), which signs the person in, 3. they choose the new password (?step=new). A signed-in person, or one
// arriving through an older reset link, goes straight to step 3.
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string; step?: string }> }) {
  const { email, step } = await searchParams;
  const session = await getSession();
  const choosing = Boolean(session) && (step === "new" || email === undefined);
  return (
    <section className="section">
      <div className="container stack" style={{ "--gap": "2rem" } as React.CSSProperties}>
        <div className="stack">
          <span className="tag">(Account · step {choosing ? 3 : 2} of 3)</span>
          {choosing
            ? <h1 className="h1">Choose a new <span className="serif">password.</span></h1>
            : <h1 className="h1">Check your <span className="serif">inbox.</span></h1>}
        </div>
        {choosing && session ? (
          <>
            <p className="muted">Code confirmed for <strong>{session.email}</strong>. Choose your new password.</p>
            <ResetPasswordForm />
          </>
        ) : email !== undefined ? (
          <>
            <p className="muted">If an account exists for <strong>{email}</strong>, we sent it a code. Enter it to continue.</p>
            <ResetCodeForm email={email} />
          </>
        ) : (
          <div className="card stack" style={{ maxWidth: "28rem" }}>
            <p>This link has expired or was already used.</p>
            <Link className="btn accent" href="/forgot-password">Send me a code</Link>
          </div>
        )}
      </div>
    </section>
  );
}
