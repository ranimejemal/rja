"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Logo } from "./Logo";

/**
 * The template's loading intro: product tiles stack up behind the logo, then the curtain lifts.
 * Plays once per visit, never without JavaScript (it starts hidden), and not for reduced-motion users.
 */
export function HomeIntro({ images }: { images: string[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    let seen = true;
    try { seen = sessionStorage.getItem("rja-intro") === "1"; sessionStorage.setItem("rja-intro", "1"); } catch { /* storage blocked */ }
    if (!seen && !matchMedia("(prefers-reduced-motion: reduce)").matches) setPlay(true);
  }, []);

  useEffect(() => {
    if (!play || !root.current) return;
    document.body.style.overflow = "hidden";
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => { document.body.style.overflow = ""; setPlay(false); } });
      tl.from(".intro-img", { yPercent: 120, rotate: () => gsap.utils.random(-8, 8), duration: 0.7, ease: "expo.out", stagger: 0.12 })
        .from(".intro-logo", { autoAlpha: 0, scale: 0.85, duration: 0.6, ease: "power3.out" }, "-=0.3")
        .to(".intro-img", { yPercent: -140, duration: 0.6, ease: "expo.in", stagger: 0.04 }, "+=0.35")
        .to(root.current, { clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)", duration: 0.9, ease: "expo.inOut" }, "-=0.2");
    }, root);
    return () => { ctx.revert(); document.body.style.overflow = ""; };
  }, [play]);

  if (!play) return null;
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
