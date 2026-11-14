"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  buildProfile, displayAnswer, isAnswered, matchingSolutions, nextQuestion, optionsOf, progress, questionById, visibleQuestions,
  type Answers, type Question,
} from "@/lib/discovery";
import { finishDiscovery, saveDiscoveryAnswer } from "@/app/start/actions";

// Business discovery as a short conversation. Each answer is saved at once, so the customer can leave and come
// back; any earlier answer can be changed. Voice input uses the browser's own speech recognition when it has one.

type Product = { slug: string; name: string; price_label: string | null; short_description: string | null };

export function Discovery({ initial, completedAt, products }: { initial: Answers; completedAt: string | null; products: Product[] }) {
  const [answers, setAnswers] = useState<Answers>(initial);
  const [done, setDone] = useState<string | null>(completedAt);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  const current = editing ? questionById(editing) : nextQuestion(answers);
  const { done: answered, total } = progress(answers);
  const asked = visibleQuestions(answers).filter((q) => isAnswered(answers, q));

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [answered, editing]);

  function save(q: Question, value: unknown) {
    setError(null);
    start(async () => {
      const r = await saveDiscoveryAnswer(q.id, value);
      if (!r.ok) { setError(r.error); return; }
      setAnswers(r.answers);
      setEditing(null);
    });
  }
  function finish() {
    setError(null);
    start(async () => {
      const r = await finishDiscovery();
      if (!r.ok) { setError(r.error); return; }
      setDone(r.completedAt ?? new Date().toISOString());
    });
  }

  if (done && !editing) return <Summary answers={answers} products={products} onEdit={(id) => { setDone(null); setEditing(id); }} />;

  return (
    <div className="discovery stack">
      <div className="discovery-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered}
        aria-label={`${answered} of ${total} questions answered`}>
        <span style={{ width: `${Math.round((answered / Math.max(total, 1)) * 100)}%` }} />
      </div>
      <p className="tiny muted">{answered} of {total} · saved as you go: you can leave and come back.</p>

      <ol className="discovery-log">
        {asked.map((q) => (
          <li key={q.id} className="discovery-pair">
            <p className="discovery-q">{q.title(answers)}</p>
            {editing === q.id ? null : (
              <div className="discovery-a">
                <span>{displayAnswer(q, answers[q.id], answers)}</span>
                <button type="button" className="link tiny" onClick={() => { setError(null); setEditing(q.id); }} disabled={pending}>Change</button>
              </div>
            )}
          </li>
        ))}
      </ol>

      {current ? (
        <QuestionCard key={`${current.id}-${editing ?? ""}`} q={current} answers={answers} busy={pending} error={error}
          onSave={(v) => save(current, v)} onCancel={editing ? () => { setEditing(null); setError(null); } : undefined} />
      ) : (
        <div className="card stack discovery-card">
          <p className="discovery-q">That’s everything we need. Ready to see your business profile?</p>
          {error && <p className="small" role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
          <button type="button" className="btn accent" onClick={finish} disabled={pending}>{pending ? "Saving…" : "See my business profile"}</button>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

function QuestionCard({ q, answers, busy, error, onSave, onCancel }: {
  q: Question; answers: Answers; busy: boolean; error: string | null; onSave: (v: unknown) => void; onCancel?: () => void;
}) {
  const saved = answers[q.id];
  const [text, setText] = useState<string>(typeof saved === "string" ? saved : "");
  const [picked, setPicked] = useState<string[]>(() =>
    Array.isArray(saved) ? (saved as string[]) : q.kind === "multi" && q.prefill ? q.prefill(answers) : []);
  const options = optionsOf(q, answers);
  const id = `dq-${q.id}`;
  const help = q.help?.(answers);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.kind === "multi") onSave(picked);
    else if (q.kind === "text" || q.kind === "long") onSave(text);
  };

  return (
    <form className="card stack discovery-card" onSubmit={submit} aria-labelledby={`${id}-t`}>
      <p id={`${id}-t`} className="discovery-q">{q.title(answers)}</p>
      {help && <p className="small muted" id={`${id}-h`}>{help}</p>}

      {q.kind === "choice" && (
        <div className="discovery-options" role="group" aria-labelledby={`${id}-t`}>
          {options.map((o) => (
            <button key={o.value} type="button" className={`discovery-option${saved === o.value ? " on" : ""}`} disabled={busy}
              aria-pressed={saved === o.value} onClick={() => onSave(o.value)}>{o.label}</button>
          ))}
        </div>
      )}

      {q.kind === "multi" && (
        <>
          <div className="discovery-options" role="group" aria-labelledby={`${id}-t`}>
            {options.map((o) => {
              const on = picked.includes(o.value);
              // At the limit, the options not chosen wait until one is unticked.
              const full = Boolean(q.maxPicks && picked.length >= q.maxPicks && !on);
              return (
                <button key={o.value} type="button" className={`discovery-option${on ? " on" : ""}`} aria-pressed={on} disabled={busy || full}
                  onClick={() => setPicked((p) => (on ? p.filter((v) => v !== o.value) : [...p, o.value]))}>{on ? "✓ " : ""}{o.label}</button>
              );
            })}
          </div>
          {q.maxPicks && (
            <p className="tiny muted" role="status">
              {picked.length} of {q.maxPicks} chosen{picked.length >= q.maxPicks ? " — untick one to pick another." : "."}
            </p>
          )}
        </>
      )}

      {(q.kind === "text" || q.kind === "long") && (
        <div className="stack" style={{ "--gap": "0.4rem" } as React.CSSProperties}>
          <label htmlFor={id} className="sr-only">{q.title(answers)}</label>
          {q.kind === "text" ? (
            <input id={id} value={text} maxLength={q.max} autoFocus autoComplete="off" placeholder={q.placeholder?.(answers)}
              aria-describedby={help ? `${id}-h` : undefined} onChange={(e) => setText(e.target.value)} />
          ) : (
            <textarea id={id} value={text} maxLength={q.max} autoFocus rows={3} aria-describedby={help ? `${id}-h` : undefined}
              onChange={(e) => setText(e.target.value)} />
          )}
          <VoiceButton onText={(t) => setText((v) => (v ? `${v} ${t}` : t).slice(0, q.max))} />
        </div>
      )}

      {error && <p className="small" role="alert" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="row">
        {q.kind !== "choice" && (
          <button type="submit" className="btn accent small" disabled={busy}>{busy ? "Saving…" : "Continue"}</button>
        )}
        {q.optional && q.kind !== "choice" && (
          <button type="button" className="btn ghost small" disabled={busy} onClick={() => onSave(q.kind === "multi" ? [] : "")}>Skip</button>
        )}
        {onCancel && <button type="button" className="btn ghost small" onClick={onCancel} disabled={busy}>Cancel</button>}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- voice

type Recognition = { lang: string; interimResults: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error?: string }) => void) | null; start: () => void; stop: () => void };

const VOICE_ERRORS: Record<string, string> = {
  "not-allowed": "Your browser blocked the microphone. Click the lock icon next to the address, allow the microphone, then try again.",
  "service-not-allowed": "Your browser blocked the microphone. Click the lock icon next to the address, allow the microphone, then try again.",
  "no-speech": "I didn’t hear anything. Click “Speak instead” and talk right away.",
  "audio-capture": "No microphone was found. Check that one is connected.",
  network: "Voice typing needs an internet connection to your browser’s speech service. Please type instead.",
  "language-not-supported": "Voice typing doesn’t support your browser’s language. Please type instead.",
};
type RecognitionCtor = new () => Recognition;

function VoiceButton({ onText }: { onText: (t: string) => void }) {
  const [Ctor, setCtor] = useState<RecognitionCtor | null>(null);
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    setCtor(() => w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null);
    return () => rec.current?.stop();
  }, []);
  if (!Ctor) return null;
  const toggle = () => {
    if (listening) { rec.current?.stop(); return; }
    setProblem(null);
    const r = new Ctor();
    r.lang = navigator.language || "en-US";
    r.interimResults = false;
    r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0].transcript).join(" "));
    r.onend = () => setListening(false);
    r.onerror = (e) => { setListening(false); if (e.error !== "aborted") setProblem(VOICE_ERRORS[e.error ?? ""] ?? "Voice typing didn’t work this time. Please try again or type instead."); };
    rec.current = r;
    try { r.start(); setListening(true); } catch { setProblem("Voice typing couldn’t start. Please try again or type instead."); }
  };
  return (
    <div className="row" style={{ "--gap": "0.5rem" } as React.CSSProperties}>
      <button type="button" className="btn ghost small" onClick={toggle} aria-pressed={listening}>{listening ? "■ Stop" : "🎤 Speak instead"}</button>
      {listening && <span className="tiny muted" role="status">Listening… speak now, then click Stop.</span>}
      {problem && <span className="tiny" role="alert" style={{ color: "var(--danger)" }}>{problem}</span>}
    </div>
  );
}

