import "server-only";

// AI provider interface: any OpenAI-compatible chat API (Google Gemini by default, or OpenAI). Configured with
// ASSISTANT_AI_KEY and optionally ASSISTANT_AI_BASE_URL / ASSISTANT_AI_MODEL. Never given credentials or tools:
// callers send text and get text (or JSON they must validate) back.

const BASE_URL = process.env.ASSISTANT_AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai";
const MODEL = process.env.ASSISTANT_AI_MODEL || "gemini-flash-latest";
const KEY = process.env.ASSISTANT_AI_KEY || "";

export const aiEnabled = () => Boolean(KEY);
export const aiModel = () => MODEL;

/** One JSON answer from the model, parsed but NOT validated: callers check it against their schema. */
export async function chatJson(system: string, user: string, opts: { maxTokens?: number; timeoutMs?: number } = {}): Promise<unknown | null> {
  if (!KEY) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL, temperature: 0.2, max_tokens: opts.maxTokens ?? 1200, response_format: { type: "json_object" },
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
        }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      });
      if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 1500)); continue; }
      if (!res.ok) return null;
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content ?? "";
      return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch {
      // timeout, network or invalid JSON: try once more, then give up
    }
  }
  return null;
}
