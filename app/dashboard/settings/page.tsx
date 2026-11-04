import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/client";

export const metadata: Metadata = { title: "Account settings" };

async function updateName(form: FormData) {
  "use server";
  const session = await requireUser("/dashboard/settings");
  const name = z.string().trim().min(2).max(80).safeParse(form.get("display_name"));
  if (!name.success) redirect("/dashboard/settings?error=Name+must+be+2-80+characters.");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ display_name: name.data }).eq("id", session.userId);
  redirect(`/dashboard/settings?${error ? "error=Could+not+save." : "notice=Saved."}`);
}

async function updateOffers(form: FormData) {
  "use server";
  await requireUser("/dashboard/settings");
  const supabase = await createClient();
  const optIn = form.get("marketing_opt_in") === "on";
  const { error } = await supabase.rpc("set_marketing_opt_in", { p_opt_in: optIn });
  redirect(`/dashboard/settings?${error ? "error=Could+not+save." : optIn ? "notice=You+will+receive+our+offers." : "notice=You+will+no+longer+receive+offers."}`);
}

export default async function SettingsPage() {
  const session = await requireUser("/dashboard/settings");
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("marketing_opt_in").eq("id", session.userId).maybeSingle();
  return (
    <>
      <div className="stack"><span className="tag">(Account)</span><h1 className="h2">Account settings</h1></div>
      <form action={updateName} className="card stack" style={{ maxWidth: "32rem" }}>
        <div className="field"><label htmlFor="display_name">Display name</label><input id="display_name" name="display_name" defaultValue={session.displayName} required maxLength={80} /></div>
        <div className="field"><label>Email</label><input value={session.email} disabled readOnly /></div>
        <p className="small muted">Roles: {session.roles.join(", ")}</p>
        <SubmitButton className="btn small">Save</SubmitButton>
      </form>
      <form action={updateOffers} className="card stack" style={{ maxWidth: "32rem" }}>
        <h2 className="h3">Offers by email</h2>
        <label className="check">
          <input type="checkbox" name="marketing_opt_in" defaultChecked={profile?.marketing_opt_in ?? false} />
          <span>Send me promotions and new automations by email. At most one offer a week; unsubscribe in one click.</span>
        </label>
        <SubmitButton className="btn small">Save</SubmitButton>
      </form>
      <p className="small muted">To export or delete your personal data, email ranimejmal@gmail.com. Purchase and financial records are kept as required by law.</p>
    </>
  );
}