// ---------------------------------------------------------------- summary

const LABEL: Record<string, string> = {
  "1": "Just you", "2-5": "2–5 people", "6-20": "6–20 people", "21-100": "21–100 people", "100+": "More than 100 people",
};

function Summary({ answers, products, onEdit }: { answers: Answers; products: Product[]; onEdit: (id: string) => void }) {
  const p = useMemo(() => buildProfile(answers), [answers]);
  const label = (id: string) => { const q = questionById(id); return q ? displayAnswer(q, answers[id], answers) : ""; };
  const matches = matchingSolutions(p).map((m) => ({ ...m, product: products.find((x) => x.slug === m.slug) })).filter((m) => m.product);
  const rows: [string, string, string][] = [
    ["Business", p.name, "business_name"], ["Type", label("industry"), "industry"], ["What you sell", p.offer, "offer"],
    ["Team", LABEL[p.size] ?? p.size, "size"], ["Customers reach you by", label("channels"), "channels"],
    ...(p.shopPlatform ? [["Online shop", label("shop_platform"), "shop_platform"] as [string, string, string]] : []),
    ["Apps you use", [label("apps"), p.otherApps].filter(Boolean).join(" · "), "apps"],
    ["Takes most time", label("time_sinks"), "time_sinks"], ["Hours a week", label("hours"), "hours"],
    ["Fix first", p.mainProblem, "problem"], ["Main goal", label("goal"), "goal"], ["Automations should", label("involvement"), "involvement"],
    ...(p.neverAutomate ? [["Never automate", p.neverAutomate, "never_automate"] as [string, string, string]] : []),
  ];
  return (
    <div className="stack" style={{ "--gap": "1.5rem" } as React.CSSProperties}>
      <section className="card stack" aria-labelledby="profile-h">
        <h2 id="profile-h" className="h3">Your business profile</h2>
        <p className="small muted">Saved. Only you and the agency can see it. Change anything at any time.</p>
        <dl className="profile-list">
          {rows.map(([k, v, id]) => (
            <div key={id} className="profile-row">
              <dt>{k}</dt>
              <dd>{v || "—"}</dd>
              <button type="button" className="link tiny" onClick={() => onEdit(id)}>Change</button>
            </div>
          ))}
        </dl>
      </section>

      <section className="card stack" aria-labelledby="matches-h">
        <h2 id="matches-h" className="h3">Ready-made automations that fit</h2>
        <p className="small muted">
          Picked from the tasks you said take most of your time. Personalised recommendations with costs and a step-by-step plan come
          next; until then, these are ready today, or <Link className="link" href="/quote">ask us to build what you need</Link>.
        </p>
        {matches.length ? (
          <ul className="match-list">
            {matches.map((m) => (
              <li key={m.slug} className="match-row">
                <div className="stack" style={{ "--gap": "0.2rem" } as React.CSSProperties}>
                  <Link className="link" href={`/products/${m.slug}`}><strong>{m.product!.name}</strong></Link>
                  <span className="tiny muted">For: {m.because}{m.product!.price_label ? ` · ${m.product!.price_label}` : ""}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small">None of our ready-made automations matches yet. <Link className="link" href="/quote">Tell us what you need</Link> and we’ll build it.</p>
        )}
      </section>
    </div>
  );
}
