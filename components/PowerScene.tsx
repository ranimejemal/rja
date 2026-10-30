"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Full-bleed "power button" scene used by the 404 and error pages: a vintage computer on a hill (a video clip).
// The "o" in the wordmark is a power button: it plays the clip on to night, the CRT collapses, and its last point
// of light flies into the button. Every scene change comes from the clip; code only adds the scanline, the sky
// glints and the flying dot on a canvas.

const CLIP = {
  hd: "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/abdab52e-bb1b-477d-ae7c-26c5f8915433.mp4",
  sd: "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/15017aa7-135b-471f-a8a1-42a208bc61b2.mp4",
  poster: "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/af6deff1-d678-4dc6-ae24-2880b16cdb20.jpg",
};
// Clip timeline (seconds) and geometry (pixels in the 1920×1080 frame).
const T_BOOT = 0.6, T_IDLE = 2.3, T_DOT = 4.72, T_DUSK = 2.7, T_NIGHT = 4.4;
const FRAME_W = 1920, FRAME_H = 1080;
const SCREEN = { x0: 806, y0: 505, x1: 1077, y1: 724 };
const LAST_LIGHT = { x: 945, y: 594 };
const FLIGHT_MS = 780, LIT_MS = 900;

// Sky glint positions (clip frame), the first 10 shown by day, all 22 at night.
const GLINTS = [
  [212, 96], [1610, 140], [540, 210], [1302, 64], [880, 150], [1760, 320], [96, 300], [1450, 250], [690, 70], [1110, 230],
  [330, 170], [1000, 40], [1530, 52], [420, 330], [1220, 330], [1850, 90], [60, 120], [760, 300], [1680, 210], [600, 140],
  [1390, 170], [250, 380],
].map(([x, y], i) => ({ x, y, phase: i * 1.7, speed: 1.1 + ((i * 37) % 10) / 10, size: 4 + ((i * 53) % 6) }));

type Mode = "standby" | "booting" | "online" | "shutting" | "offline";

const easeInOutCubic = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export type SceneColumn = { title: string; links: ReactNode[] };

