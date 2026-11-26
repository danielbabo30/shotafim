"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import {
  applicationFormSchema,
  PLATFORM_FEE_RATE,
  TARGET_TYPES_FOR_ROLE,
  type ApplicationFormState,
} from "@/lib/pitch";
import { PARTNERSHIP_PLATFORM_FEE_PCT, attributionModeHasCoupon } from "@/lib/partner-terms";
import { computeRequiredDepositILS } from "@/lib/partner-deposit";
import { generateCouponCode, generateRefCode } from "@/lib/partner-codes";
import { PARTNERSHIP_AGREEMENT_VERSION } from "@/lib/legal-consent";
import { withActionError } from "@/lib/action-errors";

/** חלון זמן שנחשב "שריון פעיל" ביומן של נכס */
const ACTIVE_BOOKING_STATUSES = ["RESERVED", "CONFIRMED", "BROADCASTING"] as const;
const MAX_NOTE_LENGTH = 1000;

/**
 * שלב 6 — הצעות לבריף.
 *  • submitApplication — ספק (יוצר / בעל שטחים) מגיש הצעה לבריף פתוח.
 *  • acceptApplication — מפרסם מאשר הצעה → נוצר Contract (AWAITING_ESCROW).
 *  • rejectApplication — מפרסם דוחה הצעה.
 *  • withdrawApplication — הספק מבטל הצעה שהגיש.
 */

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function submitApplication(
  _prev: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const user = await requireActiveUser();

  const parsed = applicationFormSchema.safeParse({
    campaignId: formData.get("campaignId"),
    proposedPriceILS: formData.get("proposedPriceILS") ?? "",
    estimatedDeliveryDays: formData.get("estimatedDeliveryDays") ?? "",
    coverLetter: formData.get("coverLetter") ?? "",
    pricingPackageId: formData.get("pricingPackageId") || undefined,
    adSpaceAssetId: formData.get("adSpaceAssetId") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = typeof issue.path[0] === "string" ? issue.path[0] : "_form";
      fieldErrors[key] ??= issue.message;
    }
    return { status: "error", message: "יש לתקן את השדות המסומנים.", fieldErrors };
  }
  const data = parsed.data;

  const campaign = await prisma.campaign.findUnique({
    where: { id: data.campaignId },
    select: {
      id: true,
      status: true,
      targetType: true,
      endDate: true,
      business: { select: { userId: true } },
    },
  });
  if (!campaign) return { status: "error", message: "הבריף לא נמצא." };
  if (campaign.business.userId === user.id) {
    return { status: "error", message: "אי אפשר להגיש הצעה לבריף של עצמך." };
  }
  if (campaign.status !== "OPEN_FOR_PITCHES") {
    return { status: "error", message: "הבריף אינו פתוח להצעות." };
  }
  if (campaign.endDate && campaign.endDate.getTime() < startOfToday().getTime()) {
    return { status: "error", message: "תאריך הסיום של הבריף עבר — אי אפשר להגיש הצעה." };
  }

  const allowed = [
    ...(user.roleKeys.includes("creator") ? (TARGET_TYPES_FOR_ROLE.CREATOR ?? []) : []),
    ...(user.roleKeys.includes("space") ? (TARGET_TYPES_FOR_ROLE.AD_SPACE_OWNER ?? []) : []),
  ];
  if (!allowed.includes(campaign.targetType)) {
    return { status: "error", message: "הבריף אינו מתאים לסוג החשבון שלך." };
  }

  // אימות בעלות על נכס / חבילה שנבחרו
  if (data.pricingPackageId) {
    const pkg = await prisma.creatorPricingPackage.findFirst({
      where: { id: data.pricingPackageId, creator: { userId: user.id } },
      select: { id: true },
    });
    if (!pkg) return { status: "error", message: "החבילה שנבחרה אינה שלך." };
  }
  if (data.adSpaceAssetId) {
    const asset = await prisma.adSpaceAsset.findFirst({
      where: { id: data.adSpaceAssetId, owner: { userId: user.id } },
      select: { id: true, isActive: true, deletedAt: true },
    });
    if (!asset) return { status: "error", message: "השטח שנבחר אינו שלך." };
    if (!asset.isActive || asset.deletedAt) {
      return { status: "error", message: "השטח שנבחר מושבת או נמחק — בחרו שטח פעיל." };
    }
  }

  // אם קיימת הזמנה (INVITED) — משלימים אותה ל-SUBMITTED במקום ליצור חדשה
  const existing = await prisma.campaignApplication.findUnique({
    where: { campaignId_applicantId: { campaignId: campaign.id, applicantId: user.id } },
    select: { id: true, status: true },
  });

  if (existing) {
    // הזמנה (INVITED) או הצעה שבוטלה בידי הספק (WITHDRAWN) — אפשר להגיש מחדש
    if (existing.status !== "INVITED" && existing.status !== "WITHDRAWN") {
      return { status: "error", message: "כבר הגשת הצעה לבריף הזה." };
    }
    await prisma.campaignApplication.update({
      where: { id: existing.id },
      data: {
        proposedPriceILS: new Prisma.Decimal(data.proposedPriceILS),
        estimatedDeliveryDays: data.estimatedDeliveryDays,
        coverLetter: data.coverLetter || null,
        ...(data.pricingPackageId ? { pricingPackageId: data.pricingPackageId } : {}),
        ...(data.adSpaceAssetId ? { adSpaceAssetId: data.adSpaceAssetId } : {}),
        status: "SUBMITTED",
      },
    });
  } else {
    try {
      await prisma.campaignApplication.create({
        data: {
          campaignId: campaign.id,
          applicantId: user.id,
          proposedPriceILS: new Prisma.Decimal(data.proposedPriceILS),
          estimatedDeliveryDays: data.estimatedDeliveryDays,
          coverLetter: data.coverLetter || null,
          pricingPackageId: data.pricingPackageId || null,
          adSpaceAssetId: data.adSpaceAssetId || null,
          status: "SUBMITTED",
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return { status: "error", message: "כבר הגשת הצעה לבריף הזה." };
      }
      throw e;
    }
  }

  revalidatePath("/dashboard/applications");
  revalidatePath(`/dashboard/campaigns/${campaign.id}`);
  redirect("/dashboard/applications?submitted=1");
}

/** מאתר הצעה ומוודא שהיא שייכת לקמפיין של המפרסם המחובר */
async function loadOwnedApplication(applicationId: string) {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("brand")) return null;

  const business = await prisma.businessProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!business) return null;

  const application = await prisma.campaignApplication.findFirst({
    where: { id: applicationId, campaign: { businessId: business.id } },
    select: {
      id: true,
      status: true,
      applicantId: true,
      proposedPriceILS: true,
      estimatedDeliveryDays: true,
      pricingPackageId: true,
      adSpaceAssetId: true,
      pricingPackage: { select: { revisionsIncluded: true } },
      requestedStartDate: true,
      requestedEndDate: true,
      campaignId: true,
      applicant: { select: { name: true } },
      campaign: {
        select: {
          id: true,
          status: true,
          compensationModel: true,
          endDate: true,
          business: { select: { userId: true } },
          partnerTerms: true,
        },
      },
      contract: { select: { id: true } },
    },
  });
  if (!application) return null;
  return { businessId: business.id, application };
}

