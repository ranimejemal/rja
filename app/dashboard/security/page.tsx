import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Notice } from "@/components/ui";
import { MfaSetup } from "./MfaForms";

export const metadata: Metadata = { title: "Account security", robots: { index: false } };

export default async function SecuritySettings({ searchParams }: { searchParams: Promise<{ setup?: string; next?: string }> }) {
  const { setup, next = "/dashboard" } = await searchParams;
  await requireUser("/dashboard/security");
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const on = (factors?.totp ?? []).length > 0;
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return (
    <>
      <div className="stack"><span className="tag">(Account)</span><h1 className="h2">Account security</h1></div>
      {setup === "admin" && !on && (
        <Notice tone="warn">The admin area needs two-step verification. Turn it on below (2 minutes), then you are taken back.</Notice>
      )}
      <section className="card stack" style={{ maxWidth: "36rem" }}>
        <h2 className="h3">Two-step verification</h2>
        {on ? (
          <p className="small">On. When you sign in, you also enter a code from your authenticator app. Lost your phone? Write to ranimejmal@gmail.com from your account email.</p>
        ) : (
          <>
            <p className="small">
              Adds a second lock to your account: after your password, a 6-digit code from an app on your phone. Even someone who
              steals your password cannot get in.
            </p>
            <MfaSetup next={safeNext} />
          </>
        )}
      </section>
    </>
  );
}
