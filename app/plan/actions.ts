"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { solutionById } from "@/lib/solutions";

const DECISIONS = new Set(["accepted", "postponed", "declined", "proposed"]);

/** The customer's decision on one recommended solution. Nothing is charged here. */
export async function decide(form: FormData) {
  await requireUser("/plan");
  const id = String(form.get("solution_id") ?? "");
  const decision = String(form.get("decision") ?? "");
  if (!solutionById(id) || !DECISIONS.has(decision)) redirect("/plan");
  const supabase = await createClient();
  await supabase.rpc("decide_recommendation", { p_solution_id: id, p_decision: decision });
  redirect(`/plan#${id}`);
}
