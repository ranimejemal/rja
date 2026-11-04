import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/client";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

async function unsubscribe(form: FormData) {
  "use server";
  const token = z.uuid().safeParse(form.get("t"));
  if (!token.success) redirect("/unsubscribe?done=0");
  const supabase = await createClient();
  const { data } = await supabase.rpc("unsubscribe_marketing", { p_token: token.data });
  redirect(`/unsubscribe?done=${data ? 1 : 0}`);
}

// Reached from the link in an offer email. Unsubscribing takes a click on the button (not just opening the link),
// so email security scanners that open links cannot unsubscribe people by accident.
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string }> }) {
  const { t, done } = await searchParams;
  return (
    <section className="section">
      <div className="container stack" style={{ maxWidth: "36rem" }}>
        <span className="tag">(Emails)</span>
        {done === "1" ? (
          <>
            <h1 className="h2">You are unsubscribed.</h1>
            <p className="muted">You will not receive offers from us any more. Emails about your account and purchases still arrive.</p>
            <Link className="btn" href="/">Back to the site</Link>
          </>
        ) : done === "0" ? (
          <>
            <h1 className="h2">This link is not valid.</h1>
            <p className="muted">Sign in and change your choice in <Link className="link" href="/dashboard/settings">Account settings</Link>, or write to ranimejmal@gmail.com.</p>
          </>
        ) : (
          <form action={unsubscribe} className="stack">
            <h1 className="h2">Stop receiving offers?</h1>
            <p className="muted">You will no longer receive promotions from Ranime Jemal Agency. Emails about your account and purchases still arrive.</p>
            <input type="hidden" name="t" value={t ?? ""} />
            <SubmitButton className="btn accent">Unsubscribe</SubmitButton>
          </form>
        )}
      </div>
    </section>
  );
}
