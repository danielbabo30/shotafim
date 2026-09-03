"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import type { ContractActionState } from "@/lib/contract-room";
import { FINAL_CHECKPOINT_GRACE_DAYS } from "@/lib/partner-terms";
import { approveCommission, reverseCommission } from "@/lib/track/ingest";
import { processCheckpoint } from "@/lib/track/cron/checkpoints";
import { notifyPartnership } from "@/lib/track/notify";

/**
 * "תשלום פר רכישה" — פעולות שותפות.
 * WP-1: fundPartnerDeposit. WP-2: top-up, שער-80, החלטה על הזמנה בודדת, trigger תחנה.
 */

const revalidateContract = (contractId: string) => {
  revalidatePath(`/dashboard/contracts/${contractId}`);
  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard");
};

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

  revalidateContract(contract.id);
  return { status: "success", message: "הפיקדון הופקד — הלינק והקופון פעילים." };
}

// ═══════════════════════════════════════════════════════════════════════
//  WP-2
// ═══════════════════════════════════════════════════════════════════════

/** מאתר את תוכנית השותפות של חוזה שהמשתמש המחובר צד בו. */
async function loadProgram(contractId: string, party: "brand" | "either") {
  const user = await requireActiveUser();
  const contract = await prisma.contract.findFirst({
    where: {
      id: contractId,
      ...(party === "brand"
        ? { business: { userId: user.id } }
        : { OR: [{ business: { userId: user.id } }, { providerId: user.id }] }),
    },
    select: {
      id: true,
      providerId: true,
      escrowHold: { select: { id: true, amountILS: true } },
      partnerProgram: true,
    },
  });
  if (!contract?.partnerProgram) return null;
  const viewerParty: "brand" | "provider" = contract.providerId === user.id ? "provider" : "brand";
  return { user, contract, program: contract.partnerProgram, viewerParty };
}

/**
 * הטענת פיקדון בשער 80% (מפרסם). מגדיל את ה-Hold, מחזיר את השותפות ל-ACTIVE
 * וסוגר את אירוע השער. אפשר לעדכן תחזית/תאריך סיום (התחנה האחרונה תיקבע מחדש).
 */
export async function topUpPartnerDeposit(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const loaded = await loadProgram(String(formData.get("contractId") ?? ""), "brand");
  if (!loaded) return { status: "error", message: "החוזה לא נמצא או אינו שייך לחשבון זה." };
  const { contract, program } = loaded;

  const addAmount = Number(formData.get("addAmountILS") ?? 0);
  if (!Number.isFinite(addAmount) || addAmount <= 0) {
    return { status: "error", message: "יש להזין סכום הטענה תקין." };
  }
  if (!contract.escrowHold || !program.depositHoldId) {
    return { status: "error", message: "אין פיקדון קיים להטעין. יש להפקיד תחילה." };
  }
  if (program.status !== "GATE_80" && program.status !== "ACTIVE") {
    return { status: "error", message: "לא ניתן להטעין בשלב הנוכחי." };
  }

  const rawPurchases = formData.get("estimatedPurchases");
  const rawEndDate = String(formData.get("endDate") ?? "").trim();
  const newPurchases =
    rawPurchases && Number.isFinite(Number(rawPurchases)) ? Math.floor(Number(rawPurchases)) : null;
  const newEndDate =
    rawEndDate && !Number.isNaN(Date.parse(rawEndDate)) ? new Date(rawEndDate) : null;

  await prisma.$transaction(async (tx) => {
    await tx.escrowHold.update({
      where: { id: program.depositHoldId! },
      data: { amountILS: { increment: new Prisma.Decimal(addAmount) } },
    });
    await tx.transaction.create({
      data: {
        userId: loaded.user.id,
        contractId: contract.id,
        type: "PARTNERSHIP_DEPOSIT",
        amountILS: new Prisma.Decimal(addAmount),
        feeAmountILS: new Prisma.Decimal(0),
        status: "SUCCESS",
      },
    });

    const programData: Prisma.PartnerProgramUpdateInput = {
      status: "ACTIVE",
      pausedAt: null,
      pauseReason: null,
      requiredDepositILS: { increment: new Prisma.Decimal(addAmount) },
    };
    if (newPurchases && newPurchases > 0) programData.estimatedPurchases = newPurchases;
    if (newEndDate) {
      programData.endDate = newEndDate;
      const finalStop = new Date(newEndDate.getTime() + FINAL_CHECKPOINT_GRACE_DAYS * 864e5);
      await tx.payoutCheckpoint.updateMany({
        where: { programId: program.id, isFinal: true, status: "SCHEDULED" },
        data: { scheduledFor: finalStop },
      });
    }
    await tx.partnerProgram.update({ where: { id: program.id }, data: programData });

    await tx.partnerGateEvent.updateMany({
      where: { programId: program.id, resolvedAt: null },
      data: { resolvedAt: new Date(), resolution: "TOPPED_UP" },
    });
  });

  await notifyPartnership(program.id, "COMMISSION_ACCRUED", {}, "provider");
  revalidateContract(contract.id);
  return { status: "success", message: `הפיקדון הוטען ב-₪${addAmount.toLocaleString("he-IL")}.` };
}

