import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * GET /dev/seed-contract — יוצר חוזה-דמו מלא למשתמש הבדיקה (dev@bridgead.local),
 * כדי לבדוק את חדר העבודה / עמוד אישור התוצרים לפני שנבנו Stage 6–7 האמיתיים.
 *
 * יוצר: יוצר-דמו (@daniel_foodie) + קמפיין + חוזה (SUBMITTED_FOR_REVIEW) +
 * EscrowHold (HELD, funded) + 2 גרסאות תוצר + הערות תזמון + שיחה עם הודעות.
 * אידמפוטנטי — הרצה חוזרת מפנה לחוזה הקיים.
 *
 * פיתוח בלבד. להסיר לפני פרודקשן.
 */

const DEV_BRAND_EMAIL = "dev@bridgead.local";
const DEMO_CREATOR_EMAIL = "daniel_foodie@bridgead.local";
const CAMPAIGN_TITLE = "השקת תפריט קיץ";
const SAMPLE_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }

  try {
    const now = new Date();

    const brandUser = await prisma.user.findUnique({
      where: { email: DEV_BRAND_EMAIL },
      include: { businessProfile: true },
    });
    if (!brandUser) {
      return NextResponse.json(
        { error: "run /dev/login first (creates dev@bridgead.local)" },
        { status: 400 },
      );
    }

    // 1. פרופיל עסקי למשתמש הבדיקה (אם עדיין אין)
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
          billingEmail: DEV_BRAND_EMAIL,
          billingAddress: "רחוב הבדיקה 1, תל אביב",
        },
      }));

    // 2. יוצר-דמו + פרופיל + ערוץ
    const creatorUser = await prisma.user.upsert({
      where: { email: DEMO_CREATOR_EMAIL },
      create: {
        email: DEMO_CREATOR_EMAIL,
        name: "דניאל כהן",
        emailVerified: now,
        status: "ACTIVE",
        roles: { set: ["CREATOR"] },
        activeRole: "CREATOR",
        termsAcceptedAt: now,
      },
      update: {},
    });

    await prisma.creatorProfile.upsert({
      where: { userId: creatorUser.id },
      create: {
        userId: creatorUser.id,
        displayName: "daniel_foodie",
        legalFullName: "דניאל כהן",
        idNumber: "039999999",
        taxStatus: "INDIVIDUAL_WITHHOLDING",
        bio: "יוצר תוכן קולינרי — ביקורות מסעדות ומתכונים.",
        channels: {
          create: {
            platform: "INSTAGRAM",
            handle: "daniel_foodie",
            channelUrl: "https://instagram.com/daniel_foodie",
            followersCount: 48000,
          },
        },
      },
      update: {},
    });

    // 3. קמפיין
    const campaign =
      (await prisma.campaign.findFirst({
        where: { businessId: business.id, title: CAMPAIGN_TITLE },
      })) ??
      (await prisma.campaign.create({
        data: {
          businessId: business.id,
          title: CAMPAIGN_TITLE,
          description: "סרטון רילס להשקת תפריט הקיץ החדש, דגש על מנות קלות וטריות.",
          targetType: "CREATOR",
          deliverables: { set: ["IG_REEL"] },
          targetPlatforms: { set: ["INSTAGRAM"] },
          totalBudgetILS: new Prisma.Decimal(3500),
          status: "IN_PROGRESS",
        },
      }));

    // אידמפוטנטי
    const existing = await prisma.contract.findFirst({
      where: { campaignId: campaign.id, providerId: creatorUser.id },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.redirect(new URL(`/dashboard/contracts/${existing.id}`, request.url));
    }

    // 4. חוזה + Escrow + הגשות + הערות + שיחה
    const contract = await prisma.contract.create({
      data: {
        campaignId: campaign.id,
        businessId: business.id,
        providerId: creatorUser.id,
        agreedPriceILS: new Prisma.Decimal(3500),
        platformFeeILS: new Prisma.Decimal(350),
        deadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        status: "SUBMITTED_FOR_REVIEW",
        revisionRoundsMax: 2,
        revisionRoundsUsed: 0,
        escrowHold: {
          create: {
            amountILS: new Prisma.Decimal(3500),
            status: "HELD",
            fundedAt: now,
          },
        },
        submissions: {
          create: [
            {
              version: 1,
              fileUrl: SAMPLE_VIDEO,
              notes: "גרסה ראשונה",
              status: "REVISION_REQUESTED",
              submittedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
            },
            {
              version: 2,
              fileUrl: SAMPLE_VIDEO,
              notes: "תיקנתי את עניין הצבעים בסוף.",
              status: "PENDING_REVIEW",
            },
          ],
        },
        conversations: {
          create: {
            campaignId: campaign.id,
            participants: {
              create: [{ userId: brandUser.id }, { userId: creatorUser.id }],
            },
            messages: {
              create: [
                {
                  senderId: creatorUser.id,
                  body: "היי, העליתי את גרסה 2. תיקנתי את עניין הצבעים בסוף. מה דעתך?",
                  createdAt: new Date(now.getTime() - 60 * 60 * 1000),
                },
                {
                  senderId: brandUser.id,
                  body: "נראה מעולה! רק הוספתי 2 הערות קטנות לגבי הסאונד על הווידאו. ברגע שזה מתוקן נוכל לאשר.",
                  createdAt: new Date(now.getTime() - 45 * 60 * 1000),
                },
              ],
            },
          },
        },
      },
      include: { submissions: { orderBy: { version: "asc" } } },
    });

    const v2 = contract.submissions.find((s) => s.version === 2)!;
    await prisma.contentFeedback.createMany({
      data: [
        {
          submissionId: v2.id,
          authorId: brandUser.id,
          timestampSeconds: 14,
          feedbackText: "נא להגביר את הווליום של סאונד הקראנץ' ולהוסיף לוגו בפינה השמאלית העליונה.",
          isResolved: true,
        },
        {
          submissionId: v2.id,
          authorId: brandUser.id,
          timestampSeconds: 22,
          feedbackText: "המעבר כאן קצת מהיר מדי, אפשר להאריך את השוט של המזיגה בעוד שנייה?",
          isResolved: false,
        },
      ],
    });

    return NextResponse.redirect(new URL(`/dashboard/contracts/${contract.id}`, request.url));
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
