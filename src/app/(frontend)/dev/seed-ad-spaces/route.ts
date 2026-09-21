import { NextResponse } from "next/server";
import {
  Prisma,
  type AdSpaceType,
  type AdPricingModel,
  type ProofRequirement,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * GET /dev/seed-ad-spaces — זורע ספק-מדיה דמו + מלאי שטחי פרסום אמיתי
 * (AdSpaceAsset מלאים: עיר, מפרט, תמחור, קטגוריות) + כמה AdSpaceBooking
 * לחישוב זמינות, כדי שעמוד «שטחי פרסום» יציג נתונים אמיתיים מ-DB.
 *
 * אידמפוטנטי — מדלג אם השטח כבר קיים (לפי owner + title).
 * פיתוח בלבד. להסיר לפני פרודקשן.
 */

const OWNER_EMAIL = "media-demo@bridgead.local";

type AssetSeed = {
  title: string;
  type: AdSpaceType;
  cityHe: string | null;
  address: string | null;
  dimensions: string | null;
  resolution: string | null;
  estimatedReach: number | null;
  pricingModel: AdPricingModel;
  basePriceILS: number;
  proofRequirement: ProofRequirement;
  categories: string[];
  description: string;
  /** ימים מהיום עד לסיום שריון קיים — null = פנוי */
  bookedForDays: number | null;
  /** האם השריון כבר משדר עכשיו */
  broadcastingNow: boolean;
};

const ASSETS: AssetSeed[] = [
  {
    title: "מסך LED דיגיטלי — עזריאלי דרום",
    type: "DIGITAL_BILLBOARD",
    cityHe: "תל אביב-יפו",
    address: "דרך מנחם בגין 132",
    dimensions: null,
    resolution: "1920×1080",
    estimatedReach: 180000,
    pricingModel: "WEEKLY",
    basePriceILS: 18500,
    proofRequirement: "PHOTO_CONFIRMATION",
    categories: ["digital-screens"],
    description: "מסך LED בכניסה הדרומית למתחם עזריאלי, פונה לנתיבי איילון.",
    bookedForDays: null,
    broadcastingNow: false,
  },
  {
    title: "שלט חוצות ראשי — גשר לה גווארדיה",
    type: "STATIC_BILLBOARD",
    cityHe: "תל אביב-יפו",
    address: "נתיבי איילון (דרום)",
    dimensions: "24×3 מ׳",
    resolution: null,
    estimatedReach: 5200000,
    pricingModel: "MONTHLY",
    basePriceILS: 42000,
    proofRequirement: "PHOTO_CONFIRMATION",
    categories: ["outdoor-billboards"],
    description: "שלט גשר דומיננטי מעל נתיבי איילון, חשיפה לתנועת בוקר וערב.",
    bookedForDays: 40,
    broadcastingNow: false,
  },
  {
    title: "השבוע בהייטק — חסות ראשית",
    type: "PODCAST_SPONSORSHIP",
    cityHe: null,
    address: null,
    dimensions: null,
    resolution: null,
    estimatedReach: 35000,
    pricingModel: "PER_BROADCAST",
    basePriceILS: 4500,
    proofRequirement: "ANALYTICS_REPORT",
    categories: ["podcasts"],
    description: "אזכור חסות בפתיח ובאמצע הפרק, פודקאסט טכנולוגיה מוביל.",
    bookedForDays: null,
    broadcastingNow: false,
  },
  {
    title: "מסכי מעליות — בורסת היהלומים",
    type: "DIGITAL_BILLBOARD",
    cityHe: "רמת גן",
    address: "בורסת היהלומים",
    dimensions: null,
    resolution: "1080×1920",
    estimatedReach: 90000,
    pricingModel: "WEEKLY",
    basePriceILS: 12000,
    proofRequirement: "SYSTEM_LOG",
    categories: ["digital-screens"],
    description: "רשת מסכים במעליות מגדלי המשרדים, קהל עסקי בשעות היום.",
    bookedForDays: 6,
    broadcastingNow: true,
  },
  {
    title: "עטיפת אוטובוס — קו 480",
    type: "TRANSIT",
    cityHe: "ירושלים",
    address: "ציר ירושלים–תל אביב",
    dimensions: "עטיפה מלאה",
    resolution: null,
    estimatedReach: 1200000,
    pricingModel: "MONTHLY",
    basePriceILS: 9800,
    proofRequirement: "PHOTO_CONFIRMATION",
    categories: ["public-transport"],
    description: "עטיפה מלאה על אוטובוס בין-עירוני בקו הנוסע ביותר בישראל.",
    bookedForDays: null,
    broadcastingNow: false,
  },
  {
    title: "ניוזלטר בוקר — באנר ראשי",
    type: "NEWSLETTER",
    cityHe: null,
    address: null,
    dimensions: null,
    resolution: "600×200",
    estimatedReach: 68000,
    pricingModel: "DAILY",
    basePriceILS: 6200,
    proofRequirement: "ANALYTICS_REPORT",
    categories: ["newsletters"],
    description: "באנר עליון בניוזלטר כלכלה יומי, שיעור פתיחה 42%.",
    bookedForDays: 12,
    broadcastingNow: false,
  },
  {
    title: "שלט גשר — כניסה צפונית לחיפה",
    type: "STATIC_BILLBOARD",
    cityHe: "חיפה",
    address: "צ׳ק פוסט",
    dimensions: "18×4 מ׳",
    resolution: null,
    estimatedReach: 4800000,
    pricingModel: "MONTHLY",
    basePriceILS: 21000,
    proofRequirement: "PHOTO_CONFIRMATION",
    categories: ["outdoor-billboards"],
    description: "שלט בכניסה הצפונית לחיפה, חשיפה לתנועת פנדל יומית.",
    bookedForDays: null,
    broadcastingNow: false,
  },
];

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }

  try {
    const now = new Date();
    const log: string[] = [];

    const ownerUser = await prisma.user.upsert({
      where: { email: OWNER_EMAIL },
      create: {
        email: OWNER_EMAIL,
        name: "מדיה גרופ דמו",
        emailVerified: now,
        status: "ACTIVE",
        roles: { set: ["AD_SPACE_OWNER"] },
        activeRole: "AD_SPACE_OWNER",
        termsAcceptedAt: now,
      },
      update: {},
    });

    const owner =
      (await prisma.adSpaceOwnerProfile.findUnique({ where: { userId: ownerUser.id } })) ??
      (await prisma.adSpaceOwnerProfile.create({
        data: {
          userId: ownerUser.id,
          companyName: "מדיה גרופ דמו",
          legalName: "מדיה גרופ דמו בע״מ",
          companyId: "515800002",
          entityType: "LTD",
          contactName: "מנהל שטחים",
          contactPhone: "03-0000000",
          billingEmail: OWNER_EMAIL,
          billingAddress: "החרש 12, תל אביב",
          verificationStatus: "VERIFIED",
        },
      }));

    for (const seed of ASSETS) {
      const exists = await prisma.adSpaceAsset.findFirst({
        where: { ownerId: owner.id, title: seed.title },
        select: { id: true },
      });
      if (exists) {
        log.push(`${seed.title}: כבר קיים`);
        continue;
      }

      const city = seed.cityHe
        ? await prisma.city.findUnique({ where: { nameHe: seed.cityHe } })
        : null;

      const asset = await prisma.adSpaceAsset.create({
        data: {
          ownerId: owner.id,
          title: seed.title,
          type: seed.type,
          description: seed.description,
          cityId: city?.id ?? null,
          address: seed.address,
          dimensions: seed.dimensions,
          technicalSpecs: seed.resolution ? { resolution: seed.resolution } : Prisma.DbNull,
          estimatedReach: seed.estimatedReach,
          pricingModel: seed.pricingModel,
          basePriceILS: new Prisma.Decimal(seed.basePriceILS),
          proofRequirement: seed.proofRequirement,
          categories: { create: seed.categories.map((slug) => ({ categorySlug: slug })) },
        },
      });

      if (seed.bookedForDays != null) {
        // שריון דורש חוזה — יוצרים חוזה-דמו מינימלי מול המפרסם-דמו של המרקטפלייס
        const brandUser = await prisma.user.findUnique({
          where: { email: "agency-demo@bridgead.local" },
          include: { businessProfile: true },
        });
        const campaign = brandUser?.businessProfile
          ? await prisma.campaign.findFirst({
              where: { businessId: brandUser.businessProfile.id },
              select: { id: true },
            })
          : null;

        if (brandUser?.businessProfile && campaign) {
          const contract = await prisma.contract.create({
            data: {
              campaignId: campaign.id,
              businessId: brandUser.businessProfile.id,
              providerId: ownerUser.id,
              agreedPriceILS: new Prisma.Decimal(seed.basePriceILS),
              platformFeeILS: new Prisma.Decimal(Math.round(seed.basePriceILS * 0.1)),
              deadline: new Date(now.getTime() + seed.bookedForDays * 864e5),
              status: "ACTIVE",
            },
          });
          await prisma.adSpaceBooking.create({
            data: {
              adSpaceAssetId: asset.id,
              contractId: contract.id,
              startDate: seed.broadcastingNow
                ? new Date(now.getTime() - 3 * 864e5)
                : new Date(now.getTime() + 2 * 864e5),
              endDate: new Date(now.getTime() + seed.bookedForDays * 864e5),
              status: seed.broadcastingNow ? "BROADCASTING" : "CONFIRMED",
            },
          });
          log.push(`${seed.title}: נוצר + שריון`);
        } else {
          log.push(`${seed.title}: נוצר (ללא שריון — הרץ /dev/seed-marketplace קודם)`);
        }
      } else {
        log.push(`${seed.title}: נוצר`);
      }
    }

    return NextResponse.json({ ok: true, log });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
