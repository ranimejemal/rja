import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { env, features } from "@/lib/env";
import { AI_PROVIDERS, savedProvider } from "@/lib/ai-providers";
import { askAssistant, type ChatTurn } from "@/lib/assistant";
import { matchProblems } from "@/lib/troubleshoot";
import { credentialsUsed, loadReadme, loadSetupForm, workflowName } from "@/lib/automations";
import { accountGuides, readmeSections } from "@/lib/setup-guide";
import { N8nError, checkN8nUrl, findWorkflows, lastError, retryExecution, updateSettings } from "@/lib/n8n-api";

// The setup assistant of a purchased automation: chat (with a screenshot), the optional connection to the
// customer's n8n (read the last error, apply a one-click fix, retry) and "send to a human".
// The n8n API key is used for the request it comes with and never stored or logged.

export const maxDuration = 60;

const id = z.string().regex(/^[0-9a-f-]{36}$/i);
const turn = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) });
const n8n = z.object({ url: z.string().max(300), key: z.string().min(10).max(2000) });
const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("chat"), productId: id, messages: z.array(turn).min(1).max(30), image: z.string().max(3_000_000).nullish(), n8nError: z.string().max(2000).nullish() }),
  z.object({ action: z.literal("n8n-connect"), productId: id, n8n, workflowId: z.string().max(64).nullish() }),
  z.object({ action: z.literal("n8n-fix"), productId: id, n8n, workflowId: z.string().min(1).max(64), fix: z.enum(["ai_settings", "switch_gemini"]) }),
  z.object({ action: z.literal("n8n-retry"), productId: id, n8n, executionId: z.string().min(1).max(64) }),
  z.object({ action: z.literal("escalate"), productId: id, messages: z.array(turn).min(1).max(30) }),
]);

