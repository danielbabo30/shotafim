"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  ScreenIcon,
  BillboardIcon,
  BusIcon,
  MailIcon,
  PlayCircleIcon,
  LocationIcon,
  SearchIcon,
  RulerIcon,
  EyeIcon,
  CalendarIcon,
  LockIcon,
  PenSquareIcon,
} from "@/components/marketing/icons";
import type { AdSpaceMediaType, AdSpaceSpecKind } from "@/lib/ad-spaces";
import type { OwnedAsset, OwnedAssetStatus } from "@/lib/my-ad-spaces";

const MEDIA_ICON: Record<AdSpaceMediaType, (p: { className?: string }) => React.JSX.Element> = {
  digital_billboard: ScreenIcon,
  static_billboard: BillboardIcon,
  transit: BusIcon,
  newsletter: MailIcon,
  podcast: PlayCircleIcon,
};

const SPEC_ICON: Record<AdSpaceSpecKind, (p: { className?: string }) => React.JSX.Element> = {
  size: RulerIcon,
  resolution: ScreenIcon,
  reach: EyeIcon,
  traffic: BusIcon,
  listeners: PlayCircleIcon,
  subscribers: MailIcon,
};

const STATUS_META: Record<OwnedAssetStatus, { label: string; className: string }> = {
  broadcasting: { label: "משדר עכשיו", className: "bg-error text-on-error" },
  booked: { label: "משובץ", className: "bg-primary-container text-on-primary-container" },
  available: { label: "פנוי לשריון", className: "bg-success-container text-success" },
  inactive: { label: "לא פעיל", className: "bg-surface-high text-on-surface-variant" },
};

export function MyAssetsList({ assets }: { assets: OwnedAsset[] }) {
  const [type, setType] = useState<AdSpaceMediaType | "all">("all");
  const [query, setQuery] = useState("");

  const facets = useMemo(() => {
    const counts = new Map<AdSpaceMediaType, number>();
    for (const a of assets) counts.set(a.mediaType, (counts.get(a.mediaType) ?? 0) + 1);
    return [...counts.entries()].map(([value, count]) => ({
      value,
      count,
      label: assets.find((a) => a.mediaType === value)!.mediaLabel,
    }));
  }, [assets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (type !== "all" && a.mediaType !== type) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        (a.location?.toLowerCase().includes(q) ?? false) ||
        a.categories.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [assets, type, query]);

  return (
    <div className="flex flex-col gap-4">
      {/* מסננים */}
      <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={type === "all"} onClick={() => setType("all")}>
            כל הנכסים ({assets.length})
          </FilterChip>
          {facets.map((f) => (
            <FilterChip key={f.value} active={type === f.value} onClick={() => setType(f.value)}>
              {f.label} ({f.count})
            </FilterChip>
          ))}
        </div>
        <div className="relative md:w-64">
          <SearchIcon className="text-outline pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם, מיקום או קטגוריה"
            className="border-outline-variant bg-surface-low text-on-surface placeholder:text-outline focus:border-primary focus:ring-primary/30 w-full rounded-lg border py-2 ps-3 pe-9 text-sm focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="border-outline-variant text-on-surface-variant rounded-lg border border-dashed px-4 py-10 text-center text-sm">
          לא נמצאו שטחים שתואמים לסינון.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((asset) => (
            <AssetRow key={asset.id} asset={asset} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
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
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-on-primary"
          : "border-outline-variant text-on-surface-variant hover:bg-surface-container",
      )}
    >
      {children}
    </button>
  );
}

function AssetRow({ asset }: { asset: OwnedAsset }) {
  const MediaIcon = MEDIA_ICON[asset.mediaType];
  const status = STATUS_META[asset.status];
  const booking = asset.currentBooking;

  return (
    <li className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col overflow-hidden rounded-xl border sm:flex-row">
      <div className="bg-surface-high relative grid h-32 shrink-0 place-items-center sm:h-auto sm:w-44">
        <MediaIcon className="text-primary/60 size-12" />
        <span
          className={cn(
            "absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            status.className,
          )}
        >
          {asset.status === "broadcasting" && (
            <span className="bg-on-error size-1.5 animate-pulse rounded-full" aria-hidden />
          )}
          {status.label}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-on-surface truncate text-sm font-bold">{asset.title}</h3>
            <p className="text-on-surface-variant mt-1 flex items-center gap-1 text-xs">
              <LocationIcon className="size-3.5 shrink-0" />
              {asset.location ?? asset.mediaLabel}
            </p>
          </div>
          <div className="shrink-0 text-end leading-tight">
            <span className="text-on-surface font-display text-base font-bold">
              {asset.priceLabel}
            </span>
            <span className="text-on-surface-variant block text-xs">{asset.unitLabel}</span>
          </div>
        </div>

        {booking ? (
          <p
            className={cn(
              "inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
              booking.kind === "escrow"
                ? "bg-warning-container text-warning"
                : "bg-primary-container/50 text-on-primary-container",
            )}
          >
            {booking.kind === "escrow" ? (
              <LockIcon className="size-3.5" />
            ) : (
              <CalendarIcon className="size-3.5" />
            )}
            משובץ ע״י {booking.label}
            {booking.sub ? ` (${booking.sub})` : ""} · עד {booking.until}
          </p>
        ) : asset.status === "available" ? (
          <p className="bg-success-container text-success inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium">
            <CalendarIcon className="size-3.5" />
            אין שיבוץ פעיל — פנוי לשריון
          </p>
        ) : null}

        {asset.specs.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {asset.specs.map((s) => {
              const Icon = SPEC_ICON[s.kind];
              return (
                <span
                  key={s.kind}
                  className="text-on-surface-variant flex items-center gap-1.5 text-xs"
                >
                  <Icon className="text-primary/60 size-4 shrink-0" />
                  {s.value}
                </span>
              );
            })}
          </div>
        )}

        <div className="border-outline-variant mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <span className="text-on-surface-variant text-xs">
            {asset.upcomingCount === 0
              ? "אין שיבוצים עתידיים"
              : asset.upcomingCount === 1
                ? "שיבוץ עתידי אחד ביומן"
                : `${asset.upcomingCount} שיבוצים עתידיים ביומן`}
          </span>
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/assets/${asset.id}/edit`}
              className="text-primary hover:text-primary-hover inline-flex items-center gap-1 text-xs font-semibold transition-colors"
            >
              <PenSquareIcon className="size-3.5" />
              עריכה
            </Link>
            <Link
              href="/dashboard/bookings"
              className="text-primary hover:text-primary-hover inline-flex items-center gap-1 text-xs font-semibold transition-colors"
            >
              <CalendarIcon className="size-3.5" />
              צפייה בלוז
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}
