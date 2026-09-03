import "server-only";
import { Prisma as P } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * "תשלום פר רכישה" — עיבוד תחנות תשלום (WP-2, §6).
 * כל תחנה שהגיע מועדה משלמת 100% מהעמלות המאושרות שטרם שולמו — בלי ריטנשן.
 * carryIn = חוב ביטולים שנגרר מתחנה קודמת. שארית שלילית → SHORTFALL, נגררת הלאה.
 */

const D = (n: number) => new P.Decimal(n);
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export async function processCheckpoint(checkpointId: string): Promise<{
  paidILS: number;
  platformFeeILS: number;
  ordersPaid: number;
  shortfall: boolean;
}> {
  return prisma.$transaction(async (tx) => {
    const cp = await tx.payoutCheckpoint.findUniqueOrThrow({
      where: { id: checkpointId },
      select: {
        id: true,
        programId: true,
        status: true,
        carryInILS: true,
        isFinal: true,
        program: {
          select: {
            contractId: true,
            contract: {
              select: { providerId: true, business: { select: { userId: true } } },
            },
          },
        },
      },
    });
    if (cp.status !== "SCHEDULED") {
      return { paidILS: 0, platformFeeILS: 0, ordersPaid: 0, shortfall: false };
    }

    const orders = await tx.attributedOrder.findMany({
      where: { programId: cp.programId, status: "APPROVED", payoutCheckpointId: null },
      select: { id: true, commissionAmount: true, platformFeeAmount: true },
    });

    const gross = round2(orders.reduce((s, o) => s + Number(o.commissionAmount), 0));
    const platformFee = round2(orders.reduce((s, o) => s + Number(o.platformFeeAmount), 0));
    const carryIn = Number(cp.carryInILS);
    const net = round2(gross - carryIn);
    const shortfall = net < 0;
    const now = new Date();

    if (orders.length > 0) {
      await tx.attributedOrder.updateMany({
        where: { id: { in: orders.map((o) => o.id) } },
        data: { status: "PAID", paidAt: now, payoutCheckpointId: cp.id },
      });
    }

    if (net > 0) {
      await tx.transaction.create({
        data: {
          userId: cp.program.contract.providerId,
          contractId: cp.program.contractId,
          type: "COMMISSION_PAYOUT",
          amountILS: D(net),
          feeAmountILS: D(0),
          status: "SUCCESS",
          referenceId: cp.id,
        },
      });
      if (platformFee > 0) {
        await tx.transaction.create({
          data: {
            userId: cp.program.contract.business.userId,
            contractId: cp.program.contractId,
            type: "PLATFORM_FEE",
            amountILS: D(platformFee),
            feeAmountILS: D(0),
            status: "SUCCESS",
            referenceId: cp.id,
          },
        });
      }
    }

    // שארית שלילית → נגררת לתחנה הבאה
    if (shortfall) {
      const nextCp = await tx.payoutCheckpoint.findFirst({
        where: { programId: cp.programId, status: "SCHEDULED", id: { not: cp.id } },
        orderBy: { scheduledFor: "asc" },
      });
      if (nextCp) {
        await tx.payoutCheckpoint.update({
          where: { id: nextCp.id },
          data: { carryInILS: { increment: D(Math.abs(net)) } },
        });
      }
    }

    await tx.payoutCheckpoint.update({
      where: { id: cp.id },
      data: {
        status: shortfall && net < 0 ? "SHORTFALL" : "PAID",
        grossCommissionILS: D(gross),
        paidILS: D(Math.max(0, net)),
        processedAt: now,
        paidAt: net > 0 ? now : null,
      },
    });

    return {
      paidILS: Math.max(0, net),
      platformFeeILS: net > 0 ? platformFee : 0,
      ordersPaid: orders.length,
      shortfall,
    };
  });
}

/** מריץ את כל התחנות שהגיע מועדן. */
export async function runDueCheckpoints(): Promise<{
  processed: number;
  paidILS: number;
}> {
  const due = await prisma.payoutCheckpoint.findMany({
    where: { status: "SCHEDULED", scheduledFor: { lte: new Date() } },
    orderBy: { scheduledFor: "asc" },
    select: { id: true },
  });

  let paidILS = 0;
  for (const cp of due) {
    const res = await processCheckpoint(cp.id);
    paidILS += res.paidILS;
  }
  return { processed: due.length, paidILS };
}
