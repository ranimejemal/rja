"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Markdown } from "@/lib/markdown";

// The setup assistant: the customer describes the problem or sends a screenshot, and gets the fix. Known problems
// are answered instantly; the rest by the AI with this automation's guide. Optionally it connects to the
// customer's n8n (address + API key, kept only in this page's memory) to read the last error and fix the
// Settings box in one click. Anything it cannot solve goes to a human with the whole conversation.

type Known = { id: string; title: string; answer: string; fix: "ai_settings" | "switch_gemini" | "retry" | null };
type Msg = { role: "user" | "assistant"; content: string; image?: string; known?: Known[] };
type N8nState = {
  url: string; key: string; connected: boolean; workflows: { id: string; name: string }[]; workflowId: string | null;
  lastError: { executionId: string; at: string | null; node: string | null; message: string } | null; known: Known[];
};

const MAX_SIDE = 1600;

/** Shrinks a screenshot to at most 1600 px and JPEG, so it uploads fast and stays under the size limit. */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function post<T>(payload: unknown): Promise<T> {
  const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({ error: "The assistant did not answer. Try again." }));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data as T;
}

const WELCOME: Msg = {
  role: "assistant",
  content: "Hi! Tell me where you are stuck, or send a **screenshot** of the screen or the red error in n8n, and I will tell you exactly what to click.",
};

