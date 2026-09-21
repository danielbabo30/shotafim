import "server-only";
import { Prisma as P } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { COMMISSION_STABILITY_DAYS, DEPOSIT_REFUND_GRACE_DAYS } from "@/lib/partner-constants";
import { approveCommission } from "@/lib/track/ingest";
import { isStableOrderStatus } from "@/lib/track/commission";

/**
 * "תשלום פר רכישה" — reconcile cron (WP-2, §6).
 *  1. עמלות PENDING שעברו את חלון ההחזרות (14 יום) + סטטוס הזמנה יציב → APPROVED (מנקז).
 *  2. שותפויות שהתחנה האחרונה שלהן + 14 יום עברה → החזר יתרת פיקדון למפרסם.
 */
export async function runReconcile(): Promise<{
  approved: number;
  depositRefunds: number;
  refundedILS: number;
}> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - COMMISSION_STABILITY_DAYS * 864e5);

  const ripe = await prisma.attributedOrder.findMany({
    where: { status: "PENDING", orderPlacedAt: { lte: cutoff } },
    select: { id: true, orderStatusRaw: true },
  });

  let approved = 0;
  for (const o of ripe) {
    if (!isStableOrderStatus(o.orderStatusRaw)) continue;
    await approveCommission(o.id);
    approved++;
  }

  // ── החזר יתרת פיקדון ──
  const refundCutoff = new Date(now.getTime() - DEPOSIT_REFUND_GRACE_DAYS * 864e5);
  const done = await prisma.partnerProgram.findMany({
    where: {
      status: { in: ["ACTIVE", "GATE_80", "PAUSED"] },
      endDate: { lte: refundCutoff },
      depositHoldId: { not: null },
    },
    select: {
      id: true,
      drainedILS: true,
      depositHoldId: true,
      contract: { select: { businessId: true, business: { select: { userId: true } } } },
      checkpoints: { where: { status: "SCHEDULED" }, select: { id: true } },
    },
  });

  let depositRefunds = 0;
  let refundedILS = 0;

  for (const prog of done) {
    if (prog.checkpoints.length > 0) continue; // עוד יש תחנות פתוחות
    const hold = await prisma.escrowHold.findUnique({
      where: { id: prog.depositHoldId! },
      select: { id: true, amountILS: true, status: true },
    });
    if (!hold || hold.status !== "HELD") continue;

    const remaining =
      Math.round((Number(hold.amountILS) - Number(prog.drainedILS) + Number.EPSILON) * 100) / 100;

    await prisma.$transaction(async (tx) => {
      await tx.escrowHold.update({
        where: { id: hold.id },
        data: { status: "REFUNDED_TO_BRAND", releasedAt: now },
      });
      await tx.partnerProgram.update({
        where: { id: prog.id },
        data: { status: "CLOSED" },
      });
      if (remaining > 0) {
        await tx.transaction.create({
          data: {
            userId: prog.contract.business.userId,
            contractId: (
              await tx.partnerProgram.findUniqueOrThrow({
                where: { id: prog.id },
                select: { contractId: true },
              })
            ).contractId,
            type: "DEPOSIT_REFUND",
            amountILS: new P.Decimal(remaining),
            feeAmountILS: new P.Decimal(0),
            status: "SUCCESS",
          },
        });
      }
      await tx.contract.update({
        where: {
          id: (
            await tx.partnerProgram.findUniqueOrThrow({
              where: { id: prog.id },
              select: { contractId: true },
            })
          ).contractId,
        },
        data: { status: "APPROVED", completedAt: now },
      });
    });

    depositRefunds++;
    refundedILS += Math.max(0, remaining);
  }

  return { approved, depositRefunds, refundedILS };
}
