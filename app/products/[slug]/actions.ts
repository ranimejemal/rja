"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments";
import { rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";

const LICENSES = ["personal", "single_business", "commercial", "extended_commercial"] as const;

function back(slug: string, error: string): never {
  redirect(`/products/${slug}?error=${encodeURIComponent(error)}`);
}

/**
 * Starts a purchase. The browser only sends the product and the chosen license; the price, currency,
 * commission and seller share are computed by the database (create_order).
 */
export async function startCheckout(form: FormData) {
  const slug = String(form.get("slug") ?? "");
  const session = await requireUser(`/products/${slug}`);
  if (!rateLimit(`checkout:${session.userId}`, 10, 10 * 60_000).ok) back(slug, "Too many checkout attempts. Please wait a few minutes.");

  const license = z.enum(LICENSES).safeParse(form.get("license"));
  if (!license.success) back(slug, "Choose a license.");
  if (form.get("accept") !== "on") back(slug, "Please accept the buyer license agreement.");
  const agreementId = String(form.get("agreement_id") ?? "");

  const supabase = await createClient();
  const { data: product } = await supabase.from("products").select("id, name, price_minor, is_demo").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!product) back(slug, "This product is not available.");
  if (product.is_demo) back(slug, "This is a demo listing and cannot be purchased.");

  const provider = product.price_minor === 0 ? null : getPaymentProvider();
  if (product.price_minor > 0 && !provider) back(slug, "Checkout is not open yet: payments are being set up.");

  const { data: orderId, error } = await supabase.rpc("create_order", {
    p_items: [{ product_id: product.id, license_type: license.data }],
    p_license_agreement_id: agreementId,
    p_provider: provider ? provider.id : "free",
  });
  if (error || !orderId) back(slug, error?.message ?? "Could not create the order.");

  if (product.price_minor === 0) {
    const { error: claimError } = await supabase.rpc("claim_free_order", { p_order_id: orderId });
    if (claimError) back(slug, claimError.message);
    redirect(`/dashboard?notice=${encodeURIComponent(`${product.name} is in your automations.`)}`);
  }

  // Server-side read of the order total created by the database.
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("total_minor, currency").eq("id", orderId).single();
  if (!order) back(slug, "Could not create the order.");
  const checkout = await provider!.createCheckout({
    orderId,
    currency: order.currency,
    lines: [{ name: product.name, amountMinor: order.total_minor, quantity: 1 }],
    customerEmail: session.email,
    successUrl: `${env.NEXT_PUBLIC_SITE_URL}/dashboard/orders/${orderId}?notice=${encodeURIComponent("Payment received. Access appears as soon as the payment provider confirms it.")}`,
    cancelUrl: `${env.NEXT_PUBLIC_SITE_URL}/products/${slug}?error=${encodeURIComponent("Checkout was canceled.")}`,
  });
  await admin.from("orders").update({ provider_session_id: checkout.sessionId }).eq("id", orderId);
  redirect(checkout.url);
}

const reportSchema = z.object({
  reason: z.enum(["intellectual_property", "malicious", "quality", "misleading", "other"]),
  details: z.string().trim().min(10, "Please describe the problem (at least 10 characters).").max(5000),
});

export async function reportProduct(form: FormData) {
  const slug = String(form.get("slug") ?? "");
  const session = await requireUser(`/products/${slug}`);
  if (!rateLimit(`report:${session.userId}`, 5, 60 * 60_000).ok) redirect(`/products/${slug}?error=Too+many+reports.`);
  const parsed = reportSchema.safeParse({ reason: form.get("reason"), details: form.get("details") });
  if (!parsed.success) redirect(`/products/${slug}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  const supabase = await createClient();
  const { data: product } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
  if (!product) redirect("/explore");
  const { error } = await supabase.from("product_reports").insert({ product_id: product.id, reporter_id: session.userId, ...parsed.data });
  redirect(`/products/${slug}?${error ? "error=Could+not+send+the+report." : "notice=Thanks.+Our+team+will+review+your+report."}`);
}
