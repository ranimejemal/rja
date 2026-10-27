import type { ReactNode } from "react";
import { formatMoney } from "@/lib/money";

export function Price({ minor, currency = "EUR" }: { minor: number; currency?: string }) {
  if (minor === 0) return <span className="price free">Free</span>;
  return <span className="price">{formatMoney(minor, currency)}</span>;
}

export function Rating({ avg, count }: { avg: number | null; count: number }) {
  if (!count || avg == null) return <span className="rating muted">No ratings yet</span>;
  const full = Math.round(avg);
  return (
    <span className="rating" aria-label={`Rated ${avg.toFixed(1)} out of 5 from ${count} reviews`}>
      <span className="stars" aria-hidden="true">{"★".repeat(full)}{"☆".repeat(5 - full)}</span>
      {avg.toFixed(1)} ({count})
    </span>
  );
}

type BadgeKind = "platform" | "creator" | "verified" | "demo" | "default";
export function Badge({ kind = "default", children }: { kind?: BadgeKind; children: ReactNode }) {
  return <span className={`badge ${kind === "default" ? "" : kind}`}>{children}</span>;
}

/** Seller identity is always explicit: platform-owned vs independent creator. */
export function SellerBadge({ isPlatform }: { isPlatform: boolean }) {
  return isPlatform ? <Badge kind="platform">Platform product</Badge> : <Badge kind="creator">Independent creator</Badge>;
}

const STATUS_TONE: Record<string, "ok" | "warn" | "danger" | "info" | ""> = {
  published: "ok", approved: "ok", paid: "ok", processed: "ok", ready_to_download: "ok", configuration_saved: "ok",
  submitted: "info", under_review: "info", requested: "info", processing: "info", pending: "info", ready_to_configure: "info",
  purchased: "info", open: "info", update_available: "warn", support_open: "warn",
  draft: "", archived: "", canceled: "",
  changes_requested: "warn", info_requested: "warn", partially_refunded: "warn",
  rejected: "danger", suspended: "danger", failed: "danger", refunded: "danger",
};
export function StatusPill({ status, label }: { status: string; label?: string }) {
  return <span className={`status ${STATUS_TONE[status] ?? ""}`}>{label ?? status.replaceAll("_", " ")}</span>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "ok" | "warn" | "danger"; children: ReactNode }) {
  return <div className={`notice ${tone === "info" ? "" : tone}`} role={tone === "danger" ? "alert" : "status"}>{children}</div>;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="tag">({title})</span>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function SectionHead({ tag, title, children }: { tag: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="section-head">
      <span className="tag">({tag})</span>
      <div className="stack">
        <h2 className="h2">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export const LICENSE_LABEL: Record<string, string> = {
  personal: "Personal use",
  single_business: "Single business",
  commercial: "Commercial use",
  extended_commercial: "Extended commercial",
};

export const CUSTOMIZATION_LABEL: Record<string, string> = {
  ready_to_use: "Ready to use",
  configurable: "Configurable",
  guided_setup: "Guided setup",
  paid_service: "Customization service",
};
