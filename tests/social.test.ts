import { describe, expect, it } from "vitest";
import { analysePosts, DAYS, importPosts, parseCsv, parseDate } from "@/lib/social/analyse";
import { checkDrafts, type Drafts } from "@/lib/social/content-rules";
import { validateAutomation } from "@/lib/engine/validate";

// A Meta Business Suite style export: month-first dates, quoted captions with commas and line breaks.
function metaExport() {
  const rows = ["Post ID,Publish time,Post type,Description,Reach,Likes,Comments,Shares,Saves,Permalink"];
  let id = 0;
  for (let week = 0; week < 8; week++) {
    const day = 2 + week * 7; // the same weekday every week
    const d = new Date(2026, 9, day);
    const mm = d.getMonth() + 1, dd = d.getDate();
    rows.push(`${++id},${mm}/${dd}/2026 19:15,IG reel,"New bag 👜, who wants it? #handmade #leather",1000,120,15,10,20,https://instagram.com/p/${id}`);
    rows.push(`${++id},${mm}/${dd}/2026 09:00,IG image,"Morning in the workshop.\nLink in bio",1000,30,2,0,3,`);
    rows.push(`${++id},${mm}/${dd}/2026 13:00,IG carousel,"3 ways to wear it",800,60,5,4,12,`);
  }
  return rows.join("\r\n");
}

describe("export import", () => {
  it("reads quoted fields with commas, line breaks and doubled quotes, and other separators", () => {
    expect(parseCsv('a,b\n"x, ""y""\nz",2\n')).toEqual([["a", "b"], ['x, "y"\nz', "2"]]);
    expect(parseCsv("a;b\n1;2")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("reads Meta's month-first dates and ISO dates", () => {
    expect(parseDate("11/03/2026 18:30")?.getDate()).toBe(3);
    expect(parseDate("2026-11-03T18:30:00Z")?.getHours()).toBe(18);
    expect(parseDate("yesterday")).toBeNull();
  });
  it("maps the columns and says which ones are missing", () => {
    const r = importPosts(metaExport(), "instagram");
    expect(r.posts).toHaveLength(24);
    expect(r.posts[0]).toMatchObject({ format: "reel", reach: 1000, likes: 120, saves: 20, permalink: "https://instagram.com/p/1" });
    expect(importPosts("Name,Score\nx,1", "instagram").missing).toEqual(["publish date", "likes"]);
  });
});

describe("analysis", () => {
  const a = analysePosts(importPosts(metaExport(), "instagram").posts)!;
  it("ranks formats by engagement per 100 people reached", () => {
    expect(a.formats.map((f) => f.format)).toEqual(["reel", "carousel", "image"]);
    expect(a.formats[0].avgRate).toBe(16.5);
  });
  it("names best times only with enough posts in the slot", () => {
    expect(a.bestTimes[0]).toMatchObject({ day: DAYS[new Date(2026, 9, 2).getDay()], slot: "18–21 h", posts: 8 });
    const few = analysePosts(importPosts(metaExport(), "instagram").posts.slice(0, 4))!;
    expect(few.bestTimes).toEqual([]);
    expect(few.notes.join(" ")).toMatch(/Not enough posts|Only 4 posts/);
  });
  it("describes caption habits from the real captions", () => {
    expect(a.captions.withEmoji).toBe(33);
    expect(a.captions.withQuestion).toBe(33);
    expect(a.captions.avgHashtags).toBeCloseTo(0.7, 1);
    expect(a.confidence).toBe("medium");
  });
});

describe("content rules", () => {
  const ok: Drafts = {
    styleSummary: "Warm, short captions with one emoji and a question.", pillars: ["Craft"],
    posts: [{ platform: "instagram", format: "image", pillar: "Craft", caption: "Stitched by hand, one bag at a time 👜 Which colour next?", hashtags: ["#handmade"], visual: { source: "own_photo", brief: "Close-up of hands stitching brown leather" } }],
    reels: [{ platform: "instagram", hook: "3 bags, one outfit", beats: [{ seconds: 0, shot: "Bags on the table" }, { seconds: 4, shot: "Outfit change" }], caption: "Which one would you pick?", hashtags: [], sound: "Upbeat; pick a trending sound in the app" }],
  };
  it("accept good drafts", () => expect(checkDrafts(ok)).toEqual([]));
  it("refuse links, Pinterest images, virality promises, late hooks and long reels", () => {
    expect(checkDrafts({ ...ok, posts: [{ ...ok.posts[0], visual: { source: "stock", brief: "Take the image from Pinterest board X" } }] })).not.toEqual([]);
    expect(checkDrafts({ ...ok, posts: [{ ...ok.posts[0], caption: "Shop now at https://x.example" }] })).not.toEqual([]);
    expect(checkDrafts({ ...ok, reels: [{ ...ok.reels[0], hook: "This will go viral" }] })).not.toEqual([]);
    expect(checkDrafts({ ...ok, reels: [{ ...ok.reels[0], beats: [{ seconds: 5, shot: "Late start" }, { seconds: 95, shot: "End" }] }] }).length).toBe(2);
  });
});

describe("publishing in the engine", () => {
  const publish = { type: "social.publish", platform: "instagram", draftId: "draft-0001" };
  it("is refused without an approval step first", () => {
    const r = validateAutomation({ solution: "social_studio", version: 1, trigger: { type: "schedule", everyMinutes: 60 }, steps: [publish] }, ["publish_posts"]);
    expect(!r.ok && r.errors.join()).toMatch(/approval step first/);
  });
  it("is accepted after the owner's approval", () => {
    const r = validateAutomation({ solution: "social_studio", version: 1, trigger: { type: "schedule", everyMinutes: 60 },
      steps: [{ type: "approval", ask: "Publish this post?", expiresHours: 48 }, publish] }, ["publish_posts"]);
    expect(r.ok).toBe(true);
  });
});
