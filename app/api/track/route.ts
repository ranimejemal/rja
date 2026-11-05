import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { features, env } from "@/lib/env";
import { brandedEmail, sendMail } from "@/lib/mailer";
import { requestInfo } from "@/lib/request-info";

const body = z.object({
  id: z.uuid(), path: z.string().regex(/^\/[^\s]*$/).max(300), seconds: z.number().int().min(0).max(7200),
  referrer: z.string().regex(/^[a-z0-9.-]+$/i).max(200).optional(),
});

// Receives page-view time from the EngagementTracker. Signed-in customers who agreed to receive offers get the
// running promotion by email once they have spent its minimum time on the site today (claim_promotion decides).
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`track:${ip}`, 120, 60_000).ok) return new NextResponse(null, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  // Query strings can carry personal data (search terms, tokens): only the path is kept.
  const path = parsed.data.path.split("?")[0];
  const info = requestInfo(req.headers);
  // The visitor id is only used when the visitor accepted the cookie.
  const consent = req.cookies.get("rja_consent")?.value === "yes";
  const vid = req.cookies.get("rja_vid")?.value;
  const supabase = await createClient();
  const { data: today } = await supabase.rpc("record_page_view", {
    p_id: parsed.data.id, p_path: path, p_seconds: parsed.data.seconds,
    p_visitor_id: consent && vid && /^[0-9a-f-]{36}$/.test(vid) ? vid : null,
    p_country: info.country, p_device: info.device, p_browser: info.browser, p_referrer: parsed.data.referrer ?? null,
  });
  if (features.email && typeof today === "number" && today >= 60) await maybeSendPromotion(supabase);
  return new NextResponse(null, { status: 204 });
}

async function maybeSendPromotion(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: claim } = await supabase.rpc("claim_promotion");
  const promo = claim?.[0];
  if (!promo) return;
  const { data: auth } = await supabase.auth.getUser();
  const to = auth.user?.email;
  if (!to) { await supabase.rpc("finish_promotion_send", { p_send_id: promo.send_id, p_ok: false, p_error: "no email address" }); return; }
  const site = env.NEXT_PUBLIC_SITE_URL;
  const unsubscribe = `${site}/unsubscribe?t=${promo.unsubscribe_token}`;
  const mail = brandedEmail({
    title: promo.subject,
    paragraphs: promo.message.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
    cta: { label: promo.cta_label, url: `${site}${promo.cta_path}` },
    footerNote: `You receive this because you asked for offers from Ranime Jemal Agency. <a href="${unsubscribe}" style="color:#8d8d86;">Unsubscribe</a>`,
  });
  const sent = await sendMail(to, promo.subject, mail.html, `${mail.text}\n\nUnsubscribe: ${unsubscribe}`);
  await supabase.rpc("finish_promotion_send", { p_send_id: promo.send_id, p_ok: sent.ok, p_error: sent.ok ? null : sent.error });
}
