import { z } from "zod";

// The format and the rules for AI-written social content. Pure, so it is unit-tested.

export const PLATFORMS = ["instagram", "facebook", "tiktok", "linkedin"] as const;
export type Platform = (typeof PLATFORMS)[number];
// Caption limits of each platform (characters).
export const CAPTION_LIMIT: Record<Platform, number> = { instagram: 2200, facebook: 5000, tiktok: 2200, linkedin: 3000 };

export const draftSchema = z.object({
  styleSummary: z.string().min(20).max(800),
  pillars: z.array(z.string().min(2).max(80)).min(1).max(6),
  posts: z.array(z.object({
    platform: z.enum(PLATFORMS),
    format: z.enum(["image", "carousel"]),
    pillar: z.string().max(80),
    caption: z.string().min(10).max(5000),
    hashtags: z.array(z.string().regex(/^#[\p{L}\p{N}_]{2,40}$/u)).max(10),
    visual: z.object({ source: z.enum(["generate", "own_photo", "stock"]), brief: z.string().min(10).max(600) }),
    slides: z.array(z.string().min(2).max(300)).max(10).optional(),
    when: z.string().max(60).optional(),
  })).max(10),
  reels: z.array(z.object({
    platform: z.enum(PLATFORMS),
    hook: z.string().min(5).max(120),
    beats: z.array(z.object({ seconds: z.number().min(0).max(90), shot: z.string().min(3).max(200), onScreenText: z.string().max(120).optional(), voiceover: z.string().max(300).optional() })).min(2).max(15),
    caption: z.string().min(10).max(2200),
    hashtags: z.array(z.string().regex(/^#[\p{L}\p{N}_]{2,40}$/u)).max(10),
    sound: z.string().max(200),
    when: z.string().max(60).optional(),
  })).max(5),
});
export type Drafts = z.infer<typeof draftSchema>;

const FORBIDDEN = [
  /https?:\/\/|www\./i, /pinterest|pinimg/i, /\bguarantee|\bgo(?:es)? viral\b|\b\d+\s?%\s+more\b/i, /<[a-z/][^>]*>/i,
];

/** Problems with a set of drafts (empty = fine). */
export function checkDrafts(d: Drafts): string[] {
  const problems: string[] = [];
  const texts = [d.styleSummary, ...d.pillars, ...d.posts.flatMap((p) => [p.caption, p.visual.brief, ...(p.slides ?? [])]),
    ...d.reels.flatMap((r) => [r.hook, r.caption, r.sound, ...r.beats.flatMap((b) => [b.shot, b.onScreenText ?? "", b.voiceover ?? ""])])];
  for (const t of texts) if (FORBIDDEN.some((r) => r.test(t))) problems.push(`not allowed: “${t.slice(0, 60)}”`);
  d.posts.forEach((p, i) => { if (p.caption.length > CAPTION_LIMIT[p.platform]) problems.push(`post ${i + 1}: caption too long for ${p.platform}`); });
  d.reels.forEach((r, i) => {
    const last = Math.max(...r.beats.map((b) => b.seconds));
    if (last > 90) problems.push(`reel ${i + 1}: longer than 90 seconds`);
    if (r.beats[0].seconds > 3) problems.push(`reel ${i + 1}: the hook must come in the first 3 seconds`);
  });
  return problems;
}
