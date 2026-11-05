import "server-only";
import { knowledgeBase } from "@/lib/troubleshoot";

// The setup assistant's AI: any OpenAI-compatible chat API (default: Google Gemini's free tier). Configured with
// ASSISTANT_AI_KEY, and optionally ASSISTANT_AI_BASE_URL and ASSISTANT_AI_MODEL. Without a key the assistant
// still answers the known problems (lib/troubleshoot.ts) and hands the rest to a human.

const BASE_URL = process.env.ASSISTANT_AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai";
const MODEL = process.env.ASSISTANT_AI_MODEL || "gemini-flash-latest";
const KEY = process.env.ASSISTANT_AI_KEY || "";

export const assistantAiEnabled = () => Boolean(KEY);

export type ChatTurn = { role: "user" | "assistant"; content: string };

type Context = {
  product: string;
  guide: string; // the setup steps the customer sees
  settings: Record<string, unknown>; // their saved details
  n8nError?: string | null;
};

function instructions(c: Context) {
  return `You are the setup assistant of Ranime Jemal Agency. You help a customer who bought the automation "${c.product}" set it up in their own n8n. Most customers are not technical.

How to answer:
- Short, warm, concrete. Numbered steps, one action each, with the exact button names in **bold**. At most about 150 words.
- Answer in the customer's language.
- When they send a screenshot, first say in one sentence what you see (which screen, which error), then the fix.
- Fix the actual problem; do not repeat the whole guide. If something is unclear, ask one precise question.
- Never ask for passwords or API keys, and tell them never to paste a key in the chat. If they did, tell them to delete that key and create a new one.
- Only talk about setting up and using this automation, n8n and the connected accounts.
- If you cannot solve it after two tries, or it needs a refund or a change to the automation, suggest the **Send to a human** button below the chat.

What the customer filled in on the setup page:
${JSON.stringify(c.settings, null, 1).slice(0, 3000)}
${c.n8nError ? `\nThe last error in their n8n:\n${c.n8nError.slice(0, 1500)}\n` : ""}
The setup guide they follow:
${c.guide.slice(0, 12000)}

Known problems and their fixes (use them when they match):
${knowledgeBase()}`;
}

/** The assistant's reply, or null when the AI is not configured or did not answer. */
export async function askAssistant(context: Context, turns: ChatTurn[], image?: string | null): Promise<string | null> {
  if (!KEY) return null;
  const messages: unknown[] = [{ role: "system", content: instructions(context) }];
  turns.forEach((t, i) => {
    const last = i === turns.length - 1;
    if (last && image && t.role === "user") {
      messages.push({ role: "user", content: [{ type: "text", text: t.content || "Here is a screenshot of my problem." }, { type: "image_url", image_url: { url: image } }] });
    } else messages.push({ role: t.role, content: t.content });
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, messages, temperature: 0.3, max_tokens: 900 }),
        signal: AbortSignal.timeout(45_000),
      });
      if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 1500 * (attempt + 1))); continue; }
      if (!res.ok) return null;
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content?.trim();
      return text || null;
    } catch {
      // timeout or network: try again
    }
  }
  return null;
}
