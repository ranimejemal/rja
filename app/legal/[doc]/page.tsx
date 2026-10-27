import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Markdown } from "@/lib/markdown";
import { Notice } from "@/components/ui";
import type { Database } from "@/lib/supabase/database.types";

const DOCS: Record<string, Database["public"]["Enums"]["agreement_kind"]> = {
  terms: "terms",
  privacy: "privacy",
  "buyer-license": "buyer_license",
  "seller-agreement": "seller_agreement",
  "refund-policy": "refund_policy",
};

type Params = { params: Promise<{ doc: string }> };

async function load(doc: string) {
  const kind = DOCS[doc];
  if (!kind) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("agreements").select("title, version, body, created_at").eq("kind", kind).eq("is_current", true).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const a = await load((await params).doc);
  return a ? { title: a.title } : {};
}

export default async function LegalPage({ params }: Params) {
  const a = await load((await params).doc);
  if (!a) notFound();
  const draft = a.version.includes("draft");
  return (
    <section className="section">
      <div className="container stack" style={{ "--gap": "1.75rem", maxWidth: "52rem" } as React.CSSProperties}>
        <span className="tag">(Legal)</span>
        <h1 className="h1">{a.title}</h1>
        <p className="mono muted">Version {a.version} · {new Date(a.created_at).toLocaleDateString("en-GB")}</p>
        {draft && <Notice tone="warn">This document is a draft awaiting legal review. It will be replaced by a reviewed version before launch.</Notice>}
        <Markdown source={a.body} />
      </div>
    </section>
  );
}