class BookingClashError extends Error {}

export async function acceptApplication(formData: FormData): Promise<void> {
  const id = String(formData.get("applicationId") ?? "");
  const loaded = await loadOwnedApplication(id);
  if (!loaded) redirect(withActionError("/dashboard/applications", "application-not-found"));
  const { businessId, application } = loaded;
  const campaignPath = `/dashboard/campaigns/${application.campaignId}`;

  if (application.contract) {
    redirect(`/dashboard/contracts/${application.contract.id}`);
  }
  if (application.status !== "SUBMITTED") {
    redirect(withActionError(campaignPath, "application-not-pending"));
  }

  // שריון שטח פרסום: חלון התאריכים המבוקש (אם יש) ובדיקת זמינות הנכס
  const bookingWindow =
    application.adSpaceAssetId && application.requestedStartDate && application.requestedEndDate
      ? { start: application.requestedStartDate, end: application.requestedEndDate }
      : null;

  if (application.adSpaceAssetId) {
    const asset = await prisma.adSpaceAsset.findUnique({
      where: { id: application.adSpaceAssetId },
      select: { isActive: true, deletedAt: true },
    });
    if (!asset || !asset.isActive || asset.deletedAt) {
      redirect(withActionError(campaignPath, "asset-unavailable"));
    }
  }

  const isRevShare = application.campaign.compensationModel === "REVENUE_SHARE";
  const terms = application.campaign.partnerTerms;

  if (isRevShare && !terms) {
    redirect(withActionError(campaignPath, "missing-partner-terms"));
  }

  const price = Number(application.proposedPriceILS);
  // בדיקת החפיפה בתוך הטרנזקציה (Serializable) — מונע שני אישורים מקבילים לאותו חלון
  let contract: { id: string };
  try {
    contract = await prisma.$transaction(
      async (tx) => {
        if (application.adSpaceAssetId && bookingWindow) {
          const clash = await tx.adSpaceBooking.findFirst({
            where: {
              adSpaceAssetId: application.adSpaceAssetId,
              status: { in: [...ACTIVE_BOOKING_STATUSES] },
              contract: { status: { not: "REFUNDED" } },
              startDate: { lte: bookingWindow.end },
              endDate: { gte: bookingWindow.start },
            },
            select: { id: true },
          });
          if (clash) throw new BookingClashError();
        }

        await tx.campaignApplication.update({
          where: { id: application.id },
          data: { status: "ACCEPTED" },
        });

        const c = await tx.contract.create({
          data: {
            campaignId: application.campaignId,
            applicationId: application.id,
            businessId,
            providerId: application.applicantId,
            pricingPackageId: application.pricingPackageId,
            // סבבי התיקונים נגזרים מהחבילה שנבחרה (אחרת ברירת המחדל של הסכימה)
            ...(application.pricingPackage
              ? { revisionRoundsMax: application.pricingPackage.revisionsIncluded }
              : {}),
            adSpaceAssetId: application.adSpaceAssetId,
            compensationModel: application.campaign.compensationModel,
            agreedPriceILS: new Prisma.Decimal(isRevShare ? 0 : price),
            platformFeeILS: new Prisma.Decimal(
              isRevShare ? 0 : Math.round(price * PLATFORM_FEE_RATE),
            ),
            deadline:
              isRevShare && terms
                ? terms.endDate
                : bookingWindow
                  ? bookingWindow.end
                  : new Date(Date.now() + application.estimatedDeliveryDays * 864e5),
            status: "AWAITING_ESCROW",
          },
          select: { id: true },
        });

        if (isRevShare && terms) {
          const withCoupon = attributionModeHasCoupon(terms.attributionMode);
          const requiredDepositILS = computeRequiredDepositILS({
            commissionType: terms.commissionType,
            commissionValue: Number(terms.commissionValue),
            estimatedPurchases: terms.estimatedPurchases,
            assumedAovILS: Number(terms.assumedAovILS),
            platformFeePct: PARTNERSHIP_PLATFORM_FEE_PCT,
          });

          // refCode / couponCode ייחודיים — retry קצר על התנגשות @unique
          let program: { id: string } | null = null;
          for (let attempt = 0; attempt < 5 && !program; attempt++) {
            try {
              program = await tx.partnerProgram.create({
                data: {
                  contractId: c.id,
                  commissionType: terms.commissionType,
                  commissionValue: terms.commissionValue,
                  commissionBasis: terms.commissionBasis,
                  commissionScope: terms.commissionScope,
                  estimatedPurchases: terms.estimatedPurchases,
                  assumedAovILS: terms.assumedAovILS,
                  requiredDepositILS: new Prisma.Decimal(requiredDepositILS),
                  attributionMode: terms.attributionMode,
                  refCode: generateRefCode(),
                  couponCode: withCoupon ? generateCouponCode(application.applicant.name) : null,
                  couponDiscountPct: terms.couponDiscountPct,
                  destinationUrl: terms.destinationUrl,
                  platformFeePct: new Prisma.Decimal(PARTNERSHIP_PLATFORM_FEE_PCT),
                  startDate: terms.startDate,
                  endDate: terms.endDate,
                  payoutCheckpoints: terms.payoutCheckpoints,
                  status: "PENDING_DEPOSIT",
                },
                select: { id: true },
              });
            } catch (e) {
              if (
                e instanceof Prisma.PrismaClientKnownRequestError &&
                e.code === "P2002" &&
                attempt < 4
              ) {
                continue;
              }
              throw e;
            }
          }

          // חומרת תחנות התשלום מתוך מערך התאריכים המנורמל (האחרונה = endDate+14)
          if (program) {
            const dates = [...terms.payoutCheckpoints].sort((a, b) => a.getTime() - b.getTime());
            await tx.payoutCheckpoint.createMany({
              data: dates.map((d, i) => ({
                programId: program!.id,
                sequence: i + 1,
                isFinal: i === dates.length - 1,
                scheduledFor: d,
                status: "SCHEDULED" as const,
              })),
            });
          }

          // תיעוד הסכמת שני הצדדים להסכם השותפות מבוססת-הביצועים
          await tx.legalConsent.createMany({
            data: [application.campaign.business.userId, application.applicantId].map((userId) => ({
              userId,
              documentType: "PARTNERSHIP_AGREEMENT" as const,
              version: PARTNERSHIP_AGREEMENT_VERSION,
            })),
          });
        }

        if (application.adSpaceAssetId && bookingWindow) {
          await tx.adSpaceBooking.create({
            data: {
              adSpaceAssetId: application.adSpaceAssetId,
              contractId: c.id,
              startDate: bookingWindow.start,
              endDate: bookingWindow.end,
              status: "RESERVED",
            },
          });
        }

        if (application.campaign.status === "OPEN_FOR_PITCHES") {
          await tx.campaign.update({
            where: { id: application.campaignId },
            data: { status: "IN_PROGRESS" },
          });
        }
        return c;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (e) {
    if (e instanceof BookingClashError) {
      redirect(withActionError(campaignPath, "asset-clash"));
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") {
      redirect(withActionError(campaignPath, "busy-retry"));
    }
    throw e;
  }

  revalidatePath("/dashboard/applications");
  revalidatePath(campaignPath);
  redirect(`/dashboard/contracts/${contract.id}`);
}

export async function rejectApplication(formData: FormData): Promise<void> {
  const id = String(formData.get("applicationId") ?? "");
  const loaded = await loadOwnedApplication(id);
  if (!loaded) redirect(withActionError("/dashboard/applications", "application-not-found"));
  if (loaded.application.status !== "SUBMITTED") {
    redirect(
      withActionError(
        `/dashboard/campaigns/${loaded.application.campaignId}`,
        "application-not-pending",
      ),
    );
  }

  await prisma.campaignApplication.update({
    where: { id: loaded.application.id },
    data: { status: "REJECTED" },
  });

  revalidatePath("/dashboard/applications");
  revalidatePath(`/dashboard/campaigns/${loaded.application.campaignId}`);
}

export async function withdrawApplication(formData: FormData): Promise<void> {
  const user = await requireActiveUser();
  const id = String(formData.get("applicationId") ?? "");

  const application = await prisma.campaignApplication.findFirst({
    where: { id, applicantId: user.id },
    select: { id: true, status: true, campaignId: true },
  });
  // SUBMITTED = ביטול הצעה; INVITED = דחיית הזמנה
  if (!application || (application.status !== "SUBMITTED" && application.status !== "INVITED")) {
    return;
  }

  await prisma.campaignApplication.update({
    where: { id: application.id },
    data: { status: "WITHDRAWN" },
  });

  revalidatePath("/dashboard/applications");
  revalidatePath(`/dashboard/campaigns/${application.campaignId}`);
}

// ─────────────────────────────────────────────────────────────
//  זרימות brand-initiated: הזמנת יוצר לבריף / שריון שטח פרסום
// ─────────────────────────────────────────────────────────────

export type BrandInviteState = { status: "idle" | "error"; message?: string } | null;

/** דורש את פרופיל העסק של המפרסם המחובר; מחזיר null אם אין הרשאה/פרופיל */
async function requireBrandBusiness() {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("brand")) return null;
  const business = await prisma.businessProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!business) return null;
  return { userId: user.id, businessId: business.id };
}

/**
 * "הזמנה לבריף" — המפרסם מזמין יוצר לבריף פתוח קיים.
 * יוצר CampaignApplication בסטטוס INVITED; היוצר משלים אותה ל-SUBMITTED
 * דרך /dashboard/campaigns/[id] (טופס ההגשה ממולא מראש מפרטי ההזמנה).
 */
export async function inviteToCampaign(
  _prev: BrandInviteState,
  formData: FormData,
): Promise<BrandInviteState> {
  const ctx = await requireBrandBusiness();
  if (!ctx) return { status: "error", message: "יש להשלים פרופיל עסק לפני הזמנת יוצרים." };

  const campaignId = String(formData.get("campaignId") ?? "");
  const creatorUserId = String(formData.get("creatorUserId") ?? "");
  if (!campaignId || !creatorUserId) {
    return { status: "error", message: "חסרים פרטים." };
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, businessId: ctx.businessId },
    select: { id: true, status: true, targetType: true },
  });
  if (!campaign) return { status: "error", message: "הבריף לא נמצא." };
  if (campaign.status !== "OPEN_FOR_PITCHES") {
    return { status: "error", message: "אפשר להזמין רק לבריף פתוח להצעות." };
  }
  if (campaign.targetType === "AD_SPACE") {
    return { status: "error", message: "הבריף מיועד לשטחי פרסום — אי אפשר להזמין אליו יוצר." };
  }
  if (creatorUserId === ctx.userId) {
    return { status: "error", message: "אי אפשר להזמין את עצמך." };
  }

  const creator = await prisma.creatorProfile.findFirst({
    where: { userId: creatorUserId, status: "ACTIVE", deletedAt: null },
    select: {
      pricingPackages: {
        where: { isActive: true },
        orderBy: { priceILS: "asc" },
        take: 1,
        select: { id: true, priceILS: true, turnaroundDays: true },
      },
    },
  });
  if (!creator) return { status: "error", message: "היוצר לא נמצא או אינו פעיל." };
  const pkg = creator.pricingPackages[0] ?? null;

  try {
    await prisma.campaignApplication.create({
      data: {
        campaignId: campaign.id,
        applicantId: creatorUserId,
        invitedByUserId: ctx.userId,
        status: "INVITED",
        proposedPriceILS: new Prisma.Decimal(pkg ? Number(pkg.priceILS) : 0),
        estimatedDeliveryDays: pkg?.turnaroundDays ?? 14,
        pricingPackageId: pkg?.id ?? null,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { status: "error", message: "היוצר כבר הוזמן לבריף הזה או שכבר הגיש הצעה." };
    }
    throw e;
  }

  revalidatePath(`/dashboard/campaigns/${campaign.id}`);
  redirect(`/dashboard/campaigns/${campaign.id}`);
}

export type ReserveState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
} | null;

