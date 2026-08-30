"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { SearchIcon } from "@/components/marketing/icons";
import { GUIDE_AUDIENCES } from "@/lib/guide-categories";
import { GuideCategoryCard } from "@/components/marketing/guide-category-card";
import type { GuideCategoryGroup } from "@/lib/guides";

/** לובי המדריכים — חיפוש חופשי + סינון לפי קהל יעד, מעל רשת כרטיסי הקטגוריות. */
export function GuideExplorer({ groups }: { groups: GuideCategoryGroup[] }) {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<string>("all");

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return groups
      .map((group) => {
        const guides = group.guides.filter((g) => {
          const byAudience = audience === "all" || g.audience === audience;
          const byQuery =
            !q ||
            g.title.toLowerCase().includes(q) ||
            g.excerpt.toLowerCase().includes(q) ||
            group.label.toLowerCase().includes(q);
          return byAudience && byQuery;
        });
        return { ...group, matched: guides };
      })
      .filter((group) => group.matched.length > 0);
  }, [groups, q, audience]);

  return (
    <div className="space-y-8">
      <label className="relative mx-auto block max-w-2xl">
        <span className="sr-only">חיפוש מדריך</span>
        <SearchIcon className="text-on-surface-variant pointer-events-none absolute end-4 top-1/2 size-5 -translate-y-1/2" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש מדריך, מונח או בעיה (למשל: שחרור נאמנות, חיבור אינסטגרם)"
          className="border-outline-variant bg-surface-lowest focus:border-primary focus:ring-primary/30 shadow-ambient-sm w-full rounded-full border py-3.5 ps-5 pe-12 text-sm transition-colors outline-none focus:ring-4"
        />
      </label>

      <div className="flex flex-wrap justify-center gap-2">
        <Tab active={audience === "all"} onClick={() => setAudience("all")}>
          הכל
        </Tab>
        {GUIDE_AUDIENCES.map((a) => (
          <Tab key={a.value} active={audience === a.value} onClick={() => setAudience(a.value)}>
            {a.he}
          </Tab>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((group) => (
            <GuideCategoryCard
              key={group.value}
              label={group.label}
              description={group.description}
              icon={group.icon}
              guides={group.matched}
              total={group.matched.length}
            />
          ))}
        </div>
      ) : (
        <p className="text-on-surface-variant py-12 text-center">
          לא נמצאו מדריכים לחיפוש הזה. נסו מונח אחר או פנו לתמיכה.
        </p>
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
        active
          ? "bg-primary text-on-primary"
          : "border-outline-variant text-on-surface-variant hover:bg-surface-container border",
      )}
    >
      {children}
    </button>
  );
}
