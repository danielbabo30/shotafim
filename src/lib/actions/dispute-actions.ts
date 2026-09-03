"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  Prisma,
  type DisputeReason,
  type DisputeStatus,
  type EnforcementType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import { requireAdmin } from "@/lib/admin-guard";
import { DISPUTE_REASON_META, reasonsForCompensationModel } from "@/lib/disputes";

export type DisputeActionState = { status: "idle" | "error" | "success"; message?: string };
export const DISPUTE_ACTION_INITIAL: DisputeActionState = { status: "idle" };

const isDisputeReason = (v: string): v is DisputeReason => v in DISPUTE_REASON_META;
const RESOLUTIONS: DisputeStatus[] = ["RESOLVED_PAYOUT", "RESOLVED_REFUND", "SPLIT"];
const ENFORCEMENT_TYPES: EnforcementType[] = ["WARNING", "FINE", "SUSPENSION", "BAN"];

/** מצבי חוזה שבהם צד יכול לפתוח מחלוקת. */
const DISPUTE_OPENABLE_STATUSES = ["ACTIVE", "SUBMITTED_FOR_REVIEW"] as const;

/** ניקוד מהימנות שיורד לפי סוג האכיפה. */
const RELIABILITY_PENALTY: Record<EnforcementType, number> = {
  WARNING: 5,
  FINE: 10,
  SUSPENSION: 25,
  BAN: 50,
};

/* ───────────────────────── פתיחת מחלוקת (צד בחוזה) ───────────────────────── */

export async function openDispute(
  _prev: DisputeActionState,
  formData: FormData,
): Promise<DisputeActionState> {
  const user = await requireActiveUser();
  const contractId = String(formData.get("contractId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!isDisputeReason(reason)) {
    return { status: "error", message: "עילת מחלוקת לא תקינה." };
  }
  if (description.length < 10) {
    return { status: "error", message: "יש לפרט את המחלוקת (לפחות 10 תווים)." };
  }

  const contract = await prisma.contract.findFirst({
    where: {
      id: contractId,
      OR: [{ business: { userId: user.id } }, { providerId: user.id }],
    },
    select: { id: true, status: true, compensationModel: true, dispute: { select: { id: true } } },
  });
  if (!contract) return { status: "error", message: "החוזה לא נמצא." };
  if (contract.dispute) return { status: "error", message: "כבר קיימת מחלוקת פתוחה לחוזה זה." };
  if (
    !DISPUTE_OPENABLE_STATUSES.includes(
      contract.status as (typeof DISPUTE_OPENABLE_STATUSES)[number],
    )
  ) {
    return { status: "error", message: "לא ניתן לפתוח מחלוקת בשלב הנוכחי של החוזה." };
  }
  if (!reasonsForCompensationModel(contract.compensationModel).includes(reason)) {
    return { status: "error", message: "העילה אינה מתאימה לסוג החוזה." };
  }

  await prisma.$transaction(async (tx) => {
    const dispute = await tx.dispute.create({
      data: { contractId: contract.id, initiatorId: user.id, reason, description },
    });
    await tx.contract.update({ where: { id: contract.id }, data: { status: "DISPUTED" } });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "dispute.opened",
        entityType: "Dispute",
        entityId: dispute.id,
        metadata: { contractId: contract.id, reason },
      },
    });
  });

  revalidatePath(`/dashboard/contracts/${contractId}`);
  revalidatePath("/dashboard/disputes");
  revalidatePath("/dashboard");
  redirect(`/dashboard/contracts/${contractId}`);
}

/* ───────────────────────── הכרעת מחלוקת (אדמין) ───────────────────────── */

export async function resolveDispute(
  _prev: DisputeActionState,
  formData: FormData,
): Promise<DisputeActionState> {
  const admin = await requireAdmin();
  const disputeId = String(formData.get("disputeId") ?? "");
  const resolution = String(formData.get("resolution") ?? "") as DisputeStatus;
  const notes = String(formData.get("notes") ?? "").trim();

  if (!RESOLUTIONS.includes(resolution)) {
    return { status: "error", message: "יש לבחור אופן הכרעה." };
  }
  if (notes.length < 5) {
    return { status: "error", message: "יש לרשום נימוק הכרעה." };
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    select: {
      id: true,
      status: true,
      contractId: true,
      contract: { select: { escrowHold: { select: { id: true } } } },
    },
  });
  if (!dispute) return { status: "error", message: "המחלוקת לא נמצאה." };
  if (dispute.status !== "OPEN" && dispute.status !== "UNDER_ARBITRATION") {
    return { status: "error", message: "המחלוקת כבר הוכרעה." };
  }

  const contractStatus = resolution === "RESOLVED_REFUND" ? "REFUNDED" : "APPROVED";
  const escrowStatus =
    resolution === "RESOLVED_PAYOUT"
      ? "RELEASED_TO_PROVIDER"
      : resolution === "RESOLVED_REFUND"
        ? "REFUNDED_TO_BRAND"
        : "SPLIT_DISPUTE";

  await prisma.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { id: dispute.id },
      data: {
        status: resolution,
        resolutionNotes: notes,
        arbitratorId: admin.id,
        resolvedAt: new Date(),
      },
    });
    await tx.contract.update({
      where: { id: dispute.contractId },
      data: { status: contractStatus, completedAt: new Date() },
    });
    if (dispute.contract.escrowHold) {
      await tx.escrowHold.update({
        where: { id: dispute.contract.escrowHold.id },
        data: { status: escrowStatus, releasedAt: new Date() },
      });
    }
    await tx.auditLog.create({
      data: {
        userId: admin.id,
        action: "dispute.resolved",
        entityType: "Dispute",
        entityId: dispute.id,
        metadata: { resolution },
      },
    });
  });

  revalidatePath("/dashboard/disputes");
  revalidatePath(`/dashboard/disputes/${disputeId}`);
  revalidatePath(`/dashboard/contracts/${dispute.contractId}`);
  redirect(`/dashboard/disputes/${disputeId}`);
}

