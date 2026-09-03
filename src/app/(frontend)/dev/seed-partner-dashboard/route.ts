import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encryptApiKey, generateApiKey, sha256Hex } from "@/lib/track/crypto";
import { ingestOrder, approveCommission, reverseCommission } from "@/lib/track/ingest";
import { processCheckpoint } from "@/lib/track/cron/checkpoints";
import { normalizeCheckpoints, PARTNERSHIP_PLATFORM_FEE_PCT } from "@/lib/partner-terms";
import { computeRequiredDepositILS } from "@/lib/partner-deposit";

/**
 * GET /dev/seed-partner-dashboard — שותפות "תשלום פר רכישה" מלאה עם נתוני מעקב,
 * לבדיקת המנוע ולרינדור הדשבורד בחדר העבודה (WP-2 / WP-3a).
 *
 * יוצר: קמפיין REVENUE_SHARE + PartnerProgram ACTIVE + פיקדון + TrackedSite +
 * ~28 קליקים + 9 הזמנות משויכות במצבים שונים + תחנת תשלום ששולמה.
 * אידמפוטנטי — הרצה חוזרת מנקה את שותפות ה-seed הקודמת ובונה מחדש.
 *
 * פיתוח בלבד. להסיר לפני פרודקשן.
 */

const BRAND_EMAIL = "dev@bridgead.local";
const CREATOR_EMAIL = "creator.noa@bridgead.local";
const CAMPAIGN_TITLE = "[seed] שותפות תשלום פר רכישה";
const D = (n: number) => new Prisma.Decimal(n);

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }

  try {
    const now = new Date();

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
          description: "עסק בדיקה",
          businessModel: "ONLINE",
          contactName: "משתמש בדיקה",
          contactPhone: "050-0000000",
          billingEmail: BRAND_EMAIL,
          billingAddress: "רחוב הבדיקה 1, תל אביב",
        },
      }));

    const creatorUser = await prisma.user.findUnique({ where: { email: CREATOR_EMAIL } });
    if (!creatorUser) {
      return NextResponse.json(
        { error: "run /dev/seed-marketplace first (creates creator.noa@bridgead.local)" },
        { status: 400 },
      );
    }

    // ── ניקוי seed קודם — מלמטה למעלה (חלק מה-FKs הם onDelete: Restrict) ──
    const prevCampaigns = await prisma.campaign.findMany({
      where: { businessId: business.id, title: CAMPAIGN_TITLE },
      select: { id: true, contracts: { select: { id: true } } },
    });
    const cids = prevCampaigns.flatMap((c) => c.contracts.map((x) => x.id));
    const campIds = prevCampaigns.map((c) => c.id);
    const progs = await prisma.partnerProgram.findMany({
      where: { contractId: { in: cids } },
      select: { id: true },
    });
    const progIds = progs.map((p) => p.id);

    if (progIds.length) {
      await prisma.attributedOrder.deleteMany({ where: { programId: { in: progIds } } });
      await prisma.affiliateClick.deleteMany({ where: { programId: { in: progIds } } });
      await prisma.payoutCheckpoint.deleteMany({ where: { programId: { in: progIds } } });
      await prisma.partnerGateEvent.deleteMany({ where: { programId: { in: progIds } } });
      await prisma.anomalyFlag.deleteMany({ where: { programId: { in: progIds } } });
      await prisma.pluginAlert.deleteMany({ where: { programId: { in: progIds } } });
      await prisma.partnerProgram.deleteMany({ where: { id: { in: progIds } } });
    }
    if (cids.length) {
      await prisma.transaction.deleteMany({ where: { contractId: { in: cids } } });
      await prisma.escrowHold.deleteMany({ where: { contractId: { in: cids } } });
      await prisma.conversation.deleteMany({ where: { contractId: { in: cids } } });
      await prisma.contract.deleteMany({ where: { id: { in: cids } } });
    }
    if (campIds.length) {
      await prisma.campaignApplication.deleteMany({ where: { campaignId: { in: campIds } } });
      await prisma.campaignPartnerTerms.deleteMany({ where: { campaignId: { in: campIds } } });
      await prisma.conversation.deleteMany({ where: { campaignId: { in: campIds } } });
      await prisma.campaign.deleteMany({ where: { id: { in: campIds } } });
    }

    const prevSites = await prisma.trackedSite.findMany({
      where: { businessId: business.id, siteUrl: "https://seed-shop.bridgead.co.il" },
      select: { id: true },
    });
    if (prevSites.length) {
      const sIds = prevSites.map((s) => s.id);
      await prisma.attributedOrder.deleteMany({ where: { siteId: { in: sIds } } });
      await prisma.maintenanceWindow.deleteMany({ where: { siteId: { in: sIds } } });
      await prisma.pluginAlert.deleteMany({ where: { siteId: { in: sIds } } });
      await prisma.trackedSite.deleteMany({ where: { id: { in: sIds } } });
    }

    // ── קמפיין + תנאים + חוזה + program (בונים ישירות, בלי לעבור באשף) ──
    const startDate = new Date(now.getTime() - 20 * 864e5);
    const endDate = new Date(now.getTime() + 25 * 864e5);
    const checkpoints = normalizeCheckpoints(
      [new Date(now.getTime() - 5 * 864e5).toISOString()],
      endDate,
    );
    const estimatedPurchases = 60;
    const assumedAovILS = 240;
    const commissionValue = 15; // אחוז

    const campaign = await prisma.campaign.create({
      data: {
        businessId: business.id,
        title: CAMPAIGN_TITLE,
        description: "שותפות מבוססת ביצועים לבדיקת המנוע — טקסט מספיק ארוך.",
        targetType: "CREATOR",
        compensationModel: "REVENUE_SHARE",
        deliverables: { set: ["IG_REEL"] },
        targetPlatforms: { set: ["INSTAGRAM"] },
        totalBudgetILS: D(0),
        endDate,
        status: "IN_PROGRESS",
        partnerTerms: {
          create: {
            commissionType: "PERCENT",
            commissionValue: D(commissionValue),
            commissionBasis: "PRE_DISCOUNT",
            commissionScope: "WHOLE_CART",
            estimatedPurchases,
            assumedAovILS: D(assumedAovILS),
            attributionMode: "LINK_AND_COUPON",
            destinationUrl: "https://seed-shop.bridgead.co.il/collections/all",
            couponDiscountPct: D(10),
            payoutCheckpoints: checkpoints,
            startDate,
            endDate,
          },
        },
      },
    });

    const requiredDepositILS = computeRequiredDepositILS({
      commissionType: "PERCENT",
      commissionValue,
      estimatedPurchases,
      assumedAovILS,
      platformFeePct: PARTNERSHIP_PLATFORM_FEE_PCT,
    });

    const contract = await prisma.contract.create({
      data: {
        campaignId: campaign.id,
        businessId: business.id,
        providerId: creatorUser.id,
        compensationModel: "REVENUE_SHARE",
        agreedPriceILS: D(0),
        platformFeeILS: D(0),
        deadline: endDate,
        status: "ACTIVE",
        escrowHold: {
          create: { amountILS: D(requiredDepositILS), status: "HELD", fundedAt: startDate },
        },
      },
      include: { escrowHold: true },
    });

    const program = await prisma.partnerProgram.create({
      data: {
        contractId: contract.id,
        commissionType: "PERCENT",
        commissionValue: D(commissionValue),
        commissionBasis: "PRE_DISCOUNT",
        commissionScope: "WHOLE_CART",
        estimatedPurchases,
        assumedAovILS: D(assumedAovILS),
        requiredDepositILS: D(requiredDepositILS),
        depositHoldId: contract.escrowHold!.id,
        attributionMode: "LINK_AND_COUPON",
        refCode: `BGSEED${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        couponCode: `NOA${Math.floor(Math.random() * 90 + 10)}`,
        couponDiscountPct: D(10),
        destinationUrl: "https://seed-shop.bridgead.co.il/collections/all",
        platformFeePct: D(PARTNERSHIP_PLATFORM_FEE_PCT),
        startDate,
        endDate,
        payoutCheckpoints: checkpoints,
        status: "ACTIVE",
      },
    });

    await prisma.payoutCheckpoint.createMany({
      data: checkpoints.map((d, i) => ({
        programId: program.id,
        sequence: i + 1,
        isFinal: i === checkpoints.length - 1,
        scheduledFor: d,
        status: "SCHEDULED" as const,
      })),
    });

    // ── TrackedSite ──
    const apiKey = generateApiKey();
    const site = await prisma.trackedSite.create({
      data: {
        businessId: business.id,
        siteUrl: "https://seed-shop.bridgead.co.il",
        apiKeyHash: sha256Hex(apiKey),
        apiKeyEnc: encryptApiKey(apiKey),
        status: "ACTIVE",
        lastHeartbeatAt: new Date(now.getTime() - 2 * 3600_000),
        pluginVersion: "1.0.0",
        wooVersion: "9.2.1",
      },
    });

    // ── קליקים ──
    for (let i = 0; i < 28; i++) {
      const daysAgo = Math.floor(Math.random() * 18);
      await prisma.affiliateClick.create({
        data: {
          programId: program.id,
          occurredAt: new Date(now.getTime() - daysAgo * 864e5 - Math.random() * 864e5),
          landingUrl: `https://seed-shop.bridgead.co.il/p/item-${i % 6}?bgad_ref=${program.refCode}`,
          ipHash: sha256Hex(`ip-${i}-${daysAgo}`),
          uaHash: sha256Hex(`ua-${i % 4}`),
          country: "IL",
        },
      });
    }

    // ── הזמנות משויכות דרך המנוע ──
    const mkOrder = async (
      idx: number,
      daysAgo: number,
      total: number,
      viaCoupon: boolean,
      status: string,
    ) => {
      const res = await ingestOrder(site, {
        externalOrderId: `SEED-${idx}`,
        orderPlacedAt: new Date(now.getTime() - daysAgo * 864e5).toISOString(),
        currency: "ILS",
        orderStatus: status,
        amounts: {
          itemsSubtotal: total,
          discountTotal: viaCoupon ? Math.round(total * 0.1) : 0,
          taxTotal: Math.round(total * 0.17),
          shippingTotal: 0,
          grandTotal: viaCoupon ? Math.round(total * 0.9) : total,
        },
        lineItems: [
          {
            sku: `SKU-${idx}`,
            name: `מוצר ${idx}`,
            quantity: 1,
            lineSubtotal: total,
            lineDiscount: viaCoupon ? Math.round(total * 0.1) : 0,
            isReferredProduct: true,
          },
        ],
        couponCodes: viaCoupon ? [program.couponCode!] : [],
        refCode: viaCoupon ? null : program.refCode,
        customerHash: sha256Hex(`cust-${idx}`),
        isNewCustomer: idx % 3 !== 0,
      });
      return res.order?.id ?? null;
    };

    const o1 = await mkOrder(1, 16, 320, true, "completed");
    const o2 = await mkOrder(2, 15, 190, false, "completed");
    const o3 = await mkOrder(3, 14, 480, true, "completed");
    await mkOrder(4, 10, 260, false, "processing"); // נשאר PENDING
    const o5 = await mkOrder(5, 8, 150, true, "processing");
    const o6 = await mkOrder(6, 6, 610, false, "completed");
    const o7 = await mkOrder(7, 4, 240, true, "completed");
    const o8 = await mkOrder(8, 3, 205, false, "completed");
    await mkOrder(9, 1, 330, true, "processing"); // נשאר PENDING

    // אישור עמלות ישנות (מדמה reconcile) — o1,o2,o3,o6
    for (const id of [o1, o2, o3, o6]) if (id) await approveCommission(id);

    // עיבוד התחנה שכבר עברה → o1,o2,o3,o6 → PAID
    const dueCp = await prisma.payoutCheckpoint.findFirst({
      where: { programId: program.id, status: "SCHEDULED", scheduledFor: { lte: now } },
      orderBy: { scheduledFor: "asc" },
      select: { id: true },
    });
    if (dueCp) await processCheckpoint(dueCp.id);

    // החזרה על o7 (אחרי אישור) + o8 מ-HOLD
    if (o7) {
      await approveCommission(o7);
      await reverseCommission(o7, "seed:refund");
    }
    if (o8) {
      await approveCommission(o8);
    }
    // o5 → ON_HOLD ידני
    if (o5) {
      await prisma.attributedOrder.update({
        where: { id: o5 },
        data: { status: "ON_HOLD", heldAt: now, holdReason: "seed: בדיקת דגימה" },
      });
    }

    const summary = await prisma.attributedOrder.groupBy({
      by: ["status"],
      where: { programId: program.id },
      _count: true,
    });
    const prog = await prisma.partnerProgram.findUnique({
      where: { id: program.id },
      select: { drainedILS: true, status: true },
    });

    return NextResponse.json({
      ok: true,
      contractId: contract.id,
      room: `/dashboard/contracts/${contract.id}`,
      refCode: program.refCode,
      couponCode: program.couponCode,
      requiredDepositILS,
      program: prog,
      orders: Object.fromEntries(summary.map((s) => [s.status, s._count])),
      note: "פתח את חדר העבודה כדי לראות את הפאנל + הדשבורד",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 },
    );
  }
}
