import "server-only";
import { cache } from "react";
import { SocialPlatform } from "@prisma/client";
import type { MarketplaceCreator } from "@/lib/marketplace";

/**
 * שכבת קריאה ליוצרים במרקטפלייס.
 *
 * ⚠️ PLACEHOLDER — שלב 6 בתוכנית (גילוי + פניות) עדיין לא חובר. כרגע מוחזרת
 * רשימת-דמה קבועה כדי לבנות ולבדוק את ה-UI. כשהמודלים יאוכלסו, להחליף את גוף
 * הפונקציה בשאילתת Prisma:
 *
 *   prisma.creatorProfile.findMany({
 *     where: { status: "ACTIVE", deletedAt: null },
 *     include: { channels: true, pricingPackages: { where: { isActive: true } },
 *                categories: true, primaryCity: true },
 *   })
 *
 * ולמפות: הערוץ עם הכי הרבה עוקבים → followers/engagementRate/avgViews/platforms,
 * החבילה הזולה → startingPriceILS/priceUnitLabel, primaryCity.district → regionValue.
 * חתימת הפונקציה והטיפוס MarketplaceCreator אמורים להישאר.
 */

const PLACEHOLDER: MarketplaceCreator[] = [
  {
    id: "cr-daniel",
    displayName: "דניאל קריאייטיב",
    regionValue: "tel-aviv",
    regionLabel: "תל אביב",
    verified: true,
    categorySlugs: ["food-beverage", "lifestyle"],
    followers: 45_000,
    engagementRate: 8.4,
    avgViews: 18_000,
    platforms: [SocialPlatform.INSTAGRAM, SocialPlatform.TIKTOK],
    startingPriceILS: 2_500,
    priceUnitLabel: "לרילס",
    rating: 4.9,
    reviewCount: 18,
  },
  {
    id: "cr-maya",
    displayName: "מיה כושר ותזונה",
    regionValue: "center",
    regionLabel: "מרכז",
    verified: true,
    categorySlugs: ["fitness-sport", "health-wellness"],
    followers: 120_000,
    engagementRate: 5.2,
    avgViews: 45_000,
    platforms: [SocialPlatform.INSTAGRAM],
    startingPriceILS: 4_000,
    priceUnitLabel: "לרילס",
    rating: 4.8,
    reviewCount: 32,
  },
  {
    id: "cr-idan",
    displayName: "עידן טק סקירות",
    regionValue: "haifa-north",
    regionLabel: "חיפה והצפון",
    verified: true,
    categorySlugs: ["technology", "gaming"],
    followers: 32_000,
    engagementRate: 12.0,
    avgViews: 22_000,
    platforms: [SocialPlatform.YOUTUBE, SocialPlatform.INSTAGRAM],
    startingPriceILS: 1_800,
    priceUnitLabel: "לסרטון",
    rating: 5.0,
    reviewCount: 8,
  },
  {
    id: "cr-noa",
    displayName: "נועה סטייל",
    regionValue: "tel-aviv",
    regionLabel: "תל אביב",
    verified: false,
    categorySlugs: ["fashion", "lifestyle"],
    followers: 88_000,
    engagementRate: 6.1,
    avgViews: 30_000,
    platforms: [SocialPlatform.INSTAGRAM, SocialPlatform.TIKTOK],
    startingPriceILS: 3_200,
    priceUnitLabel: "לרילס",
    rating: 4.7,
    reviewCount: 24,
  },
  {
    id: "cr-yossi",
    displayName: "יוסי מסביב לעולם",
    regionValue: "jerusalem",
    regionLabel: "ירושלים",
    verified: true,
    categorySlugs: ["travel-tourism"],
    followers: 210_000,
    engagementRate: 3.9,
    avgViews: 60_000,
    platforms: [SocialPlatform.INSTAGRAM, SocialPlatform.YOUTUBE],
    startingPriceILS: 5_500,
    priceUnitLabel: "לסרטון",
    rating: 4.6,
    reviewCount: 41,
  },
  {
    id: "cr-shira",
    displayName: "שירה הורים בקטנה",
    regionValue: "south",
    regionLabel: "דרום",
    verified: false,
    categorySlugs: ["parenting-family", "lifestyle"],
    followers: 26_000,
    engagementRate: 9.7,
    avgViews: 12_000,
    platforms: [SocialPlatform.INSTAGRAM, SocialPlatform.FACEBOOK],
    startingPriceILS: 1_500,
    priceUnitLabel: "לסטורי",
    rating: 5.0,
    reviewCount: 11,
  },
];

export const getMarketplaceCreators = cache(async (): Promise<MarketplaceCreator[]> => {
  return PLACEHOLDER;
});
