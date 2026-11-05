import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Writes one event to the security log (security_events) with the server's secret key. Used by the middleware
// (scan probes) and by lib/security.ts (logins, bots, admin access). Never throws: logging must not break the site.
// Passwords are never passed here.

export type SecurityEvent = {
  kind: Database["public"]["Enums"]["security_event_kind"];
  severity?: Database["public"]["Enums"]["security_severity"];
  email?: string | null; userId?: string | null; ip?: string | null; country?: string | null;
  userAgent?: string | null; path?: string | null; details?: Record<string, unknown>;
};

let client: ReturnType<typeof createClient<Database>> | null = null;
function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zdppasosborxodhglqwo.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  client ??= createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export async function writeSecurityEvent(e: SecurityEvent) {
  const db = admin();
  if (!db) return;
  try {
    await db.from("security_events").insert({
      kind: e.kind, severity: e.severity ?? "info", email: e.email?.toLowerCase().slice(0, 254) ?? null, user_id: e.userId ?? null,
      ip: e.ip ?? null, country: e.country ?? null, user_agent: e.userAgent ?? null, path: e.path?.slice(0, 300) ?? null,
      details: (e.details ?? {}) as never,
    });
    // Old entries are purged now and then (security events after 90 days, visits after 13 months).
    if (Math.random() < 0.01) await db.rpc("purge_old_logs");
  } catch (error) {
    console.error("security log failed", error);
  }
}

/** Recent events matching a filter, for brute-force detection and alert throttling. */
export async function countRecentEvents(filter: { kind: SecurityEvent["kind"]; minutes: number; email?: string; ip?: string }) {
  const db = admin();
  if (!db) return 0;
  let q = db.from("security_events").select("id", { count: "exact", head: true })
    .eq("kind", filter.kind).gte("created_at", new Date(Date.now() - filter.minutes * 60_000).toISOString());
  if (filter.email) q = q.eq("email", filter.email.toLowerCase());
  if (filter.ip) q = q.eq("ip", filter.ip);
  const { count } = await q;
  return count ?? 0;
}
