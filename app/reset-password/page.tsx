import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { ResetPasswordForm, ResetWithCodeForm } from "@/app/auth/PasswordForms";

export const metadata: Metadata = { title: "Choose a new password" };

// After "Forgot your password?": enter the code from the email and a new password.
// Someone already signed in (or arriving through an older reset link) just picks the new password.
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  const session = await getSession();
  return (
    <section className="section">
      <div className="container stack" style={{ "--gap": "2rem" } as React.CSSProperties}>
        <div className="stack">
          <span className="tag">(Account)</span>
          <h1 className="h1">Choose a new <span className="serif">password.</span></h1>
        </div>
        {email !== undefined ? (
          <>
            <p className="muted">If an account exists for <strong>{email}</strong>, we sent it a code. Enter it with your new password.</p>
            <ResetWithCodeForm email={email} />
          </>
        ) : session ? (
          <>
            <p className="muted">For {session.email}.</p>
            <ResetPasswordForm />
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
