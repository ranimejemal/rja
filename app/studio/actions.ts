"use server";

import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { analysePosts, importPosts, type Analysis } from "@/lib/social/analyse";
import { generateDrafts } from "@/lib/social/generate";
import { PLATFORMS, type Drafts, type Platform } from "@/lib/social/content-rules";
import { looksSecret } from "@/lib/discovery";

export type StudioResult =
  | { ok: true; analysis: Analysis; skipped: number; drafts: Drafts | null; draftError: string | null }
  | { ok: false; error: string };

const MAX_BYTES = 3_000_000;

/**
 * Analyses the account's own export and, when asked, writes new posts and reels in its style. The file is read in
 * memory and not stored.
 */
export async function analyseExport(input: { csv: string; platform: string; posts: number; reels: number; brief: string; generate: boolean }): Promise<StudioResult> {
  const session = await requireUser("/studio");
  if (!rateLimit(`studio:${session.userId}`, 10, 60 * 60_000).ok) return { ok: false, error: "You ran the studio many times this hour. Please wait a little." };
  if (typeof input.csv !== "string" || !input.csv.trim()) return { ok: false, error: "Choose your export file (.csv)." };
  if (input.csv.length > MAX_BYTES) return { ok: false, error: "This file is too big (3 MB at most). Export a shorter period." };
  const platform = (PLATFORMS as readonly string[]).includes(input.platform) ? (input.platform as Platform) : "instagram";
  const brief = String(input.brief ?? "").slice(0, 500);
  if (looksSecret(brief)) return { ok: false, error: "Please don’t paste passwords or keys here." };
  const imported = importPosts(input.csv, platform);
  if (imported.missing.length) return { ok: false, error: `We could not find these columns in the file: ${imported.missing.join(", ")}. Use the “Content” export of Meta Business Suite or TikTok Analytics.` };
  const analysis = analysePosts(imported.posts);
  if (!analysis) return { ok: false, error: "No posts found in this file." };
  if (!input.generate) return { ok: true, analysis, skipped: imported.skipped, drafts: null, draftError: null };
  const drafts = await generateDrafts(analysis, {
    platform, business: session.displayName, brief,
    posts: Math.min(Math.max(Number(input.posts) || 0, 0), 6), reels: Math.min(Math.max(Number(input.reels) || 0, 0), 3),
  });
  return { ok: true, analysis, skipped: imported.skipped, drafts: drafts.ok ? drafts.drafts : null, draftError: drafts.ok ? null : drafts.error };
}
