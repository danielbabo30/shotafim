import { SocialPlatform } from "@prisma/client";

/**
 * מרקטפלייס היוצרים — טיפוסים, קבועי סינון ולוגיקת הסינון (טהורה).
 *
 * קובץ זה נטול server-only בכוונה: הקבועים והפרדיקט משמשים גם את איון-הלקוח
 * של הסינון (marketplace-browser). שכבת הקריאה מה-DB יושבת ב-marketplace-query.ts.
 */

export type MarketplaceCreator = {
  id: string;
  /** User.id של היוצר — נדרש להזמנה לבריף */
  userId: string;
  displayName: string;
  /** ערך אזור לסינון — אחד מ-MARKETPLACE_REGIONS (ללא "all") */
  regionValue: string;
  regionLabel: string;
  verified: boolean;
  /** slugs של קטגוריות (partner-categories, scope CREATOR) — התוויות מגיעות מ-Payload */
  categorySlugs: string[];
  /** סה"כ עוקבים בערוץ המוביל */
  followers: number;
  /** אחוז מעורבות ממוצע */
  engagementRate: number;
  /** צפיות ממוצעות לרילס/סרטון */
  avgViews: number;
  platforms: SocialPlatform[];
  /** מחיר פתיחה לחבילה הזולה ביותר, בש"ח */
  startingPriceILS: number;
  /** יחידת המחיר להצגה — "לרילס" / "לסרטון" / "לסטורי" */
  priceUnitLabel: string;
  rating: number;
  reviewCount: number;
};

export const MARKETPLACE_REGIONS = [
  { value: "all", label: "כל הארץ" },
  { value: "tel-aviv", label: "תל אביב" },
  { value: "center", label: "מרכז" },
  { value: "jerusalem", label: "ירושלים" },
  { value: "haifa-north", label: "חיפה והצפון" },
  { value: "south", label: "דרום" },
] as const;

export const MARKETPLACE_PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: SocialPlatform.INSTAGRAM, label: "אינסטגרם" },
  { value: SocialPlatform.TIKTOK, label: "טיקטוק" },
  { value: SocialPlatform.YOUTUBE, label: "יוטיוב" },
  { value: SocialPlatform.FACEBOOK, label: "פייסבוק" },
];

/** גבולות סליידר טווח העוקבים */
export const FOLLOWERS_BOUNDS = { min: 0, max: 300_000, step: 5_000 } as const;
/** גבולות סליידר טווח המחיר לחבילה */
export const PRICE_BOUNDS = { min: 0, max: 15_000, step: 500 } as const;

/** ‎45,000 → "45K"; מעל התקרה → "300K+" */
export const formatFollowersShort = (n: number): string => {
  if (n >= FOLLOWERS_BOUNDS.max) return `${FOLLOWERS_BOUNDS.max / 1000}K+`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
};

/** ‎2,500 → "₪2,500"; מעל התקרה → "₪15K+" */
export const formatPriceShort = (n: number): string => {
  if (n >= PRICE_BOUNDS.max) return `₪${PRICE_BOUNDS.max / 1000}K+`;
  return `₪${n.toLocaleString("en-US")}`;
};

export type MarketplaceFilters = {
  query: string;
  /** null = כל הקטגוריות */
  categorySlug: string | null;
  region: string;
  platforms: SocialPlatform[];
  followers: [number, number];
  price: [number, number];
};

export const DEFAULT_MARKETPLACE_FILTERS: MarketplaceFilters = {
  query: "",
  categorySlug: null,
  region: "all",
  platforms: [],
  followers: [FOLLOWERS_BOUNDS.min, FOLLOWERS_BOUNDS.max],
  price: [PRICE_BOUNDS.min, PRICE_BOUNDS.max],
};

const inRange = (value: number, [lo, hi]: [number, number], hardMax: number): boolean =>
  value >= lo && (hi >= hardMax || value <= hi);

/** סינון בצד-הלקוח מעל הרשימה שנטענה מהשרת */
export function filterCreators(
  creators: MarketplaceCreator[],
  f: MarketplaceFilters,
): MarketplaceCreator[] {
  const q = f.query.trim().toLowerCase();

  return creators.filter((c) => {
    if (q && !c.displayName.toLowerCase().includes(q)) return false;
    if (f.categorySlug && !c.categorySlugs.includes(f.categorySlug)) return false;
    if (f.region !== "all" && c.regionValue !== f.region) return false;
    if (f.platforms.length > 0 && !f.platforms.some((p) => c.platforms.includes(p))) return false;
    if (!inRange(c.followers, f.followers, FOLLOWERS_BOUNDS.max)) return false;
    if (!inRange(c.startingPriceILS, f.price, PRICE_BOUNDS.max)) return false;
    return true;
  });
}

/** האם הסינון הנוכחי שונה מברירת המחדל (להצגת כפתור "נקה") */
export function hasActiveFilters(f: MarketplaceFilters): boolean {
  const d = DEFAULT_MARKETPLACE_FILTERS;
  return (
    f.query.trim() !== "" ||
    f.categorySlug !== null ||
    f.region !== d.region ||
    f.platforms.length > 0 ||
    f.followers[0] !== d.followers[0] ||
    f.followers[1] !== d.followers[1] ||
    f.price[0] !== d.price[0] ||
    f.price[1] !== d.price[1]
  );
}
