"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { nextQuestion, questionById, validateAnswer, type Answers } from "@/lib/discovery";

export type DiscoveryResult = { ok: true; answers: Answers; completedAt?: string | null } | { ok: false; error: string };

async function currentAnswers() {
  const supabase = await createClient();
  const { data } = await supabase.from("business_profiles").select("answers, completed_at").limit(1).maybeSingle();
  return { supabase, answers: (data?.answers ?? {}) as Answers, completedAt: data?.completed_at ?? null };
}

/** Saves one answer after checking it against its question (options, length, no secrets). */
export async function saveDiscoveryAnswer(questionId: string, value: unknown): Promise<DiscoveryResult> {
  const session = await requireUser("/start");
  if (!rateLimit(`discovery:${session.userId}`, 120, 60 * 60_000).ok) return { ok: false, error: "Too many changes in a short time. Please wait a few minutes." };
  const q = questionById(String(questionId));
  if (!q) return { ok: false, error: "This question no longer exists. Please reload the page." };
  const { supabase, answers } = await currentAnswers();
  const checked = validateAnswer(q, value, answers);
  if (!checked.ok) return { ok: false, error: checked.error };
  const { data, error } = await supabase.rpc("save_discovery_answer", { p_key: q.id, p_value: checked.value as never });
  if (error) return { ok: false, error: "Your answer could not be saved. Please try again." };
  return { ok: true, answers: (data ?? {}) as Answers };
}

/** Marks discovery as finished once every question that applies is answered. */
export async function finishDiscovery(): Promise<DiscoveryResult> {
  await requireUser("/start");
  const { supabase, answers } = await currentAnswers();
  const missing = nextQuestion(answers);
  if (missing) return { ok: false, error: "A few questions are still open." };
  const { data, error } = await supabase.rpc("finish_discovery");
  if (error) return { ok: false, error: "Could not save. Please try again." };
  return { ok: true, answers, completedAt: data as string };
}
