import Link from "next/link";
import type { SceneColumn } from "./PowerScene";

// The agency's own links for the power-button scene.
export const marketplaceColumn: SceneColumn = {
  title: "Marketplace",
  links: [
    <Link key="home" href="/">Home</Link>,
    <Link key="explore" href="/explore">Explore automations</Link>,
    <Link key="categories" href="/categories">Categories</Link>,
    <Link key="quote" href="/quote">Request a quote</Link>,
  ],
};
export const agencyColumn: SceneColumn = {
  title: "Agency",
  links: [
    <Link key="help" href="/help">Help center</Link>,
    <Link key="pricing" href="/pricing">Pricing &amp; licensing</Link>,
    <Link key="terms" href="/legal/terms">Terms of service</Link>,
    <Link key="privacy" href="/legal/privacy">Privacy policy</Link>,
  ],
};
export const contactColumn: SceneColumn = {
  title: "Contact",
  links: [
    <a key="ig" href="https://www.instagram.com/ranimejemalagency/" target="_blank" rel="noopener">Instagram</a>,
    <a key="mail" href="mailto:ranimejmal@gmail.com">ranimejmal@gmail.com</a>,
    <a key="tn" href="https://wa.me/21697017061" target="_blank" rel="noopener">WhatsApp +216 97 017 061</a>,
    <a key="fr" href="https://wa.me/33624979941" target="_blank" rel="noopener">WhatsApp +33 6 24 97 99 41</a>,
  ],
};
