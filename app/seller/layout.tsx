import { requireRole } from "@/lib/auth";
import { DashNav } from "@/components/DashNav";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  await requireRole("seller");
  return (
    <div className="container dash">
      <DashNav
        label="Seller dashboard"
        items={[
          ["/seller", "Overview & earnings"],
          ["/seller/products", "My products"],
          ["/seller/products/new", "Add product"],
          ["/seller/sales", "Sales"],
          ["/seller/payouts", "Payouts"],
          ["/seller/support", "Customer support"],
          ["/seller/profile", "Seller profile"],
          ["/seller/agreement", "Agreement"],
        ]}
      />
      <div className="stack" style={{ "--gap": "1.75rem", minWidth: 0 } as React.CSSProperties}>{children}</div>
    </div>
  );
}
