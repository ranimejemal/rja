"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments";
import { features } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

function go(path: string, error: string | null | undefined, ok: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}${error ? `error=${encodeURIComponent(error)}` : `notice=${encodeURIComponent(ok)}`}`);
}
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// Every function below is also permission-checked inside the database (is_admin()).

export async function reviewApplication(form: FormData) {
  await requireRole("admin");
  const decision = z.enum(["approved", "rejected", "info_requested"]).parse(form.get("decision"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_seller_application", { p_application_id: text(form, "id"), p_decision: decision, p_note: text(form, "note") || undefined });
  go("/admin/applications", error?.message, `Application ${decision.replace("_", " ")}.`);
}

export async function setSellerStatus(form: FormData) {
  await requireRole("admin");
  const status = z.enum(["approved", "suspended"]).parse(form.get("status"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_seller_status", { p_seller_id: text(form, "id"), p_status: status, p_note: text(form, "note") });
  go("/admin/sellers", error?.message, `Seller ${status}.`);
}

export async function setCommissionOverride(form: FormData) {
  await requireRole("admin");
  const raw = text(form, "percent");
  const bps = raw === "" ? null : Math.round(Number(raw.replace(",", ".")) * 100);
  if (bps !== null && (!Number.isFinite(bps) || bps < 0 || bps > 10000)) go("/admin/sellers", "Enter a percentage between 0 and 100.", "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_seller_commission_override", { p_seller_id: text(form, "id"), p_bps: bps as number, p_note: text(form, "note") });
  go("/admin/sellers", error?.message, bps === null ? "Override removed: default rate applies to future sales." : "Commission override saved for future sales.");
}

export async function setDefaultCommission(form: FormData) {
  await requireRole("admin");
  const bps = Math.round(Number(text(form, "percent").replace(",", ".")) * 100);
  if (!Number.isFinite(bps) || bps < 0 || bps > 10000) go("/admin/finance", "Enter a percentage between 0 and 100.", "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_default_commission", { p_bps: bps });
  go("/admin/finance", error?.message, "Default commission updated for future sales.");
}

export async function moderateProduct(form: FormData) {
  await requireRole("admin");
  const id = text(form, "id");
  const to = z.enum(["under_review", "approved", "changes_requested", "rejected", "suspended", "archived"]).parse(form.get("to")) as Enums["product_status"];
  const supabase = await createClient();
  const { error } = await supabase.rpc("change_product_status", { p_product_id: id, p_to: to, p_note: text(form, "note") || undefined });
  go(`/admin/products/${id}`, error?.message, `Product moved to ${to.replace("_", " ")}.`);
}

export async function reviewVersion(form: FormData) {
  await requireRole("admin");
  const productId = text(form, "product_id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_product_version", { p_version_id: text(form, "version_id"), p_approve: form.get("approve") === "1", p_note: text(form, "note") || undefined });
  go(`/admin/products/${productId}`, error?.message, "Version decision recorded.");
}

export async function toggleFeatured(form: FormData) {
  await requireRole("admin");
  const id = text(form, "id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_product_featured", { p_product_id: id, p_featured: form.get("featured") === "1" });
  go(`/admin/products/${id}`, error?.message, "Featured setting saved.");
}

export async function decideRefund(form: FormData) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_refund", { p_refund_id: text(form, "id"), p_approve: form.get("approve") === "1", p_note: text(form, "note") || undefined });
  go("/admin/finance", error?.message, "Refund decision recorded.");
}

/**
 * Sends an approved refund to the payment provider. The ledger is updated when the provider confirms it
 * (immediately if it succeeds now, otherwise by the refund webhook). Free orders are applied directly.
 */
export async function processRefund(form: FormData) {
  const session = await requireRole("admin");
  if (!features.serverAdmin) go("/admin/finance", "The server key is not configured.", "");
  const admin = createAdminClient();
  const { data: r } = await admin.from("refunds").select("id, amount_minor, status, order:orders(provider, provider_payment_id)").eq("id", text(form, "id")).single();
  if (!r || r.status !== "approved") go("/admin/finance", "Only approved refunds can be processed.", "");
  let providerRefundId = `manual:${session.userId}`;
  if (r.order?.provider === "stripe") {
    const provider = getPaymentProvider();
    if (!provider || !r.order.provider_payment_id) go("/admin/finance", "Stripe is not configured, so this refund cannot be sent.", "");
    const result = await provider.refund({ paymentId: r.order.provider_payment_id, amountMinor: r.amount_minor, refundId: r.id });
    if (result.status === "failed") go("/admin/finance", "Stripe rejected the refund.", "");
    if (result.status === "pending") go("/admin/finance", null, "Refund sent to Stripe. The ledger updates when Stripe confirms it.");
    providerRefundId = result.providerRefundId;
  } else if (r.order?.provider !== "free") {
    go("/admin/finance", "Unknown payment provider for this order.", "");
  }
  const { error } = await admin.rpc("apply_refund", { p_refund_id: r.id, p_provider_refund_id: providerRefundId });
  await admin.from("audit_logs").insert({ actor_id: session.userId, action: "refund.sent", entity_type: "refund", entity_id: r.id, details: { provider_refund_id: providerRefundId } });
  go("/admin/finance", error?.message, "Refund processed and recorded in the ledger.");
}

export async function setPayoutStatus(form: FormData) {
  await requireRole("admin");
  const status = z.enum(["approved", "processing", "paid", "failed", "canceled"]).parse(form.get("status"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_payout_status", {
    p_payout_id: text(form, "id"), p_status: status, p_reference: text(form, "reference") || undefined, p_note: text(form, "note") || undefined,
  });
  go("/admin/finance", error?.message, `Payout marked ${status}.`);
}

export async function setReportStatus(form: FormData) {
  const session = await requireRole("admin");
  if (!features.serverAdmin) go("/admin/reports", "The server key is not configured.", "");
  const status = z.enum(["investigating", "resolved", "dismissed"]).parse(form.get("status"));
  const admin = createAdminClient();
  const { error } = await admin.from("product_reports").update({ status }).eq("id", text(form, "id"));
  await admin.from("audit_logs").insert({ actor_id: session.userId, action: `report.${status}`, entity_type: "product_report", entity_id: text(form, "id") });
  go("/admin/reports", error?.message, `Report ${status}.`);
}

export async function saveCategory(form: FormData) {
  const session = await requireRole("admin");
  if (!features.serverAdmin) go("/admin/categories", "The server key is not configured.", "");
  const parsed = z.object({
    name: z.string().trim().min(2).max(60),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    sort_order: z.coerce.number().int().min(0).max(1000),
  }).safeParse({ name: form.get("name"), slug: form.get("slug"), sort_order: form.get("sort_order") ?? 100 });
  if (!parsed.success) go("/admin/categories", "Name and a lowercase slug are required.", "");
  const admin = createAdminClient();
  const { error } = await admin.from("product_categories").upsert(parsed.data, { onConflict: "slug" });
  await admin.from("audit_logs").insert({ actor_id: session.userId, action: "category.saved", entity_type: "product_category", entity_id: parsed.data.slug, details: parsed.data });
  go("/admin/categories", error?.message, "Category saved.");
}

export async function toggleCategory(form: FormData) {
  const session = await requireRole("admin");
  if (!features.serverAdmin) go("/admin/categories", "The server key is not configured.", "");
  const active = form.get("active") === "1";
  const admin = createAdminClient();
  const { error } = await admin.from("product_categories").update({ is_active: active }).eq("id", text(form, "id"));
  await admin.from("audit_logs").insert({ actor_id: session.userId, action: active ? "category.enabled" : "category.disabled", entity_type: "product_category", entity_id: text(form, "id") });
  go("/admin/categories", error?.message, active ? "Category enabled." : "Category hidden.");
}

export async function claimPlatformStore() {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("ensure_platform_seller");
  go("/admin/platform", error?.message, "You now manage the platform store from the Seller dashboard.");
}

export async function updateQuote(form: FormData) {
  await requireRole("admin");
  const status = z.enum(["new", "contacted", "won", "lost", "spam"]).parse(form.get("status"));
  const supabase = await createClient();
  const { error } = await supabase.from("quote_requests")
    .update({ status, admin_note: text(form, "note").slice(0, 2000), updated_at: new Date().toISOString() })
    .eq("id", text(form, "id"));
  go("/admin/quotes", error?.message, "Quote request updated.");
}
