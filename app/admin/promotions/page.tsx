import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { features } from "@/lib/env";
import { SubmitButton } from "@/components/client";
import { EmptyState, Notice, StatusPill } from "@/components/ui";
import { savePromotion, sendPromotionTest, setPromotionActive } from "../actions";

export const metadata: Metadata = { title: "Promotions" };

type Promo = { id: string; name: string; subject: string; message: string; cta_label: string; cta_path: string; min_seconds: number; ends_at: string | null; active: boolean };

function PromotionForm({ p }: { p?: Promo }) {
  const id = p?.id ?? "new";
  return (
    <form action={savePromotion} className="stack" style={{ "--gap": "0.75rem" } as React.CSSProperties}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="field"><label htmlFor={`name-${id}`}>Name (only you see it)</label><input id={`name-${id}`} name="name" required maxLength={120} defaultValue={p?.name ?? ""} placeholder="November offer" /></div>
      <div className="field"><label htmlFor={`subject-${id}`}>Email subject</label><input id={`subject-${id}`} name="subject" required maxLength={150} defaultValue={p?.subject ?? ""} placeholder="A gift for you: 10% off your first automation" /></div>
      <div className="field">
        <label htmlFor={`message-${id}`}>Message</label>
        <textarea id={`message-${id}`} name="message" required minLength={10} maxLength={4000} rows={5} defaultValue={p?.message ?? ""}
          placeholder={"Thanks for visiting Ranime Jemal Agency.\n\nThis week, reply to this email or send a quote request with the word NOVEMBER and get 10% off your setup."} />
        <span className="hint">Leave an empty line between paragraphs. Say clearly how the customer gets the offer (a code, a reply, a quote request).</span>
      </div>
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div className="field" style={{ flex: 1, minWidth: "10rem" }}><label htmlFor={`cta-${id}`}>Button text</label><input id={`cta-${id}`} name="cta_label" required maxLength={60} defaultValue={p?.cta_label ?? "See the offer"} /></div>
        <div className="field" style={{ flex: 1, minWidth: "10rem" }}><label htmlFor={`path-${id}`}>Button opens (page of the site)</label><input id={`path-${id}`} name="cta_path" required maxLength={300} defaultValue={p?.cta_path ?? "/explore"} placeholder="/explore" /></div>
      </div>
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div className="field" style={{ flex: 1, minWidth: "10rem" }}><label htmlFor={`min-${id}`}>Send after this many minutes on the site (same day)</label><input id={`min-${id}`} name="min_minutes" type="number" min={1} max={120} required defaultValue={p ? Math.round(p.min_seconds / 60) : 5} /></div>
        <div className="field" style={{ flex: 1, minWidth: "10rem" }}><label htmlFor={`end-${id}`}>Last day (optional)</label><input id={`end-${id}`} name="ends_at" type="date" defaultValue={p?.ends_at?.slice(0, 10) ?? ""} /></div>
      </div>
      <SubmitButton className="btn small">{p ? "Save changes" : "Create promotion"}</SubmitButton>
    </form>
  );
}

export default async function Promotions() {
  const supabase = await createClient();
  const [{ data: promos }, { data: sends }] = await Promise.all([
    supabase.from("promotions").select("id, name, subject, message, cta_label, cta_path, min_seconds, ends_at, active, created_at").order("created_at", { ascending: false }),
    supabase.from("promotion_sends").select("promotion_id, status"),
  ]);
  const stats = (id: string) => (sends ?? []).filter((s) => s.promotion_id === id).reduce((a, s) => ({ ...a, [s.status]: (a[s.status] ?? 0) + 1 }), {} as Record<string, number>);
  return (
    <>
      <div className="stack">
        <span className="tag">(Promotions)</span>
        <h1 className="h2">Promotion emails</h1>
        <p className="small muted">
          When a signed-in customer has spent the chosen time on the site today, they automatically receive the running promotion by email.
          It only goes to customers who ticked “send me offers” (at sign-up or in their settings), once per promotion and at most once a week,
          with an unsubscribe link, as the law (GDPR) requires. One promotion runs at a time.
        </p>
      </div>
      {!features.email && (
        <Notice tone="warn">Emails cannot be sent yet: add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM in Vercel (the same Gmail app password as your Supabase emails works). Promotions are not reserved for anyone until then.</Notice>
      )}
      <details className="card">
        <summary><strong>New promotion</strong></summary>
        <div style={{ marginTop: "1rem" }}><PromotionForm /></div>
      </details>
      {promos?.length ? promos.map((p) => {
        const s = stats(p.id);
        return (
          <div key={p.id} className="card stack">
            <div className="row between">
              <strong>{p.name}</strong>
              <StatusPill status={p.active ? "active" : "paused"} label={p.active ? "Running" : "Off"} />
            </div>
            <p className="small muted">Subject: {p.subject} · after {Math.round(p.min_seconds / 60)} min · sent {s.sent ?? 0}{s.failed ? ` · failed ${s.failed}` : ""}{p.ends_at ? ` · until ${new Date(p.ends_at).toLocaleDateString("en-GB")}` : ""}</p>
            <div className="row">
              <form action={setPromotionActive}>
                <input type="hidden" name="id" value={p.id} /><input type="hidden" name="active" value={String(!p.active)} />
                <SubmitButton className={p.active ? "btn ghost small" : "btn accent small"}>{p.active ? "Switch off" : "Switch on"}</SubmitButton>
              </form>
              <form action={sendPromotionTest}>
                <input type="hidden" name="id" value={p.id} />
                <SubmitButton className="btn ghost small" pendingText="Sending…">Send me a test</SubmitButton>
              </form>
            </div>
            <details><summary className="small">Edit</summary><div style={{ marginTop: "1rem" }}><PromotionForm p={p} /></div></details>
          </div>
        );
      }) : <EmptyState title="No promotions yet">Create one above, send yourself a test, then switch it on.</EmptyState>}
    </>
  );
}
