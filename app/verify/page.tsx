import type { Metadata } from "next";
import { VerifyForm } from "@/app/auth/VerifyForm";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ email?: string; next?: string }> }) {
  const { email = "", next = "/dashboard" } = await searchParams;
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return (
    <section className="section">
      <div className="container stack" style={{ "--gap": "2rem" } as React.CSSProperties}>
        <div className="stack">
          <span className="tag">(Account)</span>
          <h1 className="h1">Check your <span className="serif">inbox.</span></h1>
          <p className="lead">
            {email ? <>We sent a code to <strong>{email}</strong>.</> : "We sent a code to your email address."} Enter it below to confirm your account.
          </p>
        </div>
        <VerifyForm email={email} next={safeNext} />
      </div>
    </section>
  );
}
