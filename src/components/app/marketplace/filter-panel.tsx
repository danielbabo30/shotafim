"use client";

import type { SocialPlatform } from "@prisma/client";
import { SlidersIcon } from "@/components/marketing/icons";
import { DualRangeSlider } from "@/components/app/marketplace/dual-range-slider";
import {
  FOLLOWERS_BOUNDS,
  PRICE_BOUNDS,
  MARKETPLACE_PLATFORMS,
  MARKETPLACE_REGIONS,
  formatFollowersShort,
  formatPriceShort,
  hasActiveFilters,
  type MarketplaceFilters,
} from "@/lib/marketplace";

/** סרגל הסינון של המרקטפלייס (מבוקר — כל השינויים דרך onChange). */
export function FilterPanel({
  filters,
  onChange,
  onReset,
}: {
  filters: MarketplaceFilters;
  onChange: (next: MarketplaceFilters) => void;
  onReset: () => void;
}) {
  const togglePlatform = (platform: SocialPlatform) => {
    const next = filters.platforms.includes(platform)
      ? filters.platforms.filter((p) => p !== platform)
      : [...filters.platforms, platform];
    onChange({ ...filters, platforms: next });
  };

  return (
    <aside className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex h-fit w-full flex-col gap-6 rounded-xl border p-6 lg:w-72 lg:shrink-0">
      <div className="border-outline-variant flex items-center justify-between border-b pb-4">
        <h2 className="text-on-surface flex items-center gap-2 text-sm font-bold">
          <SlidersIcon className="size-4" />
          סינון תוצאות
        </h2>
        {hasActiveFilters(filters) && (
          <button
            type="button"
            onClick={onReset}
            className="text-primary hover:text-primary-hover text-xs font-semibold"
          >
            נקה סינונים
          </button>
        )}
      </div>

      {/* אזור */}
      <div className="flex flex-col gap-2">
        <label htmlFor="mp-region" className="text-on-surface text-sm font-medium">
          עיר ואזור פעילות
        </label>
        <select
          id="mp-region"
          value={filters.region}
          onChange={(e) => onChange({ ...filters, region: e.target.value })}
          className="border-outline-variant bg-surface-low text-on-surface focus:outline-primary rounded-lg border px-3 py-2 text-sm focus:outline-2"
        >
          {MARKETPLACE_REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* פלטפורמה */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-on-surface mb-1 text-sm font-medium">פלטפורמה</legend>
        <div className="flex flex-col gap-2">
          {MARKETPLACE_PLATFORMS.map((p) => (
            <label
              key={p.value}
              className="text-on-surface-variant hover:text-on-surface flex cursor-pointer items-center gap-2 text-sm transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.platforms.includes(p.value)}
                onChange={() => togglePlatform(p.value)}
                className="accent-primary size-4 rounded"
              />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* טווח עוקבים */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-on-surface text-sm font-medium">טווח עוקבים</span>
          <span className="text-on-surface-variant text-xs font-medium">
            {formatFollowersShort(filters.followers[0])} –{" "}
            {formatFollowersShort(filters.followers[1])}
          </span>
        </div>
        <DualRangeSlider
          label="טווח עוקבים"
          min={FOLLOWERS_BOUNDS.min}
          max={FOLLOWERS_BOUNDS.max}
          step={FOLLOWERS_BOUNDS.step}
          value={filters.followers}
          onChange={(followers) => onChange({ ...filters, followers })}
        />
      </div>

      {/* טווח מחיר */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-on-surface text-sm font-medium">טווח מחיר לחבילה</span>
          <span className="text-on-surface-variant text-xs font-medium">
            {formatPriceShort(filters.price[0])} – {formatPriceShort(filters.price[1])}
          </span>
        </div>
        <DualRangeSlider
          label="טווח מחיר לחבילה"
          min={PRICE_BOUNDS.min}
          max={PRICE_BOUNDS.max}
          step={PRICE_BOUNDS.step}
          value={filters.price}
          onChange={(price) => onChange({ ...filters, price })}
        />
      </div>
    </aside>
  );
}
