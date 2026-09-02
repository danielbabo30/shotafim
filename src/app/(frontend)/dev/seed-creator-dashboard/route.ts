import { NextResponse } from "next/server";
import {
  Prisma,
  type ContractStatus,
  type DeliverableType,
  type EscrowStatus,
  type SubmissionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * GET /dev/seed-creator-dashboard — זורע תמונת-מצב מלאה ליוצר תוכן דמו
 * (creator-board@bridgead.local) כדי שלוח-הבקרה של כובע "יוצר" יציג נתונים
 * אמיתיים מ-DB: פרופיל יוצר, חוזים כספק בשלבים שונים (עם EscrowHold והגשות
 * סקיצה), הצעות שממתינות למענה, ובריפים פתוחים.
 *
 * אידמפוטנטי — מדלג על כל ישות שכבר קיימת. פיתוח בלבד. להסיר לפני פרודקשן.
 * כניסה: /dev/login?email=creator-board@bridgead.local&role=creator
 */

const CREATOR_EMAIL = "creator-board@bridgead.local";
const DAY = 864e5;

type BrandDef = { key: string; company: string; companyId: string; category: string };

const BRANDS: BrandDef[] = [
  {
    key: "burger",
    company: "Burger Station",
    companyId: "512220001",
    category: "restaurants-cafes",
  },
  { key: "fitlife", company: "FitLife Apparel", companyId: "512220002", category: "fitness-sport" },
  { key: "erez", company: "מאפיית לחם ארז", companyId: "512220003", category: "food-beverage" },
  { key: "techgear", company: "TechGear IL", companyId: "512220004", category: "technology" },
  { key: "nova", company: "נובה ביוטי", companyId: "512220005", category: "beauty-cosmetics" },
  {
    key: "nahat",
    company: "קפה נחת תל אביב",
    companyId: "512220006",
    category: "restaurants-cafes",
  },
];

type ContractDef = {
  brand: string;
  campaignTitle: string;
  description: string;
  deliverables: DeliverableType[];
  amount: number;
  deadlineInDays: number;
  contractStatus: ContractStatus;
  escrowStatus: EscrowStatus;
  escrowFunded: boolean;
  /** גרסת סקיצה אחרונה — או null אם עוד לא הוגשה */
  submission: SubmissionStatus | null;
  releasedDaysAgo?: number;
};

const CONTRACTS: ContractDef[] = [
  {
    brand: "burger",
    campaignTitle: "השקת המבורגר כמהין",
    description: "רילס + 3 סטוריז סביב השקת המבורגר הכמהין החדש, דגש על חוויית הטעימה.",
    deliverables: ["IG_REEL", "IG_STORY"],
    amount: 3200,
    deadlineInDays: 2,
    contractStatus: "ACTIVE",
    escrowStatus: "HELD",
    escrowFunded: true,
    submission: null,
  },
  {
    brand: "fitlife",
    campaignTitle: "ביקורת קולקציית קיץ",
    description: "רילס ביקורת אישית על קולקציית האתלז׳ר החדשה, כולל קריאה לפעולה לאתר.",
    deliverables: ["IG_REEL"],
    amount: 2500,
    deadlineInDays: 6,
    contractStatus: "SUBMITTED_FOR_REVIEW",
    escrowStatus: "HELD",
    escrowFunded: true,
    submission: "PENDING_REVIEW",
  },
  {
    brand: "erez",
    campaignTitle: "סרטון בוקר — לחם מחמצת",
    description: "סטורי בוקר קליל עם תהליך אפיית המחמצת והגשה.",
    deliverables: ["IG_STORY"],
    amount: 1900,
    deadlineInDays: 4,
    contractStatus: "ACTIVE",
    escrowStatus: "HELD",
    escrowFunded: true,
    submission: "REVISION_REQUESTED",
  },
  {
    brand: "techgear",
    campaignTitle: "השקת אוזניות ביטול רעשים",
    description: "אינטגרציה בסרטון יוטיוב שבועי — סקירת אוזניות ה-ANC החדשות.",
    deliverables: ["YOUTUBE_INTEGRATION"],
    amount: 4000,
    deadlineInDays: 10,
    contractStatus: "AWAITING_ESCROW",
    escrowStatus: "HELD",
    escrowFunded: false,
    submission: null,
  },
  {
    brand: "nova",
    campaignTitle: "שגרת סקינקר בוקר",
    description: "רילס שגרת בוקר עם סדרת הסרום החדשה.",
    deliverables: ["IG_REEL"],
    amount: 6800,
    deadlineInDays: -6,
    contractStatus: "APPROVED",
    escrowStatus: "RELEASED_TO_PROVIDER",
    escrowFunded: true,
    submission: "APPROVED",
    releasedDaysAgo: 4,
  },
];

/** בריפים פתוחים — 3 שמופיעים ב"בריפים חדשים" + 4 שהיוצר כבר הגיש להם (Pending) */
type OpenCampaign = {
  brand: string;
  title: string;
  description: string;
  deliverables: DeliverableType[];
  budget: number;
  /** האם היוצר הגיש הצעה (SUBMITTED) — משפיע על ה-KPI ועל תצוגת הגילוי */
  applied: boolean;
  proposedPrice?: number;
};

const OPEN_CAMPAIGNS: OpenCampaign[] = [
  {
    brand: "nahat",
    title: "יוצרי לייפסטייל לסרטון בוקר קליל",
    description: "דרושים יוצרי לייפסטייל לסרטון בוקר קליל בבית הקפה, אווירה חמימה.",
    deliverables: ["IG_REEL", "IG_STORY"],
    budget: 2200,
    applied: false,
  },
  {
    brand: "techgear",
    title: "סקירת מקלדת גיימינג מכנית",
    description: "סרטון סקירה קצר למקלדת ה-TKL החדשה, דגש על תחושת ההקלדה.",
    deliverables: ["YOUTUBE_INTEGRATION"],
    budget: 3000,
    applied: false,
  },
  {
    brand: "nova",
    title: "השקת פלטת צלליות סתיו",
    description: "רילס לוק סתווי עם הפלטה החדשה + סטורי סקוואטש.",
    deliverables: ["IG_REEL"],
    budget: 2800,
    applied: false,
  },
  {
    brand: "burger",
    title: "טברקים חדשים בתפריט",
    description: "טעימה מהתפריט המחודש, פורמט חופשי.",
    deliverables: ["IG_REEL"],
    budget: 2600,
    applied: true,
    proposedPrice: 2500,
  },
  {
    brand: "fitlife",
    title: "אתגר 7 ימים עם הלגינגס החדשים",
    description: "סדרת סטוריז יומית לאורך אתגר קצר.",
    deliverables: ["IG_STORY"],
    budget: 3400,
    applied: true,
    proposedPrice: 3200,
  },
  {
    brand: "erez",
    title: "מארז חג — צילום סטודיו",
    description: "רילס סטיילינג למארז המתנה של החג.",
    deliverables: ["IG_REEL"],
    budget: 3000,
    applied: true,
    proposedPrice: 2900,
  },
  {
    brand: "nahat",
    title: "קמפיין קפה קר לקיץ",
    description: "אזכור אורגני של סדרת הקולד-ברו בתוך תוכן קיצי.",
    deliverables: ["IG_REEL", "IG_STORY"],
    budget: 2400,
    applied: true,
    proposedPrice: 2300,
  },
];

const SAMPLE_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }

  try {
    const now = new Date();
    const log: string[] = [];

    // ── היוצר ──
    const creatorUser = await prisma.user.upsert({
      where: { email: CREATOR_EMAIL },
      create: {
        email: CREATOR_EMAIL,
        name: "דניאל קריאייטיב",
        emailVerified: now,
        status: "ACTIVE",
        roles: { set: ["CREATOR"] },
        activeRole: "CREATOR",
        termsAcceptedAt: now,
        lastLoginAt: now,
      },
      update: {},
    });

    const creatorProfile =
      (await prisma.creatorProfile.findUnique({ where: { userId: creatorUser.id } })) ??
      (await prisma.creatorProfile.create({
        data: {
          userId: creatorUser.id,
          displayName: "דניאל קריאייטיב",
          legalFullName: "דניאל כהן",
          idNumber: "029200011",
          taxStatus: "LICENSED_DEALER",
          bio: "יוצר תוכן לייפסטייל וקולינריה — רילסים, סטוריז ואינטגרציות אורגניות.",
          verificationStatus: "VERIFIED",
          reliabilityScore: 96,
          channels: {
            create: [
              {
                platform: "INSTAGRAM",
                handle: "daniel.creative",
                channelUrl: "https://instagram.com/daniel.creative",
                followersCount: 84000,
                isChannelVerified: true,
              },
              {
                platform: "TIKTOK",
                handle: "daniel.creative",
                channelUrl: "https://tiktok.com/@daniel.creative",
                followersCount: 51000,
                isChannelVerified: true,
              },
            ],
          },
          categories: {
            create: [{ categorySlug: "lifestyle" }, { categorySlug: "food-beverage" }],
          },
        },
      }));
    log.push(`יוצר: ${creatorProfile.displayName}`);

    // ── מפרסמים ──
    const brandBiz = new Map<string, { id: string }>();
    for (const b of BRANDS) {
      const brandUser = await prisma.user.upsert({
        where: { email: `cbrand-${b.key}@bridgead.local` },
        create: {
          email: `cbrand-${b.key}@bridgead.local`,
          name: b.company,
          emailVerified: now,
          status: "ACTIVE",
          roles: { set: ["BRAND"] },
          activeRole: "BRAND",
          termsAcceptedAt: now,
        },
        update: {},
      });
      const biz =
        (await prisma.businessProfile.findUnique({ where: { userId: brandUser.id } })) ??
        (await prisma.businessProfile.create({
          data: {
            userId: brandUser.id,
            name: b.company,
            legalName: `${b.company} בע״מ`,
            companyId: b.companyId,
            entityType: "LTD",
            description: `${b.company} — מפרסם דמו ללוח-הבקרה של היוצר.`,
            businessModel: "HYBRID",
            contactName: "מנהל שיווק",
            contactPhone: "03-0000000",
            billingEmail: `cbrand-${b.key}@bridgead.local`,
            billingAddress: "תל אביב",
            verificationStatus: "VERIFIED",
            categories: { create: { categorySlug: b.category } },
          },
        }));
      brandBiz.set(b.key, { id: biz.id });
    }

    // ── חוזים בעבודה ──
    for (const d of CONTRACTS) {
      const biz = brandBiz.get(d.brand)!;
      const existing = await prisma.contract.findFirst({
        where: {
          providerId: creatorUser.id,
          campaign: { title: d.campaignTitle, businessId: biz.id },
        },
        select: { id: true },
      });
      if (existing) {
        log.push(`${d.campaignTitle}: חוזה כבר קיים`);
        continue;
      }

      const campaign = await prisma.campaign.create({
        data: {
          businessId: biz.id,
          title: d.campaignTitle,
          description: d.description,
          targetType: "CREATOR",
          targetPlatforms: { set: [] },
          deliverables: { set: d.deliverables },
          totalBudgetILS: new Prisma.Decimal(d.amount),
          status: d.contractStatus === "APPROVED" ? "COMPLETED" : "IN_PROGRESS",
        },
        select: { id: true },
      });

      await prisma.contract.create({
        data: {
          campaignId: campaign.id,
          businessId: biz.id,
          providerId: creatorUser.id,
          agreedPriceILS: new Prisma.Decimal(d.amount),
          platformFeeILS: new Prisma.Decimal(Math.round(d.amount * 0.1)),
          deadline: new Date(now.getTime() + d.deadlineInDays * DAY),
          status: d.contractStatus,
          completedAt:
            d.releasedDaysAgo != null ? new Date(now.getTime() - d.releasedDaysAgo * DAY) : null,
          escrowHold: {
            create: {
              amountILS: new Prisma.Decimal(d.amount),
              status: d.escrowStatus,
              fundedAt: d.escrowFunded ? new Date(now.getTime() - 7 * DAY) : null,
              releasedAt:
                d.releasedDaysAgo != null
                  ? new Date(now.getTime() - d.releasedDaysAgo * DAY)
                  : null,
            },
          },
          submissions: d.submission
            ? {
                create: {
                  version: 1,
                  fileUrl: SAMPLE_VIDEO,
                  notes: "גרסה ראשונה לבדיקה.",
                  status: d.submission,
                  submittedAt: new Date(now.getTime() - 2 * DAY),
                },
              }
            : undefined,
        },
      });
      log.push(`${d.campaignTitle}: חוזה נוצר (${d.contractStatus})`);
    }

    // ── בריפים פתוחים + הצעות ──
    for (const c of OPEN_CAMPAIGNS) {
      const biz = brandBiz.get(c.brand)!;
      let campaign = await prisma.campaign.findFirst({
        where: { businessId: biz.id, title: c.title },
        select: { id: true },
      });
      if (!campaign) {
        const brandDef = BRANDS.find((b) => b.key === c.brand)!;
        campaign = await prisma.campaign.create({
          data: {
            businessId: biz.id,
            title: c.title,
            description: c.description,
            targetType: "CREATOR",
            targetPlatforms: { set: [] },
            deliverables: { set: c.deliverables },
            totalBudgetILS: new Prisma.Decimal(c.budget),
            status: "OPEN_FOR_PITCHES",
            endDate: new Date(now.getTime() + 30 * DAY),
            categories: { create: { categorySlug: brandDef.category } },
          },
          select: { id: true },
        });
      }

      if (c.applied) {
        const exists = await prisma.campaignApplication.findUnique({
          where: {
            campaignId_applicantId: { campaignId: campaign.id, applicantId: creatorUser.id },
          },
          select: { id: true },
        });
        if (!exists) {
          await prisma.campaignApplication.create({
            data: {
              campaignId: campaign.id,
              applicantId: creatorUser.id,
              proposedPriceILS: new Prisma.Decimal(c.proposedPrice ?? c.budget),
              estimatedDeliveryDays: 10,
              coverLetter: "אשמח לקחת את הבריף הזה — הקהל שלי מאוד מגיב לתוכן כזה.",
              status: "SUBMITTED",
            },
          });
        }
      }
      log.push(`בריף פתוח: ${c.title}${c.applied ? " (הוגשה הצעה)" : ""}`);
    }

    return NextResponse.json({
      ok: true,
      login: `/dev/login?email=${CREATOR_EMAIL}&role=creator`,
      log,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
