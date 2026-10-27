import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Role = Database["public"]["Enums"]["app_role"];

export type Session = {
  userId: string;
  email: string;
  displayName: string;
  roles: Role[];
  sellerId: string | null;
  sellerStatus: Database["public"]["Enums"]["seller_status"] | null;
  isPlatformSeller: boolean;
};

/** The signed-in user with roles, verified with Supabase Auth (not just read from the cookie). */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const [{ data: roles }, { data: profile }, { data: seller }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", data.user.id),
    supabase.from("profiles").select("display_name").eq("id", data.user.id).maybeSingle(),
    supabase.from("seller_profiles").select("id, status, is_platform").eq("user_id", data.user.id).maybeSingle(),
  ]);
  return {
    userId: data.user.id,
    email: data.user.email ?? "",
    displayName: profile?.display_name || data.user.email || "",
    roles: (roles ?? []).map((r) => r.role),
    sellerId: seller?.id ?? null,
    sellerStatus: seller?.status ?? null,
    isPlatformSeller: seller?.is_platform ?? false,
  };
});

export async function requireUser(next = "/dashboard"): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session;
}

/** UI-level gate. The database enforces the same rules again on every query and function call. */
export async function requireRole(role: Role): Promise<Session> {
  const session = await requireUser();
  if (!session.roles.includes(role)) notFound();
  return session;
}
