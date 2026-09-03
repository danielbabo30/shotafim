import "server-only";
import { cache } from "react";
import type { CampaignStatus, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * נתוני לוח-הבקרה של המפרסם — נתונים אמיתיים מ-Prisma (ראה CLAUDE.md §"האזור האישי").
 * מסונן לפרופיל העסק של המשתמש המחובר. אם עדיין אין פרופיל עסק — הכול אפס/ריק.
 *
 * שכבת הכסף (EscrowHold / Transaction) נכתבת ל-DB אבל מעברי הסטטוס עדיין
 * ידניים/אדמין עד חיבור PSP — הנתונים כאן אמיתיים ככל שהזרימה מילאה אותם.
 */

export type ChipTone = "primary" | "neutral" | "warning" | "success";

export type BrandKpis = {
  escrowLocked: number;
  escrowDeals: number;
  activeCampaigns: number;
  activeCampaignsBreakdown: string;
  pendingApplications: number;
  pendingDeliverables: number;
  pendingDeliverablesHint: string;
};

export type CampaignRow = {
  id: string;
  title: string;
  meta: string;
  status: { label: string; tone: ChipTone };
  href: string;
};

export type LedgerEntry = {
  id: string;
  direction: "in" | "out";
  title: string;
  timestamp: string;
  amount: number;
  /** יעד ניווט — חדר העבודה של החוזה הקשור, אם יש */
  href: string | null;
};

export type BrandDashboardData = {
  kpis: BrandKpis;
  campaigns: CampaignRow[];
  ledger: LedgerEntry[];
};

/** ‎₪12,000 — פורמט קצר, ספרות בלבד, ללא אגורות */
export const formatShekels = (amount: number): string =>
  `₪${Math.round(amount).toLocaleString("en-US")}`;

const CAMPAIGN_STATUS_META: Record<CampaignStatus, { label: string; tone: ChipTone }> = {
  DRAFT: { label: "טיוטה", tone: "neutral" },
  OPEN_FOR_PITCHES: { label: "פתוח להצעות", tone: "success" },
  IN_PROGRESS: { label: "בהפקה", tone: "primary" },
  COMPLETED: { label: "הושלם", tone: "neutral" },
  CANCELLED: { label: "בוטל", tone: "neutral" },
};

const TXN_TITLE: Record<TransactionType, string> = {
  ESCROW_DEPOSIT: "הפקדה לחשבון נאמנות",
  ESCROW_RELEASE: "שחרור תשלום לספק",
  WITHDRAWAL: "משיכה",
  PLATFORM_FEE: "עמלת פלטפורמה",
  REFUND: "החזר לארנק",
  PARTNERSHIP_DEPOSIT: "הפקדת פיקדון שותפות",
  COMMISSION_ACCRUAL: "צבירת עמלה מרכישה",
  COMMISSION_PAYOUT: "תשלום עמלות בתחנה",
  COMMISSION_REVERSAL: "ביטול עמלה (החזרה)",
  DEPOSIT_REFUND: "החזר יתרת פיקדון",
};

const TXN_IN: TransactionType[] = ["ESCROW_DEPOSIT", "REFUND", "PARTNERSHIP_DEPOSIT"];

const heDateTime = (d: Date) =>
  new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);

const EMPTY: BrandDashboardData = {
  kpis: {
    escrowLocked: 0,
    escrowDeals: 0,
    activeCampaigns: 0,
    activeCampaignsBreakdown: "אין קמפיינים פעילים",
    pendingApplications: 0,
    pendingDeliverables: 0,
    pendingDeliverablesHint: "אין תוצרים ממתינים",
  },
  campaigns: [],
  ledger: [],
};

export const getBrandDashboardData = cache(
  async (brandUserId: string): Promise<BrandDashboardData> => {
    const business = await prisma.businessProfile.findUnique({
      where: { userId: brandUserId },
      select: { id: true },
    });
    if (!business) return EMPTY;

    const bizId = business.id;

    const [escrow, statusGroups, pendingApplications, pendingDeliverables, campaignRows, txns] =
      await Promise.all([
        prisma.escrowHold.aggregate({
          _sum: { amountILS: true },
          _count: true,
          where: { status: "HELD", contract: { businessId: bizId } },
        }),
        prisma.campaign.groupBy({
          by: ["status"],
          where: { businessId: bizId },
          _count: { _all: true },
        }),
        prisma.campaignApplication.count({
          where: { status: "SUBMITTED", campaign: { businessId: bizId } },
        }),
        prisma.deliverableSubmission.count({
          where: { status: "PENDING_REVIEW", contract: { businessId: bizId } },
        }),
        prisma.campaign.findMany({
          where: { businessId: bizId },
          orderBy: { updatedAt: "desc" },
          take: 6,
          select: {
            id: true,
            title: true,
            status: true,
            totalBudgetILS: true,
            _count: { select: { applications: true, contracts: true } },
          },
        }),
        prisma.transaction.findMany({
          where: { userId: brandUserId },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            type: true,
            amountILS: true,
            createdAt: true,
            contract: { select: { id: true, provider: { select: { name: true } } } },
          },
        }),
      ]);

    const countBy = (s: CampaignStatus) =>
      statusGroups.find((g) => g.status === s)?._count._all ?? 0;
    const open = countBy("OPEN_FOR_PITCHES");
    const inProgress = countBy("IN_PROGRESS");

    const campaigns: CampaignRow[] = campaignRows.map((c) => {
      const budget = formatShekels(Number(c.totalBudgetILS));
      const openish = c.status === "OPEN_FOR_PITCHES" || c.status === "DRAFT";
      const meta = openish
        ? `${c._count.applications} הצעות • תקציב: ${budget}`
        : `${c._count.contracts} ${c._count.contracts === 1 ? "ספק" : "ספקים"} • תקציב: ${budget}`;
      return {
        id: c.id,
        title: c.title,
        meta,
        status: CAMPAIGN_STATUS_META[c.status],
        href: `/dashboard/campaigns/${c.id}`,
      };
    });

    const ledger: LedgerEntry[] = txns.map((t) => {
      const who = t.contract?.provider?.name;
      return {
        id: t.id,
        direction: TXN_IN.includes(t.type) ? "in" : "out",
        title: TXN_TITLE[t.type] + (who ? ` • ${who}` : ""),
        timestamp: heDateTime(t.createdAt),
        amount: Number(t.amountILS),
        href: t.contract ? `/dashboard/contracts/${t.contract.id}` : null,
      };
    });

    return {
      kpis: {
        escrowLocked: Number(escrow._sum.amountILS ?? 0),
        escrowDeals: escrow._count,
        activeCampaigns: open + inProgress,
        activeCampaignsBreakdown:
          open + inProgress === 0
            ? "אין קמפיינים פעילים"
            : `${open} פתוחים להצעות, ${inProgress} בהפקה`,
        pendingApplications,
        pendingDeliverables,
        pendingDeliverablesHint:
          pendingDeliverables === 0
            ? "אין תוצרים ממתינים"
            : `${pendingDeliverables} ${pendingDeliverables === 1 ? "תוצר ממתין" : "תוצרים ממתינים"} לבדיקה`,
      },
      campaigns,
      ledger,
    };
  },
);
