// The AI a customer's automation talks to. Both speak the OpenAI chat format, so the workflow only needs the
// address and the model name; the customer's own key goes in n8n (an "OpenAI" credential in both cases).

export type AiProvider = "gemini" | "openai";

export const AI_PROVIDERS: Record<AiProvider, { label: string; baseUrl: string; model: string; images: boolean }> = {
  // "-latest" follows Google's current Flash model, so the workflow keeps working when Google retires a version.
  gemini: { label: "Google Gemini (free)", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-flash-latest", images: false },
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini", images: true },
};

export function aiProvider(value: unknown): AiProvider {
  return value === "openai" ? "openai" : "gemini";
}

/** The AI of saved details. Details saved before the choice existed use the workflow's original AI (OpenAI). */
export function savedProvider(values: Record<string, unknown> | null | undefined): AiProvider {
  if (!values || !Object.keys(values).length) return "gemini";
  return values.ai_provider ? aiProvider(values.ai_provider) : "openai";
}
