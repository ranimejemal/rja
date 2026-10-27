"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { coerceFormValues, parseManifest, validateConfig } from "@/lib/manifest";
import { rateLimit } from "@/lib/rate-limit";
import { features } from "@/lib/env";

function back(id: string, kind: "notice" | "error", msg: string, hash = ""): never {
  redirect(`/dashboard/products/${id}?${kind}=${encodeURIComponent(msg)}${hash}`);
}

export type ConfigState = { errors?: Record<string, string>; message?: string; ok?: boolean };

/** Saves a new configuration revision. Values are validated again here against the product's manifest. */
export async function saveConfiguration(_: ConfigState, form: FormData): Promise<ConfigState> {
  const productId = String(form.get("product_id") ?? "");
  const session = await requireUser(`/dashboard/products/${productId}`);
  if (!rateLimit(`config:${session.userId}`, 30, 60 * 60_000).ok) return { message: "Too many saves. Try again later." };
  if (!features.serverAdmin) return { message: "Saving configurations is not available yet." };
  const supabase = await createClient();
  const { data: owns } = await supabase.rpc("owns_product", { p_product_id: productId });
  if (!owns) return { message: "You do not own this product." };
  const { data: product } = await supabase.from("products").select("current_version_id").eq("id", productId).single();
  if (!product?.current_version_id) return { message: "This product has no published version." };
  const { data: row } = await supabase.from("product_manifests").select("manifest").eq("version_id", product.current_version_id).maybeSingle();
  const parsed = row ? parseManifest(row.manifest) : null;
  if (!parsed?.ok) return { message: "This product has no configuration form." };

  const result = validateConfig(parsed.manifest, coerceFormValues(parsed.manifest, form));
  if (!result.ok) return { errors: result.errors, message: "Please fix the highlighted fields." };

  const admin = createAdminClient();
  const { data: last } = await admin.from("product_configurations").select("revision")
    .eq("user_id", session.userId).eq("product_id", productId).order("revision", { ascending: false }).limit(1);
  const { error } = await admin.from("product_configurations").insert({
    user_id: session.userId, product_id: productId, version_id: product.current_version_id,
    revision: (last?.[0]?.revision ?? 0) + 1, values: result.values,
  });
  if (error) return { message: "Could not save the configuration." };
  revalidatePath(`/dashboard/products/${productId}`);
  return { ok: true, message: "Configuration saved as a new version." };
}

export async function submitReview(form: FormData) {
  const productId = String(form.get("product_id") ?? "");
  const session = await requireUser();
  const parsed = z.object({ rating: z.coerce.number().int().min(1).max(5), body: z.string().trim().max(2000) })
    .safeParse({ rating: form.get("rating"), body: form.get("body") ?? "" });
  if (!parsed.success) back(productId, "error", "Choose a rating from 1 to 5.", "#review");
  const supabase = await createClient();
  const { error } = await supabase.from("product_reviews").upsert(
    { product_id: productId, user_id: session.userId, ...parsed.data },
    { onConflict: "product_id,user_id" },
  );
  back(productId, error ? "error" : "notice", error ? "Only owners of this product can review it." : "Thanks for your review.", "#review");
}

export async function openTicket(form: FormData) {
  const productId = String(form.get("product_id") ?? "");
  const session = await requireUser();
  if (!rateLimit(`ticket:${session.userId}`, 10, 24 * 60 * 60_000).ok) back(productId, "error", "Too many support requests today.");
  const parsed = z.object({ subject: z.string().trim().min(3).max(160), body: z.string().trim().min(10).max(5000) })
    .safeParse({ subject: form.get("subject"), body: form.get("body") });
  if (!parsed.success) back(productId, "error", "Add a subject and describe the problem (10+ characters).", "#support");
  const supabase = await createClient();
  const { data: product } = await supabase.from("products").select("seller_id").eq("id", productId).single();
  if (!product) back(productId, "error", "Product not found.");
  const { data: ticket, error } = await supabase.from("support_tickets")
    .insert({ product_id: productId, buyer_id: session.userId, seller_id: product.seller_id, subject: parsed.data.subject })
    .select("id").single();
  if (error || !ticket) back(productId, "error", "Could not open the request.", "#support");
  await supabase.from("support_messages").insert({ ticket_id: ticket.id, author_id: session.userId, body: parsed.data.body });
  redirect(`/dashboard/support/${ticket.id}?notice=${encodeURIComponent("Request sent to the seller.")}`);
}

export async function requestRefund(form: FormData) {
  const productId = String(form.get("product_id") ?? "");
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_refund", {
    p_order_item_id: String(form.get("order_item_id") ?? ""),
    p_reason: String(form.get("reason") ?? ""),
  });
  back(productId, error ? "error" : "notice", error ? error.message : "Refund requested. We will email you once it is reviewed.", "#refund");
}
