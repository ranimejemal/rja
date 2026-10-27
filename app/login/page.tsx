import type { Metadata } from "next";
import { AuthForm } from "@/app/auth/AuthForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/dashboard" } = await searchParams;
  return (
    <section className="section">
      <div className="container stack" style={{ "--gap": "2rem" } as React.CSSProperties}>
        <div className="stack">
          <span className="tag">(Account)</span>
          <h1 className="h1">Welcome <span className="serif">back.</span></h1>
        </div>
        <AuthForm mode="login" next={next} />
      </div>
    </section>
  );
}