/* ───────────────────────── אכיפה (אדמין) ───────────────────────── */

export async function issueEnforcement(
  _prev: DisputeActionState,
  formData: FormData,
): Promise<DisputeActionState> {
  const admin = await requireAdmin();
  const targetUserId = String(formData.get("targetUserId") ?? "");
  const type = String(formData.get("type") ?? "") as EnforcementType;
  const reason = String(formData.get("reason") ?? "").trim();
  const disputeId = String(formData.get("disputeId") ?? "").trim() || null;
  const amountRaw = String(formData.get("amountILS") ?? "").trim();

  if (!ENFORCEMENT_TYPES.includes(type)) {
    return { status: "error", message: "יש לבחור סוג אכיפה." };
  }
  if (reason.length < 5) {
    return { status: "error", message: "יש לרשום נימוק לאכיפה." };
  }
  const amountILS = type === "FINE" ? Number(amountRaw) : null;
  if (type === "FINE" && (!Number.isFinite(amountILS) || (amountILS ?? 0) <= 0)) {
    return { status: "error", message: "יש להזין סכום קנס תקין." };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      status: true,
      creatorProfile: { select: { id: true, reliabilityScore: true } },
      adSpaceOwnerProfile: { select: { id: true, reliabilityScore: true } },
    },
  });
  if (!target) return { status: "error", message: "המשתמש לא נמצא." };

  const penalty = RELIABILITY_PENALTY[type];

  await prisma.$transaction(async (tx) => {
    await tx.enforcementAction.create({
      data: {
        targetUserId: target.id,
        type,
        reason,
        disputeId,
        amountILS: amountILS != null ? new Prisma.Decimal(amountILS) : null,
        issuedByAdminId: admin.id,
      },
    });

    if (type === "SUSPENSION" && target.status === "ACTIVE") {
      await tx.user.update({ where: { id: target.id }, data: { status: "SUSPENDED" } });
    }
    if (type === "BAN") {
      await tx.user.update({ where: { id: target.id }, data: { status: "BANNED" } });
    }

    if (target.creatorProfile) {
      await tx.creatorProfile.update({
        where: { id: target.creatorProfile.id },
        data: { reliabilityScore: Math.max(0, target.creatorProfile.reliabilityScore - penalty) },
      });
    }
    if (target.adSpaceOwnerProfile) {
      await tx.adSpaceOwnerProfile.update({
        where: { id: target.adSpaceOwnerProfile.id },
        data: {
          reliabilityScore: Math.max(0, target.adSpaceOwnerProfile.reliabilityScore - penalty),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: admin.id,
        action: "enforcement.issued",
        entityType: "EnforcementAction",
        entityId: target.id,
        metadata: { type, disputeId },
      },
    });
  });

  revalidatePath("/dashboard/disputes");
  if (disputeId) revalidatePath(`/dashboard/disputes/${disputeId}`);
  revalidatePath("/dashboard");
  return { status: "success", message: "פעולת האכיפה נרשמה." };
}

/* ───────────────────────── סימון דגל אנומליה כטופל (אדמין) ───────────────────────── */

export async function resolveAnomalyFlag(
  _prev: DisputeActionState,
  formData: FormData,
): Promise<DisputeActionState> {
  const admin = await requireAdmin();
  const flagId = String(formData.get("flagId") ?? "");
  const disputeId = String(formData.get("disputeId") ?? "").trim() || null;

  const flag = await prisma.anomalyFlag.findUnique({
    where: { id: flagId },
    select: { id: true, resolvedAt: true },
  });
  if (!flag) return { status: "error", message: "הדגל לא נמצא." };
  if (flag.resolvedAt) return { status: "error", message: "הדגל כבר סומן כטופל." };

  await prisma.$transaction([
    prisma.anomalyFlag.update({ where: { id: flag.id }, data: { resolvedAt: new Date() } }),
    prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "anomaly.resolved",
        entityType: "AnomalyFlag",
        entityId: flag.id,
        metadata: { disputeId },
      },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/disputes");
  if (disputeId) revalidatePath(`/dashboard/disputes/${disputeId}`);
  return { status: "success", message: "הדגל סומן כטופל." };
}
