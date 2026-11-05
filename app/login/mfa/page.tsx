import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { MfaCodeForm } from "@/app/dashboard/security/MfaForms";

export const metadata: Metadata = { title: "Two-step verification", robots: { index: false } };

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/admin" } = await searchParams;
  await requireUser("/login/mfa");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  return (
    <section className="section">
      <div className="container stack" style={{ "--gap": "2rem" } as React.CSSProperties}>
        <div className="stack">
          <span className="tag">(Account)</span>
          <h1 className="h1">One more <span className="serif">step.</span></h1>
          <p className="muted">Open your authenticator app and enter the 6-digit code for Ranime Jemal Agency.</p>
        </div>
        <MfaCodeForm next={safeNext} />
      </div>
    </section>
  );
}
