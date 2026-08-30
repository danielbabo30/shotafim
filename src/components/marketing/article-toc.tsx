"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ListIcon } from "@/components/marketing/icons";

/** ניווט צדדי במאמר — עוקב אחרי הכותרת הפעילה בגלילה. */
export function ArticleToc({ items }: { items: { anchor: string; text: string }[] }) {
  const [active, setActive] = useState(items[0]?.anchor ?? "");

  useEffect(() => {
    const headings = items
      .map((it) => document.getElementById(it.anchor))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-96px 0px -60% 0px" },
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label="ניווט במאמר"
      className="border-outline-variant/60 bg-surface-lowest shadow-ambient-sm sticky top-24 hidden rounded-xl border p-5 lg:block"
    >
      <p className="text-on-surface-variant mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide">
        <ListIcon className="size-4" />
        ניווט במאמר
      </p>
      <ul className="space-y-1 text-sm">
        {items.map((it) => (
          <li key={it.anchor}>
            <a
              href={`#${it.anchor}`}
              onClick={() => setActive(it.anchor)}
              className={cn(
                "block rounded-lg px-3 py-2 transition-colors",
                active === it.anchor
                  ? "border-primary text-primary bg-primary/5 border-s-4 font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-primary",
              )}
            >
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
