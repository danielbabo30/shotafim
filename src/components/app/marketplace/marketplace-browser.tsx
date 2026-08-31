"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { SearchIcon, UsersIcon } from "@/components/marketing/icons";
import { CreatorCard } from "@/components/app/marketplace/creator-card";
import { FilterPanel } from "@/components/app/marketplace/filter-panel";
import {
  DEFAULT_MARKETPLACE_FILTERS,
  filterCreators,
  type MarketplaceCreator,
  type MarketplaceFilters,
} from "@/lib/marketplace";

type CategoryOption = { slug: string; name: string };

/** דפדפן המרקטפלייס — חיפוש, שבבי תחום, סרגל סינון ורשת כרטיסי יוצרים. */
export function MarketplaceBrowser({
  creators,
  categories,
}: {
  creators: MarketplaceCreator[];
  categories: CategoryOption[];
}) {
  const [filters, setFilters] = useState<MarketplaceFilters>(DEFAULT_MARKETPLACE_FILTERS);

  const categoryLabels = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.slug, c.name])),
    [categories],
  );

  const visible = useMemo(() => filterCreators(creators, filters), [creators, filters]);

  const setCategory = (slug: string | null) =>
    setFilters((f) => ({ ...f, categorySlug: f.categorySlug === slug ? null : slug }));

  return (
    <div className="flex flex-col gap-6">
      {/* חיפוש + שבבי תחום */}
      <section className="flex flex-col gap-4">
        <div className="relative w-full lg:max-w-xl">
          <SearchIcon className="text-outline pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2" />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            placeholder="חיפוש לפי שם יוצר…"
            className="border-outline-variant bg-surface-lowest text-on-surface shadow-ambient-sm focus:outline-primary w-full rounded-lg border py-3 ps-12 pe-4 text-sm focus:outline-2"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Chip active={filters.categorySlug === null} onClick={() => setCategory(null)}>
            הכל
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c.slug}
              active={filters.categorySlug === c.slug}
              onClick={() => setCategory(c.slug)}
            >
              {c.name}
            </Chip>
          ))}
        </div>
      </section>

      {/* סרגל סינון + תוצאות */}
      <div className="flex flex-col gap-8 lg:flex-row">
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(DEFAULT_MARKETPLACE_FILTERS)}
        />

        <div className="flex-1">
          <p className="text-on-surface-variant mb-4 text-sm">
            {visible.length === creators.length
              ? `${creators.length} יוצרים בקטלוג`
              : `${visible.length} מתוך ${creators.length} יוצרים`}
          </p>

          {visible.length === 0 ? (
            <div className="border-outline-variant text-on-surface-variant flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
              <UsersIcon className="text-outline size-8" />
              <p className="text-sm">אין יוצרים שתואמים את הסינון. נסו להרחיב את הטווחים.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 2xl:grid-cols-3">
              {visible.map((creator) => (
                <CreatorCard key={creator.id} creator={creator} categoryLabels={categoryLabels} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({
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
      aria-pressed={active}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-on-primary font-semibold"
          : "border-outline-variant bg-surface-lowest text-on-surface-variant hover:bg-surface-low border",
      )}
    >
      {children}
    </button>
  );
}
