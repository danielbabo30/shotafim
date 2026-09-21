import "server-only";
import { cache } from "react";
import type {
  AdPricingModel,
  AdSpaceType,
  BookingStatus,
  IsraelDistrict,
  ProofRequirement,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import { getPartnerCategoryLabels } from "@/lib/partner-categories-query";

/**
 * נתוני עמוד חיפוש שטחי הפרסום של המפרסם — עיון בשלטי חוצות, מסכים דיגיטליים,
 * תחבורה, ניוזלטרים ופודקאסטים הזמינים לשריון, עם סינון לפי עיר / סוג מדיה / קטגוריה.
 *
 * נתונים אמיתיים מ-Prisma (ראה CLAUDE.md §"האזור האישי"): AdSpaceAsset פעילים,
 * join ל-AdSpaceOwnerProfile / City / AdSpaceBooking (לחישוב זמינות). תוויות
 * הקטגוריות מגיעות מ-Payload; כאן שומרים slugים בלבד.
 */

export type AdSpaceMediaType =
  "digital_billboard" | "static_billboard" | "transit" | "newsletter" | "podcast";

export const MEDIA_TYPE_LABELS: Record<AdSpaceMediaType, string> = {
  digital_billboard: "מסך דיגיטלי",
  static_billboard: "שלט חוצות",
  transit: "תחבורה",
  newsletter: "ניוזלטר",
  podcast: "פודקאסט",
};

export type AdSpacePricingUnit = "day" | "week" | "month" | "cpm" | "episode";

export const PRICING_UNIT_LABELS: Record<AdSpacePricingUnit, string> = {
  day: "ליום",
  week: "לשבוע",
  month: "לחודש",
  cpm: "לכל 1,000 חשיפות",
  episode: "לפרק",
};

export type AdSpaceSpecKind =
  "size" | "resolution" | "reach" | "traffic" | "listeners" | "subscribers";

export type AdSpaceSpec = { kind: AdSpaceSpecKind; value: string };

export type AdSpaceAvailability = "immediate" | "booked";

export type AdSpaceListing = {
  id: string;
  title: string;
  mediaType: AdSpaceMediaType;
  /** שם ספק המדיה */
  provider: string;
  /** מיקום להצגה (עיר + כתובת / צומת). ריק לפודקאסט / ניוזלטר */
  location: string | null;
  /** שם העיר לסינון — null לשטחים לא-גאוגרפיים */
  city: string | null;
  /** משדר תוכן חי כרגע (מסכים דיגיטליים) */
  isLive: boolean;
  specs: AdSpaceSpec[];
  availability: AdSpaceAvailability;
  /** תאריך שחרור מפורמט — רק כש-availability === "booked" */
  bookedUntil: string | null;
  /** מחיר בסיס בשקלים */
  price: number;
  pricingUnit: AdSpacePricingUnit;
  /** "החל מ-" — כשיש טווח מחירים לפי לוח זמנים */
  priceFrom: boolean;
  /** slugים של קטגוריות דומיין (scope AD_SPACE) שהשטח משויך אליהן */
  categories: string[];
  /** מיקום סכמטי על המפה — אחוזים (0–100) מפינת ההתחלה */
  map: { x: number; y: number };
  href: string;
};

export type AdSpaceFacet = { value: string; label: string };

export type AdSpacesData = {
  listings: AdSpaceListing[];
  /** מסננים זמינים — נגזרים מהמלאי */
  mediaTypes: AdSpaceFacet[];
  cities: AdSpaceFacet[];
  categories: AdSpaceFacet[];
  /** סה״כ שטחים תואמים (לפני חיתוך לעמוד) */
  total: number;
};

export const TYPE_TO_MEDIA: Record<AdSpaceType, AdSpaceMediaType> = {
  DIGITAL_BILLBOARD: "digital_billboard",
  STATIC_BILLBOARD: "static_billboard",
  TRANSIT: "transit",
  NEWSLETTER: "newsletter",
  PODCAST_SPONSORSHIP: "podcast",
};

export const MODEL_TO_UNIT: Record<AdPricingModel, AdSpacePricingUnit> = {
  DAILY: "day",
  WEEKLY: "week",
  MONTHLY: "month",
  PER_CPM: "cpm",
  PER_BROADCAST: "episode",
};

/** סוג מדד החשיפה לפי סוג המדיה */
const REACH_KIND: Record<AdSpaceMediaType, AdSpaceSpecKind> = {
  digital_billboard: "reach",
  static_billboard: "traffic",
  transit: "traffic",
  newsletter: "subscribers",
  podcast: "listeners",
};

const REACH_SUFFIX: Record<AdSpaceSpecKind, string> = {
  reach: "חשיפות משוערות",
  traffic: "חשיפות / חודש",
  listeners: "מאזינים / פרק",
  subscribers: "נמענים",
  size: "",
  resolution: "",
};

/** מיקום סכמטי על מפת ישראל (אחוזים) לפי מחוז — עם jitter יציב מה-id */
const DISTRICT_MAP_POS: Record<IsraelDistrict, { x: number; y: number }> = {
  NORTH: { x: 46, y: 12 },
  HAIFA: { x: 42, y: 20 },
  TEL_AVIV: { x: 33, y: 40 },
  CENTRAL: { x: 42, y: 44 },
  JERUSALEM: { x: 53, y: 52 },
  JUDEA_SAMARIA: { x: 55, y: 44 },
  SOUTH: { x: 44, y: 74 },
};
const NON_GEO_POS = { x: 82, y: 26 };

const clampPct = (n: number) => Math.max(3, Math.min(97, Math.round(n)));

function jitter(id: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 100) / 100) * 12 - 6; // -6..+6
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

