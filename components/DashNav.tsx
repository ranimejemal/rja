"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashNav({ items, label }: { items: [string, string][]; label: string }) {
  const pathname = usePathname();
  return (
    <nav className="dash-nav" aria-label={label}>
      {items.map(([href, text]) => {
        const current = href === pathname || (href.split("/").length > 2 && pathname.startsWith(href + "/"));
        return <Link key={href} href={href} aria-current={current ? "page" : undefined}>{text}</Link>;
      })}
    </nav>
  );
}
