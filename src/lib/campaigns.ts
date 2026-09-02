import "server-only";
import { cache } from "react";
import type { CampaignStatus, CampaignTargetType, DeliverableType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";

/**
 * הקשר המפרסם ליצירת בריף — פרופיל העסק והסניפים שלו.
 * מוחזר null כשלמשתמש עדיין אין פרופיל עסקי (טרם הושלם ה-onboarding של המותג).
 */
export type BrandContext = {
  businessId: string;
  businessName: string;
  locations: { id: string; label: string }[];
};

export const getBrandContext = cache(async (): Promise<BrandContext | null> => {
  const user = await requireActiveUser();

  const business = await prisma.businessProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      locations: {
        select: { id: true, name: true, address: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!business) return null;

  return {
    businessId: business.id,
    businessName: business.name,
    locations: business.locations.map((loc) => ({
      id: loc.id,
      label: loc.name ? `${loc.name} — ${loc.address}` : loc.address,
    })),
  };
});

export type BrandCampaignListItem = {
  id: string;
  title: string;
  status: CampaignStatus;
  targetType: CampaignTargetType;
  deliverables: DeliverableType[];
  totalBudgetILS: number;
  endDate: Date | null;
  updatedAt: Date;
  applicationCount: number;
};

export const listBrandCampaigns = cache(async (): Promise<BrandCampaignListItem[]> => {
  const ctx = await getBrandContext();
  if (!ctx) return [];

  const rows = await prisma.campaign.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      targetType: true,
      deliverables: true,
      totalBudgetILS: true,
      endDate: true,
      updatedAt: true,
      _count: { select: { applications: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    targetType: row.targetType,
    deliverables: row.deliverables,
    totalBudgetILS: Number(row.totalBudgetILS),
    endDate: row.endDate,
    updatedAt: row.updatedAt,
    applicationCount: row._count.applications,
  }));
});

/** קמפיינים פתוחים להצעות של המפרסם המחובר — לבורר "הזמנה לבריף" */
export const listBrandOpenCampaigns = cache(
  async (
    targetType?: CampaignTargetType,
  ): Promise<{ id: string; title: string; targetType: CampaignTargetType }[]> => {
    const ctx = await getBrandContext();
    if (!ctx) return [];

    const rows = await prisma.campaign.findMany({
      where: {
        businessId: ctx.businessId,
        status: "OPEN_FOR_PITCHES",
        ...(targetType
          ? { targetType: targetType === "BOTH" ? undefined : { in: [targetType, "BOTH"] } }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, targetType: true },
    });
    return rows;
  },
);