const heDate = (d: Date) =>
  new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long" }).format(d);

/** בונה את שורות המפרט מתוך שדות ה-DB */
function buildSpecs(
  a: {
    dimensions: string | null;
    technicalSpecs: unknown;
    estimatedReach: number | null;
  },
  mediaType: AdSpaceMediaType,
): AdSpaceSpec[] {
  const specs: AdSpaceSpec[] = [];
  if (a.dimensions) specs.push({ kind: "size", value: a.dimensions });
  const tech = (a.technicalSpecs ?? {}) as Record<string, unknown>;
  if (typeof tech.resolution === "string") {
    specs.push({ kind: "resolution", value: tech.resolution });
  }
  if (a.estimatedReach != null) {
    const kind = REACH_KIND[mediaType];
    specs.push({ kind, value: `${formatCount(a.estimatedReach)} ${REACH_SUFFIX[kind]}`.trim() });
  }
  return specs;
}

export const getAdSpacesData = cache(async (brandUserId: string): Promise<AdSpacesData> => {
  const now = new Date();

  const rows = await prisma.adSpaceAsset.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      owner: {
        status: "ACTIVE",
        deletedAt: null,
        // מפרסם שהוא גם בעל שטחים לא רואה את השטחים של עצמו
        userId: { not: brandUserId },
      },
    },
    select: {
      id: true,
      title: true,
      type: true,
      address: true,
      dimensions: true,
      technicalSpecs: true,
      estimatedReach: true,
      pricingModel: true,
      basePriceILS: true,
      owner: { select: { companyName: true } },
      city: { select: { nameHe: true, district: true } },
      categories: { select: { categorySlug: true } },
      bookings: {
        where: { status: { in: ["RESERVED", "CONFIRMED", "BROADCASTING"] }, endDate: { gte: now } },
        select: { status: true, startDate: true, endDate: true },
        orderBy: { endDate: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const categoryLabels = await getPartnerCategoryLabels();

  const listings: AdSpaceListing[] = rows.map((a) => {
    const mediaType = TYPE_TO_MEDIA[a.type];
    const specs = buildSpecs(a, mediaType);

    const activeBooking = a.bookings.find((b) => b.startDate <= now) ?? a.bookings[0] ?? null;
    const isBooked = a.bookings.some((b) => b.startDate <= now && b.endDate >= now);

    const base = a.city ? DISTRICT_MAP_POS[a.city.district] : NON_GEO_POS;
    const map = a.city
      ? { x: clampPct(base.x + jitter(a.id, 7)), y: clampPct(base.y + jitter(a.id, 13)) }
      : { x: clampPct(base.x + jitter(a.id, 3)), y: clampPct(base.y + jitter(a.id, 5)) };

    return {
      id: a.id,
      title: a.title,
      mediaType,
      provider: a.owner.companyName,
      location: a.city
        ? [a.city.nameHe, a.address].filter(Boolean).join(", ")
        : (a.address ?? null),
      city: a.city?.nameHe ?? null,
      isLive: a.bookings.some((b) => b.status === "BROADCASTING"),
      specs,
      availability: isBooked ? "booked" : "immediate",
      bookedUntil: isBooked && activeBooking ? heDate(activeBooking.endDate) : null,
      price: Math.round(Number(a.basePriceILS)),
      pricingUnit: MODEL_TO_UNIT[a.pricingModel],
      priceFrom: false,
      categories: a.categories.map((c) => c.categorySlug),
      map,
      href: `/dashboard/ad-spaces/${a.id}`,
    };
  });

  const facet = (values: string[], label: (v: string) => string): AdSpaceFacet[] =>
    [...new Set(values)].map((value) => ({ value, label: label(value) }));

  return {
    listings,
    mediaTypes: facet(
      listings.map((l) => l.mediaType),
      (v) => MEDIA_TYPE_LABELS[v as AdSpaceMediaType],
    ),
    cities: facet(
      listings.map((l) => l.city).filter((c): c is string => c != null),
      (v) => v,
    ),
    categories: facet(
      listings.flatMap((l) => l.categories),
      (v) => categoryLabels[v] ?? v,
    ),
    total: listings.length,
  };
});

// ─────────────────────────────────────────────────────────────
//  עמוד פרטי שטח בודד — /dashboard/ad-spaces/[id]
// ─────────────────────────────────────────────────────────────

export const PROOF_REQUIREMENT_LABELS: Record<ProofRequirement, string> = {
  PHOTO_CONFIRMATION: "צילום השטח בשידור",
  ANALYTICS_REPORT: "דוח חשיפות מהמערכת",
  SYSTEM_LOG: "לוג מערכת אוטומטי",
};

const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  RESERVED: "משוריין",
  CONFIRMED: "מאושר",
  BROADCASTING: "משדר עכשיו",
  COMPLETED: "הושלם",
  CANCELLED: "בוטל",
};

export type AdSpaceBookingView = {
  startDate: Date;
  endDate: Date;
  status: BookingStatus;
  statusLabel: string;
};

export type AdSpaceDetail = {
  id: string;
  title: string;
  mediaType: AdSpaceMediaType;
  mediaLabel: string;
  provider: string;
  providerVerified: boolean;
  description: string;
  location: string | null;
  city: string | null;
  dimensions: string | null;
  estimatedReach: number | null;
  specs: AdSpaceSpec[];
  price: number;
  unitLabel: string;
  proofRequirementLabel: string;
  categorySlugs: string[];
  availability: AdSpaceAvailability;
  isLive: boolean;
  bookings: AdSpaceBookingView[];
};

export const getAdSpaceDetail = cache(async (id: string): Promise<AdSpaceDetail | null> => {
  await requireActiveUser();
  const now = new Date();

  const a = await prisma.adSpaceAsset.findFirst({
    where: {
      id,
      isActive: true,
      deletedAt: null,
      owner: { status: "ACTIVE", deletedAt: null },
    },
    select: {
      id: true,
      title: true,
      type: true,
      description: true,
      address: true,
      dimensions: true,
      technicalSpecs: true,
      estimatedReach: true,
      pricingModel: true,
      basePriceILS: true,
      proofRequirement: true,
      owner: { select: { companyName: true, verificationStatus: true } },
      city: { select: { nameHe: true } },
      categories: { select: { categorySlug: true } },
      bookings: {
        orderBy: { startDate: "asc" },
        select: { startDate: true, endDate: true, status: true },
      },
    },
  });
  if (!a) return null;

  const mediaType = TYPE_TO_MEDIA[a.type];
  const upcoming = a.bookings.filter(
    (b) =>
      b.endDate >= now &&
      (b.status === "RESERVED" || b.status === "CONFIRMED" || b.status === "BROADCASTING"),
  );
  const isBooked = upcoming.some((b) => b.startDate <= now && b.endDate >= now);

  return {
    id: a.id,
    title: a.title,
    mediaType,
    mediaLabel: MEDIA_TYPE_LABELS[mediaType],
    provider: a.owner.companyName,
    providerVerified: a.owner.verificationStatus === "VERIFIED",
    description: a.description,
    location: a.city ? [a.city.nameHe, a.address].filter(Boolean).join(", ") : (a.address ?? null),
    city: a.city?.nameHe ?? null,
    dimensions: a.dimensions,
    estimatedReach: a.estimatedReach,
    specs: buildSpecs(a, mediaType),
    price: Math.round(Number(a.basePriceILS)),
    unitLabel: PRICING_UNIT_LABELS[MODEL_TO_UNIT[a.pricingModel]],
    proofRequirementLabel: PROOF_REQUIREMENT_LABELS[a.proofRequirement],
    categorySlugs: a.categories.map((c) => c.categorySlug),
    availability: isBooked ? "booked" : "immediate",
    isLive: upcoming.some((b) => b.status === "BROADCASTING"),
    bookings: upcoming.map((b) => ({
      startDate: b.startDate,
      endDate: b.endDate,
      status: b.status,
      statusLabel: BOOKING_STATUS_LABEL[b.status],
    })),
  };
});
