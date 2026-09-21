import "server-only";
import type { AttributedOrder, Prisma, TrackedSite } from "@prisma/client";
import { Prisma as P } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  computeCommission,
  isStableOrderStatus,
  proRateCommission,
  resolveAttribution,
} from "@/lib/track/commission";
import { applyDeposiDrain } from "@/lib/track/drain";
import { notifyPartnership } from "@/lib/track/notify";
import type { ClickPayload, DigestPayload, OrderPayload } from "@/lib/track/schemas";

/**
 * "תשלום פר רכישה" — קליטת קליקים והזמנות + מעברי סטטוס עמלה (WP-2, §3/§4/§6).
 * משותף בין ה-route handlers (webhook + digest) ל-cron.
 */

const D = (n: number) => new P.Decimal(n);
const num = (d: Prisma.Decimal) => Number(d);

const LIVE_STATUSES = ["ACTIVE", "GATE_80"] as const;
const ATTRIBUTABLE_STATUSES = ["ACTIVE", "GATE_80", "PAUSED"] as const;

// ── קליקים ──────────────────────────────────────────────────────────────

export async function recordClick(
  site: TrackedSite,
  payload: ClickPayload,
): Promise<{ counted: boolean; deduped: boolean }> {
  const program = await prisma.partnerProgram.findFirst({
    where: {
      refCode: payload.refCode.trim().toUpperCase(),
      contract: { businessId: site.businessId },
    },
    select: { id: true, status: true },
  });
  if (!program) return { counted: false, deduped: false };

  const isLive = (LIVE_STATUSES as readonly string[]).includes(program.status);
  if (!isLive) return { counted: false, deduped: false };

  const occurredAt = new Date(payload.occurredAt);
  const recent = await prisma.affiliateClick.findFirst({
    where: {
      programId: program.id,
      ipHash: payload.ipHash,
      occurredAt: { gte: new Date(occurredAt.getTime() - 30_000) },
    },
    select: { id: true },
  });
  if (recent) return { counted: true, deduped: true };

  // קליק בתוך חלון תחזוקה מוצהר → "לא ניתן לאמת"
  const inMaintenance = await prisma.maintenanceWindow.findFirst({
    where: { siteId: site.id, startsAt: { lte: occurredAt }, endsAt: { gte: occurredAt } },
    select: { id: true },
  });

  await prisma.affiliateClick.create({
    data: {
      programId: program.id,
      occurredAt,
      landingUrl: payload.landingUrl,
      ipHash: payload.ipHash,
      uaHash: payload.uaHash ?? null,
      country: payload.country ?? null,
      unverifiable: inMaintenance != null,
    },
  });
  return { counted: true, deduped: false };
}

// ── הזמנות ──────────────────────────────────────────────────────────────

type ProgramForMatch = {
  id: string;
  status: string;
  attributionMode: "LINK" | "COUPON" | "LINK_AND_COUPON";
  refCode: string;
  couponCode: string | null;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: Prisma.Decimal;
  commissionBasis: "PRE_DISCOUNT" | "POST_DISCOUNT";
  commissionScope: "PRODUCT_ONLY" | "WHOLE_CART";
  platformFeePct: Prisma.Decimal;
  contractId: string;
  contract: { providerId: string };
};

export type IngestOrderResult = {
  attributed: boolean;
  order?: AttributedOrder;
  attributionMethod?: "COUPON" | "COOKIE" | "MANUAL";
  created?: boolean;
};

