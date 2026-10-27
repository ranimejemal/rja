import { requireUser } from "@/lib/auth";
import { DashNav } from "@/components/DashNav";

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/dashboard");
  return (
    <div className="container dash">
      <DashNav
        label="Buyer dashboard"
        items={[
          ["/dashboard", "My automations"],
          ["/dashboard/orders", "Orders & receipts"],
          ["/dashboard/downloads", "Download history"],
          ["/dashboard/support", "Support requests"],
          ["/dashboard/settings", "Account settings"],
        ]}
      />
      <div className="stack" style={{ "--gap": "1.75rem", minWidth: 0 } as React.CSSProperties}>{children}</div>
    </div>
  );
}
