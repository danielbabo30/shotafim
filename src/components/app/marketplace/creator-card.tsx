import Link from "next/link";
import { cn } from "@/lib/cn";
import { LocationIcon, StarIcon, VerifiedIcon } from "@/components/marketing/icons";
import { formatFollowersShort, type MarketplaceCreator } from "@/lib/marketplace";
import {
  InviteToCampaignDialog,
  type OpenCampaign,
} from "@/components/app/pitch/invite-to-campaign-dialog";

/** כרטיס יוצר במרקטפלייס — זהות, תחומים, מדדים, מחיר פתיחה ודירוג. */
export function CreatorCard({
  creator,
  categoryLabels,
  openCampaigns,
}: {
  creator: MarketplaceCreator;
  /** slug → שם תצוגה (מ-Payload) */
  categoryLabels: Record<string, string>;
  openCampaigns: OpenCampaign[];
}) {
  const initial = creator.displayName.trim().charAt(0) || "?";

  return (
    <article className="border-outline-variant bg-surface-lowest shadow-ambient-sm hover:shadow-ambient flex flex-col gap-4 rounded-xl border p-6 transition-shadow">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <span className="bg-primary-fixed text-on-primary-fixed font-display grid size-16 place-items-center rounded-full text-xl font-bold">
            {initial}
          </span>
          {creator.verified && (
            <VerifiedIcon className="text-primary bg-surface-lowest absolute -start-1 -bottom-1 size-5 rounded-full" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-on-surface truncate text-lg font-bold">{creator.displayName}</h3>
          <p className="text-on-surface-variant mt-0.5 flex items-center gap-1 text-sm">
            <LocationIcon className="size-4 shrink-0" />
            {creator.regionLabel}
          </p>
        </div>
      </div>

      {creator.categorySlugs.some((s) => categoryLabels[s]) && (
        <div className="flex flex-wrap gap-2">
          {creator.categorySlugs.map((slug) =>
            categoryLabels[slug] ? (
              <span
                key={slug}
                className="bg-surface-low text-on-surface-variant rounded-md px-2 py-1 text-xs font-medium"
              >
                {categoryLabels[slug]}
              </span>
            ) : null,
          )}
        </div>
      )}

      <div className="border-outline-variant grid grid-cols-3 gap-2 border-y py-4 text-center">
        <Metric value={formatFollowersShort(creator.followers)} label="עוקבים" />
        <Metric value={`${creator.engagementRate.toFixed(1)}%`} label="מעורבות" divider />
        <Metric value={formatFollowersShort(creator.avgViews)} label="צפיות ממוצע" divider />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-on-surface-variant text-xs">החל מ-</span>
          <span className="text-on-surface font-bold">
            ₪{creator.startingPriceILS.toLocaleString("en-US")} {creator.priceUnitLabel}
          </span>
        </div>
        <div className="text-on-surface flex items-center gap-1 text-sm font-medium">
          <StarIcon className="size-4 text-amber-400" />
          <span>{creator.rating.toFixed(1)}</span>
          <span className="text-on-surface-variant">({creator.reviewCount} מותגים)</span>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row">
        <InviteToCampaignDialog
          creatorUserId={creator.userId}
          openCampaigns={openCampaigns}
          className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm flex-1 cursor-pointer rounded-lg px-3 py-2 text-center text-sm font-semibold transition-colors"
        />
        <Link
          href={`/dashboard/marketplace/${creator.id}`}
          className="border-outline-variant text-on-surface hover:bg-surface-low flex-1 rounded-lg border px-3 py-2 text-center text-sm font-semibold transition-colors"
        >
          צפייה בפרופיל
        </Link>
      </div>
    </article>
  );
}

function Metric({
  value,
  label,
  divider = false,
}: {
  value: string;
  label: string;
  divider?: boolean;
}) {
  return (
    <div className={cn("flex flex-col", divider && "border-outline-variant border-s")}>
      <span className="text-on-surface text-base font-bold">{value}</span>
      <span className="text-on-surface-variant text-xs">{label}</span>
    </div>
  );
}
