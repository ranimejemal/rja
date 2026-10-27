import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { SUPABASE_URL } from "@/lib/public-env";

export const CARD_FIELDS = `id, slug, name, short_description, price_minor, currency, thumbnail_path, difficulty, integrations,
  customization_mode, is_featured, is_demo, ownership, sales_count, rating_avg, rating_count, published_at, platforms,
  seller:seller_profiles!products_seller_id_fkey(slug, display_name, is_platform, is_demo),
  category:product_categories(slug, name)`;

type Enums = Database["public"]["Enums"];
export type ProductCardData = {
  id: string; slug: string; name: string; short_description: string; price_minor: number; currency: string;
  thumbnail_path: string | null; difficulty: Enums["difficulty"]; integrations: string[];
  customization_mode: Enums["customization_mode"]; is_featured: boolean; is_demo: boolean;
  ownership: Enums["product_ownership"]; sales_count: number; rating_avg: number | null; rating_count: number;
  published_at: string | null; platforms: string[];
  seller: { slug: string; display_name: string; is_platform: boolean; is_demo: boolean } | null;
  category: { slug: string; name: string } | null;
};

export type CatalogFilters = {
  q?: string;
  category?: string;
  price?: "free" | "paid" | "under-150" | "150-250" | "over-250";
  minRating?: number;
  seller?: string;
  app?: string;
  mode?: Enums["customization_mode"];
  platform?: string;
  difficulty?: Enums["difficulty"];
  sort?: "popular" | "recent" | "price-asc" | "price-desc" | "rating";
  featured?: boolean;
};

const SORTS = ["popular", "recent", "price-asc", "price-desc", "rating"] as const;
const PRICES = ["free", "paid", "under-150", "150-250", "over-250"] as const;
const MODES = ["ready_to_use", "configurable", "guided_setup", "paid_service"] as const;
const DIFFS = ["beginner", "intermediate", "advanced"] as const;

/** Reads filters from the URL, keeping only known values. */
export function parseFilters(sp: Record<string, string | string[] | undefined>): CatalogFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).slice(0, 100) : undefined);
  const pick = <T extends string>(v: string | undefined, allowed: readonly T[]) => (allowed as readonly string[]).includes(v ?? "") ? (v as T) : undefined;
  const rating = Number(one("rating"));
  return {
    q: one("q")?.trim() || undefined,
    category: one("category"),
    price: pick(one("price"), PRICES),
    minRating: rating >= 1 && rating <= 5 ? rating : undefined,
    seller: one("seller"),
    app: one("app"),
    mode: pick(one("mode"), MODES),
    platform: one("platform"),
    difficulty: pick(one("difficulty"), DIFFS),
    sort: pick(one("sort"), SORTS) ?? "popular",
  };
}

export async function listProducts(f: CatalogFilters, limit = 60): Promise<ProductCardData[]> {
  const supabase = await createClient();
  let query = supabase.from("products").select(CARD_FIELDS).eq("status", "published");

  if (f.q) {
    // Matches name, description, integrations and tags (case-insensitive).
    // Characters with meaning in PostgREST filter syntax are removed, so the search text cannot alter the query.
    const term = f.q.replace(/[%_,(){}"\\*:]/g, " ").replace(/\s+/g, " ").trim();
    if (term) query = query.or(`name.ilike.%${term}%,short_description.ilike.%${term}%,tags.cs.{${term.toLowerCase()}},integrations.cs.{${term}}`);
  }
  if (f.category) {
    const { data: cat } = await supabase.from("product_categories").select("id").eq("slug", f.category).maybeSingle();
    query = cat ? query.eq("category_id", cat.id) : query.eq("id", "00000000-0000-0000-0000-000000000000");
  }
  if (f.price === "free") query = query.eq("price_minor", 0);
  if (f.price === "paid") query = query.gt("price_minor", 0);
  if (f.price === "under-150") query = query.gt("price_minor", 0).lte("price_minor", 15000);
  if (f.price === "150-250") query = query.gt("price_minor", 15000).lte("price_minor", 25000);
  if (f.price === "over-250") query = query.gt("price_minor", 25000);
  if (f.minRating) query = query.gte("rating_avg", f.minRating);
  if (f.app) query = query.contains("integrations", [f.app]);
  if (f.mode) query = query.eq("customization_mode", f.mode);
  if (f.platform) query = query.contains("platforms", [f.platform]);
  if (f.difficulty) query = query.eq("difficulty", f.difficulty);
  if (f.featured) query = query.eq("is_featured", true);
  if (f.seller) {
    const { data: s } = await supabase.from("seller_profiles").select("id").eq("slug", f.seller).maybeSingle();
    query = s ? query.eq("seller_id", s.id) : query.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  switch (f.sort) {
    case "recent": query = query.order("published_at", { ascending: false }); break;
    case "price-asc": query = query.order("price_minor", { ascending: true }); break;
    case "price-desc": query = query.order("price_minor", { ascending: false }); break;
    case "rating": query = query.order("rating_avg", { ascending: false, nullsFirst: false }); break;
    default: query = query.order("sales_count", { ascending: false }).order("is_featured", { ascending: false });
  }
  const { data, error } = await query.limit(limit);
  if (error) throw new Error(`Could not load products: ${error.message}`);
  return (data ?? []) as unknown as ProductCardData[];
}

export async function listCategories() {
  const supabase = await createClient();
  const [{ data: cats }, { data: counts }] = await Promise.all([
    supabase.from("product_categories").select("id, slug, name, description").eq("is_active", true).order("sort_order"),
    supabase.from("products").select("category_id").eq("status", "published"),
  ]);
  const n = new Map<string, number>();
  (counts ?? []).forEach((p) => p.category_id && n.set(p.category_id, (n.get(p.category_id) ?? 0) + 1));
  return (cats ?? []).map((c) => ({ ...c, count: n.get(c.id) ?? 0 }));
}

export async function listIntegrations(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("integrations").eq("status", "published");
  return [...new Set((data ?? []).flatMap((p) => p.integrations))].sort((a, b) => a.localeCompare(b));
}

export function thumbnailUrl(path: string | null): string {
  if (!path) return "/images/rja-opengraph.jpg";
  if (path.startsWith("/")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/product-media/${path}`;
}
