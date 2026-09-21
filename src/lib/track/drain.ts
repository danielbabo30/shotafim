import "server-only";
import type { Prisma } from "@prisma/client";
import { Prisma as P } from "@prisma/client";
import { GATE_THRESHOLD_PCT } from "@/lib/partner-constants";

/**
 * "תשלום פר רכישה" — ניקוז הפיקדון ושערי 80%/100% (WP-2, §6).
 *
 * ניקוז = drainedILS מול EscrowHold.amountILS. עמלה APPROVED מגדילה, REVERSAL מקטין.
 *  • חצייית 80% (מלמטה) → ProgramStatus.GATE_80 + PartnerGateEvent + התראות.
 *  • חצייית 100% → ProgramStatus.PAUSED (לינק/קופון סגורים לקליקים חדשים),
 *    החריגה נרשמת כחוב מפרסם (BusinessProfile.partnershipDebtILS).
 *
 * חייב לרוץ בתוך prisma.$transaction. delta יכול להיות שלילי (REVERSAL).
 */

type Tx = Prisma.TransactionClient;

const D = (n: number | Prisma.Decimal) => new P.Decimal(n);
const num = (d: Prisma.Decimal) => Number(d);

export type DrainOutcome = {
  drainedILS: number;
  depositILS: number;
  utilizationPct: number;
  gateOpened: boolean;
  autoPaused: boolean;
  overageILS: number;
};

export async function applyDeposiDrain(
  tx: Tx,
  programId: string,
  deltaILS: number,
): Promise<DrainOutcome> {
  const program = await tx.partnerProgram.findUniqueOrThrow({
    where: { id: programId },
    select: {
      id: true,
      status: true,
      drainedILS: true,
      depositHoldId: true,
      contract: { select: { businessId: true } },
    },
  });

  const hold = program.depositHoldId
    ? await tx.escrowHold.findUnique({
        where: { id: program.depositHoldId },
        select: { amountILS: true },
      })
    : null;
  const depositILS = hold ? num(hold.amountILS) : 0;

  const before = num(program.drainedILS);
  const after = Math.max(0, Math.round((before + deltaILS + Number.EPSILON) * 100) / 100);
  const pctBefore = depositILS > 0 ? (before / depositILS) * 100 : 0;
  const pctAfter = depositILS > 0 ? (after / depositILS) * 100 : 0;

  const crossed80 =
    deltaILS > 0 && pctBefore < GATE_THRESHOLD_PCT && pctAfter >= GATE_THRESHOLD_PCT;
  const crossed100 = deltaILS > 0 && pctBefore < 100 && pctAfter >= 100;

  const data: Prisma.PartnerProgramUpdateInput = { drainedILS: D(after) };
  let gateOpened = false;
  let autoPaused = false;
  let overageILS = 0;

  if (crossed100 && program.status !== "PAUSED" && program.status !== "CLOSED") {
    data.status = "PAUSED";
    data.pausedAt = new Date();
    data.pauseReason = "deposit_exhausted";
    autoPaused = true;
    overageILS = Math.max(0, Math.round((after - depositILS + Number.EPSILON) * 100) / 100);

    if (overageILS > 0) {
      await tx.businessProfile.update({
        where: { id: program.contract.businessId },
        data: { partnershipDebtILS: { increment: D(overageILS) } },
      });
    }
    // סגירת שער פתוח, אם קיים
    await tx.partnerGateEvent.updateMany({
      where: { programId, resolvedAt: null },
      data: { resolvedAt: new Date(), resolution: "AUTO_PAUSED_100" },
    });
  } else if (crossed80 && program.status === "ACTIVE") {
    data.status = "GATE_80";
    gateOpened = true;
    await tx.partnerGateEvent.create({
      data: {
        programId,
        thresholdPct: GATE_THRESHOLD_PCT,
        drainedAtOpenILS: D(after),
        depositAtOpenILS: D(depositILS),
      },
    });
  }

  await tx.partnerProgram.update({ where: { id: programId }, data });

  return {
    drainedILS: after,
    depositILS,
    utilizationPct: Math.round(pctAfter * 10) / 10,
    gateOpened,
    autoPaused,
    overageILS,
  };
}
