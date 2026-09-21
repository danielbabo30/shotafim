import "server-only";
import { cache } from "react";
import type { TransactionType, TransactionStatus, EscrowStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * נתוני מסך "הכנסות" של היוצר (/dashboard/earnings) — כמה הרוויח מקמפיינים,
 * כמה נעול בנאמנות, כמה נמשך, ומה היתרה הזמינה. נתונים אמיתיים מ-Prisma
 * (ראה CLAUDE.md §"האזור האישי"), מסונן ל-userId המחובר.
 *
 * שכבת הכספים: מעברי סטטוס של EscrowHold/Transaction עדיין ידניים/אדמין עד חיבור PSP,
 * והחשבוניות פיקטיביות (Invoice.externalProvider=LOCAL_MOCK) — אבל הכל נקרא מ-DB אמיתי.
 */

export type EarningsKpis = {
  /** סך שוחרר ליוצר מחשבונות נאמנות (RELEASED_TO_PROVIDER) */
  totalReleased: number;
  /** נעול כרגע בנאמנות וממתין לשחרור (HELD) */
  heldInEscrow: number;
  /** סך שנמשך לחשבון הבנק (WITHDRAWAL / COMMISSION_PAYOUT שהצליחו) */
  withdrawn: number;
  /** יתרה זמינה למשיכה = שוחרר − נמשך */
  availableBalance: number;
};

export type EarningsEscrowRow = {
  contractId: string;
  campaignTitle: string;
  businessName: string;
  amount: number;
  status: EscrowStatus;
  fundedAt: string | null;
  releasedAt: string | null;
};

export type EarningsTxnRow = {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  feeAmount: number;
  context: string | null;
  referenceId: string | null;
  createdAt: string;
};

export type EarningsInvoiceRow = {
  id: string;
  documentType: string;
  number: string | null;
  issuedBy: string;
  totalAmount: number;
  issuedAt: string;
  pdfUrl: string | null;
};

export type CreatorEarningsData = {
  isCreator: boolean;
  kpis: EarningsKpis;
  escrow: EarningsEscrowRow[];
  transactions: EarningsTxnRow[];
  invoices: EarningsInvoiceRow[];
};

const EMPTY: CreatorEarningsData = {
  isCreator: false,
  kpis: { totalReleased: 0, heldInEscrow: 0, withdrawn: 0, availableBalance: 0 },
  escrow: [],
  transactions: [],
  invoices: [],
};

const num = (v: unknown) => Number(v ?? 0);

export const getCreatorEarnings = cache(
  async (userId: string, isCreator: boolean): Promise<CreatorEarningsData> => {
    if (!isCreator) return EMPTY;

    const [releasedAgg, heldAgg, withdrawnAgg, escrowRows, txnRows, invoiceRows] =
      await Promise.all([
        prisma.escrowHold.aggregate({
          _sum: { amountILS: true },
          where: { status: "RELEASED_TO_PROVIDER", contract: { providerId: userId } },
        }),
        prisma.escrowHold.aggregate({
          _sum: { amountILS: true },
          where: { status: "HELD", contract: { providerId: userId } },
        }),
        prisma.transaction.aggregate({
          _sum: { amountILS: true },
          where: {
            userId,
            type: { in: ["WITHDRAWAL", "COMMISSION_PAYOUT"] },
            status: "SUCCESS",
          },
        }),
        prisma.escrowHold.findMany({
          where: { contract: { providerId: userId } },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            contractId: true,
            amountILS: true,
            status: true,
            fundedAt: true,
            releasedAt: true,
            contract: {
              select: {
                campaign: {
                  select: { title: true, business: { select: { name: true } } },
                },
              },
            },
          },
        }),
        prisma.transaction.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            type: true,
            status: true,
            amountILS: true,
            feeAmountILS: true,
            referenceId: true,
            createdAt: true,
            contract: { select: { campaign: { select: { title: true } } } },
          },
        }),
        prisma.invoice.findMany({
          where: { recipientUserId: userId },
          orderBy: { issuedAt: "desc" },
          take: 50,
          select: {
            id: true,
            documentType: true,
            externalDocumentId: true,
            customerName: true,
            totalAmount: true,
            issuedAt: true,
            pdfUrl: true,
          },
        }),
      ]);

    const totalReleased = num(releasedAgg._sum.amountILS);
    const withdrawn = num(withdrawnAgg._sum.amountILS);

    return {
      isCreator: true,
      kpis: {
        totalReleased,
        heldInEscrow: num(heldAgg._sum.amountILS),
        withdrawn,
        availableBalance: Math.max(0, totalReleased - withdrawn),
      },
      escrow: escrowRows.map((e) => ({
        contractId: e.contractId,
        campaignTitle: e.contract.campaign?.title ?? "קמפיין",
        businessName: e.contract.campaign?.business?.name ?? "—",
        amount: num(e.amountILS),
        status: e.status,
        fundedAt: e.fundedAt?.toISOString() ?? null,
        releasedAt: e.releasedAt?.toISOString() ?? null,
      })),
      transactions: txnRows.map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        amount: num(t.amountILS),
        feeAmount: num(t.feeAmountILS),
        context: t.contract?.campaign?.title ?? null,
        referenceId: t.referenceId,
        createdAt: t.createdAt.toISOString(),
      })),
      invoices: invoiceRows.map((inv) => ({
        id: inv.id,
        documentType: inv.documentType,
        number: inv.externalDocumentId,
        issuedBy: inv.customerName,
        totalAmount: num(inv.totalAmount),
        issuedAt: inv.issuedAt.toISOString(),
        pdfUrl: inv.pdfUrl,
      })),
    };
  },
);

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  ESCROW_DEPOSIT: "הפקדה לנאמנות",
  ESCROW_RELEASE: "שחרור מנאמנות",
  WITHDRAWAL: "משיכה לחשבון בנק",
  PLATFORM_FEE: "עמלת פלטפורמה",
  REFUND: "החזר",
  PARTNERSHIP_DEPOSIT: "הפקדת שותפות",
  COMMISSION_ACCRUAL: "צבירת עמלה",
  COMMISSION_PAYOUT: "תשלום עמלה",
  COMMISSION_REVERSAL: "ביטול עמלה",
  DEPOSIT_REFUND: "החזר יתרת פיקדון",
  PLATFORM_ABSORPTION: "ספיגת פלטפורמה",
};

export const ESCROW_STATUS_LABELS: Record<EscrowStatus, string> = {
  HELD: "נעול בנאמנות",
  RELEASED_TO_PROVIDER: "שוחרר אליך",
  REFUNDED_TO_BRAND: "הוחזר למפרסם",
  SPLIT_DISPUTE: "פוצל (מחלוקת)",
};

export const INVOICE_DOC_TYPE_LABELS: Record<string, string> = {
  TAX_INVOICE: "חשבונית מס",
  RECEIPT: "קבלה",
  CREDIT_INVOICE: "חשבונית זיכוי",
};
