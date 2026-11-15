"use client";

import { useState, useTransition } from "react";
import { analyseExport, type StudioResult } from "@/app/studio/actions";
import type { Drafts } from "@/lib/social/content-rules";

const FORMAT: Record<string, string> = { image: "Photos", carousel: "Carousels", reel: "Reels", video: "Videos", text: "Text posts", other: "Other", story: "Stories" };

const HOW: Record<string, string[]> = {
  instagram: ["Open business.facebook.com (Meta Business Suite) on a computer.", "Insights → Content → choose Instagram and the last 90 days (or more).", "Click Export data → CSV."],
  facebook: ["Open business.facebook.com (Meta Business Suite) on a computer.", "Insights → Content → choose Facebook and the last 90 days (or more).", "Click Export data → CSV."],
  tiktok: ["Open tiktok.com on a computer and sign in.", "Profile menu → Business Suite (or Creator tools) → Analytics → Content.", "Choose the period and click Download data."],
  linkedin: ["Open your LinkedIn company page as an admin.", "Analytics → Updates → choose the period.", "Click Export."],
};

export function Studio() {
  const [platform, setPlatform] = useState("instagram");
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [brief, setBrief] = useState("");
  const [posts, setPosts] = useState(4);
  const [reels, setReels] = useState(2);
  const [result, setResult] = useState<StudioResult | null>(null);
  const [pending, start] = useTransition();

  async function pick(file: File | undefined) {
    if (!file) return;
    if (file.size > 3_000_000) { setResult({ ok: false, error: "This file is too big (3 MB at most). Export a shorter period." }); return; }
    setFileName(file.name);
    setCsv(await file.text());
    setResult(null);
  }
  const run = (generate: boolean) => start(async () => setResult(await analyseExport({ csv, platform, posts, reels, brief, generate })));

  return (
    <div className="stack" style={{ "--gap": "1.5rem" } as React.CSSProperties}>
      <div className="card stack">
        <div className="field">
          <label htmlFor="st-platform">Which account?</label>
          <select id="st-platform" value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ maxWidth: "16rem" }}>
            <option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="tiktok">TikTok</option><option value="linkedin">LinkedIn</option>
          </select>
        </div>
        <details className="small"><summary>How do I get the export file? (2 minutes)</summary>
          <ol>{HOW[platform].map((s) => <li key={s}>{s}</li>)}</ol>
          <p className="tiny muted">It is your own data, downloaded by you. We read it to make this report and do not keep it.</p>
        </details>
        <div className="field">
          <label htmlFor="st-file">Your export file (.csv)</label>
          <input id="st-file" type="file" accept=".csv,text/csv" onChange={(e) => pick(e.target.files?.[0])} />
          {fileName && <span className="hint">{fileName}</span>}
        </div>
        <div className="field">
          <label htmlFor="st-brief">Anything to focus on? (optional)</label>
          <textarea id="st-brief" rows={2} maxLength={500} value={brief} onChange={(e) => setBrief(e.target.value)}
            placeholder="e.g. Our new winter collection launches on 1 December; more behind-the-scenes; less selling." />
        </div>
        <div className="row">
          <div className="field"><label htmlFor="st-posts">New posts</label>
            <input id="st-posts" type="number" min={0} max={6} value={posts} onChange={(e) => setPosts(Number(e.target.value))} style={{ width: "6rem" }} /></div>
          <div className="field"><label htmlFor="st-reels">Reel plans</label>
            <input id="st-reels" type="number" min={0} max={3} value={reels} onChange={(e) => setReels(Number(e.target.value))} style={{ width: "6rem" }} /></div>
        </div>
        <div className="row">
          <button type="button" className="btn accent" disabled={!csv || pending} onClick={() => run(true)}>{pending ? "Working… (up to a minute)" : "Analyse and create"}</button>
          <button type="button" className="btn ghost" disabled={!csv || pending} onClick={() => run(false)}>Analyse only</button>
        </div>
      </div>

      {result && !result.ok && <div className="notice danger" role="alert">{result.error}</div>}
      {result?.ok && <Report r={result} />}
    </div>
  );
}

