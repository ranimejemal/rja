"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Logo } from "./Logo";

export const INTRO_DONE = "rja:intro-done";

/**
 * The template's loading intro: product tiles stack up behind the logo, then the curtain lifts.
 * It is in the server HTML so it covers the page from the first paint; CSS only shows it while <html> has
 * `intro-pending`, which the boot script in the layout sets once per visit (never without JS or for reduced motion).
 */
export function HomeIntro({ images }: { images: string[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains("intro-pending") || !root.current) { setDone(true); return; }
    try { sessionStorage.setItem("rja-intro", "1"); } catch { /* storage blocked */ }
    const finish = () => { html.classList.remove("intro-pending"); setDone(true); };
    const ctx = gsap.context(() => {
      gsap.timeline({ onComplete: finish })
        .fromTo(".intro-img", { yPercent: 120, autoAlpha: 1, rotate: () => gsap.utils.random(-8, 8) }, { yPercent: 0, duration: 0.7, ease: "expo.out", stagger: 0.12 })
        .fromTo(".intro-logo", { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: "power3.out" }, "-=0.3")
        .to(".intro-img", { yPercent: -140, duration: 0.6, ease: "expo.in", stagger: 0.04 }, "+=0.35")
        // Page headings start rolling in as the curtain lifts.
        .call(() => { window.dispatchEvent(new Event(INTRO_DONE)); }, undefined, "-=0.2")
        .to(root.current, { clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)", duration: 0.9, ease: "expo.inOut" }, "<");
    }, root);
    return () => { ctx.revert(); html.classList.remove("intro-pending"); };
  }, []);

  if (done) return null;
  return (
    <div className="intro" ref={root} aria-hidden="true">
      <div className="intro-stack">
        {images.slice(0, 6).map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} className="intro-img" src={src} alt="" style={{ zIndex: i }} />
        ))}
      </div>
      <div className="intro-logo"><Logo /></div>
    </div>
  );
}
