import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProductFields } from "@/components/ProductFields";
import { SubmitButton } from "@/components/client";
import { Notice } from "@/components/ui";
import { createProduct } from "../actions";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProduct() {
  const session = await requireRole("seller");
  const supabase = await createClient();
  const { data: categories } = await supabase.from("product_categories").select("id, name").eq("is_active", true).order("sort_order");
  return (
    <>
      <div className="stack"><span className="tag">(Add product)</span><h1 className="h2">New automation</h1></div>
      {session.isPlatformSeller && <Notice>This product will be listed as a platform-owned product.</Notice>}
      <form action={createProduct} className="card stack">
        <ProductFields categories={categories ?? []} />
        <SubmitButton className="btn accent">Create draft</SubmitButton>
      </form>
    </>
  );
}
