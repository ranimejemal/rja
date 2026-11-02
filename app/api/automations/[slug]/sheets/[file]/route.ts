import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { readSheetTemplate } from "@/lib/automations";

// Google Sheet template (CSV) of an automation the buyer owns, imported as one tab of their sheet, or another
// ready-made file that comes with it (e.g. the Vapi assistant configuration).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; file: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to download." }, { status: 401 });
  const { slug, file } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
  const { data: owns } = product ? await supabase.rpc("owns_product", { p_product_id: product.id }) : { data: false };
  const csv = owns ? await readSheetTemplate(slug, file) : null;
  if (!csv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(csv, {
    headers: { "Content-Type": file.endsWith(".json") ? "application/json" : "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${file}"`, "Cache-Control": "no-store" },
  });
}
