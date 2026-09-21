import { NextResponse } from "next/server";
import { Prisma, type SocialPlatform, type DeliverableType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * GET /dev/seed-marketplace — זורע יוצרי-דמו אמיתיים (CreatorProfile מלאים:
 * ערוצים, מחירון, קטגוריות, עיר) + חוזה שהושלם + ביקורת אחת לכל יוצר, כדי
 * שעמוד המרקטפלייס יציג נתונים אמיתיים מ-DB.
 *
 * אידמפוטנטי — יוצר מדלג אם ה-CreatorProfile שלו כבר קיים.
 * פיתוח בלבד. להסיר לפני פרודקשן.
 */

const DEMO_BRAND_EMAIL = "agency-demo@bridgead.local";

type Seed = {
  email: string;
  name: string;
  displayName: string;
  idNumber: string;
  bio: string;
  cityHe: string;
  verified: boolean;
  categories: string[];
  channels: {
    platform: SocialPlatform;
    handle: string;
    followersCount: number;
    engagementRate: number;
    avgViews: number;
  }[];
  packages: { deliverableType: DeliverableType; title: string; priceILS: number; days: number }[];
  review: { rating: number; text: string };
};

const CREATORS: Seed[] = [
  {
    email: "creator.daniel@bridgead.local",
    name: "דניאל כהן",
    displayName: "דניאל קריאייטיב",
    idNumber: "021110001",
    bio: "תוכן קולינרי — ביקורות מסעדות, המלצות ומתכונים קצרים.",
    cityHe: "תל אביב-יפו",
    verified: true,
    categories: ["food-beverage", "lifestyle"],
    channels: [
      {
        platform: "INSTAGRAM",
        handle: "daniel_creative",
        followersCount: 45000,
        engagementRate: 8.4,
        avgViews: 18000,
      },
      {
        platform: "TIKTOK",
        handle: "daniel_eats",
        followersCount: 31000,
        engagementRate: 11.2,
        avgViews: 26000,
      },
    ],
    packages: [
      { deliverableType: "IG_REEL", title: "רילס ייעודי + 2 סטוריז", priceILS: 2500, days: 7 },
      { deliverableType: "IG_STORY", title: "סדרת 3 סטוריז", priceILS: 900, days: 3 },
    ],
    review: { rating: 5, text: "עמד בזמנים, תוצר מוקפד, תקשורת מצוינת." },
  },
  {
    email: "creator.maya@bridgead.local",
    name: "מיה לוי",
    displayName: "מיה כושר ותזונה",
    idNumber: "021110002",
    bio: "מאמנת כושר ותזונאית — אימונים ביתיים, ליווי והרגלי אכילה.",
    cityHe: "רמת גן",
    verified: true,
    categories: ["fitness-sport", "health-wellness"],
    channels: [
      {
        platform: "INSTAGRAM",
        handle: "maya_fit",
        followersCount: 120000,
        engagementRate: 5.2,
        avgViews: 45000,
      },
    ],
    packages: [
      { deliverableType: "IG_REEL", title: "רילס אימון + אזכור מותג", priceILS: 4000, days: 10 },
    ],
    review: { rating: 5, text: "מקצועית מאוד, הביאה תוצאות מעל הציפייה." },
  },
  {
    email: "creator.idan@bridgead.local",
    name: "עידן ברק",
    displayName: "עידן טק סקירות",
    idNumber: "021110003",
    bio: "סקירות גאדג'טים, השוואות והמלצות קנייה.",
    cityHe: "חיפה",
    verified: true,
    categories: ["technology", "gaming"],
    channels: [
      {
        platform: "YOUTUBE",
        handle: "idan_tech",
        followersCount: 32000,
        engagementRate: 12.0,
        avgViews: 22000,
      },
      {
        platform: "INSTAGRAM",
        handle: "idan_tech",
        followersCount: 14000,
        engagementRate: 6.8,
        avgViews: 9000,
      },
    ],
    packages: [
      {
        deliverableType: "YOUTUBE_INTEGRATION",
        title: "אינטגרציה בסרטון סקירה",
        priceILS: 1800,
        days: 14,
      },
    ],
    review: { rating: 4, text: "תוצר טוב, לקח קצת יותר זמן מהמתוכנן." },
  },
  {
    email: "creator.noa@bridgead.local",
    name: "נועה שגב",
    displayName: "נועה סטייל",
    idNumber: "021110004",
    bio: "אופנה ולייפסטייל — לוקים יומיומיים, טרנדים ושופינג.",
    cityHe: "תל אביב-יפו",
    verified: false,
    categories: ["fashion", "lifestyle"],
    channels: [
      {
        platform: "INSTAGRAM",
        handle: "noa_style",
        followersCount: 88000,
        engagementRate: 6.1,
        avgViews: 30000,
      },
      {
        platform: "TIKTOK",
        handle: "noa_style",
        followersCount: 54000,
        engagementRate: 9.0,
        avgViews: 40000,
      },
    ],
    packages: [
      { deliverableType: "IG_REEL", title: "רילס לוק + לינק בסטורי", priceILS: 3200, days: 7 },
    ],
    review: { rating: 5, text: "אסתטיקה מדויקת למותג, שיתוף פעולה קליל." },
  },
  {
    email: "creator.yossi@bridgead.local",
    name: "יוסי אדרי",
    displayName: "יוסי מסביב לעולם",
    idNumber: "021110005",
    bio: "תיירות ונסיעות — יעדים, טיפים ומסלולים.",
    cityHe: "ירושלים",
    verified: true,
    categories: ["travel-tourism"],
    channels: [
      {
        platform: "INSTAGRAM",
        handle: "yossi_travels",
        followersCount: 210000,
        engagementRate: 3.9,
        avgViews: 60000,
      },
      {
        platform: "YOUTUBE",
        handle: "yossi_travels",
        followersCount: 95000,
        engagementRate: 5.5,
        avgViews: 48000,
      },
    ],
    packages: [
      { deliverableType: "YOUTUBE_INTEGRATION", title: "פרק יעד ממותג", priceILS: 5500, days: 21 },
    ],
    review: { rating: 4, text: "חשיפה מצוינת, איכות הפקה גבוהה." },
  },
  {
    email: "creator.shira@bridgead.local",
    name: "שירה מזרחי",
    displayName: "שירה הורים בקטנה",
    idNumber: "021110006",
    bio: "הורות ומשפחה — טיפים, מוצרים לילדים ושגרת בית.",
    cityHe: "באר שבע",
    verified: false,
    categories: ["parenting-family", "lifestyle"],
    channels: [
      {
        platform: "INSTAGRAM",
        handle: "shira_parenting",
        followersCount: 26000,
        engagementRate: 9.7,
        avgViews: 12000,
      },
      {
        platform: "FACEBOOK",
        handle: "shira.parenting",
        followersCount: 41000,
        engagementRate: 4.2,
        avgViews: 8000,
      },
    ],
    packages: [
      { deliverableType: "IG_STORY", title: "סדרת סטוריז המלצה", priceILS: 1500, days: 4 },
    ],
    review: { rating: 5, text: "קהל נאמן ומגיב, המרות יפות מהסטוריז." },
  },
  {
    email: "creator.tom@bridgead.local",
    name: "תום גלבוע",
    displayName: "תום גיימר",
    idNumber: "021110007",
    bio: "גיימינג ובידור — לייבים, סקירות משחקים והרפתקאות.",
    cityHe: "נתניה",
    verified: true,
    categories: ["gaming", "technology"],
    channels: [
      {
        platform: "TIKTOK",
        handle: "tom_gamer",
        followersCount: 150000,
        engagementRate: 10.5,
        avgViews: 70000,
      },
      {
        platform: "YOUTUBE",
        handle: "tom_gamer",
        followersCount: 60000,
        engagementRate: 7.1,
        avgViews: 33000,
      },
    ],
    packages: [
      { deliverableType: "TIKTOK_VIDEO", title: "סרטון טיקטוק ממותג", priceILS: 2200, days: 5 },
    ],
    review: { rating: 4, text: "אנרגיה מעולה, קהל צעיר ומעורב." },
  },
];

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }

  try {
    const now = new Date();
    const log: string[] = [];

    // מפרסם-דמו לצורך חוזה + ביקורת
    const brandUser = await prisma.user.upsert({
      where: { email: DEMO_BRAND_EMAIL },
      create: {
        email: DEMO_BRAND_EMAIL,
        name: "סוכנות דמו",
        emailVerified: now,
        status: "ACTIVE",
        roles: { set: ["BRAND"] },
        activeRole: "BRAND",
        termsAcceptedAt: now,
      },
      update: {},
    });

    const business =
      (await prisma.businessProfile.findUnique({ where: { userId: brandUser.id } })) ??
      (await prisma.businessProfile.create({
        data: {
          userId: brandUser.id,
          name: "סוכנות דמו",
          companyId: "515900001",
          entityType: "LTD",
          description: "סוכנות שיווק דיגיטלי — חשבון הדגמה.",
          businessModel: "ONLINE",
          contactName: "מנהל סוכנות",
          contactPhone: "03-0000000",
          billingEmail: DEMO_BRAND_EMAIL,
          billingAddress: "דרך מנחם בגין 1, תל אביב",
        },
      }));

    const campaign =
      (await prisma.campaign.findFirst({
        where: { businessId: business.id, title: "קמפיין דמו למרקטפלייס" },
      })) ??
      (await prisma.campaign.create({
        data: {
          businessId: business.id,
          title: "קמפיין דמו למרקטפלייס",
          description: "קמפיין הדגמה לצורך זריעת ביקורות ליוצרים.",
          targetType: "CREATOR",
          totalBudgetILS: new Prisma.Decimal(50000),
          status: "COMPLETED",
        },
      }));

    for (const seed of CREATORS) {
      const user = await prisma.user.upsert({
        where: { email: seed.email },
        create: {
          email: seed.email,
          name: seed.name,
          emailVerified: now,
          status: "ACTIVE",
          roles: { set: ["CREATOR"] },
          activeRole: "CREATOR",
          termsAcceptedAt: now,
        },
        update: {},
      });

      const existing = await prisma.creatorProfile.findUnique({ where: { userId: user.id } });
      if (existing) {
        log.push(`${seed.displayName}: כבר קיים`);
        continue;
      }

      const city = await prisma.city.findUnique({ where: { nameHe: seed.cityHe } });

      await prisma.creatorProfile.create({
        data: {
          userId: user.id,
          displayName: seed.displayName,
          legalFullName: seed.name,
          idNumber: seed.idNumber,
          taxStatus: "EXEMPT_DEALER",
          bio: seed.bio,
          primaryCityId: city?.id ?? null,
          verificationStatus: seed.verified ? "VERIFIED" : "PENDING",
          channels: {
            create: seed.channels.map((ch) => ({
              platform: ch.platform,
              handle: ch.handle,
              channelUrl: `https://example.com/${ch.handle}`,
              followersCount: ch.followersCount,
              engagementRate: ch.engagementRate,
              avgViews: ch.avgViews,
              isChannelVerified: seed.verified,
            })),
          },
          pricingPackages: {
            create: seed.packages.map((p) => ({
              deliverableType: p.deliverableType,
              title: p.title,
              priceILS: new Prisma.Decimal(p.priceILS),
              turnaroundDays: p.days,
            })),
          },
          categories: { create: seed.categories.map((slug) => ({ categorySlug: slug })) },
        },
      });

      // חוזה שהושלם + ביקורת אחת מהמפרסם-דמו
      const contract = await prisma.contract.create({
        data: {
          campaignId: campaign.id,
          businessId: business.id,
          providerId: user.id,
          agreedPriceILS: new Prisma.Decimal(seed.packages[0].priceILS),
          platformFeeILS: new Prisma.Decimal(Math.round(seed.packages[0].priceILS * 0.1)),
          deadline: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          status: "APPROVED",
          completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.review.create({
        data: {
          contractId: contract.id,
          authorId: brandUser.id,
          targetId: user.id,
          sentiment: seed.review.rating >= 5 ? "POSITIVE" : "NEUTRAL",
          rating: seed.review.rating,
          feedbackText: seed.review.text,
          isPublic: true,
        },
      });

      log.push(
        `${seed.displayName}: נוצר (${seed.channels.length} ערוצים, ${seed.packages.length} חבילות)`,
      );
    }

    return NextResponse.json({ ok: true, log });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