function Report({ r }: { r: Extract<StudioResult, { ok: true }> }) {
  const a = r.analysis;
  return (
    <>
      <section className="card stack" aria-labelledby="st-report">
        <h2 id="st-report" className="h3">What works on your account</h2>
        <p className="small muted">
          {a.posts} posts from {a.period.from} to {a.period.to} (about {a.postsPerWeek} a week){r.skipped ? `; ${r.skipped} rows without a date were skipped` : ""}.
          {" "}Engagement = likes + comments + shares + saves, per 100 people reached.
        </p>
        {a.notes.map((n) => <p key={n} className="small notice">{n}</p>)}

        <div className="studio-grid">
          <div>
            <h3 className="tag">Formats</h3>
            <table className="small"><thead><tr><th>Format</th><th className="num">Posts</th><th className="num">Engagement</th></tr></thead>
              <tbody>{a.formats.map((f) => <tr key={f.format}><td>{FORMAT[f.format]}</td><td className="num">{f.posts}</td><td className="num">{f.avgRate !== null ? `${f.avgRate} / 100` : `${f.avgEngagement} avg`}</td></tr>)}</tbody></table>
          </div>
          <div>
            <h3 className="tag">Best times to post</h3>
            {a.bestTimes.length ? <ol className="small">{a.bestTimes.map((t) => <li key={t.day + t.slot}>{t.day}, {t.slot} <span className="muted">({t.avgRate} / 100, {t.posts} posts)</span></li>)}</ol>
              : <p className="small muted">Not enough posts yet to tell.</p>}
            <p className="tiny muted">Times as in your file (your account’s time zone).</p>
          </div>
          <div>
            <h3 className="tag">Your caption habits</h3>
            <ul className="small">
              <li>About {a.captions.avgLength} characters</li>
              <li>{a.captions.withEmoji} % use emoji · {a.captions.avgHashtags} hashtags on average</li>
              <li>{a.captions.withQuestion} % ask a question · {a.captions.withCallToAction} % have a call to action</li>
            </ul>
          </div>
        </div>

        <h3 className="tag">Your best posts</h3>
        <ol className="small studio-top">
          {a.top.map((t, i) => (
            <li key={i}><span className="muted">{t.date} · {FORMAT[t.format]} · {t.rate !== null ? `${t.rate} / 100` : `${t.engagement} interactions`}</span>
              <br />{t.caption || "(no caption)"} {t.permalink && <a className="link" href={t.permalink} target="_blank" rel="noopener noreferrer">open</a>}</li>
          ))}
        </ol>
      </section>

      {r.draftError && <div className="notice warn" role="status">{r.draftError}</div>}
      {r.drafts && <DraftList d={r.drafts} />}
    </>
  );
}

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" className="btn ghost small" onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}>{done ? "Copied" : "Copy"}</button>;
}

function DraftList({ d }: { d: Drafts }) {
  return (
    <>
      <section className="card stack" aria-labelledby="st-style">
        <h2 id="st-style" className="h3">Your style</h2>
        <p>{d.styleSummary}</p>
        <div className="badges">{d.pillars.map((p) => <span key={p} className="badge">{p}</span>)}</div>
        <p className="tiny muted">Written by AI from your own posts. Check every draft before you publish: you stay the author.</p>
      </section>

      {d.posts.map((p, i) => {
        const full = `${p.caption}\n\n${p.hashtags.join(" ")}`.trim();
        return (
          <article key={`p${i}`} className="card stack studio-draft">
            <div className="row between"><strong>Post {i + 1} · {p.format === "carousel" ? "Carousel" : "Photo"} · {p.pillar}</strong><span className="tiny muted">{p.when}</span></div>
            <p className="studio-caption">{full}</p>
            {p.slides?.length ? <ol className="small">{p.slides.map((s, j) => <li key={j}>{s}</li>)}</ol> : null}
            <p className="small"><span className="tag">{p.visual.source === "generate" ? "AI image idea" : p.visual.source === "own_photo" ? "Photo to take" : "Free stock photo to find"}</span> {p.visual.brief}</p>
            <div className="row"><Copy text={full} /></div>
          </article>
        );
      })}

      {d.reels.map((r, i) => {
        const full = `${r.caption}\n\n${r.hashtags.join(" ")}`.trim();
        return (
          <article key={`r${i}`} className="card stack studio-draft">
            <div className="row between"><strong>Reel {i + 1}</strong><span className="tiny muted">{r.when}</span></div>
            <p className="studio-hook">“{r.hook}”</p>
            <table className="small"><thead><tr><th>Time</th><th>Shot</th><th>Text on screen</th><th>Voice</th></tr></thead>
              <tbody>{r.beats.map((b, j) => <tr key={j}><td className="num">{b.seconds}s</td><td>{b.shot}</td><td>{b.onScreenText}</td><td>{b.voiceover}</td></tr>)}</tbody></table>
            <p className="small"><span className="tag">Sound</span> {r.sound}</p>
            <p className="studio-caption">{full}</p>
            <div className="row"><Copy text={full} /></div>
          </article>
        );
      })}
    </>
  );
}
