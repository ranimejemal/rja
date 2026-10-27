import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server-side access check for private product files.
 * Allowed: the buyer with an active entitlement (approved versions only), the product's seller, or an admin.
 */
export async function canAccessFile(userId: string, fileId: string) {
  const admin = createAdminClient();
  const { data: file } = await admin
    .from("product_files")
    .select("id, storage_path, file_name, mime, version:product_versions(id, status, product_id, product:products!product_versions_product_id_fkey(seller_id, seller:seller_profiles!products_seller_id_fkey(user_id, is_platform)))")
    .eq("id", fileId)
    .maybeSingle();
  if (!file?.version?.product) return { ok: false as const };
  const v = file.version;
  const [{ data: roles }, { data: ent }] = await Promise.all([
    admin.from("user_roles").select("role").eq("user_id", userId),
    admin.from("entitlements").select("id").eq("user_id", userId).eq("product_id", v.product_id).is("revoked_at", null).limit(1),
  ]);
  const isAdmin = (roles ?? []).some((r) => r.role === "admin");
  const isOwner = v.product?.seller?.user_id === userId || (v.product?.seller?.is_platform && isAdmin);
  const isBuyer = (ent ?? []).length > 0 && v.status === "approved";
  if (!isAdmin && !isOwner && !isBuyer) return { ok: false as const };
  return { ok: true as const, file };
}

/** Files of an approved version, for a buyer who owns the product. */
export async function filesForBuyer(userId: string, productId: string) {
  const admin = createAdminClient();
  const { data: ent } = await admin.from("entitlements").select("id").eq("user_id", userId).eq("product_id", productId).is("revoked_at", null).limit(1);
  if (!ent?.length) return null;
  const { data: product } = await admin.from("products").select("current_version_id").eq("id", productId).single();
  if (!product?.current_version_id) return [];
  const { data } = await admin.from("product_files").select("id, kind, file_name, size_bytes").eq("version_id", product.current_version_id).order("kind");
  return data ?? [];
}
