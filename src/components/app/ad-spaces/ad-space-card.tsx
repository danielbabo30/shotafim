"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { ReserveAdSpaceDialog } from "@/components/app/pitch/reserve-ad-space-dialog";
import {
  ScreenIcon,
  BillboardIcon,
  BusIcon,
  MailIcon,
  PlayCircleIcon,
  LocationIcon,
  EyeIcon,
  RulerIcon,
  UsersIcon,
  HeartIcon,
  ClockIcon,
} from "@/components/marketing/icons";
import type { AdSpaceMediaType, AdSpaceSpecKind } from "@/lib/ad-spaces";

export type AdSpaceCardVM = {
  id: string;
  title: string;
  mediaType: AdSpaceMediaType;
  mediaLabel: string;
  provider: string;
  location: string | null;
  city: string | null;
  isLive: boolean;
  specs: { kind: AdSpaceSpecKind; value: string }[];
  availability: "immediate" | "booked";
  bookedUntil: string | null;
  priceLabel: string;
  priceShort: string;
  unitLabel: string;
  priceFrom: boolean;
  categories: string[];
  map: { x: number; y: number };
  href: string;
};

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
  listeners: UsersIcon,
  subscribers: MailIcon,
};

const SPONSORSHIP: AdSpaceMediaType[] = ["podcast", "newsletter"];

export function AdSpaceCard({
  listing,
  active,
  onHover,
}: {
  listing: AdSpaceCardVM;
  active: boolean;
  onHover: (id: string | null) => void;
}) {
  const [faved, setFaved] = useState(false);
  const MediaIcon = MEDIA_ICON[listing.mediaType];
  const booked = listing.availability === "booked";
  const ctaLabel = SPONSORSHIP.includes(listing.mediaType) ? "הצעת חסות" : "שריין ביומן";

  return (
    <article
      onMouseEnter={() => onHover(listing.id)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        "border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col overflow-hidden rounded-xl border transition-shadow sm:flex-row",
        active && "shadow-ambient border-outline",
      )}
    >
      {/* מדיה */}
      <div className="bg-surface-high relative grid h-40 shrink-0 place-items-center sm:h-auto sm:w-2/5">
        <MediaIcon className="text-primary/70 size-14" />
        <span
          className={cn(
            "absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            listing.isLive
              ? "bg-error text-on-error"
              : "bg-surface-lowest/90 text-on-surface-variant border-outline-variant border backdrop-blur",
          )}
        >
          {listing.isLive && (
            <span className="bg-on-error size-1.5 animate-pulse rounded-full" aria-hidden />
          )}
          {listing.isLive ? "משדר עכשיו" : listing.mediaLabel}
        </span>
      </div>

      {/* פרטים */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-on-surface text-sm font-bold">
              <Link href={listing.href} className="hover:text-primary transition-colors">
                {listing.title}
              </Link>
            </h3>
            <p className="text-on-surface-variant mt-1 flex items-center gap-1 text-xs">
              <LocationIcon className="size-3.5 shrink-0" />
              {listing.location ?? `${listing.provider} • ${listing.mediaLabel}`}
            </p>
          </div>
          <button
            type="button"
            aria-pressed={faved}
            aria-label={faved ? "הסרה מהמועדפים" : "הוספה למועדפים"}
            onClick={() => setFaved((v) => !v)}
            className="text-outline hover:text-primary -me-1 -mt-1 shrink-0 rounded-lg p-1 transition-colors"
          >
            <HeartIcon className={cn("size-5", faved && "text-primary fill-current")} />
          </button>
        </div>

        {booked && listing.bookedUntil && (
          <p className="bg-warning-container text-warning inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium">
            <ClockIcon className="size-3.5" />
            תפוס עד {listing.bookedUntil}
          </p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {listing.specs.map((s) => {
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

        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <div className="leading-tight">
            {listing.priceFrom && (
              <span className="text-on-surface-variant block text-xs">החל מ-</span>
            )}
            <span className="text-on-surface font-display text-lg font-bold">
              {listing.priceLabel}
            </span>{" "}
            <span className="text-on-surface-variant text-xs">{listing.unitLabel}</span>
          </div>
          {booked ? (
            <Button variant="ghost" disabled className="shrink-0">
              נתפס
            </Button>
          ) : (
            <ReserveAdSpaceDialog
              assetId={listing.id}
              label={ctaLabel}
              className="bg-primary text-on-primary hover:bg-primary-hover shrink-0 cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            />
          )}
        </div>
      </div>
    </article>
  );
}
