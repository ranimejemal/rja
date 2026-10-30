"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";
import { PowerScene } from "@/components/PowerScene";

// Shown when a page fails to load. Server errors only expose Next.js's digest (a reference to the server log),
// never internal details. Errors raised in the browser show their message, which helps when reporting a problem.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { console.error(error); }, [error]);
  const reference = error.digest ? `server ${error.digest}` : `browser: ${error.message}`.slice(0, 160);
  const retry = () => startTransition(() => { router.refresh(); reset(); });
  return (
    <PowerScene
      before="err" after="r" label="Something went wrong"
      tagline="This page went offline on our side. Try again, and if it keeps happening, send us the reference below."
      extra={<span style={{ fontFamily: "var(--font-mono)" }}>Reference: {reference}</span>}
      columns={[
        {
          title: "Back online",
          links: [
            <button key="retry" type="button" onClick={retry}>Try again</button>,
            <button key="reload" type="button" onClick={() => window.location.reload()}>Reload page</button>,
            <Link key="home" href="/">Home</Link>,
            <Link key="explore" href="/explore">Explore automations</Link>,
          ],
        },
        {
          title: "Help",
          links: [
            <Link key="help" href="/help">Help center</Link>,
            <Link key="quote" href="/quote">Request a quote</Link>,
            <Link key="terms" href="/legal/terms">Terms of service</Link>,
            <Link key="privacy" href="/legal/privacy">Privacy policy</Link>,
          ],
        },
        {
          title: "Contact",
          links: [
            <a key="mail" href={`mailto:ranimejmal@gmail.com?subject=${encodeURIComponent(`Error ${reference}`)}`}>ranimejmal@gmail.com</a>,
            <a key="ig" href="https://www.instagram.com/ranimejemalagency/" target="_blank" rel="noopener">Instagram</a>,
            <a key="tn" href="https://wa.me/21697017061" target="_blank" rel="noopener">WhatsApp +216 97 017 061</a>,
            <a key="fr" href="https://wa.me/33624979941" target="_blank" rel="noopener">WhatsApp +33 6 24 97 99 41</a>,
          ],
        },
      ]}
    />
  );
}