const IMAGE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
// API keys people paste by mistake: removed before anything is sent to the AI or saved in a ticket.
const SECRET = /\b(sk-[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{30,}|n8n_api_[A-Za-z0-9]{16,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})\b/g;
const HAS_SECRET = new RegExp(SECRET.source);
const redact = (s: string) => s.replace(SECRET, "[key removed]");

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return fail("Sign in first.", 401);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid request.");
  const input = parsed.data;

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("can_use_product", { p_product_id: input.productId });
  if (!allowed) return fail("Not found", 404);
  const { data: product } = await supabase.from("products").select("id, slug, name, seller_id").eq("id", input.productId).single();
  if (!product) return fail("Not found", 404);
  const { data: config } = await supabase.from("product_configurations").select("values")
    .eq("user_id", session.userId).eq("product_id", product.id).order("revision", { ascending: false }).limit(1).maybeSingle();
  const saved = (config?.values ?? {}) as Record<string, unknown>;

  if (input.action === "chat") {
    if (!rateLimit(`assistant:${session.userId}`, 40, 60 * 60_000).ok) return fail("You sent many messages this hour. Wait a little, or send the conversation to us.", 429);
    if (input.image && !IMAGE.test(input.image)) return fail("The screenshot must be a PNG, JPEG or WebP image.");
    const messages: ChatTurn[] = input.messages.map((m) => ({ role: m.role, content: redact(m.content) }));
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const pastedKey = input.messages.some((m) => m.role === "user" && HAS_SECRET.test(m.content));
    const known = matchProblems(`${lastUser}\n${input.n8nError ?? ""}`);
    const reply = await askAssistant(
      { product: product.name, guide: await guideText(product.slug, session.userId, saved), settings: publicSettings(saved), n8nError: input.n8nError },
      messages, input.image,
    );
    return NextResponse.json({
      reply,
      known: known.map((k) => ({ id: k.id, title: k.title, answer: k.answer, fix: k.fix ?? null })),
      warning: pastedKey ? "You pasted a secret key: I removed it from the message. To be safe, delete that key and create a new one." : null,
    });
  }

  if (input.action === "escalate") {
    if (!rateLimit(`ticket:${session.userId}`, 10, 24 * 60 * 60_000).ok) return fail("Too many support requests today.", 429);
    const transcript = input.messages.map((m) => `${m.role === "user" ? "Customer" : "Assistant"}: ${redact(m.content)}`).join("\n\n").slice(-4800);
    const { data: ticket } = await supabase.from("support_tickets")
      .insert({ product_id: product.id, buyer_id: session.userId, seller_id: product.seller_id, subject: `Setup help: ${product.name}`.slice(0, 160) })
      .select("id").single();
    if (ticket) await supabase.from("support_messages").insert({ ticket_id: ticket.id, author_id: session.userId, body: `Conversation with the setup assistant:\n\n${transcript}` });
    if (features.email && env.SMTP_USER) {
      const { brandedEmail, sendMail } = await import("@/lib/mailer");
      const mail = brandedEmail({
        title: `Setup help needed: ${product.name}`,
        paragraphs: [`From: ${session.email ?? session.userId}`, transcript.slice(-3000)],
        cta: ticket ? { label: "Open the request", url: `${env.NEXT_PUBLIC_SITE_URL}/dashboard/support/${ticket.id}` } : undefined,
      });
      await sendMail(env.SMTP_USER, `Setup help needed: ${product.name}`, mail.html, mail.text);
    }
    if (!ticket && !features.email) return fail("Could not send it. Use the contact form below.", 500);
    return NextResponse.json({ ticketUrl: ticket ? `/dashboard/support/${ticket.id}` : null });
  }

  // ---- the customer's n8n
  if (!rateLimit(`assistant-n8n:${session.userId}`, 30, 60 * 60_000).ok) return fail("Too many n8n requests this hour. Wait a little.", 429);
  const url = await checkN8nUrl(input.n8n.url);
  if (!url.ok) return fail(url.error);
  const key = input.n8n.key.trim();
  try {
    if (input.action === "n8n-connect") {
      const { match, all } = await findWorkflows(url.base, key, (await workflowName(product.slug)) ?? product.name);
      const workflowId = input.workflowId ?? match?.id ?? null;
      if (!workflowId) return NextResponse.json({ workflows: all, workflowId: null, error: null });
      const err = await lastError(url.base, key, workflowId);
      const known = err ? matchProblems(err.message) : [];
      return NextResponse.json({
        workflows: all, workflowId,
        lastError: err && { ...err, message: redact(err.message) },
        known: known.map((k) => ({ id: k.id, title: k.title, answer: k.answer, fix: k.fix ?? null })),
      });
    }
    if (input.action === "n8n-fix") {
      const ai = AI_PROVIDERS[input.fix === "switch_gemini" ? "gemini" : savedProvider(saved)];
      const changed = await updateSettings(url.base, key, input.workflowId, { openAiBaseUrl: ai.baseUrl, openAiModel: ai.model });
      return NextResponse.json({ changed: Object.keys(changed), provider: ai.label });
    }
    const ok = await retryExecution(url.base, key, input.executionId);
    return NextResponse.json({ retried: ok });
  } catch (e) {
    if (e instanceof N8nError) return fail(e.message === "not found" ? "That workflow or run no longer exists in your n8n." : e.message, 502);
    return fail("Something went wrong talking to your n8n.", 502);
  }
}

/** The customer's details without anything secret-looking (webhook passwords are generated, not typed). */
function publicSettings(values: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v === "string" ? redact(v) : v]));
}

async function guideText(slug: string, userId: string, saved: Record<string, unknown>) {
  const form = await loadSetupForm(slug);
  const readme = readmeSections((await loadReadme(slug)) ?? "", form ?? undefined);
  const accounts = accountGuides(slug, await credentialsUsed(slug), userId, savedProvider(saved));
  return [
    `What it does:\n${readme.whatItDoes}`,
    `Setup notes:\n${readme.setup}`,
    ...accounts.map((a) => `Account: ${a.title}\n${a.steps}`),
    `Steps on the page: 1 create an n8n account, 2 make the Google Sheet from the templates (if any), 3 fill in the details form and save, 4 download the personal workflow file, 5 in n8n: Create workflow → ... menu → Import from file, 6 connect the accounts (boxes with a red warning), 7 test with "Execute workflow", then switch it Active.`,
  ].join("\n\n");
}