export async function ingestOrder(
  site: TrackedSite,
  payload: OrderPayload,
  opts: { lateFromDigest?: boolean } = {},
): Promise<IngestOrderResult> {
  // idempotency
  const existing = await prisma.attributedOrder.findUnique({
    where: {
      siteId_externalOrderId: { siteId: site.id, externalOrderId: payload.externalOrderId },
    },
  });
  if (existing) return { attributed: true, order: existing, created: false };

  if (payload.currency !== "ILS") {
    throw Object.assign(new Error("מטבע לא נתמך"), { httpStatus: 422 });
  }

  const candidates = (await prisma.partnerProgram.findMany({
    where: {
      contract: { businessId: site.businessId },
      status: { in: [...ATTRIBUTABLE_STATUSES] },
    },
    select: {
      id: true,
      status: true,
      attributionMode: true,
      refCode: true,
      couponCode: true,
      commissionType: true,
      commissionValue: true,
      commissionBasis: true,
      commissionScope: true,
      platformFeePct: true,
      contractId: true,
      contract: { select: { providerId: true } },
    },
  })) as ProgramForMatch[];

  let matched: ProgramForMatch | null = null;
  let method: "COUPON" | "COOKIE" | null = null;
  // קופון גובר על cookie — עוברים קודם על כל המועמדים למול הקופון
  for (const p of candidates) {
    const m = resolveAttribution(
      {
        attributionMode: p.attributionMode,
        refCode: p.refCode,
        couponCode: p.couponCode,
      },
      { couponCodes: payload.couponCodes, refCode: payload.refCode ?? null },
    );
    if (m === "COUPON") {
      matched = p;
      method = "COUPON";
      break;
    }
    if (m === "COOKIE" && !matched) {
      matched = p;
      method = "COOKIE";
    }
  }

  if (!matched || !method) return { attributed: false };

  const amounts = payload.amounts;
  const lines = payload.lineItems.map((l) => ({
    lineSubtotal: l.lineSubtotal,
    lineDiscount: l.lineDiscount,
    isReferredProduct: l.isReferredProduct,
  }));
  const commission = computeCommission(
    {
      commissionType: matched.commissionType,
      commissionValue: num(matched.commissionValue),
      commissionBasis: matched.commissionBasis,
      commissionScope: matched.commissionScope,
      platformFeePct: num(matched.platformFeePct),
    },
    amounts,
    lines,
  );

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.attributedOrder.create({
      data: {
        programId: matched.id,
        siteId: site.id,
        externalOrderId: payload.externalOrderId,
        orderPlacedAt: new Date(payload.orderPlacedAt),
        currency: "ILS",
        grossAmount: D(amounts.grandTotal),
        commissionableAmount: D(commission.commissionableAmount),
        couponCodes: payload.couponCodes.map((c) => c.toUpperCase()),
        attributionMethod: method,
        customerHash: payload.customerHash,
        isNewCustomer: payload.isNewCustomer,
        orderStatusRaw: payload.orderStatus,
        commissionAmount: D(commission.commissionAmount),
        platformFeeAmount: D(commission.platformFeeAmount),
        lateFromDigest: opts.lateFromDigest ?? false,
        status: "PENDING",
      },
    });

    await tx.transaction.create({
      data: {
        userId: matched.contract.providerId,
        contractId: (
          await tx.partnerProgram.findUniqueOrThrow({
            where: { id: matched.id },
            select: { contractId: true },
          })
        ).contractId,
        type: "COMMISSION_ACCRUAL",
        amountILS: D(commission.commissionAmount),
        feeAmountILS: D(commission.platformFeeAmount),
        status: "PENDING",
        referenceId: created.id,
      },
    });

    return created;
  });

  await notifyPartnership(matched.id, "COMMISSION_ACCRUED", {
    orderId: order.id,
    commissionAmount: commission.commissionAmount,
  });

  return { attributed: true, order, attributionMethod: method, created: true };
}

// ── מעברי סטטוס עמלה ────────────────────────────────────────────────────

/** PENDING/ON_HOLD → APPROVED: מנקז את הפיקדון, מסמן את התנועה כמוצלחת. */
export async function approveCommission(orderId: string): Promise<void> {
  const outcome = await prisma.$transaction(async (tx) => {
    const order = await tx.attributedOrder.findUniqueOrThrow({ where: { id: orderId } });
    if (order.status !== "PENDING" && order.status !== "ON_HOLD") return null;

    await tx.attributedOrder.update({
      where: { id: orderId },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
    await tx.transaction.updateMany({
      where: { referenceId: orderId, type: "COMMISSION_ACCRUAL" },
      data: { status: "SUCCESS" },
    });
    const drain = await applyDeposiDrain(
      tx,
      order.programId,
      num(order.commissionAmount) + num(order.platformFeeAmount),
    );
    return { programId: order.programId, drain };
  });

  if (!outcome) return;
  if (outcome.drain.gateOpened) {
    await notifyPartnership(outcome.programId, "DEPOSIT_LOW", {
      utilizationPct: outcome.drain.utilizationPct,
    });
  }
  if (outcome.drain.autoPaused) {
    await notifyPartnership(outcome.programId, "PARTNERSHIP_PAUSED", {});
  }
}

/** ביטול עמלה (החזרה/ביטול הזמנה). מטפל גם במקרה שכבר נוקזה או שולמה. */
export async function reverseCommission(
  orderId: string,
  reason: string,
  refundedAmountILS?: number,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.attributedOrder.findUniqueOrThrow({ where: { id: orderId } });
    if (order.status === "REVERSED") return;

    const prog = await tx.partnerProgram.findUniqueOrThrow({
      where: { id: order.programId },
      select: { contractId: true, contract: { select: { providerId: true } } },
    });
    const wasApproved = order.status === "APPROVED";
    const wasPaid = order.status === "PAID";

    // החזר חלקי → חישוב מחדש פרו-רטה; החזר מלא → אפס
    const partial = refundedAmountILS != null && refundedAmountILS < num(order.grossAmount);
    const newAmounts = partial
      ? proRateCommission(
          {
            commissionableAmount: num(order.commissionableAmount),
            commissionAmount: num(order.commissionAmount),
            platformFeeAmount: num(order.platformFeeAmount),
          },
          num(order.grossAmount),
          refundedAmountILS,
        )
      : { commissionableAmount: 0, commissionAmount: 0, platformFeeAmount: 0 };

    const clawbackCommission = num(order.commissionAmount) - newAmounts.commissionAmount;
    const clawbackFee = num(order.platformFeeAmount) - newAmounts.platformFeeAmount;

    await tx.attributedOrder.update({
      where: { id: orderId },
      data: partial
        ? {
            commissionAmount: D(newAmounts.commissionAmount),
            platformFeeAmount: D(newAmounts.platformFeeAmount),
            refundedAmountILS: D(refundedAmountILS),
            reversalReason: reason,
          }
        : {
            status: "REVERSED",
            reversedAt: new Date(),
            reversalReason: reason,
          },
    });

    await tx.transaction.create({
      data: {
        userId: prog.contract.providerId,
        contractId: prog.contractId,
        type: "COMMISSION_REVERSAL",
        amountILS: D(clawbackCommission),
        feeAmountILS: D(clawbackFee),
        status: "SUCCESS",
        referenceId: orderId,
      },
    });

    if (wasApproved) {
      // הפחתת הניקוז (delta שלילי — לא פותח שערים)
      await applyDeposiDrain(tx, order.programId, -(clawbackCommission + clawbackFee));
    } else if (wasPaid) {
      // כבר שולם ליוצר → החוב נגרר לתחנה הבאה (carryIn)
      const nextCp = await tx.payoutCheckpoint.findFirst({
        where: { programId: order.programId, status: "SCHEDULED" },
        orderBy: { scheduledFor: "asc" },
      });
      if (nextCp) {
        await tx.payoutCheckpoint.update({
          where: { id: nextCp.id },
          data: { carryInILS: { increment: D(clawbackCommission) } },
        });
      }
    }
  });

  await notifyPartnershipByOrder(orderId, "COMMISSION_ACCRUED", { reversal: true });
}

