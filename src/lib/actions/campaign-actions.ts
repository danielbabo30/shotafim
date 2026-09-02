"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import {
  campaignFormSchema,
  platformsFromDeliverables,
  type CampaignFormState,
} from "@/lib/campaign-brief";

/**
 * יצירת בריף קמפיין (טיוטה או פרסום להצעות).
 * intent=draft → CampaignStatus.DRAFT · intent=publish → OPEN_FOR_PITCHES.
 * שכבת ה-Escrow (הפקדה בפועל) מתרחשת בהמשך — רק לאחר אישור הצעת יוצר.
 */
export async function createCampaign(
  _prev: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  const user = await requireActiveUser();

  if (!user.roleKeys.includes("brand")) {
    return { status: "error", message: "רק חשבון מפרסם יכול ליצור בריף קמפיין." };
  }

  const business = await prisma.businessProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!business) {
    return {
      status: "error",
      message: "יש להשלים את פרופיל העסק לפני יצירת בריף קמפיין.",
    };
  }

  const parsed = campaignFormSchema.safeParse({
    intent: formData.get("intent"),
    targetType: formData.get("targetType"),
    title: formData.get("title") ?? "",
    locationId: formData.get("locationId") || undefined,
    description: formData.get("description") ?? "",
    briefAssetsUrl: formData.get("briefAssetsUrl") ?? "",
    hasPhysicalProduct: formData.get("hasPhysicalProduct") ?? "",
    deliverables: formData.getAll("deliverables"),
    totalBudgetILS: formData.get("totalBudgetILS") ?? "0",
    endDate: formData.get("endDate") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = typeof issue.path[0] === "string" ? (issue.path[0] as string) : "_form";
      fieldErrors[key] ??= issue.message;
    }
    return {
      status: "error",
      message: "יש לתקן את השדות המסומנים.",
      fieldErrors,
    };
  }

  const data = parsed.data;

  // ודא שהסניף (אם נבחר) באמת שייך לעסק הזה
  let locationId: string | null = null;
  if (data.locationId) {
    const loc = await prisma.businessLocation.findFirst({
      where: { id: data.locationId, businessId: business.id },
      select: { id: true },
    });
    locationId = loc?.id ?? null;
  }

  const campaign = await prisma.campaign.create({
    data: {
      businessId: business.id,
      locationId,
      title: data.title,
      description: data.description,
      targetType: data.targetType,
      deliverables: data.deliverables,
      targetPlatforms: platformsFromDeliverables(data.deliverables),
      briefAssetsUrl: data.briefAssetsUrl || null,
      hasPhysicalProduct: data.hasPhysicalProduct,
      totalBudgetILS: new Prisma.Decimal(data.totalBudgetILS),
      endDate: data.endDate ? new Date(data.endDate) : null,
      status: data.intent === "publish" ? "OPEN_FOR_PITCHES" : "DRAFT",
    },
    select: { id: true },
  });

  revalidatePath("/dashboard/campaigns");
  redirect(`/dashboard/campaigns?created=${campaign.id}`);
}
