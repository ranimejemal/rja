import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Logo } from "./Logo";
import { MobileNav } from "./client";

export async function SiteHeader() {
  const session = await getSession();
  return (
    <header className="site-header">
      <div className="container" style={{ position: "relative" }}>
        <Link href="/" className="logo" aria-label="Ranime Jemal Agency — home"><Logo /></Link>
        <MobileNav>
          <Link href="/explore">Explore</Link>
          <Link href="/categories">Categories</Link>
          <Link href="/pricing">Pricing &amp; licensing</Link>
          <Link href="/sell">Sell</Link>
          {session ? (
            <>
              <Link href="/dashboard">My automations</Link>
              {session.roles.includes("seller") && <Link href="/seller">Seller</Link>}
              {session.roles.includes("admin") && <Link href="/admin">Admin</Link>}
              <form action="/auth/signout" method="post">
                <button className="btn ghost small" type="submit">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/signup" className="btn accent small" style={{ color: "var(--accent-ink)" }}>Sign up</Link>
            </>
          )}
        </MobileNav>
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
            <p className="small">
              <a className="link" href="mailto:ranimejmal@gmail.com">ranimejmal@gmail.com</a> ·{" "}
              <a className="link" href="https://www.instagram.com/ranimejemalagency/" rel="noopener" target="_blank">Instagram</a>
            </p>
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
