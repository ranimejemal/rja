import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { personalizedWorkflow } from "@/lib/automations";
import { rateLimit } from "@/lib/rate-limit";
import type { ConfigValues } from "@/lib/manifest";

// The buyer's workflow, ready to import into n8n: the automation with their saved setup answers written into
// its Settings node. Row-level security returns only the caller's own configurations, and the buyer must still
// own the product (a refund revokes it).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to download." }, { status: 401 });
  if (!rateLimit(`workflow:${session.userId}`, 60, 60 * 60_000).ok) return NextResponse.json({ error: "Too many downloads. Try again later." }, { status: 429 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const supabase = await createClient();
  const { data: cfg } = await supabase.from("product_configurations")
    .select("id, values, product_id, product:products(slug)").eq("id", id).maybeSingle();
  if (!cfg?.product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: owns } = await supabase.rpc("owns_product", { p_product_id: cfg.product_id });
  if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const out = await personalizedWorkflow(cfg.product.slug, cfg.values as ConfigValues, cfg.id);
  if (!out) return NextResponse.json({ error: "This automation has no ready-made workflow file." }, { status: 404 });
  return new NextResponse(JSON.stringify(out.workflow, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${out.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
