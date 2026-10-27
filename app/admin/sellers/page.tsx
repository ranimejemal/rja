import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { features } from "@/lib/env";
import { bpsToPercent } from "@/lib/money";
import { ConfirmSubmit } from "@/components/client";
import { StatusPill } from "@/components/ui";
import { setCommissionOverride, setSellerStatus } from "../actions";

export const metadata: Metadata = { title: "Sellers" };

export default async function AdminSellers() {
  const supabase = await createClient();
  const { data: sellers } = await supabase.from("seller_profiles").select("id, slug, display_name, status, is_platform, is_demo, country, created_at").order("created_at", { ascending: false });
  // Commission overrides are not exposed through the public API; the admin page reads them server-side.
  const overrides = new Map<string, number | null>();
  if (features.serverAdmin) {
    const { data } = await createAdminClient().from("seller_profiles").select("id, commission_bps_override");
    (data ?? []).forEach((s) => overrides.set(s.id, s.commission_bps_override));
  }
  const { data: settings } = await supabase.from("platform_settings").select("default_commission_bps").single();
  return (
    <>
      <div className="stack"><span className="tag">(Sellers)</span><h1 className="h2">Sellers</h1>
        <p className="small muted">Default commission: {bpsToPercent(settings?.default_commission_bps ?? 2000)}. Overrides apply to future sales only.</p></div>
      {(sellers ?? []).map((s) => (
        <div key={s.id} className="card stack">
          <div className="row between">
            <div className="row"><Link className="h3" style={{ textDecoration: "none" }} href={`/sellers/${s.slug}`}>{s.display_name}</Link>
              {s.is_platform && <span className="badge platform">Platform</span>}{s.is_demo && <span className="badge demo">Demo</span>}</div>
            <StatusPill status={s.status} />
          </div>
          <p className="small muted">{s.country ?? "—"} · joined {new Date(s.created_at).toLocaleDateString("en-GB")}</p>
          {!s.is_platform && (
            <div className="row" style={{ alignItems: "flex-end" }}>
              <form action={setSellerStatus} className="row" style={{ alignItems: "flex-end" }}>
                <input type="hidden" name="id" value={s.id} />
                <div className="field"><label htmlFor={`sn-${s.id}`}>Reason</label><input id={`sn-${s.id}`} name="note" required /></div>
                {s.status === "suspended"
                  ? <button className="btn ghost small" name="status" value="approved">Reinstate</button>
                  : <ConfirmSubmit className="btn danger small" name="status" value="suspended" title={`Suspend ${s.display_name}?`} message="All their published products are suspended too.">Suspend</ConfirmSubmit>}
              </form>
              <form action={setCommissionOverride} className="row" style={{ alignItems: "flex-end" }}>
                <input type="hidden" name="id" value={s.id} />
                <div className="field" style={{ maxWidth: "9rem" }}><label htmlFor={`c-${s.id}`}>Commission %</label>
                  <input id={`c-${s.id}`} name="percent" inputMode="decimal" placeholder="default" defaultValue={overrides.get(s.id) != null ? String(overrides.get(s.id)! / 100) : ""} /></div>
                <div className="field"><label htmlFor={`cn-${s.id}`}>Reason</label><input id={`cn-${s.id}`} name="note" required /></div>
                <ConfirmSubmit className="btn ghost small" title="Change this seller's commission?" message="The new rate applies to future sales only. Past orders keep their recorded rate.">Save rate</ConfirmSubmit>
              </form>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
