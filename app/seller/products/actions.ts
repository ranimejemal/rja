"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkFile, safeFileName, type FileKind, FILE_RULES } from "@/lib/files";
import { scanWorkflow } from "@/lib/workflow-scan";
import { parseManifest } from "@/lib/manifest";
import { parsePriceToMinor } from "@/lib/money";
import { rateLimit } from "@/lib/rate-limit";
import { features } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

function go(path: string, kind: "notice" | "error", msg: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`);
}

const listing = z.object({
  name: z.string().trim().min(3, "Name is too short").max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "URL slug: lowercase letters, digits and dashes").max(80),
  short_description: z.string().trim().min(10, "Add a short description").max(280),
  description: z.string().trim().max(10000),
  category_id: z.uuid("Choose a category"),
  price: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  customization_mode: z.enum(["ready_to_use", "configurable", "guided_setup", "paid_service"]),
  license_types: z.array(z.enum(["personal", "single_business", "commercial", "extended_commercial"])).min(1, "Offer at least one license"),
  integrations: z.string().max(500),
  tags: z.string().max(300),
  prerequisites: z.string().trim().max(2000),
  install_instructions: z.string().trim().max(10000),
  support_policy: z.string().trim().max(1000),
  demo_video_url: z.union([z.url({ protocol: /^https$/ }), z.literal("")]),
});

const list = (s: string) => [...new Set(s.split(",").map((x) => x.trim()).filter(Boolean))].slice(0, 20).map((x) => x.slice(0, 40));

async function readListing(form: FormData, back: string) {
  const parsed = listing.safeParse({
    name: form.get("name"), slug: form.get("slug"), short_description: form.get("short_description"),
    description: form.get("description") ?? "", category_id: form.get("category_id"), price: String(form.get("price") ?? ""),
    difficulty: form.get("difficulty"), customization_mode: form.get("customization_mode"),
    license_types: form.getAll("license_types").map(String), integrations: String(form.get("integrations") ?? ""),
    tags: String(form.get("tags") ?? ""), prerequisites: form.get("prerequisites") ?? "",
    install_instructions: form.get("install_instructions") ?? "", support_policy: form.get("support_policy") ?? "",
    demo_video_url: form.get("demo_video_url") ?? "",
  });
  if (!parsed.success) go(back, "error", parsed.error.issues[0].message);
  const priceMinor = parsePriceToMinor(parsed.data.price);
  if (priceMinor === null) go(back, "error", "Enter a price like 49 or 49.90");
  const supabase = await createClient();
  const { data: s } = await supabase.from("platform_settings").select("min_price_minor, max_price_minor").single();
  if (s && priceMinor > 0 && (priceMinor < s.min_price_minor || priceMinor > s.max_price_minor)) go(back, "error", "The price is outside the platform limits.");
  const { price: _price, integrations, tags, demo_video_url, ...rest } = parsed.data;
  void _price;
  return {
    ...rest,
    price_minor: priceMinor,
    integrations: list(integrations),
    tags: list(tags).map((t) => t.toLowerCase()),
    demo_video_url: demo_video_url || null,
    license_types: rest.license_types as Enums["license_type"][],
  };
}

export async function createProduct(form: FormData) {
  const session = await requireRole("seller");
  if (!rateLimit(`product:${session.userId}`, 20, 24 * 60 * 60_000).ok) go("/seller/products/new", "error", "Too many new products today.");
  const data = await readListing(form, "/seller/products/new");
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("products").insert({
    ...data,
    seller_id: session.sellerId!,
    ownership: session.isPlatformSeller ? "platform" : "third_party",
  }).select("id").single();
  if (error || !row) go("/seller/products/new", "error", error?.code === "23505" ? "That URL slug is already taken." : "Could not create the product.");
  redirect(`/seller/products/${row.id}?notice=${encodeURIComponent("Draft created. Add a version and upload your workflow next.")}`);
}

export async function updateProduct(form: FormData) {
  await requireRole("seller");
  const id = String(form.get("id"));
  const back = `/seller/products/${id}`;
  const { slug: _slug, ...data } = await readListing(form, back);
  void _slug;
  const supabase = await createClient();
  const { data: updated, error } = await supabase.from("products").update(data).eq("id", id).select("id");
  if (error || !updated?.length) go(back, "error", "This listing can only be edited while it is a draft, needs changes, or was rejected.");
  go(back, "notice", "Listing saved.");
}

export async function confirmRights(form: FormData) {
  await requireRole("seller");
  const id = String(form.get("id"));
  if (form.get("confirm") !== "on") go(`/seller/products/${id}`, "error", "Tick the box to confirm.");
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ rights_confirmed_at: new Date().toISOString() }).eq("id", id);
  go(`/seller/products/${id}`, error ? "error" : "notice", error ? "Could not save the confirmation." : "Distribution rights confirmed.");
}

export async function createVersion(form: FormData) {
  await requireRole("seller");
  const productId = String(form.get("product_id"));
  const back = `/seller/products/${productId}`;
  const parsed = z.object({ version: z.string().regex(/^\d+\.\d+\.\d+$/, "Use a version like 1.0.0"), changelog: z.string().trim().max(4000) })
    .safeParse({ version: form.get("version"), changelog: form.get("changelog") ?? "" });
  if (!parsed.success) go(back, "error", parsed.error.issues[0].message);
  const supabase = await createClient();
  const { error } = await supabase.from("product_versions").insert({ product_id: productId, ...parsed.data });
  go(back, error ? "error" : "notice", error ? (error.code === "23505" ? "That version number already exists." : "Could not create the version.") : `Version ${parsed.data.version} created.`);
}

/** Checks that the signed-in seller owns the product of a draft version. */
async function ownedDraftVersion(versionId: string) {
  const supabase = await createClient();
  const { data: v } = await supabase.from("product_versions").select("id, version, status, product_id").eq("id", versionId).maybeSingle();
  if (!v) return null;
  const { data: mine } = await supabase.rpc("is_my_product", { p_product_id: v.product_id });
  return mine ? v : null;
}

export async function uploadFile(form: FormData) {
  const session = await requireRole("seller");
  const versionId = String(form.get("version_id"));
  const productId = String(form.get("product_id"));
  const back = `/seller/products/${productId}`;
  if (!features.serverAdmin) go(back, "error", "File uploads are not available until the server storage key is configured.");
  if (!rateLimit(`upload:${session.userId}`, 40, 60 * 60_000).ok) go(back, "error", "Too many uploads. Try again later.");
  const kind = z.enum(Object.keys(FILE_RULES) as [FileKind, ...FileKind[]]).safeParse(form.get("kind"));
  const file = form.get("file");
  if (!kind.success || !(file instanceof File)) go(back, "error", "Choose a file and its type.");
  const v = await ownedDraftVersion(versionId);
  if (!v || v.product_id !== productId) go(back, "error", "Version not found.");
  if (v.status !== "draft") go(back, "error", "Files can only be added to draft versions. Create a new version instead.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkFile(kind.data, file.name, bytes);
  if (!check.ok) go(back, "error", check.error);
  let scan = null;
  if (kind.data === "workflow") {
    scan = scanWorkflow(new TextDecoder().decode(bytes));
    if (!scan.ok) go(back, "error", `Workflow rejected: ${scan.findings.filter((f) => f.severity === "error").map((f) => f.message).join(" ")}`);
  }

  const admin = createAdminClient();
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const path = `${session.sellerId}/${productId}/${v.version}/${kind.data}-${sha256.slice(0, 12)}-${safeFileName(file.name)}`;
  const { error: upErr } = await admin.storage.from("product-files").upload(path, bytes, { contentType: check.mime, upsert: false });
  if (upErr) go(back, "error", "Upload failed. Please try again.");
  const { error } = await admin.from("product_files").insert({
    version_id: v.id, kind: kind.data, storage_path: path, file_name: safeFileName(file.name), size_bytes: bytes.length, mime: check.mime, sha256,
  });
  if (error) { await admin.storage.from("product-files").remove([path]); go(back, "error", "Could not record the file."); }
  if (scan) await admin.from("product_versions").update({ scan_report: scan }).eq("id", v.id);
  revalidatePath(back);
  const warnings = scan?.findings.filter((f) => f.severity === "warning").length ?? 0;
  go(back, "notice", warnings ? `Uploaded with ${warnings} warning(s) for the reviewer.` : "File uploaded.");
}

export async function deleteFile(form: FormData) {
  await requireRole("seller");
  const productId = String(form.get("product_id"));
  const back = `/seller/products/${productId}`;
  if (!features.serverAdmin) go(back, "error", "Not available.");
  const supabase = await createClient();
  const { data: f } = await supabase.from("product_files").select("id, storage_path, version_id").eq("id", String(form.get("file_id"))).maybeSingle();
  const v = f ? await ownedDraftVersion(f.version_id) : null;
  if (!f || !v || v.status !== "draft") go(back, "error", "Only files of draft versions can be removed.");
  const admin = createAdminClient();
  await admin.from("product_files").delete().eq("id", f.id);
  await admin.storage.from("product-files").remove([f.storage_path]);
  go(back, "notice", "File removed.");
}

export async function uploadThumbnail(form: FormData) {
  const session = await requireRole("seller");
  const productId = String(form.get("product_id"));
  const back = `/seller/products/${productId}`;
  if (!features.serverAdmin) go(back, "error", "Image uploads are not available yet.");
  const file = form.get("file");
  if (!(file instanceof File)) go(back, "error", "Choose an image.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkFile("screenshot", file.name, bytes);
  if (!check.ok) go(back, "error", check.error);
  const supabase = await createClient();
  const { data: mine } = await supabase.rpc("is_my_product", { p_product_id: productId });
  if (!mine) go(back, "error", "Product not found.");
  const admin = createAdminClient();
  const path = `${session.sellerId}/${productId}/thumb-${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await admin.storage.from("product-media").upload(path, bytes, { contentType: check.mime });
  if (error) go(back, "error", "Upload failed.");
  const { error: updErr } = await supabase.from("products").update({ thumbnail_path: path }).eq("id", productId);
  go(back, updErr ? "error" : "notice", updErr ? "The image can only change while the listing is editable." : "Thumbnail updated.");
}

export async function saveManifest(form: FormData) {
  await requireRole("seller");
  const productId = String(form.get("product_id"));
  const back = `/seller/products/${productId}`;
  if (!features.serverAdmin) go(back, "error", "Not available yet.");
  const v = await ownedDraftVersion(String(form.get("version_id")));
  if (!v || v.status !== "draft") go(back, "error", "The configuration form can only be edited on a draft version.");
  let json: unknown;
  try { json = JSON.parse(String(form.get("manifest") ?? "")); } catch { go(back, "error", "The manifest is not valid JSON."); }
  const parsed = parseManifest(json);
  if (!parsed.ok) go(back, "error", parsed.errors.slice(0, 3).join(" · "));
  if (parsed.manifest.workflowVersion !== v.version) go(back, "error", `workflowVersion must be ${v.version} to match this version.`);
  const admin = createAdminClient();
  const { error } = await admin.from("product_manifests").upsert({ version_id: v.id, schema_version: 1, manifest: parsed.manifest }, { onConflict: "version_id" });
  go(back, error ? "error" : "notice", error ? "Could not save the manifest." : "Configuration form saved.");
}

export async function changeStatus(form: FormData) {
  await requireRole("seller");
  const productId = String(form.get("product_id"));
  const to = z.enum(["submitted", "published", "archived", "draft"]).safeParse(form.get("to"));
  if (!to.success) go(`/seller/products/${productId}`, "error", "Unknown action.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("change_product_status", { p_product_id: productId, p_to: to.data });
  go(`/seller/products/${productId}`, error ? "error" : "notice", error ? error.message : `Status changed to ${to.data}.`);
}

export async function submitVersion(form: FormData) {
  await requireRole("seller");
  const productId = String(form.get("product_id"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_product_version", { p_version_id: String(form.get("version_id")) });
  go(`/seller/products/${productId}`, error ? "error" : "notice", error ? error.message : "Update submitted for review.");
}
