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
import { normalizeCheckpoints, partnerTermsSchema } from "@/lib/partner-terms";

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
    compensationModel: formData.get("compensationModel") ?? "FIXED_FEE",
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

  // תנאי שותפות "תשלום פר רכישה" — נדרשים ונשמרים רק כש-compensationModel=REVENUE_SHARE
  let partnerTerms: ReturnType<typeof partnerTermsSchema.safeParse> | null = null;
  if (data.compensationModel === "REVENUE_SHARE") {
    partnerTerms = partnerTermsSchema.safeParse({
      commissionType: formData.get("commissionType") ?? "",
      commissionValue: formData.get("commissionValue") ?? "",
      commissionBasis: formData.get("commissionBasis") ?? "PRE_DISCOUNT",
      commissionScope: formData.get("commissionScope") ?? "PRODUCT_ONLY",
      estimatedPurchases: formData.get("estimatedPurchases") ?? "",
      assumedAovILS: formData.get("assumedAovILS") ?? "",
      attributionMode: formData.get("attributionMode") ?? "LINK_AND_COUPON",
      destinationUrl: formData.get("destinationUrl") ?? "",
      couponDiscountPct: formData.get("couponDiscountPct")
        ? formData.get("couponDiscountPct")
        : undefined,
      payoutCheckpoints: formData.getAll("payoutCheckpoints").map(String).filter(Boolean),
      startDate: formData.get("partnerStartDate") ?? "",
      endDate: formData.get("partnerEndDate") ?? "",
    });
    if (!partnerTerms.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of partnerTerms.error.issues) {
        const key = typeof issue.path[0] === "string" ? (issue.path[0] as string) : "_form";
        fieldErrors[key] ??= issue.message;
      }
      return { status: "error", message: "יש לתקן את תנאי השותפות.", fieldErrors };
    }
  }

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
      compensationModel: data.compensationModel,
      deliverables: data.deliverables,
      targetPlatforms: platformsFromDeliverables(data.deliverables),
      briefAssetsUrl: data.briefAssetsUrl || null,
      hasPhysicalProduct: data.hasPhysicalProduct,
      totalBudgetILS: new Prisma.Decimal(data.totalBudgetILS),
      endDate: data.endDate ? new Date(data.endDate) : null,
      status: data.intent === "publish" ? "OPEN_FOR_PITCHES" : "DRAFT",
      ...(partnerTerms?.success
        ? {
            partnerTerms: {
              create: {
                commissionType: partnerTerms.data.commissionType,
                commissionValue: new Prisma.Decimal(partnerTerms.data.commissionValue),
                commissionBasis: partnerTerms.data.commissionBasis,
                commissionScope: partnerTerms.data.commissionScope,
                estimatedPurchases: partnerTerms.data.estimatedPurchases,
                assumedAovILS: new Prisma.Decimal(partnerTerms.data.assumedAovILS),
                attributionMode: partnerTerms.data.attributionMode,
                destinationUrl: partnerTerms.data.destinationUrl,
                couponDiscountPct:
                  partnerTerms.data.couponDiscountPct != null
                    ? new Prisma.Decimal(partnerTerms.data.couponDiscountPct)
                    : null,
                payoutCheckpoints: normalizeCheckpoints(
                  partnerTerms.data.payoutCheckpoints,
                  new Date(partnerTerms.data.endDate),
                ),
                startDate: new Date(partnerTerms.data.startDate),
                endDate: new Date(partnerTerms.data.endDate),
              },
            },
          }
        : {}),
    },
    select: { id: true },
  });

  revalidatePath("/dashboard/campaigns");
  redirect(`/dashboard/campaigns?created=${campaign.id}`);
}
