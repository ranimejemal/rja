"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Template-style motion, driven by data attributes (same names as the template):
 *  data-split="rolling"   heading lines roll up into view
 *  data-scramble-loop     mono labels scramble when they enter the viewport
 *  data-scramble-hover    text scrambles on hover
 *  data-reveal            fades and rises into view
 * Everything is skipped for users who prefer reduced motion.
 */
export function Motion() {
  const pathname = usePathname();

  // Smooth scrolling, once.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(tick); lenis.destroy(); };
  }, []);

  // Per-page effects, rebuilt on every navigation. They start two frames later so React has finished
  // hydrating the page before any text is split or scrambled.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cleanups: (() => void)[] = [];
    let ctx: gsap.Context | null = null;
    let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => setup()); });
    const setup = () => ctx = gsap.context(() => {
      document.querySelectorAll<HTMLElement>("[data-split='rolling']").forEach((el) => {
        const split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "split-line" });
        gsap.from(split.lines, {
          yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
        cleanups.push(() => split.revert());
      });

      document.querySelectorAll<HTMLElement>("[data-scramble-loop]").forEach((el) => {
        const text = el.textContent ?? "";
        ScrollTrigger.create({
          trigger: el, start: "top 92%",
          onEnter: () => gsap.to(el, { duration: 1.2, scrambleText: { text, chars: SCRAMBLE_CHARS, speed: 0.5 } }),
        });
      });

      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, { y: 40, autoAlpha: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
      });
    });

    // Hover scramble uses plain listeners so it also works on elements added later in the page.
    const onEnter = (e: Event) => {
      const host = (e.target as HTMLElement).closest<HTMLElement>("[data-scramble-hover]");
      if (!host || host.dataset.scrambling) return;
      const target = host.querySelector<HTMLElement>("[data-scramble-target]") ?? host;
      const text = target.dataset.text ?? target.textContent ?? "";
      target.dataset.text = text;
      host.dataset.scrambling = "1";
      gsap.to(target, { duration: 0.6, scrambleText: { text, chars: SCRAMBLE_CHARS, speed: 0.6 }, onComplete: () => { delete host.dataset.scrambling; } });
    };
    document.addEventListener("mouseover", onEnter);
    cleanups.push(() => document.removeEventListener("mouseover", onEnter));

    const refresh = setTimeout(() => ScrollTrigger.refresh(), 300);
    return () => { cancelAnimationFrame(raf); clearTimeout(refresh); cleanups.forEach((c) => c()); ctx?.revert(); };
  }, [pathname]);

  return null;
}
