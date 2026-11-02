import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadSetupForm } from "@/lib/automations";
import { parseManifest, type Manifest } from "@/lib/manifest";
import type { Database } from "@/lib/supabase/database.types";

/** The setup form of a product: generated from the workflow for the agency's own automations, else the creator's manifest. */
export async function setupFormFor(supabase: SupabaseClient<Database>, slug: string, versionId: string | null): Promise<Manifest | null> {
  const repo = await loadSetupForm(slug);
  if (repo) return repo;
  if (!versionId) return null;
  const { data } = await supabase.from("product_manifests").select("manifest").eq("version_id", versionId).maybeSingle();
  const parsed = data ? parseManifest(data.manifest) : null;
  return parsed?.ok ? parsed.manifest : null;
}
