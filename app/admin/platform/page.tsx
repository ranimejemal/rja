import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/client";
import { Notice } from "@/components/ui";
import { claimPlatformStore } from "../actions";

export const metadata: Metadata = { title: "Platform store" };

export default async function PlatformStore() {
  const session = await getSession();
  const supabase = await createClient();
  const { data: platform } = await supabase.from("seller_profiles").select("id, slug, display_name, user_id, is_demo").eq("is_platform", true).maybeSingle();
  const mine = platform?.user_id === session?.userId;
  return (
    <>
      <div className="stack"><span className="tag">(Platform store)</span><h1 className="h2">First-party products</h1>
        <p className="small muted">Products sold by Ranime Jemal Agency itself: labelled as platform products, no seller commission, same pages, versioning and delivery as third-party products.</p></div>
      {mine ? (
        <Notice tone="ok">You manage the platform store. Create and edit its products in the <Link className="link" href="/seller/products">Seller dashboard</Link>; they still go through review here.</Notice>
      ) : platform?.user_id ? (
        <Notice>The platform store is managed by another admin account.</Notice>
      ) : (
        <form action={claimPlatformStore} className="card stack">
          <p className="small">Link the platform store{platform ? ` (“${platform.display_name}”, currently holding demo products)` : ""} to your admin account.</p>
          <SubmitButton className="btn accent small">Manage the platform store</SubmitButton>
        </form>
      )}
    </>
  );
}
