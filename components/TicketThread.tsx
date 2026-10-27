import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { replyToTicket } from "@/app/support-actions";
import { SubmitButton } from "./client";
import { StatusPill } from "./ui";

/** A support conversation, shown to the buyer or the seller. Only the participants can load it. */
export async function TicketThread({ ticketId, viewerId, returnTo }: { ticketId: string; viewerId: string; returnTo: string }) {
  const supabase = await createClient();
  const { data: t } = await supabase.from("support_tickets")
    .select("id, subject, status, created_at, buyer_id, product:products(name), messages:support_messages(id, author_id, body, created_at)")
    .eq("id", ticketId).maybeSingle();
  if (!t) notFound();
  const messages = [...t.messages].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return (
    <div className="stack" style={{ "--gap": "1.25rem" } as React.CSSProperties}>
      <div className="stack">
        <h1 className="h2">{t.subject}</h1>
        <div className="row small muted"><StatusPill status={t.status} /><span>{t.product?.name}</span></div>
      </div>
      {messages.map((m) => (
        <div key={m.id} className="card stack" style={{ "--gap": "0.4rem", marginLeft: m.author_id === viewerId ? "auto" : 0, maxWidth: "40rem", background: m.author_id === viewerId ? "var(--surface-2)" : undefined } as React.CSSProperties}>
          <span className="tiny muted">{m.author_id === viewerId ? "You" : m.author_id === t.buyer_id ? "Buyer" : "Seller"} · {new Date(m.created_at).toLocaleString("en-GB")}</span>
          <p style={{ whiteSpace: "pre-wrap" }}>{m.body}</p>
        </div>
      ))}
      {t.status !== "closed" && (
        <form action={replyToTicket} className="card stack">
          <input type="hidden" name="ticket_id" value={t.id} />
          <input type="hidden" name="return_to" value={returnTo} />
          <div className="field"><label htmlFor="reply">Reply</label><textarea id="reply" name="body" required maxLength={5000} /></div>
          <SubmitButton className="btn small">Send</SubmitButton>
        </form>
      )}
    </div>
  );
}
