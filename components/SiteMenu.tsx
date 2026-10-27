"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Item = { href: string; label: string };

/** Full-screen overlay menu in the template's style (clip-path wipe, big rolling links, scramble on hover). */
export function SiteMenu({ primary, secondary }: { primary: Item[]; secondary: Item[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const button = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.dataset.menuStatus = open ? "open" : "closed";
    if (open) firstLink.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) { setOpen(false); button.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        className="menu-button"
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(!open)}
      >
        <span className="menu-button-line" /><span className="menu-button-line" /><span className="menu-button-line" />
      </button>
      {/* Rendered into <body>: the header's backdrop blur would otherwise clip a fixed overlay. */}
      {mounted && createPortal(<div id="site-menu" className="menu" aria-hidden={!open} inert={!open}>
        <nav className="container menu-inner" aria-label="Main">
          <ul className="menu-list">
            {primary.map((it, i) => (
              <li key={it.href} className="menu-list__item">
                <Link ref={i === 0 ? firstLink : undefined} className="menu-list__link" href={it.href} data-scramble-hover="" aria-current={pathname === it.href ? "page" : undefined}>
                  <span data-scramble-target="">{it.label}</span>
                  <small>0{i + 1}</small>
                </Link>
              </li>
            ))}
          </ul>
          <div className="menu-secondary">
            {secondary.map((it) => <Link key={it.href} href={it.href} className="link-block">{it.label}</Link>)}
          </div>
        </nav>
      </div>, document.body)}
    </>
  );
}
