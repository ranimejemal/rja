import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Markdown } from "@/lib/markdown";
import { Notice } from "@/components/ui";
import { SubmitButton } from "@/components/client";

export const metadata: Metadata = { title: "Seller agreement" };

async function accept(form: FormData) {
  "use server";
  await requireRole("seller");
  if (form.get("accept") !== "on") redirect("/seller/agreement?error=Tick+the+box+to+accept+the+agreement.");
  const supabase = await createClient();
  const ua = (await headers()).get("user-agent") ?? undefined;
  const { error } = await supabase.rpc("accept_seller_agreement", { p_agreement_id: String(form.get("agreement_id")), p_user_agent: ua });
  redirect(`/seller/agreement?${error ? `error=${encodeURIComponent(error.message)}` : "notice=Agreement+accepted."}`);
}

export default async function AgreementPage() {
  const session = await requireRole("seller");
  const supabase = await createClient();
  const [{ data: a }, { data: acc }] = await Promise.all([
    supabase.from("agreements").select("id, title, version, body").eq("kind", "seller_agreement").eq("is_current", true).single(),
    supabase.from("seller_agreement_acceptances").select("agreement_id, accepted_at").eq("seller_id", session.sellerId!),
  ]);
  if (!a) return <Notice tone="danger">No seller agreement is published yet.</Notice>;
  const mine = acc?.find((x) => x.agreement_id === a.id);
  return (
    <>
      <div className="stack">
        <span className="tag">(Seller agreement)</span>
        <h1 className="h2">{a.title}</h1>
        <p className="mono muted">Version {a.version}</p>
      </div>
      {a.version.includes("draft") && <Notice tone="warn">This agreement is a draft pending legal review. You will be asked to accept the reviewed version when it is published.</Notice>}
      <div className="card"><Markdown source={a.body} /></div>
      {mine ? (
        <Notice tone="ok">You accepted version {a.version} on {new Date(mine.accepted_at).toLocaleString("en-GB")}.</Notice>
      ) : session.isPlatformSeller ? (
        <Notice>The platform-owned store does not need to accept the seller agreement.</Notice>
      ) : (
        <form action={accept} className="card stack">
          <input type="hidden" name="agreement_id" value={a.id} />
          <label className="check"><input type="checkbox" name="accept" required /> <span>I have read and accept the {a.title}, version {a.version}.</span></label>
          <SubmitButton className="btn accent">Accept agreement</SubmitButton>
          <p className="tiny muted">We record the version, the time and your account with your acceptance.</p>
        </form>
      )}
    </>
  );
}