/** בחירת צד בשער ה-80% (כל צד). "STOP" משאיר את השותפות לרוץ עד 100% ואז השהיה אוטומטית. */
export async function submitGateChoice(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const loaded = await loadProgram(String(formData.get("contractId") ?? ""), "either");
  if (!loaded) return { status: "error", message: "החוזה לא נמצא או אינו שייך לחשבון זה." };
  const { program, viewerParty } = loaded;

  const choice = String(formData.get("choice") ?? "");
  if (choice !== "CONTINUE" && choice !== "STOP") {
    return { status: "error", message: "בחירה לא תקינה." };
  }

  const gate = await prisma.partnerGateEvent.findFirst({
    where: { programId: program.id, resolvedAt: null },
    orderBy: { openedAt: "desc" },
  });
  if (!gate) return { status: "error", message: "אין החלטת שער פתוחה." };

  const data =
    viewerParty === "brand"
      ? { brandChoice: choice as "CONTINUE" | "STOP" }
      : { providerChoice: choice as "CONTINUE" | "STOP" };
  const updated = await prisma.partnerGateEvent.update({ where: { id: gate.id }, data });

  // צד אחד בחר "עצור" → סוגרים את אירוע השער; ההשהיה עצמה מתרחשת אוטומטית ב-100% (drain).
  // שניהם "המשך" → השער נשאר פתוח וממתין ל-top-up.
  if (updated.brandChoice === "STOP" || updated.providerChoice === "STOP") {
    await prisma.partnerGateEvent.update({
      where: { id: gate.id },
      data: { resolvedAt: new Date(), resolution: "STOPPED" },
    });
  }

  await notifyPartnership(
    program.id,
    "DEPOSIT_LOW",
    {},
    viewerParty === "brand" ? "provider" : "brand",
  );
  revalidateContract(loaded.contract.id);
  return { status: "success", message: "הבחירה נרשמה." };
}

/** החלטת מפרסם על עמלת הזמנה בודדת: אישור מיידי / עצירה לבירור / ביטול. */
export async function decideAttributedOrder(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const user = await requireActiveUser();
  const orderId = String(formData.get("orderId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  const order = await prisma.attributedOrder.findFirst({
    where: { id: orderId, program: { contract: { business: { userId: user.id } } } },
    select: { id: true, status: true, program: { select: { contractId: true } } },
  });
  if (!order) return { status: "error", message: "ההזמנה לא נמצאה." };

  if (decision === "APPROVE") {
    if (order.status !== "PENDING" && order.status !== "ON_HOLD") {
      return { status: "error", message: "אפשר לאשר רק עמלה ממתינה." };
    }
    await approveCommission(order.id);
  } else if (decision === "HOLD") {
    if (order.status !== "PENDING") {
      return { status: "error", message: "אפשר לעצור רק עמלה ממתינה." };
    }
    await prisma.attributedOrder.update({
      where: { id: order.id },
      data: { status: "ON_HOLD", heldAt: new Date(), holdReason: note },
    });
  } else if (decision === "REVERSE") {
    if (order.status === "REVERSED") {
      return { status: "error", message: "העמלה כבר בוטלה." };
    }
    await reverseCommission(order.id, note ? `manual:${note}` : "manual");
  } else {
    return { status: "error", message: "פעולה לא מוכרת." };
  }

  revalidateContract(order.program.contractId);
  return { status: "success", message: "העדכון נשמר." };
}

/** הרצת תחנת תשלום ידנית — אדמין בלבד (בדרך כלל ה-cron מטפל). */
export async function triggerPayoutCheckpoint(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("admin")) {
    return { status: "error", message: "פעולה זו מיועדת לאדמין בלבד." };
  }
  const checkpointId = String(formData.get("checkpointId") ?? "");
  const cp = await prisma.payoutCheckpoint.findUnique({
    where: { id: checkpointId },
    select: { id: true, program: { select: { contractId: true } } },
  });
  if (!cp) return { status: "error", message: "התחנה לא נמצאה." };

  const res = await processCheckpoint(cp.id);
  revalidateContract(cp.program.contractId);
  return {
    status: "success",
    message: `התחנה עובדה — שולמו ₪${res.paidILS.toLocaleString("he-IL")} (${res.ordersPaid} הזמנות).`,
  };
}
