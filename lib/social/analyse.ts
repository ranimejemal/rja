// Social Media Studio — reading a creator's own statistics export and analysing it.
//
// Works today without any platform approval: Instagram / Facebook (Meta Business Suite → Insights → Content →
// Export) and TikTok (Analytics → Content → Download) let account owners download their posts with numbers.
// Column names differ between platforms and languages, so columns are matched by a list of known names.
// Every number below is computed from the file; nothing is estimated or invented. When there are too few posts to
// say something, the result says so instead of guessing.

export type Format = "image" | "carousel" | "reel" | "video" | "story" | "text" | "other";
export type Post = {
  platform: string;
  format: Format;
  publishedAt: Date;
  caption: string;
  reach: number | null;
  views: number | null;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  permalink: string | null;
};

// ---------------------------------------------------------------- CSV
/** RFC 4180 CSV: quoted fields, doubled quotes, commas/semicolons/tabs, CRLF. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = [",", ";", "\t"].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

const COLUMNS: Record<keyof Omit<Post, "platform">, string[]> = {
  publishedAt: ["publish time", "published", "date", "created", "post time", "time", "date de publication", "heure de publication"],
  format: ["post type", "media type", "type", "content type", "type de publication"],
  caption: ["description", "caption", "title", "message", "video title", "post", "légende", "titre"],
  reach: ["reach", "accounts reached", "portée", "couverture"],
  views: ["views", "impressions", "plays", "video views", "vues", "lectures"],
  likes: ["likes", "reactions", "j'aime", "réactions"],
  comments: ["comments", "commentaires"],
  shares: ["shares", "partages"],
  saves: ["saves", "enregistrements", "favorites", "favourites"],
  permalink: ["permalink", "link", "url", "lien"],
};

function columnIndex(headers: string[], names: string[]) {
  const h = headers.map((x) => x.trim().toLowerCase());
  for (const n of names) { const i = h.indexOf(n); if (i >= 0) return i; }
  for (const n of names) { const i = h.findIndex((x) => x.startsWith(n)); if (i >= 0) return i; }
  return -1;
}

const num = (v: string | undefined) => {
  if (!v) return null;
  const n = Number(v.replace(/[\s ,]/g, "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && v.trim() !== "" ? n : null;
};

function format(v: string): Format {
  const t = v.toLowerCase();
  if (/reel/.test(t)) return "reel";
  if (/carousel|album|carrousel/.test(t)) return "carousel";
  if (/story|stories/.test(t)) return "story";
  if (/video|vidéo/.test(t)) return "video";
  if (/photo|image|picture/.test(t)) return "image";
  if (/text|status|statut/.test(t)) return "text";
  return "other";
}

/** "11/03/2026 18:30" (Meta, month first), ISO, or "2026-11-03 18:30". Returns null when unreadable. */
export function parseDate(v: string): Date | null {
  const s = v.trim();
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T,]+(\d{1,2}):(\d{2}))?/);
  if (us) return new Date(Number(us[3]), Number(us[1]) - 1, Number(us[2]), Number(us[4] ?? 0), Number(us[5] ?? 0));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), Number(iso[4] ?? 0), Number(iso[5] ?? 0));
  return null;
}

export type ImportResult = { posts: Post[]; skipped: number; missing: string[] };

/** Reads an export into posts. Rows without a readable date are skipped and counted. */
export function importPosts(csv: string, platform: string): ImportResult {
  const rows = parseCsv(csv);
  if (rows.length < 2) return { posts: [], skipped: 0, missing: ["the file has no rows"] };
  const [headers, ...data] = rows;
  const idx = Object.fromEntries(Object.entries(COLUMNS).map(([k, names]) => [k, columnIndex(headers, names)])) as Record<keyof typeof COLUMNS, number>;
  const missing = (["publishedAt", "likes"] as const).filter((k) => idx[k] < 0).map((k) => (k === "publishedAt" ? "publish date" : "likes"));
  if (missing.length) return { posts: [], skipped: data.length, missing };
  const posts: Post[] = [];
  let skipped = 0;
  for (const r of data.slice(0, 5000)) {
    const date = parseDate(r[idx.publishedAt] ?? "");
    if (!date) { skipped++; continue; }
    const get = (k: keyof typeof COLUMNS) => (idx[k] >= 0 ? r[idx[k]] : undefined);
    posts.push({
      platform, publishedAt: date,
      format: idx.format >= 0 ? format(get("format") ?? "") : platform === "tiktok" ? "video" : "other",
      caption: (get("caption") ?? "").slice(0, 3000),
      reach: num(get("reach")), views: num(get("views")),
      likes: num(get("likes")) ?? 0, comments: num(get("comments")) ?? 0, shares: num(get("shares")) ?? 0, saves: num(get("saves")) ?? 0,
      permalink: /^https:\/\//.test(get("permalink") ?? "") ? get("permalink")! : null,
    });
  }
  return { posts, skipped, missing: [] };
}

