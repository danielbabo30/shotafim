import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * GET /dev/seed-pitches — יוצר בריף פתוח למשתמש הבדיקה (dev@bridgead.local) +
 * 3 הצעות מיוצרי הדמו של המרקטפלייס, כדי לבדוק את שלב 6 (הצעות → אישור → חוזה).
 *
 * דורש: /dev/login (יוצר את dev@bridgead.local) ו-/dev/seed-marketplace (היוצרים).
 * אידמפוטנטי. פיתוח בלבד.
 */

const BRAND_EMAIL = "dev@bridgead.local";
const CAMPAIGN_TITLE = "בריף פתוח — סדרת רילסים לחורף";

const PITCHERS = [
  {
    email: "creator.daniel@bridgead.local",
    price: 2400,
    days: 7,
    cover: "יש לי ניסיון רב בתוכן קולינרי, אשמח לשלב את המוצר בסדרת מתכונים קצרים.",
  },
  {
    email: "creator.maya@bridgead.local",
    price: 3800,
    days: 10,
    cover: "אשלב את המוצר באזכור אורגני בתוך רילס אימון — הקהל שלי מאוד מגיב להמלצות.",
  },
  {
    email: "creator.idan@bridgead.local",
    price: 1800,
    days: 14,
    cover: "אינטגרציה קצרה בסרטון סקירה שבועי, כולל קריאייטיב מותאם.",
  },
];

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }

  try {
    const brandUser = await prisma.user.findUnique({
      where: { email: BRAND_EMAIL },
      include: { businessProfile: true },
    });
    if (!brandUser) {
      return NextResponse.json({ error: "run /dev/login first" }, { status: 400 });
    }

    const business =
      brandUser.businessProfile ??
      (await prisma.businessProfile.create({
        data: {
          userId: brandUser.id,
          name: "מותג הבדיקה",
          companyId: "515123456",
          entityType: "LTD",
          description: "עסק בדיקה מקומי",
          businessModel: "PHYSICAL",
          contactName: "משתמש בדיקה",
          contactPhone: "050-0000000",
          billingEmail: BRAND_EMAIL,
          billingAddress: "רחוב הבדיקה 1, תל אביב",
        },
      }));

    const campaign =
      (await prisma.campaign.findFirst({
        where: { businessId: business.id, title: CAMPAIGN_TITLE },
      })) ??
      (await prisma.campaign.create({
        data: {
          businessId: business.id,
          title: CAMPAIGN_TITLE,
          description:
            "מחפשים 2–3 יוצרים לסדרת רילסים סביב השקת קו החורף. דגש על סטייל, אווירה חמימה וקריאה לפעולה לאתר. תקציב גמיש לפי היקף.",
          targetType: "CREATOR",
          deliverables: { set: ["IG_REEL", "IG_STORY"] },
          targetPlatforms: { set: ["INSTAGRAM"] },
          totalBudgetILS: new Prisma.Decimal(12000),
          status: "OPEN_FOR_PITCHES",
          endDate: new Date(Date.now() + 30 * 864e5),
        },
      }));

    const log: string[] = [`בריף: ${campaign.title} (${campaign.status})`];

    for (const p of PITCHERS) {
      const creator = await prisma.user.findUnique({ where: { email: p.email } });
      if (!creator) {
        log.push(`${p.email}: לא קיים — הרץ /dev/seed-marketplace`);
        continue;
      }
      const exists = await prisma.campaignApplication.findUnique({
        where: { campaignId_applicantId: { campaignId: campaign.id, applicantId: creator.id } },
      });
      if (exists) {
        log.push(`${p.email}: כבר הגיש`);
        continue;
      }
      await prisma.campaignApplication.create({
        data: {
          campaignId: campaign.id,
          applicantId: creator.id,
          proposedPriceILS: new Prisma.Decimal(p.price),
          estimatedDeliveryDays: p.days,
          coverLetter: p.cover,
          status: "SUBMITTED",
        },
      });
      log.push(`${p.email}: הצעה נוצרה (₪${p.price})`);
    }

    return NextResponse.json({ ok: true, campaignId: campaign.id, log });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
