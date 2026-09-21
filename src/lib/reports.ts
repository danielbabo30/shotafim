import "server-only";
import { cache } from "react";
import type { EscrowStatus as PrismaEscrowStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ChipTone } from "@/lib/dashboard-brand";

/**
 * נתוני עמוד הדוחות של המפרסם — תקציבים נעולים בנאמנות (Escrow), יומן תנועות
 * וריכוז חשבוניות מס. נתונים אמיתיים מ-Prisma (ראה CLAUDE.md §"האזור האישי"),
 * מסונן לפרופיל העסק של המשתמש המחובר.
 *
 * מעברי סטטוס של EscrowHold עדיין ידניים/אדמין עד חיבור PSP; החשבוניות
 * פיקטיביות (Invoice.externalProvider=LOCAL_MOCK) עד חיבור API חשבוניות.
 */

export type ReportsKpis = {
  escrowLocked: number;
  availableBalance: number;
  releasedThisMonth: number;
  releasedTrend: string;
};

export type EscrowStatus = "held" | "released" | "refunded";

export type LedgerTxn = {
  id: string;
  ref: string;
  campaign: string;
  counterparty: string;
  counterpartyKind: "campaign" | "space" | "video";
  depositedAt: string;
  amount: number;
  status: EscrowStatus;
  href?: string;
};

export type TaxInvoice = {
  id: string;
  number: string;
  issuedBy: string;
  issuedAt: string;
  amount: number;
};

export type ReportsData = {
  kpis: ReportsKpis;
  ledger: LedgerTxn[];
  ledgerTotal: number;
  invoices: TaxInvoice[];
  bundleMonthLabel: string;
};

export const ESCROW_STATUS_META: Record<
  EscrowStatus,
  { label: string; short: string; tone: ChipTone }
> = {
  held: { label: "נעול בנאמנות (HELD)", short: "נעול בנאמנות", tone: "warning" },
  released: { label: "שוחרר לספק (RELEASED)", short: "שוחרר לספק", tone: "success" },
  refunded: { label: "הוחזר בזיכוי (REFUNDED)", short: "הוחזר בזיכוי", tone: "neutral" },
};

const ESCROW_STATUS_MAP: Record<PrismaEscrowStatus, EscrowStatus> = {
  HELD: "held",
  RELEASED_TO_PROVIDER: "released",
  REFUNDED_TO_BRAND: "refunded",
  SPLIT_DISPUTE: "refunded",
};

const heDate = (d: Date) =>
  new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);

const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

const EMPTY_KPIS: ReportsKpis = {
  escrowLocked: 0,
  availableBalance: 0,
  releasedThisMonth: 0,
  releasedTrend: "—",
};

export const getReportsData = cache(async (brandUserId: string): Promise<ReportsData> => {
  const now = new Date();
  const thisMonth = monthStart(now);
  const prevMonth = monthStart(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const bundleMonthLabel = new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
  }).format(prevMonth);

  const business = await prisma.businessProfile.findUnique({
    where: { userId: brandUserId },
    select: { id: true },
  });
  if (!business) {
    return { kpis: EMPTY_KPIS, ledger: [], ledgerTotal: 0, invoices: [], bundleMonthLabel };
  }
  const bizId = business.id;

  const [lockedAgg, releasedThis, releasedPrev, holds, holdsTotal, invoiceRows] = await Promise.all(
    [
      prisma.escrowHold.aggregate({
        _sum: { amountILS: true },
        where: { status: "HELD", contract: { businessId: bizId } },
      }),
      prisma.escrowHold.aggregate({
        _sum: { amountILS: true },
        where: {
          status: "RELEASED_TO_PROVIDER",
          releasedAt: { gte: thisMonth },
          contract: { businessId: bizId },
        },
      }),
      prisma.escrowHold.aggregate({
        _sum: { amountILS: true },
        where: {
          status: "RELEASED_TO_PROVIDER",
          releasedAt: { gte: prevMonth, lt: thisMonth },
          contract: { businessId: bizId },
        },
      }),
      prisma.escrowHold.findMany({
        where: { contract: { businessId: bizId } },
        orderBy: [{ fundedAt: "desc" }, { createdAt: "desc" }],
        take: 25,
        select: {
          id: true,
          amountILS: true,
          status: true,
          fundedAt: true,
          createdAt: true,
          contract: {
            select: {
              id: true,
              adSpaceAssetId: true,
              campaign: { select: { title: true } },
              provider: { select: { name: true } },
            },
          },
        },
      }),
      prisma.escrowHold.count({ where: { contract: { businessId: bizId } } }),
      prisma.invoice.findMany({
        where: { recipientUserId: brandUserId },
        orderBy: { issuedAt: "desc" },
        take: 25,
        select: {
          id: true,
          externalDocumentId: true,
          customerName: true,
          totalAmount: true,
          issuedAt: true,
        },
      }),
    ],
  );

  const releasedThisMonth = Number(releasedThis._sum.amountILS ?? 0);
  const releasedPrevMonth = Number(releasedPrev._sum.amountILS ?? 0);
  let releasedTrend = "—";
  if (releasedPrevMonth > 0) {
    const pct = Math.round(((releasedThisMonth - releasedPrevMonth) / releasedPrevMonth) * 100);
    releasedTrend = `${pct >= 0 ? "+" : ""}${pct}% מהחודש הקודם`;
  } else if (releasedThisMonth > 0) {
    releasedTrend = "החודש הראשון עם שחרורים";
  }

  const ledger: LedgerTxn[] = holds.map((h) => ({
    id: h.id,
    ref: `#ESC-${h.id.slice(-6).toUpperCase()}`,
    campaign: h.contract.campaign?.title ?? "—",
    counterparty: h.contract.provider?.name ?? "ספק",
    counterpartyKind: h.contract.adSpaceAssetId ? "space" : "campaign",
    depositedAt: heDate(h.fundedAt ?? h.createdAt),
    amount: Number(h.amountILS),
    status: ESCROW_STATUS_MAP[h.status],
    href: `/dashboard/contracts/${h.contract.id}`,
  }));

  const invoices: TaxInvoice[] = invoiceRows.map((inv) => ({
    id: inv.id,
    number: inv.externalDocumentId ?? `LOCAL-${inv.id.slice(-6).toUpperCase()}`,
    issuedBy: inv.customerName,
    issuedAt: heDate(inv.issuedAt),
    amount: Number(inv.totalAmount),
  }));

  return {
    kpis: {
      escrowLocked: Number(lockedAgg._sum.amountILS ?? 0),
      availableBalance: 0, // אין עדיין ארנק/יתרה — נכנס עם שכבת ה-PSP
      releasedThisMonth,
      releasedTrend,
    },
    ledger,
    ledgerTotal: holdsTotal,
    invoices,
    bundleMonthLabel,
  };
});
