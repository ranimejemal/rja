import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Logo } from "./Logo";
import { SiteMenu } from "./SiteMenu";

export async function SiteHeader() {
  const session = await getSession();
  const primary = [
    { href: "/explore", label: "Explore" },
    { href: "/categories", label: "Categories" },
    { href: "/sell", label: "Sell" },
    { href: "/pricing", label: "Pricing" },
    { href: "/help", label: "Help" },
  ];
  const secondary = session
    ? [
        { href: "/dashboard", label: "My automations" },
        ...(session.roles.includes("seller") ? [{ href: "/seller", label: "Seller dashboard" }] : []),
        ...(session.roles.includes("admin") ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [{ href: "/login", label: "Log in" }, { href: "/signup", label: "Sign up" }];
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="logo" aria-label="Ranime Jemal Agency — home"><Logo /></Link>
        <div className="header-actions">
          <Link href="/explore" className="link-block hide-sm" data-scramble-hover=""><span data-scramble-target="">explore</span></Link>
          {session ? (
            <>
              <Link href="/dashboard" className="link-block hide-sm" data-scramble-hover=""><span data-scramble-target="">my automations</span></Link>
              <form action="/auth/signout" method="post" className="hide-sm"><button className="link-block" type="submit">sign out</button></form>
            </>
          ) : (
            <Link href="/login" className="link-block" data-scramble-hover=""><span data-scramble-target="">log in</span></Link>
          )}
          <SiteMenu primary={primary} secondary={secondary} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container stack" style={{ "--gap": "2.5rem" } as React.CSSProperties}>
        <div className="footer-grid">
          <div className="stack">
            <span className="logo" style={{ width: "5rem" }}><Logo /></span>
            <p className="muted small" style={{ maxWidth: "22rem" }}>
              The marketplace for AI automations and n8n workflows, by Ranime Jemal Agency and independent creators.
            </p>
            <div className="small">
              <a href="mailto:ranimejmal@gmail.com">ranimejmal@gmail.com</a>
              <a href="tel:+21697017061">+216 97 017 061</a>
              <a href="tel:+33624979941">+33 6 24 97 99 41</a>
              <a href="https://www.instagram.com/ranimejemalagency/" rel="noopener" target="_blank">Instagram</a>
            </div>
          </div>
          <div><span className="tag">Marketplace</span><Link href="/explore">Explore</Link><Link href="/categories">Categories</Link><Link href="/pricing">Pricing &amp; licensing</Link><Link href="/help">Help center</Link></div>
          <div><span className="tag">Creators</span><Link href="/sell">Become a seller</Link><Link href="/seller">Seller dashboard</Link><Link href="/legal/seller-agreement">Seller agreement</Link></div>
          <div><span className="tag">Account</span><Link href="/dashboard">My automations</Link><Link href="/login">Log in</Link><Link href="/signup">Sign up</Link></div>
          <div><span className="tag">Legal</span><Link href="/legal/terms">Terms of service</Link><Link href="/legal/privacy">Privacy policy</Link><Link href="/legal/buyer-license">Buyer license</Link><Link href="/legal/refund-policy">Refund policy</Link></div>
        </div>
        <div className="row between tiny muted" style={{ borderTop: "1px solid var(--line)", paddingTop: "1.25rem" }}>
          <span>© {new Date().getFullYear()} Ranime Jemal Agency</span>
          <span className="mono">Automate more. Build less. Grow faster.</span>
        </div>
      </div>
    </footer>
  );
}
