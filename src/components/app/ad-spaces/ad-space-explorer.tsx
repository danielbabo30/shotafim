"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { SearchIcon, CalendarIcon } from "@/components/marketing/icons";
import { AdSpaceCard, type AdSpaceCardVM } from "@/components/app/ad-spaces/ad-space-card";
import { AdSpaceMap } from "@/components/app/ad-spaces/ad-space-map";
import type { AdSpaceFacet } from "@/lib/ad-spaces";

const selectClass =
  "border-outline-variant bg-surface-low text-on-surface focus:outline-primary rounded-lg border px-3 py-2 text-sm focus:outline-2";

export function AdSpaceExplorer({
  listings,
  mediaTypes,
  cities,
  categories,
  total,
}: {
  listings: AdSpaceCardVM[];
  mediaTypes: AdSpaceFacet[];
  cities: AdSpaceFacet[];
  categories: AdSpaceFacet[];
  total: number;
}) {
  const [query, setQuery] = useState("");
  const [mediaType, setMediaType] = useState("all");
  const [city, setCity] = useState("all");
  const [category, setCategory] = useState("all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      if (mediaType !== "all" && l.mediaType !== mediaType) return false;
      if (city !== "all" && l.city !== city) return false;
      if (category !== "all" && !l.categories.includes(category)) return false;
      if (q) {
        const haystack = `${l.title} ${l.provider} ${l.location ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [listings, query, mediaType, city, category]);

  const chips: AdSpaceFacet[] = [{ value: "all", label: "כל השטחים" }, ...categories];

  return (
    <div className="flex flex-col gap-5">
      {/* סרגל סינון */}
      <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm sticky top-16 z-20 flex flex-col gap-3 rounded-xl border p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <SearchIcon className="text-on-surface-variant pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי עיר, צומת, שם מסך או ספק…"
              className="border-outline-variant bg-surface-low text-on-surface placeholder:text-on-surface-variant focus:outline-primary w-full rounded-lg border py-2 ps-9 pe-3 text-sm focus:outline-2"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value)}
              aria-label="סוג מדיה"
              className={selectClass}
            >
              <option value="all">כל סוגי המדיה</option>
              {mediaTypes.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label="עיר"
              className={selectClass}
            >
              <option value="all">כל הערים</option>
              {cities.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <span
              className="border-outline-variant text-on-surface-variant inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm"
              title="בחירת טווח תאריכים תיפתח עם חיבור יומן השיבוצים"
            >
              <CalendarIcon className="size-4" />
              תאריכים
            </span>
          </div>
        </div>

        {/* שבבי קטגוריה */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {chips.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                category === c.value
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-high border",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* תצוגה מפוצלת */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-7">
          <p className="text-on-surface-variant text-sm">
            {filtered.length} מתוך {total} שטחים תואמים
          </p>

          {filtered.map((l) => (
            <AdSpaceCard
              key={l.id}
              listing={l}
              active={hoveredId === l.id}
              onHover={setHoveredId}
            />
          ))}

          {filtered.length === 0 && (
            <div className="border-outline-variant bg-surface-lowest text-on-surface-variant rounded-xl border p-10 text-center text-sm">
              לא נמצאו שטחי פרסום בסינון הנוכחי. נסו להרחיב את החיפוש.
            </div>
          )}
        </div>

        <div className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-32">
            <AdSpaceMap points={filtered} hoveredId={hoveredId} onHover={setHoveredId} />
          </div>
        </div>
      </div>
    </div>
  );
}
