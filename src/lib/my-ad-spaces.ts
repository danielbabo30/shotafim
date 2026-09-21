import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getPartnerCategoryLabels } from "@/lib/partner-categories-query";
import { formatShekels } from "@/lib/dashboard-brand";
import {
  MEDIA_TYPE_LABELS,
  PRICING_UNIT_LABELS,
  TYPE_TO_MEDIA,
  MODEL_TO_UNIT,
  type AdSpaceMediaType,
  type AdSpaceSpec,
} from "@/lib/ad-spaces";

/**
 * נתוני עמוד «שטחי הפרסום שלי» — כל נכסי המדיה של בעל השטחים המחובר,
 * עם סטטוס תפוסה נגזר מ-AdSpaceBooking (משדר / משובץ / פנוי) והשיבוץ הפעיל.
 *
 * נתונים אמיתיים מ-Prisma (ראה CLAUDE.md §"האזור האישי"): AdSpaceOwnerProfile
 * של המשתמש המחובר → assets → bookings פעילים/עתידיים + join לחוזה לשם המפרסם.
 * תוויות הקטגוריה מגיעות מ-Payload.
 */

export type OwnedAssetStatus = "broadcasting" | "booked" | "available" | "inactive";

/** צבע/משמעות שיבוץ ביומן — נגזר מ-BookingStatus + מצב הנאמנות */
export type BookingKind = "escrow" | "confirmed" | "broadcasting";

export type OwnedAssetBooking = {
  /** שם הקמפיין, ואם אין — שם המפרסם */
  label: string;
  /** שם המפרסם כשורה משנית (null אם כבר מוצג כ-label) */
  sub: string | null;
  /** תאריך סיום מפורמט (עברית) */
  until: string;
  kind: BookingKind;
};

export type OwnedAsset = {
  id: string;
  title: string;
  mediaType: AdSpaceMediaType;
  mediaLabel: string;
  /** מיקום להצגה (עיר + כתובת) — null לפודקאסט / ניוזלטר */
  location: string | null;
  isActive: boolean;
  status: OwnedAssetStatus;
  specs: AdSpaceSpec[];
  price: number;
  /** מחיר מפורמט לתצוגה — ‎₪18,500 */
  priceLabel: string;
  unitLabel: string;
  /** תוויות קטגוריה לתצוגה */
  categories: string[];
  /** השיבוץ המשדר כרגע (אם יש) */
  currentBooking: OwnedAssetBooking | null;
  /** מספר שיבוצים עתידיים (שטרם התחילו) */
  upcomingCount: number;
};

export type MyAdSpacesData =
  { hasProfile: false } | { hasProfile: true; companyName: string; assets: OwnedAsset[] };

const ACTIVE_BOOKING_STATUSES = ["RESERVED", "CONFIRMED", "BROADCASTING"] as const;

const heDate = (d: Date) =>
  new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" }).format(d);

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString("he-IL");
}

const REACH_SUFFIX: Record<AdSpaceMediaType, string> = {
  digital_billboard: "חשיפות מוערכות",
  static_billboard: "חשיפות / חודש",
  transit: "חשיפות / חודש",
  newsletter: "נמענים",
  podcast: "מאזינים / פרק",
};

function bookingKind(status: string, escrowHeld: boolean): BookingKind {
  if (status === "BROADCASTING") return "broadcasting";
  if (status === "CONFIRMED") return "confirmed";
  return escrowHeld ? "confirmed" : "escrow";
}

export const getMyAdSpaces = cache(async (): Promise<MyAdSpacesData> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { hasProfile: false };

  const now = new Date();

  const profile = await prisma.adSpaceOwnerProfile.findUnique({
    where: { userId },
    select: {
      companyName: true,
      assets: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
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
          isActive: true,
          city: { select: { nameHe: true } },
          categories: { select: { categorySlug: true } },
          bookings: {
            where: { endDate: { gte: now }, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
            orderBy: { startDate: "asc" },
            select: {
              startDate: true,
              endDate: true,
              status: true,
              contract: {
                select: {
                  business: { select: { name: true } },
                  campaign: { select: { title: true } },
                  escrowHold: { select: { status: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!profile) return { hasProfile: false };

  const categoryLabels = await getPartnerCategoryLabels();

  const assets: OwnedAsset[] = profile.assets.map((a) => {
    const mediaType = TYPE_TO_MEDIA[a.type];

    const specs: AdSpaceSpec[] = [];
    if (a.dimensions) specs.push({ kind: "size", value: a.dimensions });
    const tech = (a.technicalSpecs ?? {}) as Record<string, unknown>;
    if (typeof tech.resolution === "string") {
      specs.push({ kind: "resolution", value: tech.resolution });
    }
    if (a.estimatedReach != null) {
      const kind = mediaType === "newsletter" ? "subscribers" : "reach";
      specs.push({
        kind,
        value: `${formatCount(a.estimatedReach)} ${REACH_SUFFIX[mediaType]}`,
      });
    }

    const activeRow = a.bookings.find((b) => b.startDate <= now && b.endDate >= now) ?? null;

    let currentBooking: OwnedAssetBooking | null = null;
    if (activeRow) {
      const campaignTitle = activeRow.contract.campaign?.title ?? null;
      const businessName = activeRow.contract.business?.name ?? null;
      currentBooking = {
        label: campaignTitle ?? businessName ?? "שיבוץ פעיל",
        sub: campaignTitle && businessName ? businessName : null,
        until: heDate(activeRow.endDate),
        kind: bookingKind(activeRow.status, activeRow.contract.escrowHold?.status === "HELD"),
      };
    }

    const status: OwnedAssetStatus = !a.isActive
      ? "inactive"
      : activeRow?.status === "BROADCASTING"
        ? "broadcasting"
        : activeRow
          ? "booked"
          : "available";

    return {
      id: a.id,
      title: a.title,
      mediaType,
      mediaLabel: MEDIA_TYPE_LABELS[mediaType],
      location: a.city ? [a.city.nameHe, a.address].filter(Boolean).join(", ") : a.address,
      isActive: a.isActive,
      status,
      specs,
      price: Math.round(Number(a.basePriceILS)),
      priceLabel: formatShekels(Number(a.basePriceILS)),
      unitLabel: PRICING_UNIT_LABELS[MODEL_TO_UNIT[a.pricingModel]],
      categories: a.categories.map((c) => categoryLabels[c.categorySlug] ?? c.categorySlug),
      currentBooking,
      upcomingCount: a.bookings.filter((b) => b.startDate > now).length,
    };
  });

  return { hasProfile: true, companyName: profile.companyName, assets };
});
