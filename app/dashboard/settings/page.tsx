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

export default async function SettingsPage() {
  const session = await requireUser("/dashboard/settings");
  return (
    <>
      <div className="stack"><span className="tag">(Account)</span><h1 className="h2">Account settings</h1></div>
      <form action={updateName} className="card stack" style={{ maxWidth: "32rem" }}>
        <div className="field"><label htmlFor="display_name">Display name</label><input id="display_name" name="display_name" defaultValue={session.displayName} required maxLength={80} /></div>
        <div className="field"><label>Email</label><input value={session.email} disabled readOnly /></div>
        <p className="small muted">Roles: {session.roles.join(", ")}</p>
        <SubmitButton className="btn small">Save</SubmitButton>
      </form>
      <p className="small muted">To export or delete your personal data, email ranimejmal@gmail.com. Purchase and financial records are kept as required by law.</p>
    </>
  );
}
