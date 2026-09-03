"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import type { ContractActionState } from "@/lib/contract-room";

/**
 * "תשלום פר רכישה" — WP-1: הפקדת הפיקדון בלבד.
 * מנוע השיוך, חישוב העמלות, עיבוד התחנות והניטור — WP-2+.
 */

/**
 * הפקדת פיקדון השותפות (מפרסם, כשה-PartnerProgram ב-PENDING_DEPOSIT).
 * ⚠️ שכבה פיקטיבית (CLAUDE.md §"האזור האישי"): מעבר מצב ידני שנכתב ל-DB, בלי PSP.
 * יוצר EscrowHold(HELD) בדפוס הקיים + Transaction(PARTNERSHIP_DEPOSIT) ומעלה את
 * ה-program ל-ACTIVE. הלינק/קופון "עולה לאוויר" רק מרגע זה.
 */
export async function fundPartnerDeposit(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const user = await requireActiveUser();
  const contractId = String(formData.get("contractId") ?? "");

  const contract = await prisma.contract.findFirst({
    where: { id: contractId, business: { userId: user.id } },
    select: {
      id: true,
      escrowHold: { select: { id: true } },
      partnerProgram: {
        select: { id: true, status: true, requiredDepositILS: true, depositHoldId: true },
      },
    },
  });

  if (!contract) {
    return { status: "error", message: "החוזה לא נמצא או אינו שייך לחשבון זה." };
  }
  const program = contract.partnerProgram;
  if (!program) {
    return { status: "error", message: "לחוזה זה אין תוכנית שותפות." };
  }
  if (program.status !== "PENDING_DEPOSIT" || program.depositHoldId || contract.escrowHold) {
    return { status: "error", message: "הפיקדון כבר הופקד או שהשותפות אינה ממתינה להפקדה." };
  }

  const amount = program.requiredDepositILS;

  await prisma.$transaction(async (tx) => {
    const hold = await tx.escrowHold.create({
      data: {
        contractId: contract.id,
        amountILS: amount,
        status: "HELD",
        fundedAt: new Date(),
      },
      select: { id: true },
    });
    await tx.transaction.create({
      data: {
        userId: user.id,
        contractId: contract.id,
        type: "PARTNERSHIP_DEPOSIT",
        amountILS: amount,
        feeAmountILS: new Prisma.Decimal(0),
        status: "SUCCESS",
      },
    });
    await tx.partnerProgram.update({
      where: { id: program.id },
      data: { status: "ACTIVE", depositHoldId: hold.id },
    });
    await tx.contract.update({
      where: { id: contract.id },
      data: { status: "ACTIVE" },
    });
  });

  revalidatePath(`/dashboard/contracts/${contract.id}`);
  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard");
  return { status: "success", message: "הפיקדון הופקד — הלינק והקופון פעילים." };
}
