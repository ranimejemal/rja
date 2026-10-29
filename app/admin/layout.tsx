import { requireRole } from "@/lib/auth";
import { DashNav } from "@/components/DashNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  return (
    <div className="container dash">
      <DashNav
        label="Admin"
        items={[
          ["/admin", "Overview"],
          ["/admin/quotes", "Quote requests"],
          ["/admin/applications", "Seller applications"],
          ["/admin/products", "Product moderation"],
          ["/admin/sellers", "Sellers"],
          ["/admin/finance", "Finance"],
          ["/admin/reports", "Reports"],
          ["/admin/categories", "Categories"],
          ["/admin/platform", "Platform store"],
          ["/admin/audit", "Audit log"],
        ]}
      />
      <div className="stack" style={{ "--gap": "1.75rem", minWidth: 0 } as React.CSSProperties}>{children}</div>
    </div>
  );
}
