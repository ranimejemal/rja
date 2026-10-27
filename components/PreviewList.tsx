"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export type PreviewRow = { href: string; name: string; seller: string; category: string; price: string; level: string; image: string; platform: boolean };

/** List view from the template's portfolio page: rows with a preview image that follows the cursor. */
export function PreviewList({ rows }: { rows: PreviewRow[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const follower = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    const f = follower.current;
    if (!el || !f || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const xTo = gsap.quickTo(f, "x", { duration: 0.6, ease: "power3" });
    const yTo = gsap.quickTo(f, "y", { duration: 0.6, ease: "power3" });
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      xTo(e.clientX - r.left);
      yTo(e.clientY - r.top);
    };
    el.addEventListener("mousemove", move);
    return () => el.removeEventListener("mousemove", move);
  }, []);

  return (
    <div className="preview" ref={wrap} onMouseLeave={() => setActive(null)}>
      <div className="preview-row preview-head tag" aria-hidden="true">
        <span>Automation</span><span>Category</span><span>Seller</span><span>Level</span><span className="num">Price</span>
      </div>
      <ul className="preview-list">
        {rows.map((r, i) => (
          <li key={r.href}>
            <Link href={r.href} className="preview-row" data-scramble-hover="" onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)}>
              <span className="preview-name" data-scramble-target="">{r.name}</span>
              <span className="muted">{r.category}</span>
              <span className="muted">{r.platform ? "Platform" : r.seller}</span>
              <span className="muted" style={{ textTransform: "capitalize" }}>{r.level}</span>
              <span className="num">{r.price}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="preview-follower" ref={follower} aria-hidden="true" data-visible={active !== null}>
        {rows.map((r, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={r.href} src={r.image} alt="" data-active={i === active} />
        ))}
        <span className="preview-follower__label">View</span>
      </div>
    </div>
  );
}