async function notifyPartnershipByOrder(
  orderId: string,
  type: Parameters<typeof notifyPartnership>[1],
  meta: Record<string, unknown>,
) {
  const order = await prisma.attributedOrder.findUnique({
    where: { id: orderId },
    select: { programId: true },
  });
  if (order) await notifyPartnership(order.programId, type, meta);
}

// ── digest / reconciliation ─────────────────────────────────────────────

export async function processDigest(
  site: TrackedSite,
  payload: DigestPayload,
): Promise<{ ingestedLate: number; corrected: number; mismatch: boolean }> {
  let ingestedLate = 0;
  let corrected = 0;

  for (const d of payload.orders) {
    const existing = await prisma.attributedOrder.findUnique({
      where: {
        siteId_externalOrderId: { siteId: site.id, externalOrderId: d.externalOrderId },
      },
      select: { id: true, orderStatusRaw: true, status: true },
    });

    if (!existing) {
      // הזמנה שנפלה מ-webhook — קליטה מאוחרת (מידע חלקי; בלי line items → WHOLE_CART fallback)
      const res = await ingestOrder(
        site,
        {
          externalOrderId: d.externalOrderId,
          orderPlacedAt: d.orderPlacedAt,
          currency: "ILS",
          orderStatus: d.status,
          amounts: {
            itemsSubtotal: d.grandTotal,
            discountTotal: 0,
            taxTotal: 0,
            shippingTotal: 0,
            grandTotal: d.grandTotal,
          },
          lineItems: [
            { quantity: 1, lineSubtotal: d.grandTotal, lineDiscount: 0, isReferredProduct: true },
          ],
          couponCodes: d.couponCodes,
          refCode: d.refCode ?? null,
          customerHash: `digest:${d.externalOrderId}`,
          isNewCustomer: true,
        },
        { lateFromDigest: true },
      );
      if (res.created) ingestedLate++;
      continue;
    }

    // סטטוס דריפט — תיקון
    const lower = d.status.toLowerCase();
    if ((lower === "refunded" || lower === "cancelled") && existing.status !== "REVERSED") {
      await reverseCommission(existing.id, `digest:${lower}`);
      corrected++;
    }
  }

  // בדיקת סכומי ביקורת
  const window = await prisma.attributedOrder.aggregate({
    _count: true,
    _sum: { grossAmount: true },
    where: {
      siteId: site.id,
      orderPlacedAt: { gte: new Date(payload.periodStart), lte: new Date(payload.periodEnd) },
      status: { not: "REVERSED" },
    },
  });
  const grossHere = num(window._sum.grossAmount ?? new P.Decimal(0));
  const mismatch =
    Math.abs(grossHere - payload.totals.grossAmount) > 1 ||
    window._count !== payload.totals.orderCount;

  if (mismatch) {
    const anyProgram = await prisma.partnerProgram.findFirst({
      where: { contract: { businessId: site.businessId } },
      select: { id: true },
    });
    await prisma.pluginAlert.create({
      data: {
        siteId: site.id,
        programId: anyProgram?.id ?? null,
        type: "WEBHOOK_MISMATCH",
        detail: `digest gross ${payload.totals.grossAmount} vs recorded ${grossHere.toFixed(2)}; count ${payload.totals.orderCount} vs ${window._count}`,
      },
    });
  }

  return { ingestedLate, corrected, mismatch };
}

// ── בדיקת יציבות (reconcile cron) ───────────────────────────────────────

export { isStableOrderStatus };