/**
 * "שריין ביומן" / "הצעת חסות" — המפרסם פותח בריף AD_SPACE ממוקד לשטח בודד
 * ומזמין את בעל השטח (CampaignApplication INVITED עם חלון התאריכים המבוקש).
 */
export async function reserveAdSpace(
  _prev: ReserveState,
  formData: FormData,
): Promise<ReserveState> {
  const ctx = await requireBrandBusiness();
  if (!ctx) {
    return { status: "error", message: "יש להשלים פרופיל עסק לפני שריון שטח פרסום." };
  }

  const adSpaceAssetId = String(formData.get("adSpaceAssetId") ?? "");
  const startRaw = String(formData.get("startDate") ?? "");
  const endRaw = String(formData.get("endDate") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  const start = startRaw && !Number.isNaN(Date.parse(startRaw)) ? new Date(startRaw) : null;
  const end = endRaw && !Number.isNaN(Date.parse(endRaw)) ? new Date(endRaw) : null;
  if (!start) fieldErrors.startDate = "בחרו תאריך התחלה";
  if (!end) fieldErrors.endDate = "בחרו תאריך סיום";
  if (start && end && end <= start) fieldErrors.endDate = "תאריך הסיום חייב להיות אחרי ההתחלה";
  if (start && !fieldErrors.startDate && start.getTime() < startOfToday().getTime()) {
    fieldErrors.startDate = "תאריך ההתחלה לא יכול להיות בעבר";
  }
  if (note.length > MAX_NOTE_LENGTH)
    fieldErrors.note = `ההערה ארוכה מדי (עד ${MAX_NOTE_LENGTH} תווים)`;
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "יש לתקן את התאריכים.", fieldErrors };
  }

  const asset = await prisma.adSpaceAsset.findFirst({
    where: { id: adSpaceAssetId, isActive: true, deletedAt: null },
    select: {
      id: true,
      title: true,
      type: true,
      basePriceILS: true,
      owner: { select: { userId: true } },
    },
  });
  if (!asset) return { status: "error", message: "השטח לא נמצא." };
  if (asset.owner.userId === ctx.userId) {
    return { status: "error", message: "אי אפשר לשריין שטח של עצמך." };
  }

  // חפיפה עם שיבוץ פעיל קיים באותו נכס
  const clash = await prisma.adSpaceBooking.findFirst({
    where: {
      adSpaceAssetId: asset.id,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      contract: { status: { not: "REFUNDED" } },
      startDate: { lte: end! },
      endDate: { gte: start! },
    },
    select: { id: true },
  });
  if (clash) {
    return {
      status: "error",
      message: "השטח כבר משובץ בתאריכים המבוקשים. בחרו חלון אחר.",
      fieldErrors: { startDate: "החלון תפוס" },
    };
  }

  // dedupe: בקשה פתוחה של אותו מפרסם לאותו נכס שחופפת בזמן
  const duplicate = await prisma.campaignApplication.findFirst({
    where: {
      adSpaceAssetId: asset.id,
      status: { in: ["INVITED", "SUBMITTED"] },
      invitedByUserId: ctx.userId,
      requestedStartDate: { lte: end! },
      requestedEndDate: { gte: start! },
    },
    select: { id: true, campaignId: true },
  });
  if (duplicate) {
    return {
      status: "error",
      message: "כבר שלחת בקשת שריון פתוחה לשטח הזה בתאריכים חופפים. המתינו לתשובת בעל השטח.",
    };
  }

  const price = Number(asset.basePriceILS);
  const days = Math.max(1, Math.ceil((end!.getTime() - Date.now()) / 864e5));

  const campaign = await prisma.$transaction(async (tx) => {
    const c = await tx.campaign.create({
      data: {
        businessId: ctx.businessId,
        title: `שריון — ${asset.title}`,
        description: note || `בקשת שריון לשטח «${asset.title}».`,
        targetType: "AD_SPACE",
        status: "OPEN_FOR_PITCHES",
        totalBudgetILS: new Prisma.Decimal(price),
        endDate: end,
      },
      select: { id: true },
    });
    await tx.campaignApplication.create({
      data: {
        campaignId: c.id,
        applicantId: asset.owner.userId,
        invitedByUserId: ctx.userId,
        status: "INVITED",
        adSpaceAssetId: asset.id,
        proposedPriceILS: new Prisma.Decimal(price),
        estimatedDeliveryDays: days,
        requestedStartDate: start,
        requestedEndDate: end,
      },
    });
    return c;
  });

  revalidatePath("/dashboard/campaigns");
  redirect(`/dashboard/campaigns/${campaign.id}`);
}
