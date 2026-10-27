import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Downloads a saved configuration as a JSON package. Row-level security returns only the caller's own rows.
// The creator's original workflow file is never modified.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cfg } = await supabase.from("product_configurations")
    .select("revision, values, created_at, product:products(slug, name), version:product_versions(version)")
    .eq("id", id).maybeSingle();
  if (!cfg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = {
    product: cfg.product?.name,
    productVersion: cfg.version?.version,
    configurationRevision: cfg.revision,
    savedAt: cfg.created_at,
    settings: cfg.values,
    instructions: "Import the workflow JSON into n8n, then copy each value above into the matching field described in the installation guide. Connect your own app credentials in n8n.",
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${cfg.product?.slug ?? "automation"}-configuration-r${cfg.revision}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
