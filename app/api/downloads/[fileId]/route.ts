import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessFile } from "@/lib/entitlement";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { features } from "@/lib/env";

// Authorized download: checks the entitlement on the server, then redirects to a 60-second signed URL.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to download." }, { status: 401 });
  if (!features.serverAdmin) return NextResponse.json({ error: "Downloads are not configured yet." }, { status: 503 });
  if (!rateLimit(`download:${session.userId}`, 60, 60 * 60_000).ok) return NextResponse.json({ error: "Too many downloads. Try again later." }, { status: 429 });
  const { fileId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(fileId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await canAccessFile(session.userId, fileId);
  // Same answer for "missing" and "not yours", so file ids cannot be probed.
  if (!access.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("product-files").createSignedUrl(access.file.storage_path, 60, { download: access.file.file_name });
  if (error || !data) return NextResponse.json({ error: "The file is temporarily unavailable." }, { status: 503 });
  await admin.from("download_logs").insert({ user_id: session.userId, file_id: fileId });
  return NextResponse.redirect(data.signedUrl, { status: 303, headers: { "Cache-Control": "no-store" } });
}
