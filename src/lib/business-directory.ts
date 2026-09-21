import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * שכבת קריאה לחיפוש עסקים באזור האישי (`/dashboard/businesses`) — נתונים אמיתיים מ-Prisma
 * (ראה CLAUDE.md §"האזור האישי" — אין mock/placeholder).
 *
 * חשוף רק שדות בטוחים: name / logoUrl / description / קטגוריות / עיר ראשית.
 * לעולם לא billingEmail / billingAddress / contactPhone / companyId / partnershipDebtILS.
 */

export type BusinessDirectoryItem = {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  categorySlugs: string[];
  cityId: string | null;
};

export type BusinessDirectoryFilters = {
  /** חיפוש טקסט חופשי לפי שם העסק */
  q?: string;
  /** slug קטגוריה */
  category?: string;
  /** מזהה עיר */
  city?: string;
};

/** רשימת עסקים פעילים ולא-מחוקים, מסוננת לפי חיפוש חופשי / קטגוריה / עיר. */
export const getBusinessDirectory = cache(
  async (filters: BusinessDirectoryFilters = {}): Promise<BusinessDirectoryItem[]> => {
    const { q, category, city } = filters;

    const rows = await prisma.businessProfile.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        ...(category ? { categories: { some: { categorySlug: category } } } : {}),
        ...(city ? { locations: { some: { cityId: city } } } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        categories: { select: { categorySlug: true } },
        locations: {
          select: { cityId: true, isPrimary: true },
          orderBy: { isPrimary: "desc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      logoUrl: r.logoUrl,
      categorySlugs: r.categories.map((c) => c.categorySlug),
      cityId: r.locations[0]?.cityId ?? null,
    }));
  },
);

// ═══════════════════════════════════════════════════════════════
//  עמוד עסק בודד (`/dashboard/businesses/[businessId]`) — אזור אישי
// ═══════════════════════════════════════════════════════════════

export type BusinessDetailSocialLinks = {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
};

export type BusinessDetailLocation = {
  id: string;
  name: string | null;
  cityId: string;
  address: string;
  isPrimary: boolean;
};

export type BusinessDetail = {
  id: string;
  /** מזהה ה-User הבעלים — לפתיחת שיחה / שאילתת ביקורות. לא מוצג ישירות. */
  userId: string;
  name: string;
  description: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  socialLinks: BusinessDetailSocialLinks;
  categorySlugs: string[];
  locations: BusinessDetailLocation[];
};

export type BusinessPublicReview = {
  id: string;
  rating: number;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  feedbackText: string;
  createdAt: Date;
  /** שם תצוגה בלבד (שם פרטי / כינוי) — לעולם לא מייל/טלפון */
  authorDisplayName: string;
};

function isSocialLinks(value: unknown): value is BusinessDetailSocialLinks {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstNameOf(fullName: string | null): string | null {
  if (!fullName) return null;
  const first = fullName.trim().split(/\s+/)[0];
  return first || null;
}

/**
 * פרטי עסק מלאים לעמוד `/dashboard/businesses/[businessId]` באזור האישי + ביקורות פומביות אחרונות.
 * מחזיר `null` אם העסק לא קיים / לא ACTIVE / נמחק — הקורא אחראי ל-`notFound()`.
 *
 * אין שדות רגישים (billingEmail/billingAddress/contactPhone/contactName/companyId/
 * partnershipDebtILS/billingCustomerId) — ר' CLAUDE.md.
 */
export const getBusinessDetail = cache(
  async (
    businessId: string,
  ): Promise<{ business: BusinessDetail; reviews: BusinessPublicReview[] } | null> => {
    const row = await prisma.businessProfile.findFirst({
      where: { id: businessId, status: "ACTIVE", deletedAt: null },
      select: {
        id: true,
        userId: true,
        name: true,
        description: true,
        logoUrl: true,
        websiteUrl: true,
        socialLinks: true,
        categories: { select: { categorySlug: true } },
        locations: {
          select: { id: true, name: true, cityId: true, address: true, isPrimary: true },
          orderBy: { isPrimary: "desc" },
        },
      },
    });

    if (!row) return null;

    const reviewRows = await prisma.review.findMany({
      where: { targetId: row.userId, isPublic: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        rating: true,
        sentiment: true,
        feedbackText: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    });

    return {
      business: {
        id: row.id,
        userId: row.userId,
        name: row.name,
        description: row.description,
        logoUrl: row.logoUrl,
        websiteUrl: row.websiteUrl,
        socialLinks: isSocialLinks(row.socialLinks) ? row.socialLinks : {},
        categorySlugs: row.categories.map((c) => c.categorySlug),
        locations: row.locations,
      },
      reviews: reviewRows.map((r) => ({
        id: r.id,
        rating: r.rating,
        sentiment: r.sentiment,
        feedbackText: r.feedbackText,
        createdAt: r.createdAt,
        authorDisplayName: firstNameOf(r.author.name) ?? "משתמש שותפים",
      })),
    };
  },
);
