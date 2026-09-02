import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LEGAL_VERSION, REGISTRATION_CONSENT_DOCUMENTS } from "@/lib/legal-consent";

/**
 * GET /dev/seed-users — נתוני דמו: 3 משתמשים מכל תפקיד (מפרסם / יוצר / בעל שטחים),
 * 2 שטחי פרסום לכל בעל שטחים, ו-2 קמפיינים מהמפרסם הראשון.
 * פיתוח בלבד. ריצה חוזרת מוחקת ומקימה מחדש (לפי דומיין המייל @demo.shutafim.local).
 */

const DEMO_DOMAIN = "@demo.shutafim.local";
const now = new Date();

async function cityId(nameHe: string): Promise<string> {
  const c =
    (await prisma.city.findFirst({ where: { nameHe }, select: { id: true } })) ??
    (await prisma.city.findFirst({ where: { isActive: true }, select: { id: true } }));
  if (!c) throw new Error("אין ערים ב-DB — הרץ קודם את זריעת הערים");
  return c.id;
}

type Role = "BRAND" | "CREATOR" | "AD_SPACE_OWNER";

async function makeUser(opts: {
  email: string;
  name: string;
  phone: string;
  role: Role;
  roles?: Role[];
}) {
  const roles = opts.roles ?? [opts.role];
  const user = await prisma.user.create({
    data: {
      email: opts.email,
      name: opts.name,
      phone: opts.phone,
      emailVerified: now,
      status: "ACTIVE",
      roles: { set: roles },
      activeRole: roles[0],
      termsAcceptedAt: now,
      lastLoginAt: now,
      legalConsents: {
        create: REGISTRATION_CONSENT_DOCUMENTS.map((documentType) => ({
          documentType,
          version: LEGAL_VERSION,
          ipAddress: "127.0.0.1",
        })),
      },
    },
  });
  return user.id;
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }

  const log: string[] = [];

  try {
    // ── ניקוי ריצה קודמת ──
    const del = await prisma.user.deleteMany({ where: { email: { endsWith: DEMO_DOMAIN } } });
    log.push(`נמחקו ${del.count} משתמשי דמו קודמים`);

    const tlv = await cityId("תל אביב-יפו");
    const jlm = await cityId("ירושלים");
    const rishon = await cityId("ראשון לציון");
    const haifa = await cityId("חיפה");

    // ═══ 3 מפרסמים ═══
    const brands: string[] = [];
    const brandDefs = [
      {
        email: `brand1${DEMO_DOMAIN}`,
        name: "יעל כהן",
        phone: "0501000001",
        biz: {
          name: "אופנה נובה",
          legalName: "אופנה נובה בע״מ",
          companyId: "514100001",
          entityType: "LTD" as const,
          description: "רשת אופנת נשים עכשווית עם 12 סניפים בפריסה ארצית.",
          businessModel: "HYBRID" as const,
          category: "fashion",
          city: tlv,
          address: "דיזנגוף 100, תל אביב",
        },
      },
      {
        email: `brand2${DEMO_DOMAIN}`,
        name: "אבי לוי",
        phone: "0501000002",
        biz: {
          name: "טעם הבית",
          legalName: "טעם הבית מזון בע״מ",
          companyId: "514100002",
          entityType: "LTD" as const,
          description: "מותג מוצרי מזון ביתיים — רטבים, ממרחים ותבלינים.",
          businessModel: "PHYSICAL" as const,
          category: "food-beverage",
          city: jlm,
          address: "יפו 42, ירושלים",
        },
      },
      {
        email: `brand3${DEMO_DOMAIN}`,
        name: "דנה שפירא",
        phone: "0501000003",
        biz: {
          name: "גאדג'ט פרו",
          legalName: "גאדג'ט פרו סחר בע״מ",
          companyId: "514100003",
          entityType: "LICENSED_DEALER" as const,
          description: "חנות אונליין לגאדג'טים, אביזרים חכמים וטכנולוגיה לבית.",
          businessModel: "ONLINE" as const,
          category: "technology",
          city: rishon,
          address: "פעילות מקוונת",
        },
      },
    ];

    for (const d of brandDefs) {
      const userId = await makeUser({ ...d, role: "BRAND" });
      const biz = await prisma.businessProfile.create({
        data: {
          userId,
          name: d.biz.name,
          legalName: d.biz.legalName,
          companyId: d.biz.companyId,
          entityType: d.biz.entityType,
          description: d.biz.description,
          businessModel: d.biz.businessModel,
          contactName: d.name,
          contactPhone: d.phone,
          billingEmail: d.email,
          billingAddress: d.biz.address,
          verificationStatus: "VERIFIED",
          locations: {
            create: {
              cityId: d.biz.city,
              address: d.biz.address,
              isPrimary: true,
            },
          },
          categories: { create: { categorySlug: d.biz.category } },
        },
      });
      brands.push(biz.id);
      log.push(`מפרסם: ${d.biz.name} (${d.email})`);
    }

    // ═══ 3 יוצרים ═══
    const creatorDefs = [
      {
        email: `creator1${DEMO_DOMAIN}`,
        name: "נועה ברק",
        phone: "0502000001",
        displayName: "Noa Style",
        idNumber: "201000001",
        taxStatus: "LICENSED_DEALER" as const,
        bio: "יוצרת תוכן אופנה וביוטי, קהילה של 120K באינסטגרם.",
        cats: ["fashion", "beauty-cosmetics"],
        channels: [
          {
            platform: "INSTAGRAM" as const,
            handle: "@noastyle",
            url: "https://instagram.com/noastyle",
            followers: 120000,
          },
          {
            platform: "TIKTOK" as const,
            handle: "@noastyle",
            url: "https://tiktok.com/@noastyle",
            followers: 85000,
          },
        ],
      },
      {
        email: `creator2${DEMO_DOMAIN}`,
        name: "רוני מזרחי",
        phone: "0502000002",
        displayName: "Roni Eats",
        idNumber: "201000002",
        taxStatus: "EXEMPT_DEALER" as const,
        bio: "ביקורות מסעדות ומתכונים, יוטיובר אוכל מוביל.",
        cats: ["food-beverage", "restaurants-cafes"],
        channels: [
          {
            platform: "YOUTUBE" as const,
            handle: "@ronieats",
            url: "https://youtube.com/@ronieats",
            followers: 210000,
          },
          {
            platform: "INSTAGRAM" as const,
            handle: "@roni.eats",
            url: "https://instagram.com/roni.eats",
            followers: 95000,
          },
        ],
      },
      {
        email: `creator3${DEMO_DOMAIN}`,
        name: "טל אדלר",
        phone: "0502000003",
        displayName: "Tal Tech",
        idNumber: "201000003",
        taxStatus: "COMPANY" as const,
        bio: "סקירות גאדג'טים, גיימינג וטכנולוגיה. פודקאסט טק שבועי.",
        cats: ["technology", "gaming"],
        channels: [
          {
            platform: "YOUTUBE" as const,
            handle: "@taltech",
            url: "https://youtube.com/@taltech",
            followers: 340000,
          },
          {
            platform: "LINKEDIN" as const,
            handle: "taladler",
            url: "https://linkedin.com/in/taladler",
            followers: 18000,
          },
        ],
      },
    ];

    for (const d of creatorDefs) {
      const userId = await makeUser({ ...d, role: "CREATOR" });
      await prisma.creatorProfile.create({
        data: {
          userId,
          displayName: d.displayName,
          legalFullName: d.name,
          idNumber: d.idNumber,
          taxStatus: d.taxStatus,
          bio: d.bio,
          primaryCityId: tlv,
          verificationStatus: "VERIFIED",
          reliabilityScore: 82,
          channels: {
            create: d.channels.map((c) => ({
              platform: c.platform,
              handle: c.handle,
              channelUrl: c.url,
              followersCount: c.followers,
              isChannelVerified: true,
            })),
          },
          categories: { create: d.cats.map((categorySlug) => ({ categorySlug })) },
        },
      });
      log.push(`יוצר: ${d.displayName} (${d.email})`);
    }

    // ═══ 3 בעלי שטחים + 2 שטחים לכל אחד ═══
    const spaceDefs = [
      {
        email: `space1${DEMO_DOMAIN}`,
        name: "משה גולן",
        phone: "0503000001",
        company: "מדיה סנטר",
        companyId: "514300001",
        assets: [
          {
            title: "מסך LED מחלף איילון צפון",
            type: "DIGITAL_BILLBOARD" as const,
            description: "מסך LED 12x4 מ' על מחלף איילון צפון, חשיפה לתנועה כבדה.",
            city: tlv,
            address: "מחלף רוקח, נתיבי איילון",
            dimensions: "12x4 מטר",
            reach: 900000,
            pricing: "WEEKLY" as const,
            price: 12000,
            proof: "PHOTO_CONFIRMATION" as const,
          },
          {
            title: "מסך דיגיטלי קניון הזהב",
            type: "DIGITAL_BILLBOARD" as const,
            description: "מסך בכניסה הראשית לקניון הזהב, ראשון לציון.",
            city: rishon,
            address: "שדרות ירושלים 1, ראשון לציון",
            dimensions: "6x3 מטר",
            reach: 400000,
            pricing: "MONTHLY" as const,
            price: 18000,
            proof: "SYSTEM_LOG" as const,
          },
        ],
      },
      {
        email: `space2${DEMO_DOMAIN}`,
        name: "רותם שני",
        phone: "0503000002",
        company: "אאוטדור פלוס",
        companyId: "514300002",
        assets: [
          {
            title: "שלט חוצות כביש 4",
            type: "STATIC_BILLBOARD" as const,
            description: 'שלט חוצות 8x4 מ"ר בכיוון צפון, כביש 4 סמוך למחלף גהה.',
            city: haifa,
            address: "כביש 4, צומת גהה",
            dimensions: "8x4 מטר",
            reach: 550000,
            pricing: "MONTHLY" as const,
            price: 9500,
            proof: "PHOTO_CONFIRMATION" as const,
          },
          {
            title: "עטיפת אוטובוס קו 480",
            type: "TRANSIT" as const,
            description: "עטיפה מלאה של אוטובוס בין-עירוני קו 480 תל אביב–ירושלים.",
            city: tlv,
            address: "מסופי אגד",
            dimensions: "אוטובוס תקני",
            reach: 300000,
            pricing: "MONTHLY" as const,
            price: 7000,
            proof: "PHOTO_CONFIRMATION" as const,
          },
        ],
      },
      {
        email: `space3${DEMO_DOMAIN}`,
        name: "עדי פרלמן",
        phone: "0503000003",
        company: "דיגיטל בורד",
        companyId: "514300003",
        assets: [
          {
            title: "ניוזלטר שבועי — עולם הטק",
            type: "NEWSLETTER" as const,
            description: "ניוזלטר שבועי בנושאי טכנולוגיה, 45,000 נרשמים, שיעור פתיחה 38%.",
            city: null,
            address: null,
            dimensions: null,
            reach: 45000,
            pricing: "PER_BROADCAST" as const,
            price: 3500,
            proof: "ANALYTICS_REPORT" as const,
          },
          {
            title: "חסות בפודקאסט 'הבוקר של הטק'",
            type: "PODCAST_SPONSORSHIP" as const,
            description: "אזכור חסות בן 60 שניות בפרק, ~20,000 האזנות לפרק.",
            city: null,
            address: null,
            dimensions: null,
            reach: 20000,
            pricing: "PER_BROADCAST" as const,
            price: 2800,
            proof: "ANALYTICS_REPORT" as const,
          },
        ],
      },
    ];

    for (const d of spaceDefs) {
      const userId = await makeUser({ ...d, role: "AD_SPACE_OWNER" });
      const owner = await prisma.adSpaceOwnerProfile.create({
        data: {
          userId,
          companyName: d.company,
          legalName: `${d.company} בע״מ`,
          companyId: d.companyId,
          entityType: "LTD",
          contactName: d.name,
          contactPhone: d.phone,
          billingEmail: d.email,
          billingAddress: "רחוב הברזל 20, תל אביב",
          verificationStatus: "VERIFIED",
        },
      });
      for (const a of d.assets) {
        await prisma.adSpaceAsset.create({
          data: {
            ownerId: owner.id,
            title: a.title,
            type: a.type,
            description: a.description,
            cityId: a.city,
            address: a.address,
            dimensions: a.dimensions,
            estimatedReach: a.reach,
            pricingModel: a.pricing,
            basePriceILS: a.price,
            proofRequirement: a.proof,
          },
        });
      }
      log.push(`בעל שטחים: ${d.company} (${d.email}) — ${d.assets.length} שטחים`);
    }

    // ═══ 2 קמפיינים מהמפרסם הראשון (אופנה נובה) ═══
    const campaignDefs = [
      {
        title: "קמפיין קיץ 2026 — קולקציית ים",
        description:
          "5 יוצרות אופנה ליצירת רילס וסטוריז סביב קולקציית הים החדשה. דגש על צבעוניות ואותנטיות.",
        targetType: "CREATOR" as const,
        targetPlatforms: ["INSTAGRAM", "TIKTOK"],
        deliverables: ["IG_REEL", "IG_STORY"] as const,
        budget: 45000,
        status: "OPEN_FOR_PITCHES" as const,
      },
      {
        title: "השקת קולקציית חורף — קמפיין 360",
        description:
          "קמפיין משולב: יוצרי תוכן + שטחי פרסום דיגיטליים במרכזי ערים. יעד — מודעות למותג לקראת החורף.",
        targetType: "BOTH" as const,
        targetPlatforms: ["INSTAGRAM"],
        deliverables: ["IG_REEL"] as const,
        budget: 80000,
        status: "DRAFT" as const,
      },
    ];

    for (const c of campaignDefs) {
      await prisma.campaign.create({
        data: {
          businessId: brands[0],
          title: c.title,
          description: c.description,
          targetType: c.targetType,
          targetPlatforms: c.targetPlatforms,
          deliverables: [...c.deliverables],
          totalBudgetILS: c.budget,
          status: c.status,
          startDate: now,
          endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        },
      });
      log.push(`קמפיין: ${c.title}`);
    }

    // ═══ משתמש רב-תפקידי: מפרסם + יוצר + בעל שטחים (עם 2 שטחים) ═══
    const allId = await makeUser({
      email: `all${DEMO_DOMAIN}`,
      name: "מיה גל",
      phone: "0509999999",
      role: "BRAND",
      roles: ["BRAND", "CREATOR", "AD_SPACE_OWNER"],
    });

    await prisma.businessProfile.create({
      data: {
        userId: allId,
        name: "סטודיו מיה",
        legalName: "סטודיו מיה בע״מ",
        companyId: "514900001",
        entityType: "LTD",
        description: "סטודיו קריאייטיב שמפיק קמפיינים, יוצר תוכן ומחזיק שטחי מדיה משלו.",
        businessModel: "HYBRID",
        contactName: "מיה גל",
        contactPhone: "0509999999",
        billingEmail: `all${DEMO_DOMAIN}`,
        billingAddress: "אחד העם 9, תל אביב",
        verificationStatus: "VERIFIED",
        locations: { create: { cityId: tlv, address: "אחד העם 9, תל אביב", isPrimary: true } },
        categories: { create: { categorySlug: "entertainment-music" } },
      },
    });

    await prisma.creatorProfile.create({
      data: {
        userId: allId,
        displayName: "Mia Creates",
        legalFullName: "מיה גל",
        idNumber: "201900001",
        taxStatus: "COMPANY",
        bio: "מפיקת תוכן ובעלת סטודיו — אופנה, לייפסטייל ומאחורי הקלעים.",
        primaryCityId: tlv,
        verificationStatus: "VERIFIED",
        reliabilityScore: 90,
        channels: {
          create: [
            {
              platform: "INSTAGRAM",
              handle: "@miacreates",
              channelUrl: "https://instagram.com/miacreates",
              followersCount: 64000,
              isChannelVerified: true,
            },
            {
              platform: "YOUTUBE",
              handle: "@miacreates",
              channelUrl: "https://youtube.com/@miacreates",
              followersCount: 30000,
              isChannelVerified: true,
            },
          ],
        },
        categories: { create: [{ categorySlug: "fashion" }, { categorySlug: "lifestyle" }] },
      },
    });

    const allOwner = await prisma.adSpaceOwnerProfile.create({
      data: {
        userId: allId,
        companyName: "סטודיו מיה מדיה",
        legalName: "סטודיו מיה בע״מ",
        companyId: "514900002",
        entityType: "LTD",
        contactName: "מיה גל",
        contactPhone: "0509999999",
        billingEmail: `all${DEMO_DOMAIN}`,
        billingAddress: "אחד העם 9, תל אביב",
        verificationStatus: "VERIFIED",
      },
    });
    await prisma.adSpaceAsset.createMany({
      data: [
        {
          ownerId: allOwner.id,
          title: "מסך בכניסה לסטודיו",
          type: "DIGITAL_BILLBOARD",
          description: "מסך 55 אינץ' בכניסה לסטודיו, חשיפה למבקרים ואירועים.",
          cityId: tlv,
          address: "אחד העם 9, תל אביב",
          estimatedReach: 12000,
          pricingModel: "MONTHLY",
          basePriceILS: 2500,
          proofRequirement: "PHOTO_CONFIRMATION",
        },
        {
          ownerId: allOwner.id,
          title: "ניוזלטר הקהילה של Mia",
          type: "NEWSLETTER",
          description: "ניוזלטר דו-שבועי ל-15,000 עוקבות, תוכן אופנה ולייפסטייל.",
          estimatedReach: 15000,
          pricingModel: "PER_BROADCAST",
          basePriceILS: 1800,
          proofRequirement: "ANALYTICS_REPORT",
        },
      ],
    });
    log.push("רב-תפקידי: מיה גל (all@demo.shutafim.local) — עסק + יוצר + 2 שטחים");

    return NextResponse.json({ ok: true, log });
  } catch (err) {
    return NextResponse.json(
      { ok: false, log, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
