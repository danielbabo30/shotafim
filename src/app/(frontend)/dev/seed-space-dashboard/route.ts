import { NextResponse } from "next/server";
import {
  Prisma,
  type AdSpaceType,
  type AdPricingModel,
  type ProofRequirement,
  type BookingStatus,
  type ContractStatus,
  type EscrowStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * GET /dev/seed-space-dashboard — זורע תמונת-מצב מלאה לבעל שטחי פרסום דמו
 * (space-board@bridgead.local) כדי שלוח-הבקרה של כובע "מדיה" יציג נתונים
 * אמיתיים מ-DB: מלאי שטחים, חוזים כספק, EscrowHold במצבים שונים, שיבוצים
 * לאורך החודש והוכחות שידור.
 *
 * מפרסמי-דמו נפרדים לכל עסקה (SuperPharm / Fiverr / …) — שם המפרסם על הכרטיס
 * מגיע מ-campaign.business.name.
 *
 * אידמפוטנטי — מדלג על כל ישות שכבר קיימת. פיתוח בלבד. להסיר לפני פרודקשן.
 * כניסה: /dev/login?email=space-board@bridgead.local&role=space
 */

const OWNER_EMAIL = "space-board@bridgead.local";
const DAY = 864e5;

type DealSeed = {
  asset: {
    title: string;
    type: AdSpaceType;
    cityHe: string | null;
    address: string | null;
    dimensions: string | null;
    resolution: string | null;
    estimatedReach: number;
    pricingModel: AdPricingModel;
    basePriceILS: number;
    proofRequirement: ProofRequirement;
    description: string;
    categories: string[];
  };
  advertiser: { email: string; person: string; company: string; companyId: string } | null;
  campaignTitle: string;
  escrowAmount: number;
  escrowStatus: EscrowStatus;
  /** ימים יחסית להיום */
  bookingFrom: number;
  bookingTo: number;
  bookingStatus: BookingStatus;
  contractStatus: ContractStatus;
  proof: "none" | "uploaded" | "verified";
};

/** נכס נוסף בלי שיבוץ — כדי שאחוז התפוסה לא יהיה 100% */
const FREE_ASSET: DealSeed["asset"] = {
  title: "שלט דיגיטלי — כיכר המדינה",
  type: "DIGITAL_BILLBOARD",
  cityHe: "תל אביב-יפו",
  address: "כיכר המדינה",
  dimensions: null,
  resolution: "1920×1080",
  estimatedReach: 70000,
  pricingModel: "WEEKLY",
  basePriceILS: 9000,
  proofRequirement: "PHOTO_CONFIRMATION",
  description: "מסך בכיכר המדינה, פונה לתנועת רכב וקהל הליכה יוקרתי.",
  categories: ["digital-screens"],
};

const DEALS: DealSeed[] = [
  {
    asset: {
      title: "מסך עזריאלי דרום — מחלף השלום",
      type: "DIGITAL_BILLBOARD",
      cityHe: "תל אביב-יפו",
      address: "דרך מנחם בגין, מחלף השלום",
      dimensions: null,
      resolution: "1920×1080",
      estimatedReach: 190000,
      pricingModel: "WEEKLY",
      basePriceILS: 18500,
      proofRequirement: "PHOTO_CONFIRMATION",
      description: "מסך LED דומיננטי במחלף השלום, חשיפה לנתיבי איילון.",
      categories: ["digital-screens"],
    },
    advertiser: {
      email: "adv-superpharm@bridgead.local",
      person: "רכש מדיה",
      company: "SuperPharm ישראל",
      companyId: "511111101",
    },
    campaignTitle: "השקת סדרת טיפוח קיץ",
    escrowAmount: 18500,
    escrowStatus: "HELD",
    bookingFrom: -3,
    bookingTo: 4,
    bookingStatus: "BROADCASTING",
    contractStatus: "ACTIVE",
    proof: "none",
  },
  {
    asset: {
      title: "מסכי מעליות — מגדל המוזיאון",
      type: "DIGITAL_BILLBOARD",
      cityHe: "תל אביב-יפו",
      address: "ברקוביץ׳ 4",
      dimensions: null,
      resolution: "1080×1920",
      estimatedReach: 85000,
      pricingModel: "WEEKLY",
      basePriceILS: 12000,
      proofRequirement: "SYSTEM_LOG",
      description: "רשת מסכים במעליות מגדל המשרדים, קהל עסקי בשעות היום.",
      categories: ["digital-screens"],
    },
    advertiser: {
      email: "adv-bankd@bridgead.local",
      person: "אגף שיווק",
      company: "בנק דיגיטל",
      companyId: "511111102",
    },
    campaignTitle: "מבצע פתיחת חשבון",
    escrowAmount: 12000,
    escrowStatus: "HELD",
    bookingFrom: -11,
    bookingTo: -2,
    bookingStatus: "COMPLETED",
    contractStatus: "ACTIVE",
    proof: "none",
  },
  {
    asset: {
      title: "עטיפת אוטובוס — קו 18",
      type: "TRANSIT",
      cityHe: "תל אביב-יפו",
      address: "מסוף רדינג",
      dimensions: "עטיפה מלאה",
      resolution: null,
      estimatedReach: 900000,
      pricingModel: "MONTHLY",
      basePriceILS: 9800,
      proofRequirement: "PHOTO_CONFIRMATION",
      description: "עטיפה מלאה על אוטובוס עירוני בקו מרכזי בתל אביב.",
      categories: ["public-transport"],
    },
    advertiser: {
      email: "adv-tnuva@bridgead.local",
      person: "מחלקת מדיה",
      company: "תנובה",
      companyId: "511111103",
    },
    campaignTitle: "קמפיין מותג — קיץ 2026",
    escrowAmount: 9800,
    escrowStatus: "HELD",
    bookingFrom: -6,
    bookingTo: 1,
    bookingStatus: "BROADCASTING",
    contractStatus: "SUBMITTED_FOR_REVIEW",
    proof: "uploaded",
  },
  {
    asset: {
      title: "גשר לה גווארדיה — איילון צפון",
      type: "STATIC_BILLBOARD",
      cityHe: "תל אביב-יפו",
      address: "נתיבי איילון (צפון)",
      dimensions: "20×3 מ׳",
      resolution: null,
      estimatedReach: 4900000,
      pricingModel: "MONTHLY",
      basePriceILS: 21000,
      proofRequirement: "PHOTO_CONFIRMATION",
      description: "שלט גשר מעל נתיבי איילון צפון, חשיפה לתנועת בוקר וערב.",
      categories: ["outdoor-billboards"],
    },
    advertiser: {
      email: "adv-fiverr@bridgead.local",
      person: "Brand Team",
      company: "Fiverr",
      companyId: "511111104",
    },
    campaignTitle: "Fiverr — Local Pros",
    escrowAmount: 21000,
    escrowStatus: "RELEASED_TO_PROVIDER",
    bookingFrom: -25,
    bookingTo: -10,
    bookingStatus: "COMPLETED",
    contractStatus: "APPROVED",
    proof: "verified",
  },
  {
    asset: {
      title: "ניוזלטר בוקר — באנר ראשי",
      type: "NEWSLETTER",
      cityHe: null,
      address: null,
      dimensions: null,
      resolution: "600×200",
      estimatedReach: 72000,
      pricingModel: "DAILY",
      basePriceILS: 6200,
      proofRequirement: "ANALYTICS_REPORT",
      description: "באנר עליון בניוזלטר כלכלה יומי, שיעור פתיחה 41%.",
      categories: ["newsletters"],
    },
    advertiser: {
      email: "adv-wolt@bridgead.local",
      person: "Growth",
      company: "וולט",
      companyId: "511111105",
    },
    campaignTitle: "השקת קטגוריית מכולת",
    escrowAmount: 6200,
    escrowStatus: "HELD",
    bookingFrom: 5,
    bookingTo: 12,
    bookingStatus: "RESERVED",
    contractStatus: "ACTIVE",
    proof: "none",
  },
];

async function cityIdByName(nameHe: string | null): Promise<string | null> {
  if (!nameHe) return null;
  const c = await prisma.city.findUnique({ where: { nameHe }, select: { id: true } });
  return c?.id ?? null;
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }

  try {
    const now = new Date();
    const log: string[] = [];

    // ── בעל השטחים ──
    const ownerUser = await prisma.user.upsert({
      where: { email: OWNER_EMAIL },
      create: {
        email: OWNER_EMAIL,
        name: "מדיה פלוס",
        emailVerified: now,
        status: "ACTIVE",
        roles: { set: ["AD_SPACE_OWNER"] },
        activeRole: "AD_SPACE_OWNER",
        termsAcceptedAt: now,
        lastLoginAt: now,
      },
      update: {},
    });

    const owner =
      (await prisma.adSpaceOwnerProfile.findUnique({ where: { userId: ownerUser.id } })) ??
      (await prisma.adSpaceOwnerProfile.create({
        data: {
          userId: ownerUser.id,
          companyName: "מדיה פלוס בע״מ",
          legalName: "מדיה פלוס בע״מ",
          companyId: "515800101",
          entityType: "LTD",
          contactName: "מנהל שטחי פרסום",
          contactPhone: "03-7000000",
          billingEmail: OWNER_EMAIL,
          billingAddress: "יגאל אלון 98, תל אביב",
          verificationStatus: "VERIFIED",
        },
      }));

    // ── נכס פנוי (בלי עסקה) ──
    {
      const exists = await prisma.adSpaceAsset.findFirst({
        where: { ownerId: owner.id, title: FREE_ASSET.title },
        select: { id: true },
      });
      if (!exists) {
        await prisma.adSpaceAsset.create({
          data: {
            ownerId: owner.id,
            title: FREE_ASSET.title,
            type: FREE_ASSET.type,
            description: FREE_ASSET.description,
            cityId: await cityIdByName(FREE_ASSET.cityHe),
            address: FREE_ASSET.address,
            dimensions: FREE_ASSET.dimensions,
            technicalSpecs: FREE_ASSET.resolution
              ? { resolution: FREE_ASSET.resolution }
              : Prisma.DbNull,
            estimatedReach: FREE_ASSET.estimatedReach,
            pricingModel: FREE_ASSET.pricingModel,
            basePriceILS: new Prisma.Decimal(FREE_ASSET.basePriceILS),
            proofRequirement: FREE_ASSET.proofRequirement,
            categories: { create: FREE_ASSET.categories.map((slug) => ({ categorySlug: slug })) },
          },
        });
        log.push(`${FREE_ASSET.title}: נוצר (פנוי)`);
      } else {
        log.push(`${FREE_ASSET.title}: כבר קיים`);
      }
    }

    // ── עסקאות ──
    for (const deal of DEALS) {
      const a = deal.asset;

      let asset = await prisma.adSpaceAsset.findFirst({
        where: { ownerId: owner.id, title: a.title },
        select: { id: true },
      });
      if (!asset) {
        asset = await prisma.adSpaceAsset.create({
          data: {
            ownerId: owner.id,
            title: a.title,
            type: a.type,
            description: a.description,
            cityId: await cityIdByName(a.cityHe),
            address: a.address,
            dimensions: a.dimensions,
            technicalSpecs: a.resolution ? { resolution: a.resolution } : Prisma.DbNull,
            estimatedReach: a.estimatedReach,
            pricingModel: a.pricingModel,
            basePriceILS: new Prisma.Decimal(a.basePriceILS),
            proofRequirement: a.proofRequirement,
            categories: { create: a.categories.map((slug) => ({ categorySlug: slug })) },
          },
          select: { id: true },
        });
      }

      // מפרסם + פרופיל עסקי
      const adv = deal.advertiser!;
      const advUser = await prisma.user.upsert({
        where: { email: adv.email },
        create: {
          email: adv.email,
          name: adv.company,
          emailVerified: now,
          status: "ACTIVE",
          roles: { set: ["BRAND"] },
          activeRole: "BRAND",
          termsAcceptedAt: now,
        },
        update: {},
      });
      const biz =
        (await prisma.businessProfile.findUnique({ where: { userId: advUser.id } })) ??
        (await prisma.businessProfile.create({
          data: {
            userId: advUser.id,
            name: adv.company,
            legalName: `${adv.company} בע״מ`,
            companyId: adv.companyId,
            entityType: "LTD",
            description: `${adv.company} — מפרסם דמו ללוח-הבקרה של בעל השטחים.`,
            businessModel: "HYBRID",
            contactName: adv.person,
            contactPhone: "03-0000000",
            billingEmail: adv.email,
            billingAddress: "תל אביב",
            verificationStatus: "VERIFIED",
          },
        }));

      const campaign =
        (await prisma.campaign.findFirst({
          where: { businessId: biz.id, title: deal.campaignTitle },
          select: { id: true },
        })) ??
        (await prisma.campaign.create({
          data: {
            businessId: biz.id,
            title: deal.campaignTitle,
            description: `${deal.campaignTitle} — שריון שטח פרסום דרך שותפים.`,
            targetType: "AD_SPACE",
            targetPlatforms: { set: [] },
            deliverables: { set: [] },
            totalBudgetILS: new Prisma.Decimal(deal.escrowAmount),
            status: "IN_PROGRESS",
            startDate: new Date(now.getTime() + deal.bookingFrom * DAY),
            endDate: new Date(now.getTime() + deal.bookingTo * DAY),
          },
          select: { id: true },
        }));

      const existingContract = await prisma.contract.findFirst({
        where: { campaignId: campaign.id, providerId: ownerUser.id, adSpaceAssetId: asset.id },
        select: { id: true },
      });
      if (existingContract) {
        log.push(`${a.title}: עסקה כבר קיימת`);
        continue;
      }

      const start = new Date(now.getTime() + deal.bookingFrom * DAY);
      const end = new Date(now.getTime() + deal.bookingTo * DAY);

      await prisma.contract.create({
        data: {
          campaignId: campaign.id,
          businessId: biz.id,
          providerId: ownerUser.id,
          adSpaceAssetId: asset.id,
          agreedPriceILS: new Prisma.Decimal(deal.escrowAmount),
          platformFeeILS: new Prisma.Decimal(Math.round(deal.escrowAmount * 0.1)),
          deadline: end,
          status: deal.contractStatus,
          completedAt:
            deal.contractStatus === "APPROVED" ? new Date(now.getTime() - 5 * DAY) : null,
          escrowHold: {
            create: {
              amountILS: new Prisma.Decimal(deal.escrowAmount),
              status: deal.escrowStatus,
              fundedAt: new Date(now.getTime() + (deal.bookingFrom - 2) * DAY),
              releasedAt:
                deal.escrowStatus === "RELEASED_TO_PROVIDER"
                  ? new Date(now.getTime() - 5 * DAY)
                  : null,
            },
          },
          bookings: {
            create: {
              adSpaceAssetId: asset.id,
              startDate: start,
              endDate: end,
              status: deal.bookingStatus,
            },
          },
          proofs:
            deal.proof === "none"
              ? undefined
              : {
                  create: {
                    proofType:
                      a.proofRequirement === "ANALYTICS_REPORT"
                        ? "ANALYTICS_EXPORT"
                        : a.proofRequirement === "SYSTEM_LOG"
                          ? "SYSTEM_LOG"
                          : "PHOTO_PROOF",
                    fileUrl: "https://example.com/dev-proof-of-play.jpg",
                    notes: "הוכחת שידור דמו (פיתוח).",
                    verifiedByBrand: deal.proof === "verified",
                    uploadedAt: new Date(now.getTime() - 4 * DAY),
                  },
                },
        },
      });

      log.push(`${a.title}: עסקה נוצרה (${deal.contractStatus}/${deal.escrowStatus})`);
    }

    return NextResponse.json({
      ok: true,
      login: `/dev/login?email=${OWNER_EMAIL}&role=space`,
      log,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
