import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { myAutomations, PURCHASED_LABEL } from "@/lib/buyer";
import { thumbnailUrl } from "@/lib/catalog";
import { EmptyState, LICENSE_LABEL, SellerBadge, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "My automations" };

export default async function BuyerDashboard() {
  const session = await requireUser("/dashboard");
  const items = await myAutomations(session.userId);
  // Admins get every agency automation for free (to test, or to set it up for a client).
  const supabase = await createClient();
  const { data: agency } = session.roles.includes("admin")
    ? await supabase.from("products").select("id, slug, name, thumbnail_path, price_minor, currency")
      .eq("ownership", "platform").eq("status", "published").order("top_rank", { nullsFirst: false }).order("name")
    : { data: null };
  const owned = new Set(items.map((it) => it.product.id));
  const free = (agency ?? []).filter((p) => !owned.has(p.id));
  return (
    <>
      <div className="stack">
        <span className="tag">(My automations)</span>
        <h1 className="h2">Hello, {session.displayName}.</h1>
        <p className="muted small">Everything you bought, with downloads, setup steps and saved configurations. Workflows run in your own n8n — we never show them as running.</p>
      </div>
      {items.length === 0 && free.length > 0 ? null : items.length === 0 ? (
        <EmptyState title="Nothing yet" action={<Link className="btn accent small" href="/explore">Explore automations</Link>}>
          Automations you buy appear here.
        </EmptyState>
      ) : (
        <div className="stack">
          {items.map((it) => (
            <Link key={it.entitlementId} href={`/dashboard/products/${it.product.id}`} className="card row" style={{ textDecoration: "none", alignItems: "flex-start", "--gap": "1.25rem" } as React.CSSProperties}>
              <Image src={thumbnailUrl(it.product.thumbnail_path)} alt="" width={150} height={100} style={{ borderRadius: "var(--radius-s)", border: "1px solid var(--line)" }} />
              <div className="stack" style={{ "--gap": "0.5rem", flex: 1, minWidth: "14rem" } as React.CSSProperties}>
                <div className="badges"><SellerBadge isPlatform={it.product.ownership === "platform"} /><span className="badge">{LICENSE_LABEL[it.license]}</span></div>
                <h2 className="h3">{it.product.name}</h2>
                <p className="small muted">by {it.product.seller?.display_name}</p>
                <div className="badges">{it.flags.map((f) => <StatusPill key={f} status={f} label={PURCHASED_LABEL[f]} />)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {free.length > 0 && (
        <section className="stack" aria-labelledby="free-h">
          <div className="stack" style={{ "--gap": "0.4rem" } as React.CSSProperties}>
            <h2 id="free-h" className="h3">All agency automations <span className="badge">Free for you</span></h2>
            <p className="small muted">As an admin you can open any of them without buying: fill in the form, download, set it up.</p>
          </div>
          <div className="grid" style={{ "--cols": 3 } as React.CSSProperties}>
            {free.map((p) => (
              <Link key={p.id} href={`/dashboard/products/${p.id}`} className="card stack" style={{ textDecoration: "none", "--gap": "0.6rem" } as React.CSSProperties}>
                <Image src={thumbnailUrl(p.thumbnail_path)} alt="" width={300} height={180} style={{ width: "100%", height: "auto", borderRadius: "var(--radius-s)", border: "1px solid var(--line)" }} />
                <strong>{p.name}</strong>
                <span className="tiny muted">Open the setup tool →</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
