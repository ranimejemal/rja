import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/app/auth/PasswordForms";

export const metadata: Metadata = { title: "Forgot your password" };

export default function ForgotPasswordPage() {
  return (
    <section className="section">
      <div className="container stack" style={{ "--gap": "2rem" } as React.CSSProperties}>
        <div className="stack">
          <span className="tag">(Account)</span>
          <h1 className="h1">Forgot your <span className="serif">password?</span></h1>
          <p className="muted">Enter your email and we will send you a link to choose a new one.</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </section>
  );
}
