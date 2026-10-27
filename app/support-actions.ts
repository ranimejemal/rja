"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// Replies on a support ticket, by the buyer or the seller. Row-level security checks who may post.
export async function replyToTicket(form: FormData) {
  const session = await requireUser();
  const ticketId = String(form.get("ticket_id") ?? "");
  const returnTo = String(form.get("return_to") ?? "/dashboard/support");
  const safeReturn = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard/support";
  if (!rateLimit(`reply:${session.userId}`, 30, 60 * 60_000).ok) redirect(`${safeReturn}?error=Too+many+messages.`);
  const body = z.string().trim().min(1).max(5000).safeParse(form.get("body"));
  if (!body.success) redirect(`${safeReturn}?error=Write+a+message+first.`);
  const supabase = await createClient();
  const { error } = await supabase.from("support_messages").insert({ ticket_id: ticketId, author_id: session.userId, body: body.data });
  redirect(`${safeReturn}?${error ? "error=Could+not+send+the+message." : "notice=Message+sent."}`);
}
