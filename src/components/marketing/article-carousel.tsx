"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ArticleCard } from "@/components/marketing/article-card";
import { ArrowIcon } from "@/components/marketing/icons";
import { cn } from "@/lib/cn";
import type { ArticleListItem } from "@/lib/posts";

type Props = {
  heading: string;
  subheading?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  posts: ArticleListItem[];
};

/**
 * רצועת "מהבלוג שלנו" — קרוסלה אופקית של המאמרים האחרונים.
 * גלילה טבעית במגע/טאץ'-פאד; חיצים לדסקטופ. RTL-safe (scrollLeft שלילי).
 */
export function ArticleCarousel({ heading, subheading, ctaLabel, ctaHref, posts }: Props) {
  const scroller = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft);
    setAtStart(pos <= 4);
    setAtEnd(pos >= max - 4);
  }, []);

  useEffect(() => {
    sync();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  /**
   * מזיז כרטיס אחד. נגזר ממיקום הגלילה בפועל (בלי state שמתנתק מגלילת מגע),
   * ו-scrollIntoView נוחת בדיוק על נקודת snap — לכן עובד גם ב-RTL וגם עם snap-mandatory.
   */
  const nudge = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    const rtl = getComputedStyle(el).direction === "rtl";
    const lead = el.getBoundingClientRect()[rtl ? "right" : "left"];
    let current = 0;
    let best = Infinity;
    cards.forEach((c, i) => {
      const dist = Math.abs(c.getBoundingClientRect()[rtl ? "right" : "left"] - lead);
      if (dist < best) {
        best = dist;
        current = i;
      }
    });
    const next = Math.max(0, Math.min(current + dir, cards.length - 1));
    cards[next]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    // גיבוי ל-scroll listener אם אירועי הגלילה נבלעים באמצע אנימציה חלקה
    window.setTimeout(sync, 450);
  };

  if (!posts.length) return null;

  return (
    <section className="border-outline-variant/40 overflow-hidden border-t py-20">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold sm:text-4xl">{heading}</h2>
            {subheading && (
              <p className="text-on-surface-variant mt-3 text-base leading-relaxed">{subheading}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {ctaLabel && ctaHref && (
              <Link
                href={ctaHref}
                className="text-primary inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
              >
                {ctaLabel}
                <ArrowIcon className="size-4" />
              </Link>
            )}
            <div className="hidden gap-2 sm:flex">
              <CarouselButton label="הקודם" disabled={atStart} onClick={() => nudge(-1)} flip />
              <CarouselButton label="הבא" disabled={atEnd} onClick={() => nudge(1)} />
            </div>
          </div>
        </div>

        {/* -mx-6/px-6 מבטלים ומחזירים את ריפוד ה-Container כך שהכרטיס הראשון מיושר לשוליים */}
        <ul
          ref={scroller}
          className={cn(
            "-mx-6 flex snap-x snap-proximity gap-6 overflow-x-auto scroll-smooth px-6 pb-4",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {posts.map((post) => (
            <li key={post.slug} className="w-[280px] shrink-0 snap-start sm:w-[320px]">
              <ArticleCard post={post} titleAs="h3" className="h-full" />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function CarouselButton({
  label,
  disabled,
  onClick,
  flip,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  flip?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="border-outline-variant text-on-surface hover:bg-surface-container inline-flex size-10 items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-40"
    >
      <ArrowIcon className={cn("size-4", flip && "rotate-180")} />
    </button>
  );
}
