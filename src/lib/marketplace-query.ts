import "server-only";
import { cache } from "react";
import type { DeliverableType, IsraelDistrict } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MARKETPLACE_REGIONS, type MarketplaceCreator } from "@/lib/marketplace";

/**
 * שכבת קריאה ליוצרים במרקטפלייס — נתונים אמיתיים מ-Prisma (ראה CLAUDE.md §"האזור האישי").
 * כלולים רק CreatorProfile פעילים של משתמשים פעילים.
 *
 * מיפוי:
 *  • הערוץ עם הכי הרבה עוקבים → followers / engagementRate / avgViews
 *  • כל הפלטפורמות של הערוצים → platforms
 *  • החבילה הזולה הפעילה → startingPriceILS / priceUnitLabel
 *  • primaryCity.district → אזור הסינון
 *  • Review פומביים שממוענים ל-user של היוצר → rating / reviewCount
 */

const DISTRICT_TO_REGION: Record<IsraelDistrict, string> = {
  TEL_AVIV: "tel-aviv",
  CENTRAL: "center",
  JERUSALEM: "jerusalem",
  JUDEA_SAMARIA: "jerusalem",
  HAIFA: "haifa-north",
  NORTH: "haifa-north",
  SOUTH: "south",
};

const REGION_LABEL = new Map<string, string>(MARKETPLACE_REGIONS.map((r) => [r.value, r.label]));

const PRICE_UNIT: Record<DeliverableType, string> = {
  IG_REEL: "לרילס",
  IG_STORY: "לסטורי",
  TIKTOK_VIDEO: "לסרטון",
  YOUTUBE_INTEGRATION: "לאינטגרציה",
  EVENT_ATTENDANCE: "להופעה",
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export const getMarketplaceCreators = cache(async (): Promise<MarketplaceCreator[]> => {
  const rows = await prisma.creatorProfile.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      user: { status: "ACTIVE", deletedAt: null },
    },
    select: {
      id: true,
      userId: true,
      displayName: true,
      verificationStatus: true,
      primaryCity: { select: { district: true } },
      channels: {
        select: { platform: true, followersCount: true, engagementRate: true, avgViews: true },
      },
      pricingPackages: {
        where: { isActive: true },
        select: { priceILS: true, deliverableType: true },
      },
      categories: { select: { categorySlug: true } },
      user: {
        select: { receivedReviews: { where: { isPublic: true }, select: { rating: true } } },
      },
    },
  });

  const creators = rows.map((c): MarketplaceCreator => {
    const lead = [...c.channels].sort((a, b) => b.followersCount - a.followersCount)[0];
    const cheapest = [...c.pricingPackages].sort(
      (a, b) => Number(a.priceILS) - Number(b.priceILS),
    )[0];
    const ratings = c.user.receivedReviews.map((r) => r.rating);
    const region = c.primaryCity ? DISTRICT_TO_REGION[c.primaryCity.district] : "";

    return {
      id: c.id,
      userId: c.userId,
      displayName: c.displayName,
      regionValue: region,
      regionLabel: region ? (REGION_LABEL.get(region) ?? "") : "",
      verified: c.verificationStatus === "VERIFIED",
      categorySlugs: c.categories.map((x) => x.categorySlug),
      followers: lead?.followersCount ?? 0,
      engagementRate: lead?.engagementRate ?? 0,
      avgViews: lead?.avgViews ?? 0,
      platforms: [...new Set(c.channels.map((x) => x.platform))],
      startingPriceILS: cheapest ? Math.round(Number(cheapest.priceILS)) : 0,
      priceUnitLabel: cheapest ? PRICE_UNIT[cheapest.deliverableType] : "",
      rating: ratings.length ? round1(ratings.reduce((s, r) => s + r, 0) / ratings.length) : 0,
      reviewCount: ratings.length,
    };
  });

  return creators.sort((a, b) => b.followers - a.followers);
});
