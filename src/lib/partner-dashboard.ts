import "server-only";
import { cache } from "react";
import type {
  AttributionMethod,
  AttributionMode,
  CheckpointStatus,
  OrderCommissionStatus,
  ProgramStatus,
  SiteStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import { attributionModeHasCoupon, attributionModeHasLink } from "@/lib/partner-terms";

/**
 * "תשלום פר רכישה" — דשבורד חדר העבודה (§8). מקור אמת יחיד, read-only, שני
 * הצדדים רואים את אותם מספרים. נגזר מ-AffiliateClick + AttributedOrder +
 * PayoutCheckpoint + Transaction. נתונים אמיתיים מ-Prisma; לפני שמנוע השיוך
 * (WP-2) מזרים דאטה — הכול אפס/ריק (empty-state אמיתי, לא mock).
 */

export type PartnerJournalTone = "neutral" | "success" | "warning" | "info";

export type PartnerJournalEntry = {
  id: string;
  at: Date;
  text: string;
  tone: PartnerJournalTone;
};

export type PartnerClickPoint = { key: string; label: string; count: number };

export type PartnerConnectedSite = {
  id: string;
  url: string;
  status: SiteStatus;
  lastHeartbeatAt: Date | null;
};

export type PartnerOrderRow = {
  id: string;
  externalOrderId: string;
  placedAt: Date;
  grossAmount: number;
  commissionAmount: number;
  status: OrderCommissionStatus;
  isNewCustomer: boolean;
  method: AttributionMethod;
};

export type PartnerCheckpointRow = {
  id: string;
  scheduledFor: Date;
  status: CheckpointStatus;
  paidILS: number;
};

export type PartnerDashboardData = {
  contractId: string;
  programId: string;
  viewerParty: "brand" | "provider";
  status: ProgramStatus;
  attributionMode: AttributionMode;
  hasLink: boolean;
  hasCoupon: boolean;
  /** לצד היוצר — שם המותג; לצד המפרסם — שם היוצר */
  counterpartyName: string;
  refCode: string;
  destinationUrl: string;
  couponCode: string | null;
  couponDiscountPct: number | null;

  metrics: {
    clicks: number;
    orders: number;
    newCustomerOrders: number;
    /** null כשאין לינק (COUPON בלבד) — אין קליקים ולכן אין שיעור המרה */
    conversionRate: number | null;
    grossRevenue: number;
    commissionPending: number;
    commissionOnHold: number;
    commissionApproved: number;
    commissionPaid: number;
    commissionReversed: number;
    /** צד מפרסם — הכנסה חלקי עלות השותפות עד כה; null כשעוד אין עלות */
    roi: number | null;
  };

  nextCheckpoint: Date | null;
  checkpoints: PartnerCheckpointRow[];
  clickSeries: PartnerClickPoint[];
  journal: PartnerJournalEntry[];
  connectedSites: PartnerConnectedSite[];
  orders: PartnerOrderRow[];
};

const CLICK_SERIES_DAYS = 14;
const JOURNAL_CAP = 30;

const nis = (n: number) => `₪${Math.round(n).toLocaleString("en-US")}`;
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const heShortDate = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric" });
const heDateTime = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const getPartnerDashboard = cache(
  async (contractId: string): Promise<PartnerDashboardData | null> => {
    const user = await requireActiveUser();

    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        OR: [{ business: { userId: user.id } }, { providerId: user.id }],
      },
      select: {
        id: true,
        providerId: true,
        business: { select: { id: true, name: true } },
        provider: {
          select: { name: true, creatorProfile: { select: { displayName: true } } },
        },
        partnerProgram: {
          select: {
            id: true,
            status: true,
            attributionMode: true,
            refCode: true,
            couponCode: true,
            couponDiscountPct: true,
            destinationUrl: true,
            requiredDepositILS: true,
            payoutCheckpoints: true,
          },
        },
      },
    });

    const program = contract?.partnerProgram;
    if (!contract || !program) return null;

    const viewerParty: "brand" | "provider" =
      contract.providerId === user.id ? "provider" : "brand";
    const hasLink = attributionModeHasLink(program.attributionMode);
    const hasCoupon = attributionModeHasCoupon(program.attributionMode);

    const now = new Date();
    const seriesStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    seriesStart.setDate(seriesStart.getDate() - (CLICK_SERIES_DAYS - 1));

    const [
      clicksTotal,
      recentClicks,
      seriesClicks,
      ordersByStatus,
      newCustomerCount,
      grossAgg,
      recentOrders,
      checkpointRows,
      sites,
      depositTxns,
      payoutTxns,
    ] = await Promise.all([
      prisma.affiliateClick.count({ where: { programId: program.id } }),
      prisma.affiliateClick.findMany({
        where: { programId: program.id },
        orderBy: { occurredAt: "desc" },
        take: 12,
        select: { id: true, occurredAt: true, country: true },
      }),
      prisma.affiliateClick.findMany({
        where: { programId: program.id, occurredAt: { gte: seriesStart } },
        select: { occurredAt: true },
      }),
      prisma.attributedOrder.groupBy({
        by: ["status"],
        where: { programId: program.id },
        _count: { _all: true },
        _sum: { commissionAmount: true, platformFeeAmount: true },
      }),
      prisma.attributedOrder.count({
        where: { programId: program.id, isNewCustomer: true, status: { not: "REVERSED" } },
      }),
      prisma.attributedOrder.aggregate({
        where: { programId: program.id, status: { not: "REVERSED" } },
        _sum: { grossAmount: true },
        _count: { _all: true },
      }),
      prisma.attributedOrder.findMany({
        where: { programId: program.id },
        orderBy: { orderPlacedAt: "desc" },
        take: 20,
        select: {
          id: true,
          externalOrderId: true,
          orderPlacedAt: true,
          grossAmount: true,
          commissionAmount: true,
          status: true,
          isNewCustomer: true,
          attributionMethod: true,
          reversedAt: true,
        },
      }),
      prisma.payoutCheckpoint.findMany({
        where: { programId: program.id },
        orderBy: { scheduledFor: "asc" },
        select: { id: true, scheduledFor: true, status: true, paidILS: true, paidAt: true },
      }),
      prisma.trackedSite.findMany({
        where: { businessId: contract.business.id },
        orderBy: { pairedAt: "asc" },
        select: { id: true, siteUrl: true, status: true, lastHeartbeatAt: true },
      }),
      prisma.transaction.findMany({
        where: { contractId: contract.id, type: "PARTNERSHIP_DEPOSIT" },
        orderBy: { createdAt: "desc" },
        select: { id: true, amountILS: true, createdAt: true },
      }),
      prisma.transaction.findMany({
        where: { contractId: contract.id, type: "COMMISSION_PAYOUT" },
        orderBy: { createdAt: "desc" },
        select: { id: true, amountILS: true, createdAt: true },
      }),
    ]);

    // ── עמלות לפי סטטוס ──
    const sumBy = (s: OrderCommissionStatus) =>
      Number(ordersByStatus.find((g) => g.status === s)?._sum.commissionAmount ?? 0);
    const feeBy = (s: OrderCommissionStatus) =>
      Number(ordersByStatus.find((g) => g.status === s)?._sum.platformFeeAmount ?? 0);
    const countBy = (s: OrderCommissionStatus) =>
      ordersByStatus.find((g) => g.status === s)?._count._all ?? 0;

    const commissionPending = sumBy("PENDING");
    const commissionOnHold = sumBy("ON_HOLD");
    const commissionApproved = sumBy("APPROVED");
    const commissionPaid = sumBy("PAID");
    const commissionReversed = sumBy("REVERSED");

    const ordersLive =
      countBy("PENDING") + countBy("ON_HOLD") + countBy("APPROVED") + countBy("PAID");
    const grossRevenue = Number(grossAgg._sum.grossAmount ?? 0);

    // ניצול הפיקדון + שער 80% — בבעלות הפאנל של WP-2 (partner-program.ts). לא מחושב כאן
    // כדי שלא יתפצל מספר.
    const costSoFar = commissionApproved + commissionPaid + feeBy("APPROVED") + feeBy("PAID");
    const roi = costSoFar > 0 ? Number((grossRevenue / costSoFar).toFixed(2)) : null;

    // ── סדרת קליקים 14 יום ──
    const bucket = new Map<string, number>();
    for (let i = 0; i < CLICK_SERIES_DAYS; i++) {
      const d = new Date(seriesStart);
      d.setDate(d.getDate() + i);
      bucket.set(dayKey(d), 0);
    }
    for (const c of seriesClicks) {
      const k = dayKey(c.occurredAt);
      if (bucket.has(k)) bucket.set(k, (bucket.get(k) ?? 0) + 1);
    }
    const clickSeries: PartnerClickPoint[] = [...bucket.entries()].map(([key, count]) => {
      const [y, m, day] = key.split("-").map(Number);
      return { key, label: heShortDate.format(new Date(y, m - 1, day)), count };
    });

    // ── תחנות תשלום ──
    const checkpoints: PartnerCheckpointRow[] = checkpointRows.map((c) => ({
      id: c.id,
      scheduledFor: c.scheduledFor,
      status: c.status,
      paidILS: Number(c.paidILS),
    }));
    const nextCheckpoint =
      checkpoints.find((c) => c.status === "SCHEDULED" && c.scheduledFor >= now)?.scheduledFor ??
      program.payoutCheckpoints.find((d) => d >= now) ??
      null;

    // ── יומן אירועים משותף (immutable) ──
    const journal: PartnerJournalEntry[] = [];
    for (const c of recentClicks) {
      journal.push({
        id: `click-${c.id}`,
        at: c.occurredAt,
        text: `קליק על לינק השיוך${c.country ? ` · ${c.country}` : ""} ב-${heDateTime.format(c.occurredAt)}`,
        tone: "info",
      });
    }
    for (const o of recentOrders) {
      journal.push({
        id: `order-${o.id}`,
        at: o.orderPlacedAt,
        text: `הזמנה #${o.externalOrderId} · ${nis(Number(o.grossAmount))} · עמלה ${nis(Number(o.commissionAmount))} · ${ORDER_STATUS_LABEL[o.status]}`,
        tone: o.status === "REVERSED" ? "warning" : o.status === "PAID" ? "success" : "neutral",
      });
      if (o.reversedAt) {
        journal.push({
          id: `reversal-${o.id}`,
          at: o.reversedAt,
          text: `הזמנה #${o.externalOrderId} הוחזרה — העמלה בוטלה`,
          tone: "warning",
        });
      }
    }
    for (const c of checkpointRows) {
      if (c.status === "PAID" && c.paidAt) {
        journal.push({
          id: `cp-${c.id}`,
          at: c.paidAt,
          text: `תחנת תשלום — שוחררו ${nis(Number(c.paidILS))} עמלות ליוצר`,
          tone: "success",
        });
      }
    }
    for (const t of depositTxns) {
      journal.push({
        id: `dep-${t.id}`,
        at: t.createdAt,
        text: `פיקדון השותפות הופקד — ${nis(Number(t.amountILS))} מוחזק בנאמנות`,
        tone: "success",
      });
    }
    for (const t of payoutTxns) {
      journal.push({
        id: `pay-${t.id}`,
        at: t.createdAt,
        text: `תשלום עמלות בתחנה — ${nis(Number(t.amountILS))}`,
        tone: "success",
      });
    }
    journal.sort((a, b) => b.at.getTime() - a.at.getTime());

    const counterpartyName =
      viewerParty === "provider"
        ? contract.business.name
        : (contract.provider.creatorProfile?.displayName ?? contract.provider.name ?? "היוצר");

    return {
      contractId: contract.id,
      programId: program.id,
      viewerParty,
      status: program.status,
      attributionMode: program.attributionMode,
      hasLink,
      hasCoupon,
      counterpartyName,
      refCode: program.refCode,
      destinationUrl: program.destinationUrl,
      couponCode: program.couponCode,
      couponDiscountPct:
        program.couponDiscountPct != null ? Number(program.couponDiscountPct) : null,
      metrics: {
        clicks: clicksTotal,
        orders: ordersLive,
        newCustomerOrders: newCustomerCount,
        conversionRate:
          hasLink && clicksTotal > 0
            ? Number(((ordersLive / clicksTotal) * 100).toFixed(1))
            : hasLink
              ? 0
              : null,
        grossRevenue,
        commissionPending,
        commissionOnHold,
        commissionApproved,
        commissionPaid,
        commissionReversed,
        roi,
      },
      nextCheckpoint,
      checkpoints,
      clickSeries,
      journal: journal.slice(0, JOURNAL_CAP),
      connectedSites: sites.map((s) => ({
        id: s.id,
        url: s.siteUrl,
        status: s.status,
        lastHeartbeatAt: s.lastHeartbeatAt,
      })),
      orders: recentOrders.map((o) => ({
        id: o.id,
        externalOrderId: o.externalOrderId,
        placedAt: o.orderPlacedAt,
        grossAmount: Number(o.grossAmount),
        commissionAmount: Number(o.commissionAmount),
        status: o.status,
        isNewCustomer: o.isNewCustomer,
        method: o.attributionMethod,
      })),
    };
  },
);

export const ORDER_STATUS_LABEL: Record<OrderCommissionStatus, string> = {
  PENDING: "ממתין לאישור",
  ON_HOLD: "בעצירה לבירור",
  APPROVED: "מאושר",
  REVERSED: "בוטל (החזרה)",
  PAID: "שולם",
};

export const CHECKPOINT_STATUS_LABEL: Record<CheckpointStatus, string> = {
  SCHEDULED: "מתוזמן",
  PAID: "שולם",
  SHORTFALL: "חוסר בפיקדון",
};

export const SITE_STATUS_LABEL: Record<SiteStatus, string> = {
  ACTIVE: "מחובר",
  STALE: "אין דיווח (>12 שעות)",
  OFFLINE: "מנותק",
  DEACTIVATED: "הושבת",
};
