import type { Metadata } from "next";
import { requireActiveUser } from "@/lib/app-user";
import { formatShekels } from "@/lib/dashboard-brand";
import { getAdSpacesData, MEDIA_TYPE_LABELS, PRICING_UNIT_LABELS } from "@/lib/ad-spaces";
import { AdSpaceExplorer } from "@/components/app/ad-spaces/ad-space-explorer";
import type { AdSpaceCardVM } from "@/components/app/ad-spaces/ad-space-card";

export const metadata: Metadata = { title: "שטחי פרסום" };

/** ‎₪18.5K — פורמט קצר לפין על המפה */
function shortShekels(n: number): string {
  if (n < 1000) return `₪${n}`;
  const k = n / 1000;
  return `₪${Number.isInteger(k) ? k : k.toFixed(1)}K`;
}

export default async function AdSpacesPage() {
  const user = await requireActiveUser();
  const data = await getAdSpacesData(user.id);

  const listings: AdSpaceCardVM[] = data.listings.map((l) => ({
    id: l.id,
    title: l.title,
    mediaType: l.mediaType,
    mediaLabel: MEDIA_TYPE_LABELS[l.mediaType],
    provider: l.provider,
    location: l.location,
    city: l.city,
    isLive: l.isLive,
    specs: l.specs,
    availability: l.availability,
    bookedUntil: l.bookedUntil,
    priceLabel: formatShekels(l.price),
    priceShort: shortShekels(l.price),
    unitLabel: PRICING_UNIT_LABELS[l.pricingUnit],
    priceFrom: l.priceFrom,
    categories: l.categories,
    map: l.map,
    href: l.href,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-on-surface text-2xl font-bold">שטחי פרסום</h1>
        <p className="text-on-surface-variant mt-1 max-w-2xl text-sm leading-relaxed">
          עיון בשלטי חוצות, מסכים דיגיטליים, תחבורה ופודקאסטים הזמינים לשריון — סינון לפי עיר, סוג
          מדיה וקטגוריה, ותצוגת מיקומים על המפה.
        </p>
      </div>

      <AdSpaceExplorer
        listings={listings}
        mediaTypes={data.mediaTypes}
        cities={data.cities}
        categories={data.categories}
        total={data.total}
      />
    </div>
  );
}
