import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { ResetPasswordForm } from "@/app/auth/PasswordForms";

export const metadata: Metadata = { title: "Choose a new password" };

// Reached from the reset email: the link signs the user in (via /auth/callback), then they pick a new password.
export default async function ResetPasswordPage() {
  const session = await getSession();
  return (
    <section className="section">
      <div className="container stack" style={{ "--gap": "2rem" } as React.CSSProperties}>
        <div className="stack">
          <span className="tag">(Account)</span>
          <h1 className="h1">Choose a new <span className="serif">password.</span></h1>
        </div>
        {session ? (
          <>
            <p className="muted">For {session.email}.</p>
            <ResetPasswordForm />
          </>
        ) : (
          <div className="card stack" style={{ maxWidth: "28rem" }}>
            <p>This link has expired or was already used.</p>
            <Link className="btn accent" href="/forgot-password">Send me a new link</Link>
          </div>
        )}
      </div>
    </section>
  );
}
