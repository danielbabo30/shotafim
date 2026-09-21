import "server-only";
import { cache } from "react";
import type {
  AttributionMode,
  CommissionBasis,
  CommissionScope,
  CommissionType,
  GateChoice,
  ProgramStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";

/**
 * "תשלום פר רכישה" — שכבת קריאה לתוכנית שותפות של חוזה. נתונים אמיתיים מ-Prisma,
 * פתוח לשני הצדדים בחוזה (מפרסם / יוצר). WP-2: כולל ניצול פיקדון ושער 80%.
 */

export type PartnerGateView = {
  id: string;
  openedAt: Date;
  brandChoice: GateChoice | null;
  providerChoice: GateChoice | null;
};

export type PartnerProgramView = {
  id: string;
  contractId: string;
  status: ProgramStatus;
  commissionType: CommissionType;
  commissionValue: number;
  commissionBasis: CommissionBasis;
  commissionScope: CommissionScope;
  estimatedPurchases: number;
  assumedAovILS: number;
  requiredDepositILS: number;
  depositILS: number;
  drainedILS: number;
  utilizationPct: number;
  depositFunded: boolean;
  attributionMode: AttributionMode;
  refCode: string;
  couponCode: string | null;
  couponDiscountPct: number | null;
  destinationUrl: string;
  platformFeePct: number;
  startDate: Date;
  endDate: Date;
  payoutCheckpoints: Date[];
  /** אירוע שער 80% פתוח, אם יש */
  openGate: PartnerGateView | null;
  /** "brand" | "provider" — קובע אילו פעולות מוצגות */
  viewerParty: "brand" | "provider";
};

export const getPartnerProgramForContract = cache(
  async (contractId: string): Promise<PartnerProgramView | null> => {
    const user = await requireActiveUser();

    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        OR: [{ business: { userId: user.id } }, { providerId: user.id }],
      },
      select: {
        id: true,
        providerId: true,
        escrowHold: { select: { amountILS: true } },
        partnerProgram: {
          include: {
            gateEvents: {
              where: { resolvedAt: null },
              orderBy: { openedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    const program = contract?.partnerProgram;
    if (!contract || !program) return null;

    const depositILS = contract.escrowHold
      ? Number(contract.escrowHold.amountILS)
      : Number(program.requiredDepositILS);
    const drainedILS = Number(program.drainedILS);
    const gate = program.gateEvents[0] ?? null;

    return {
      id: program.id,
      contractId: contract.id,
      status: program.status,
      commissionType: program.commissionType,
      commissionValue: Number(program.commissionValue),
      commissionBasis: program.commissionBasis,
      commissionScope: program.commissionScope,
      estimatedPurchases: program.estimatedPurchases,
      assumedAovILS: Number(program.assumedAovILS),
      requiredDepositILS: Number(program.requiredDepositILS),
      depositILS,
      drainedILS,
      utilizationPct: depositILS > 0 ? Math.round((drainedILS / depositILS) * 1000) / 10 : 0,
      depositFunded: program.depositHoldId != null,
      openGate: gate
        ? {
            id: gate.id,
            openedAt: gate.openedAt,
            brandChoice: gate.brandChoice,
            providerChoice: gate.providerChoice,
          }
        : null,
      attributionMode: program.attributionMode,
      refCode: program.refCode,
      couponCode: program.couponCode,
      couponDiscountPct:
        program.couponDiscountPct != null ? Number(program.couponDiscountPct) : null,
      destinationUrl: program.destinationUrl,
      platformFeePct: Number(program.platformFeePct),
      startDate: program.startDate,
      endDate: program.endDate,
      payoutCheckpoints: program.payoutCheckpoints,
      viewerParty: contract.providerId === user.id ? "provider" : "brand",
    };
  },
);
