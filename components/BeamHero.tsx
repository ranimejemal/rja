"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

// Home hero: a dark card under a green light arc, with a beam that runs from "your apps" through the agency to
// "secure and running", then the headline and the apps the automations work with.
// The beam is a small state machine on requestAnimationFrame: p1 (left → centre), splash, p2 (centre → right), idle.

const DUR = { p1: 800, splash: 800, p2: 800, idle: 1000 } as const;
type Phase = keyof typeof DUR;

export function BeamHero() {
  const pipeline = useRef<HTMLDivElement>(null);
  const nodeStack = useRef<HTMLDivElement>(null);
  const nodeX = useRef<HTMLDivElement>(null);
  const nodeShield = useRef<HTMLDivElement>(null);
  const glowPath = useRef<SVGPathElement>(null);
  const corePath = useRef<SVGPathElement>(null);
  const gradient = useRef<SVGLinearGradientElement>(null);
  const splash = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = [pipeline.current, nodeStack.current, nodeX.current, nodeShield.current, glowPath.current, corePath.current, gradient.current, splash.current];
    if (els.some((e) => !e)) return;
    const [pipe, stack, x, shield, glow, core, grad, spl] = els as [HTMLDivElement, HTMLDivElement, HTMLDivElement, HTMLDivElement, SVGPathElement, SVGPathElement, SVGLinearGradientElement, HTMLDivElement];
    const paths = [glow, core];

    const updatePath = () => {
      const p = pipe.getBoundingClientRect();
      const c = (r: DOMRect) => [r.left + r.width / 2 - p.left, r.top + r.height / 2 - p.top];
      const [sx, sy] = c(stack.getBoundingClientRect());
      const [mx, my] = c(x.getBoundingClientRect());
      const [ex, ey] = c(shield.getBoundingClientRect());
      const d = `M ${sx},${sy} L ${mx},${my} L ${ex},${ey}`;
      paths.forEach((path) => path.setAttribute("d", d));
    };
    const setBeam = (percentage: number) => {
      const center = percentage * 100;
      grad.setAttribute("x1", `${center - 5}%`);
      grad.setAttribute("x2", `${center + 5}%`);
      grad.setAttribute("y1", "0%");
      grad.setAttribute("y2", "0%");
    };
    const showBeam = (on: boolean) => paths.forEach((path) => (path.style.opacity = on ? "" : "0"));

    // Respect people who turn animations off: show the beam still, in the middle.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      updatePath(); setBeam(0.5);
      window.addEventListener("resize", updatePath);
      return () => window.removeEventListener("resize", updatePath);
    }

    let phase: Phase = "p1";
    let lastStateChange = performance.now();
    let frame = 0;
    const go = (next: Phase, now: number) => { phase = next; lastStateChange = now; };

    const tick = (now: number) => {
      const elapsed = now - lastStateChange;
      const p = Math.min(elapsed / DUR[phase], 1);
      if (phase === "p1") {
        setBeam(p * 0.5);
        stack.classList.toggle("active", p < 0.4);
        if (p >= 1) { go("splash", now); showBeam(false); spl.classList.add("animate"); }
      } else if (phase === "splash") {
        if (p >= 1) { go("p2", now); spl.classList.remove("animate"); showBeam(true); }
      } else if (phase === "p2") {
        setBeam(0.5 + p * 0.5);
        shield.classList.toggle("active", p > 0.6);
        if (p >= 1) { shield.classList.remove("active"); go("idle", now); }
      } else if (p >= 1) {
        go("p1", now);
      }
      frame = requestAnimationFrame(tick);
    };

    updatePath();
    window.addEventListener("resize", updatePath);
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("resize", updatePath);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="beam-hero">
      <section className="hero-card" aria-labelledby="hero-h">
        <div className="hero-grid" aria-hidden="true" />

        <div className="icon-pipeline" ref={pipeline} aria-hidden="true">
          <svg className="beam-svg">
            <defs>
              <filter id="beam-glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="beam-gradient" ref={gradient} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3f8f1f" stopOpacity="0" />
                <stop offset="20%" stopColor="#3f8f1f" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="80%" stopColor="#c8ff3d" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#c8ff3d" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path ref={glowPath} className="beam-glow" stroke="url(#beam-gradient)" strokeWidth="2" fill="none" filter="url(#beam-glow)" />
            <path ref={corePath} className="beam-core" stroke="url(#beam-gradient)" strokeWidth="0.8" fill="none" />
          </svg>

          <div className="icon-node node-light-right" ref={nodeStack} title="Your apps">
            <svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
          </div>
          <div className="pipeline-line" />
          <div className="pipeline-center">
            <div className="splash" ref={splash} />
            <div className="icon-node-center" ref={nodeX}><Logo title="" /></div>
          </div>
          <div className="pipeline-line right" />
          <div className="icon-node node-light-left" ref={nodeShield} title="Secure and running">
            <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
          </div>
        </div>

        <div className="hero-content">
          <h1 id="hero-h" className="hero-heading">
            The simple way
            <strong>to automate your business</strong>
          </h1>
          <p className="hero-sub">
            Ready-to-use AI automations, set up with your details in minutes,<br className="hide-sm" /> or done for you by Ranime Jemal Agency.
          </p>
          <div className="hero-cta-row">
            <Link href="/explore" className="btn-cta">Explore automations</Link>
            <Link href="/quote" className="btn-cta ghost">Request a quote</Link>
          </div>
        </div>
      </section>

      <div className="brands" aria-label="Works with">
        <span className="brands-label">Works with</span>
        <div className="brand-item">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M3 6.5l9 6.5 9-6.5" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
          Gmail
        </div>
        <div className="brand-item">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="2.5" width="16" height="19" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M8 9h8M8 13h8M8 17h8M12 9v8" stroke="currentColor" strokeWidth="1.5" /></svg>
          Google Sheets
        </div>
        <div className="brand-item">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2.5" fill="currentColor" /><circle cx="19" cy="6" r="2.5" fill="currentColor" /><circle cx="19" cy="18" r="2.5" fill="currentColor" /><path d="M7.5 12h4m0 0l5-5.2m-5 5.2l5 5.2" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
          n8n
        </div>
        <div className="brand-item">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 12.5H6.2z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
          Shopify
        </div>
        <div className="brand-item">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.2 7.3 7.3 2.2-7.3 2.2-2.2 7.3-2.2-7.3L2.5 12l7.3-2.2z" fill="currentColor" /></svg>
          Gemini &amp; OpenAI
        </div>
      </div>
    </div>
  );
}
