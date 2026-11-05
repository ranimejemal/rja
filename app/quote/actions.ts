"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { env, features } from "@/lib/env";
import { HUMAN_CHECK_FAILED, verifyHuman } from "@/lib/human-check";

export type QuoteState = { error?: string; sent?: boolean };

const schema = z.object({
  product: z.string().regex(/^[a-z0-9-]*$/).max(120),
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.email("Enter a valid email address").max(254),
  phone: z.string().trim().max(40),
  company: z.string().trim().max(160),
  message: z.string().trim().min(10, "Tell us a little more (10 characters or more)").max(4000),
});

export async function submitQuote(_: QuoteState, form: FormData): Promise<QuoteState> {
  // Honeypot: real visitors never fill this hidden field.
  if (String(form.get("website") ?? "")) return { sent: true };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`quote:${ip}`, 5, 60 * 60_000).ok) return { error: "Too many requests from your network. Please try again later or contact us directly." };
  const parsed = schema.safeParse({
    product: String(form.get("product") ?? ""),
    name: form.get("name"), email: form.get("email"),
    phone: String(form.get("phone") ?? ""), company: String(form.get("company") ?? ""), message: form.get("message"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await verifyHuman(form, "/quote"))) return { error: HUMAN_CHECK_FAILED };
  const q = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_quote_request", {
    p_product_slug: q.product, p_name: q.name, p_email: q.email, p_phone: q.phone, p_company: q.company, p_message: q.message,
  });
  if (error) return { error: "We could not send your request. Please try again or contact us directly." };

  // Optional: forward to an automation (for example the n8n lead workflow's webhook) for instant follow-up.
  if (env.QUOTE_WEBHOOK_URL) {
    await fetch(env.QUOTE_WEBHOOK_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...q, source: "quote request" }), signal: AbortSignal.timeout(4000),
    }).catch(() => undefined);
  }
  await notifyAdmin(q);
  return { sent: true };
}

/** Emails the agency about the new request (to SMTP_USER, the agency's own mailbox), with a reply link. */
async function notifyAdmin(q: { product: string; name: string; email: string; phone: string; company: string; message: string }) {
  if (!features.email || !env.SMTP_USER) return;
  const { brandedEmail, sendMail } = await import("@/lib/mailer");
  const mail = brandedEmail({
    title: `New quote request from ${q.name}`,
    paragraphs: [
      `Automation: ${q.product || "general enquiry"}`,
      `Email: ${q.email}${q.phone ? ` · Phone: ${q.phone}` : ""}${q.company ? ` · Company: ${q.company}` : ""}`,
      q.message,
    ],
    cta: { label: "Open quote requests", url: `${env.NEXT_PUBLIC_SITE_URL}/admin/quotes` },
  });
  await sendMail(env.SMTP_USER, `New quote request: ${q.name}${q.company ? ` (${q.company})` : ""}`, mail.html, mail.text);
}