export function SetupAssistant({ productId, canEscalate }: { productId: string; canEscalate: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const [n8n, setN8n] = useState<N8nState>({ url: "", key: "", connected: false, workflows: [], workflowId: null, lastError: null, known: [] });
  const [n8nBusy, setN8nBusy] = useState(false);
  const [n8nNote, setN8nNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const scroll = () => requestAnimationFrame(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }));
  const history = (list: Msg[]) => list.filter((m) => m !== WELCOME).map(({ role, content }) => ({ role, content: content || "(screenshot)" }));

  async function attach(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Send an image (a screenshot)."); return; }
    try { setImage(await shrink(file)); setError(null); } catch { setError("This image could not be read. Try a PNG or JPEG screenshot."); }
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy || (!text.trim() && !image)) return;
    const mine: Msg = { role: "user", content: text.trim(), image: image ?? undefined };
    const next = [...messages, mine];
    setMessages(next); setText(""); setImage(null); setBusy(true); setError(null); scroll();
    try {
      const r = await post<{ reply: string | null; known: Known[]; warning: string | null }>({
        action: "chat", productId, messages: history(next).slice(-20), image: mine.image ?? null, n8nError: n8n.lastError?.message ?? null,
      });
      const content = [r.warning && `⚠️ ${r.warning}`, r.reply ?? (r.known.length ? "" : "I could not find the answer right away. Press **Send to a human** below: we get the whole conversation and answer quickly.")]
        .filter(Boolean).join("\n\n");
      setMessages((m) => [...m, { role: "assistant", content, known: r.reply ? r.known.filter((k) => k.fix) : r.known }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setBusy(false); scroll(); }
  }

  async function connect(workflowId?: string) {
    setN8nBusy(true); setN8nNote(null);
    try {
      const r = await post<{ workflows: { id: string; name: string }[]; workflowId: string | null; lastError?: N8nState["lastError"]; known?: Known[] }>({
        action: "n8n-connect", productId, n8n: { url: n8n.url, key: n8n.key }, workflowId: workflowId ?? null,
      });
      setN8n((s) => ({ ...s, connected: true, workflows: r.workflows, workflowId: r.workflowId, lastError: r.lastError ?? null, known: r.known ?? [] }));
      if (!r.workflowId) setN8nNote(r.workflows.length ? "Connected. Which workflow is this automation?" : "Connected, but your n8n has no workflow yet: import your file first (step “Import it into n8n”).");
      else if (!r.lastError) setN8nNote("Connected. No failed run found: if it still does not work, describe what happens in the chat.");
    } catch (err) {
      setN8nNote(err instanceof Error ? err.message : "Could not connect.");
    } finally { setN8nBusy(false); }
  }

  async function fix(kind: Known["fix"]) {
    if (!kind || !n8n.connected) return;
    setN8nBusy(true); setN8nNote(null);
    try {
      if (kind === "retry") {
        if (!n8n.lastError) return;
        const r = await post<{ retried: boolean }>({ action: "n8n-retry", productId, n8n: { url: n8n.url, key: n8n.key }, executionId: n8n.lastError.executionId });
        setN8nNote(r.retried ? "Done: I started the run again. Check again in a minute." : "Your n8n cannot retry from here: open Executions in n8n, click the failed run and click Retry.");
        return;
      }
      if (!n8n.workflowId) return;
      const what = kind === "switch_gemini" ? "switch the AI of this workflow to free Google Gemini" : "correct the AI address and model in the Settings box";
      if (!window.confirm(`I will ${what} in your n8n. Nothing else is changed. Continue?`)) return;
      const r = await post<{ changed: string[]; provider: string }>({ action: "n8n-fix", productId, n8n: { url: n8n.url, key: n8n.key }, workflowId: n8n.workflowId, fix: kind });
      setN8nNote(r.changed.length
        ? `Fixed: the Settings box now uses ${r.provider}. ${kind === "switch_gemini" ? "Now create the Gemini credential (step “Connect your accounts”) and choose it in the AI boxes. " : ""}Test again with “Execute workflow”.`
        : `The Settings box already uses ${r.provider}, so the problem is the credential: check its key and Base URL (see the answer above).`);
    } catch (err) {
      setN8nNote(err instanceof Error ? err.message : "Could not apply the fix.");
    } finally { setN8nBusy(false); }
  }

  async function escalate() {
    if (!window.confirm("Send this conversation to the agency? A person answers you by email and in your support requests (screenshots are not sent: describe them in a message if needed).")) return;
    setBusy(true); setError(null);
    try {
      const extra = n8n.lastError ? [{ role: "user" as const, content: `Last n8n error (${n8n.lastError.node ?? "unknown box"}): ${n8n.lastError.message}` }] : [];
      const r = await post<{ ticketUrl: string | null }>({ action: "escalate", productId, messages: [...history(messages), ...extra].slice(-30) });
      setTicketUrl(r.ticketUrl ?? "sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send it.");
    } finally { setBusy(false); }
  }

  const fixButton = (k: Known) => {
    if (!k.fix) return null;
    if (!n8n.connected) return <a className="link tiny" href="#assistant-n8n" onClick={() => (document.getElementById("assistant-n8n") as HTMLDetailsElement | null)?.setAttribute("open", "")}>Connect your n8n below and I can fix this for you</a>;
    if (k.fix === "retry" && !n8n.lastError) return null;
    return <button type="button" className="btn small accent" disabled={n8nBusy} onClick={() => fix(k.fix)}>{k.fix === "retry" ? "Run it again" : k.fix === "switch_gemini" ? "Switch to free Gemini for me" : "Fix it for me"}</button>;
  };

  return (
    <section className="card stack assistant" id="assistant" aria-labelledby="assistant-h">
      <div className="row between" style={{ alignItems: "baseline" }}>
        <h2 id="assistant-h" className="h3">Stuck? Ask the setup assistant</h2>
        <span className="tag">answers in seconds</span>
      </div>

      <div className="assistant-log" ref={logRef} aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`assistant-msg ${m.role}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a local data: URL */}
            {m.image && <img src={m.image} alt="Your screenshot" className="assistant-shot" />}
            {m.content && (m.role === "assistant" ? <Markdown source={m.content} /> : <p>{m.content}</p>)}
            {m.known?.map((k) => (
              <div key={k.id} className="assistant-known stack">
                <strong className="small">{k.title}</strong>
                {!(m.content && k.fix) && <Markdown source={k.answer} />}
                {fixButton(k)}
              </div>
            ))}
          </div>
        ))}
        {busy && <div className="assistant-msg assistant"><p className="muted">Looking into it…</p></div>}
      </div>

      <form onSubmit={send} className="stack" style={{ "--gap": "0.5rem" } as React.CSSProperties}>
        {image && (
          <div className="row" style={{ alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a local data: URL */}
            <img src={image} alt="Screenshot to send" className="assistant-shot small" />
            <button type="button" className="btn small ghost" onClick={() => setImage(null)}>Remove</button>
          </div>
        )}
        <label htmlFor="assistant-text" className="sr-only">Your message</label>
        <textarea
          id="assistant-text" value={text} maxLength={4000} rows={2} placeholder="E.g. “The AI box shows Authorization failed” (you can also paste a screenshot here)"
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => { const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/")); if (f) { e.preventDefault(); attach(f); } }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <div className="row between">
          <div className="row">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { attach(e.target.files?.[0]); e.target.value = ""; }} />
            <button type="button" className="btn small ghost" onClick={() => fileRef.current?.click()}>Add a screenshot</button>
          </div>
          <button type="submit" className="btn small" disabled={busy || (!text.trim() && !image)}>Send</button>
        </div>
        {error && <p className="small" role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
      </form>

      <details id="assistant-n8n" className="assistant-n8n">
        <summary className="small"><strong>Let the assistant look into your n8n</strong> (optional: finds the error and fixes it in one click)</summary>
        <div className="stack" style={{ "--gap": "0.6rem", marginTop: "0.75rem" } as React.CSSProperties}>
          <ol className="small">
            <li>In n8n, click your name (bottom left) → <strong>Settings</strong> → <strong>n8n API</strong> → <strong>Create an API key</strong>. Name it “setup help”, then copy it.</li>
            <li>Paste your n8n address (the one in your browser, e.g. https://yourname.app.n8n.cloud) and the key below.</li>
          </ol>
          <div className="field"><label htmlFor="n8n-url">Your n8n address</label>
            <input id="n8n-url" type="url" placeholder="https://yourname.app.n8n.cloud" value={n8n.url} autoComplete="off" onChange={(e) => setN8n((s) => ({ ...s, url: e.target.value, connected: false }))} /></div>
          <div className="field"><label htmlFor="n8n-key">n8n API key</label>
            <input id="n8n-key" type="password" autoComplete="off" value={n8n.key} onChange={(e) => setN8n((s) => ({ ...s, key: e.target.value, connected: false }))} />
            <span className="hint">Used only while this page is open, never saved. When you are done you can delete the key in n8n.</span></div>
          <button type="button" className="btn small" disabled={n8nBusy || !n8n.url || n8n.key.length < 10} onClick={() => connect()}>{n8nBusy ? "Checking…" : n8n.connected ? "Check again" : "Connect and check"}</button>

          {n8n.connected && n8n.workflows.length > 0 && (
            <div className="field"><label htmlFor="n8n-wf">Workflow</label>
              <select id="n8n-wf" value={n8n.workflowId ?? ""} onChange={(e) => e.target.value && connect(e.target.value)}>
                <option value="">Choose…</option>
                {n8n.workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select></div>
          )}
          {n8n.lastError && (
            <div className="assistant-known stack">
              <strong className="small">Last error{n8n.lastError.node ? ` in “${n8n.lastError.node}”` : ""}{n8n.lastError.at ? `, ${new Date(n8n.lastError.at).toLocaleString("en-GB")}` : ""}</strong>
              <code className="tiny" style={{ whiteSpace: "pre-wrap" }}>{n8n.lastError.message}</code>
              {n8n.known.length ? n8n.known.map((k) => (
                <div key={k.id} className="stack"><strong className="small">{k.title}</strong><Markdown source={k.answer} />{fixButton(k)}</div>
              )) : (
                <button type="button" className="btn small ghost" disabled={busy} onClick={() => { setText(`My n8n shows this error: ${n8n.lastError!.message}`); }}>Ask the assistant about this error</button>
              )}
            </div>
          )}
          {n8nNote && <p className="small" role="status">{n8nNote}</p>}
        </div>
      </details>

      <div className="row between" style={{ alignItems: "center" }}>
        {ticketUrl ? (
          <p className="small" role="status">Sent. A person will answer you soon{ticketUrl !== "sent" && <> — follow it in <Link className="link" href={ticketUrl}>your support request</Link></>}.</p>
        ) : (
          <p className="tiny muted">Still stuck after a few messages? A person takes over, with this conversation.</p>
        )}
        {canEscalate && !ticketUrl && <button type="button" className="btn small ghost" disabled={busy || messages.length < 2} onClick={escalate}>Send to a human</button>}
      </div>
    </section>
  );
}