// ---------------------------------------------------------------- analysis
const engagement = (p: Post) => p.likes + p.comments + p.shares + p.saves;
/** Engagement per 100 people reached (or per 100 views when the export has no reach). */
const rate = (p: Post) => { const base = p.reach ?? p.views; return base && base > 0 ? (engagement(p) / base) * 100 : null; };
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOTS = ["0–3 h", "3–6 h", "6–9 h", "9–12 h", "12–15 h", "15–18 h", "18–21 h", "21–24 h"];
const MIN_PER_SLOT = 3;

const EMOJI = /\p{Extended_Pictographic}/u;
const CTA = /\b(link in bio|dm|comment|tag|share|save|shop|order|book|click|lien en bio|commente|partage|commande|réserve)\b/i;

export type Analysis = {
  posts: number;
  period: { from: string; to: string; weeks: number };
  postsPerWeek: number;
  confidence: "low" | "medium" | "good";
  formats: { format: Format; posts: number; avgEngagement: number; avgRate: number | null }[];
  bestTimes: { day: string; slot: string; avgRate: number; posts: number }[];
  captions: { avgLength: number; withEmoji: number; avgHashtags: number; withQuestion: number; withCallToAction: number };
  top: { caption: string; format: Format; date: string; engagement: number; rate: number | null; permalink: string | null }[];
  notes: string[];
};

export function analysePosts(posts: Post[]): Analysis | null {
  const ps = posts.filter((p) => p.format !== "story");
  if (!ps.length) return null;
  const sorted = [...ps].sort((a, b) => +a.publishedAt - +b.publishedAt);
  const from = sorted[0].publishedAt, to = sorted.at(-1)!.publishedAt;
  const weeks = Math.max(1, (+to - +from) / (7 * 864e5));
  const notes: string[] = [];

  const byFormat = new Map<Format, Post[]>();
  for (const p of ps) byFormat.set(p.format, [...(byFormat.get(p.format) ?? []), p]);
  const formats = [...byFormat].map(([format, list]) => {
    const rates = list.map(rate).filter((r): r is number => r !== null);
    return { format, posts: list.length, avgEngagement: round(avg(list.map(engagement)), 0), avgRate: rates.length ? round(avg(rates), 2) : null };
  }).sort((a, b) => (b.avgRate ?? b.avgEngagement) - (a.avgRate ?? a.avgEngagement));

  const slots = new Map<string, number[]>();
  for (const p of ps) {
    const r = rate(p);
    if (r === null) continue;
    const k = `${p.publishedAt.getDay()}|${Math.floor(p.publishedAt.getHours() / 3)}`;
    slots.set(k, [...(slots.get(k) ?? []), r]);
  }
  const bestTimes = [...slots].filter(([, rs]) => rs.length >= MIN_PER_SLOT)
    .map(([k, rs]) => { const [d, s] = k.split("|").map(Number); return { day: DAYS[d], slot: SLOTS[s], avgRate: round(avg(rs), 2), posts: rs.length }; })
    .sort((a, b) => b.avgRate - a.avgRate).slice(0, 3);
  if (!bestTimes.length) notes.push(`Not enough posts at the same day and time yet to name best times (we need at least ${MIN_PER_SLOT} per time slot, with reach or views).`);
  if (ps.every((p) => p.reach === null && p.views === null)) notes.push("The file has no reach or views, so posts are compared by total engagement only.");

  const caps = ps.map((p) => p.caption).filter(Boolean);
  const share = (f: (c: string) => boolean) => (caps.length ? round((caps.filter(f).length / caps.length) * 100, 0) : 0);
  const captions = {
    avgLength: round(avg(caps.map((c) => c.length)), 0),
    withEmoji: share((c) => EMOJI.test(c)),
    avgHashtags: round(avg(caps.map((c) => (c.match(/#[\p{L}\p{N}_]+/gu) ?? []).length)), 1),
    withQuestion: share((c) => c.includes("?")),
    withCallToAction: share((c) => CTA.test(c)),
  };

  const top = [...ps].sort((a, b) => (rate(b) ?? -1) - (rate(a) ?? -1) || engagement(b) - engagement(a)).slice(0, 5)
    .map((p) => ({ caption: p.caption.slice(0, 300), format: p.format, date: p.publishedAt.toISOString().slice(0, 10), engagement: engagement(p), rate: rate(p) === null ? null : round(rate(p)!, 2), permalink: p.permalink }));

  const confidence = ps.length >= 60 ? "good" : ps.length >= 20 ? "medium" : "low";
  if (confidence === "low") notes.push(`Only ${ps.length} posts: treat these results as first hints.`);
  return {
    posts: ps.length, period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), weeks: round(weeks, 0) },
    postsPerWeek: round(ps.length / weeks, 1), confidence, formats, bestTimes, captions, top, notes,
  };
}
