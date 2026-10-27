import type { Metadata } from "next";
import { AuthForm } from "@/app/auth/AuthForm";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/dashboard" } = await searchParams;
  return (
    <section className="section">
      <div className="container stack" style={{ "--gap": "2rem" } as React.CSSProperties}>
        <div className="stack">
          <span className="tag">(Account)</span>
          <h1 className="h1">One account to <span className="serif">buy and sell.</span></h1>
          <p className="lead">Buy automations right away. Apply to sell from the same account whenever you are ready.</p>
        </div>
        <AuthForm mode="signup" next={next} />
      </div>
    </section>
  );
}