export function PowerScene({ before, after, label, tagline, columns, extra }: {
  /** Wordmark text around the power "o", e.g. "4" + "4" or "err" + "r". */
  before: string; after: string; label: string;
  tagline: ReactNode; columns: SceneColumn[]; extra?: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sky = useRef<HTMLCanvasElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const ring = useRef<SVGSVGElement>(null);
  const poster = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = root.current!, btn = button.current!, cv = canvas.current!, skyCv = sky.current!, vid = video.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !vid) { el.classList.add("is-in"); return; }

    vid.src = window.matchMedia("(max-width: 900px)").matches ? CLIP.sd : CLIP.hd;
    let mode: Mode = "standby";
    let stopAt = Infinity;
    // The flying dot: null until launched; "landed" keeps it from launching twice in one switch-off.
    let flight: { start: number; from: { x: number; y: number }; landed: boolean } | null = null;
    let litStart = -1;
    let raf = 0;
    const ctx = cv.getContext("2d")!, skyCtx = skyCv.getContext("2d")!;

    const setMode = (m: Mode) => {
      mode = m;
      btn.setAttribute("aria-pressed", String(m === "online" || m === "booting"));
      el.dataset.mode = m;
    };
    const playFrom = (t: number, until: number) => {
      stopAt = until;
      vid.currentTime = t;
      vid.play().catch(() => { /* autoplay refused: stay on the poster frame */ });
    };
    const boot = () => { setMode("booting"); playFrom(T_BOOT, T_IDLE); };

    btn.onclick = () => {
      if (mode === "online") { setMode("shutting"); playFrom(T_IDLE, Infinity); }
      else if (mode === "offline") { flight = null; boot(); }
      // standby, booting and shutting: ignore clicks mid-transition.
    };
    vid.onended = () => { if (mode === "shutting") setMode("offline"); };

    // Arrival: text rises and the CRT switches on once the scene is 35 % in view.
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      el.classList.add("is-in");
      boot();
    }, { threshold: 0.35 });
    io.observe(el);

    // Maps clip-frame coordinates to scene coordinates (object-fit: cover, centred horizontally, bottom-aligned).
    const mapper = () => {
      const r = el.getBoundingClientRect(), v = vid.getBoundingClientRect();
      const s = Math.max(v.width / FRAME_W, v.height / FRAME_H);
      const ox = v.left - r.left + (v.width - FRAME_W * s) / 2, oy = v.top - r.top + v.height - FRAME_H * s;
      return { s, at: (x: number, y: number) => ({ x: ox + x * s, y: oy + y * s }) };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const c of [cv, skyCv]) {
        const b = c.getBoundingClientRect();
        c.width = Math.round(b.width * dpr); c.height = Math.round(b.height * dpr);
        c.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const star = (x: number, y: number, size: number, alpha: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, size);
      g.addColorStop(0, `rgba(255,255,255,${alpha})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      // Four-point star: thin diamond arms on both axes.
      ctx.moveTo(x, y - size); ctx.lineTo(x + size * 0.16, y - size * 0.16); ctx.lineTo(x + size, y);
      ctx.lineTo(x + size * 0.16, y + size * 0.16); ctx.lineTo(x, y + size); ctx.lineTo(x - size * 0.16, y + size * 0.16);
      ctx.lineTo(x - size, y); ctx.lineTo(x - size * 0.16, y - size * 0.16); ctx.closePath();
      ctx.fill();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const t = vid.currentTime;
      if (t >= stopAt && !vid.paused) {
        vid.pause(); vid.currentTime = stopAt; stopAt = Infinity;
        if (mode === "booting") setMode("online");
      }
      const W = cv.clientWidth, H = cv.clientHeight;
      ctx.clearRect(0, 0, W, H);
      const { s, at } = mapper();
      const secs = now / 1000;

      // Scanline over the colour bars (clip 1.6 s to 2.7 s), clipped to the screen glass.
      if (t > 1.6 && t < T_DUSK + 0.05 && mode !== "standby") {
        const a = at(SCREEN.x0, SCREEN.y0), b = at(SCREEN.x1, SCREEN.y1);
        const h = b.y - a.y, band = 52 * Math.max(s, 0.5);
        const y = a.y - band + ((secs % 1.8) / 1.8) * (h + band);
        ctx.save();
        ctx.beginPath(); ctx.rect(a.x, a.y, b.x - a.x, h); ctx.clip();
        const flicker = 0.85 + Math.random() * 0.15;
        const g = ctx.createLinearGradient(0, y, 0, y + band);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.5, `rgba(255,255,255,${0.1 * flicker})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g; ctx.fillRect(a.x, y, b.x - a.x, band);
        ctx.fillStyle = `rgba(255,255,255,${0.015 * Math.random()})`; ctx.fillRect(a.x, a.y, b.x - a.x, h);
        ctx.restore();
      }

      // Glints: 10 by day, up to 22 as the clip's sky reaches night.
      const night = clamp01((t - T_DUSK) / (T_NIGHT - T_DUSK));
      const count = Math.round(10 + 12 * night);
      for (let i = 0; i < count; i++) {
        const gl = GLINTS[i], p = at(gl.x, gl.y);
        if (p.y < 0 || p.x < 0 || p.x > W) continue;
        const tw = Math.pow(Math.max(0, Math.sin(secs * gl.speed + gl.phase)), 3);
        const fadeIn = i < 10 ? 1 : clamp01(night * 12 - (i - 10));
        if (tw > 0.02) star(p.x, p.y, gl.size * Math.max(s, 0.6) * (0.7 + 0.5 * tw), 0.85 * tw * fadeIn);
      }

      // The last point of light leaves the screen at 4.72 s and flies into the power "o".
      if (mode === "shutting" && !flight && t >= T_DOT) flight = { start: now, from: at(LAST_LIGHT.x, LAST_LIGHT.y), landed: false };
      if (flight && !flight.landed) {
        const p = clamp01((now - flight.start) / FLIGHT_MS), e = easeInOutCubic(p);
        const r = el.getBoundingClientRect(), o = ring.current!.getBoundingClientRect();
        // Centre of the power circle: (25, 38.2) in the 50×62 viewBox.
        const to = { x: o.left - r.left + (o.width * 25) / 50, y: o.top - r.top + (o.height * 38.2) / 62 };
        const c = { x: flight.from.x + (to.x - flight.from.x) * 0.15, y: to.y + (flight.from.y - to.y) * 0.08 };
        const x = (1 - e) * (1 - e) * flight.from.x + 2 * (1 - e) * e * c.x + e * e * to.x;
        const y = (1 - e) * (1 - e) * flight.from.y + 2 * (1 - e) * e * c.y + e * e * to.y;
        const core = 2.4 * (0.7 + 1.3 * Math.sin(Math.PI * p)) * (1 - 0.45 * p);
        const g = ctx.createRadialGradient(x, y, 0, x, y, core * 6);
        g.addColorStop(0, "rgba(255,255,255,0.95)");
        g.addColorStop(0.18, "rgba(255,255,255,0.45)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, core * 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, core, 0, Math.PI * 2); ctx.fill();
        if (p >= 1) { flight.landed = true; litStart = now; }
      }
      if (litStart >= 0) {
        const p = clamp01((now - litStart) / LIT_MS);
        btn.style.setProperty("--lit", String(0.9 * (1 - p)));
        if (p >= 1) litStart = -1;
      }

      // Phone: the sky behind the text follows the clip's top rows, blurred and stretched.
      if (skyCv.clientWidth) {
        const src: CanvasImageSource | null = vid.readyState >= 2 ? vid : poster.current?.complete ? poster.current : null;
        if (src) {
          const w = skyCv.clientWidth, h = skyCv.clientHeight;
          skyCtx.filter = "blur(18px)";
          skyCtx.drawImage(src, 0, 0, FRAME_W, 140, -40, -40, w + 80, h + 80);
          skyCtx.filter = "none";
        }
      }
    };
    raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); btn.onclick = null; vid.onended = null; vid.pause(); };
  }, []);

  let i = 0;
  const rise = () => ({ "data-rise": "", style: { "--i": i++ } as React.CSSProperties });
  return (
    <section ref={root} className="power-scene" aria-label={label}>
      <canvas ref={sky} className="power-sky" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={poster} className="power-media power-poster" src={CLIP.poster} alt="" />
      <video ref={video} className="power-media" poster={CLIP.poster} muted playsInline preload="auto" aria-hidden="true" />
      <canvas ref={canvas} className="power-fx" aria-hidden="true" />
      <div className="power-grid">
        <div className="power-brand">
          <h1 {...rise()} className="power-wordmark">
            <button ref={button} type="button" className="power-button" aria-pressed="false" aria-label={`${before}o${after}: power button, switches the scene off and on`}>
              <span aria-hidden="true">{before}</span>
              <svg ref={ring} className="power-o" viewBox="0 0 50 62" aria-hidden="true">
                <g className="power-halo" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round">
                  <path d="M14.2 22.6 A19 19 0 1 0 35.8 22.6" /><path d="M25 6.5 V33" />
                </g>
                <g fill="none" stroke="currentColor" strokeWidth="4.6" strokeLinecap="round">
                  <path d="M14.2 22.6 A19 19 0 1 0 35.8 22.6" /><path d="M25 6.5 V33" />
                </g>
              </svg>
              <span aria-hidden="true">{after}</span>
            </button>
          </h1>
          <p {...rise()} className="power-tagline">{tagline}</p>
          <p {...rise()} className="power-copy">© {new Date().getFullYear()} Ranime Jemal Agency. All rights reserved.</p>
          {extra && <div {...rise()} className="power-extra">{extra}</div>}
        </div>
        {columns.map((c) => (
          <nav key={c.title} className="power-col" aria-label={c.title}>
            <h2 {...rise()}>{c.title}</h2>
            <ul>{c.links.map((l, k) => <li key={k} {...rise()}>{l}</li>)}</ul>
          </nav>
        ))}
      </div>
    </section>
  );
}
