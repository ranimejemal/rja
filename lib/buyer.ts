import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PurchasedStatus = "update_available" | "support_open" | "ready_to_configure" | "configuration_saved" | "ready_to_download" | "purchased";

export const PURCHASED_LABEL: Record<PurchasedStatus, string> = {
  purchased: "Purchased",
  ready_to_configure: "Ready to configure",
  configuration_saved: "Configuration saved",
  ready_to_download: "Ready to download",
  update_available: "Update available",
  support_open: "Support request open",
};

/**
 * Purchased automations with honest statuses. Nothing here claims a workflow is running:
 * the marketplace does not execute workflows.
 */
export async function myAutomations(userId: string) {
  const supabase = await createClient();
  const { data: ents } = await supabase
    .from("entitlements")
    .select(`id, license_type, granted_at, product_id,
      item:order_items(version_id, order_id),
      product:products(id, slug, name, short_description, thumbnail_path, customization_mode, current_version_id, ownership,
        seller:seller_profiles!products_seller_id_fkey(display_name, slug))`)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("granted_at", { ascending: false });
  const rows = ents ?? [];
  const productIds = rows.map((e) => e.product_id);
  const versionIds = rows.map((e) => e.product?.current_version_id).filter((v): v is string => Boolean(v));
  const [{ data: configs }, { data: tickets }, { data: manifests }] = await Promise.all([
    supabase.from("product_configurations").select("product_id").eq("user_id", userId).in("product_id", productIds),
    supabase.from("support_tickets").select("product_id").eq("buyer_id", userId).neq("status", "closed").in("product_id", productIds),
    supabase.from("product_manifests").select("version_id").in("version_id", versionIds),
  ]);
  const configured = new Set((configs ?? []).map((c) => c.product_id));
  const supportOpen = new Set((tickets ?? []).map((t) => t.product_id));
  const hasManifest = new Set((manifests ?? []).map((m) => m.version_id));

  return rows.filter((e) => e.product).map((e) => {
    const p = e.product!;
    const purchasedVersion = e.item?.version_id ?? null;
    const flags: PurchasedStatus[] = [];
    if (p.current_version_id && purchasedVersion && p.current_version_id !== purchasedVersion) flags.push("update_available");
    if (supportOpen.has(p.id)) flags.push("support_open");
    const configurable = p.current_version_id ? hasManifest.has(p.current_version_id) : false;
    if (configurable) flags.push(configured.has(p.id) ? "configuration_saved" : "ready_to_configure");
    // Buyers cannot read file metadata directly, so availability follows from having an approved version.
    flags.push(p.current_version_id ? "ready_to_download" : "purchased");
    return { entitlementId: e.id, license: e.license_type, grantedAt: e.granted_at, orderId: e.item?.order_id ?? null, product: p, flags };
  });
}
