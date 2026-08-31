"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import type { ContractActionState } from "@/lib/contract-room";

/** מאמת שהחוזה שייך לעסק של המשתמש המחובר (מפרסם). מחזיר את החוזה או null. */
async function loadOwnedContract(contractId: string) {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("brand")) return null;

  const business = await prisma.businessProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!business) return null;

  const contract = await prisma.contract.findFirst({
    where: { id: contractId, businessId: business.id },
    include: {
      escrowHold: true,
      submissions: { orderBy: { version: "desc" }, take: 1 },
      conversations: { take: 1, orderBy: { createdAt: "asc" }, select: { id: true } },
    },
  });
  if (!contract) return null;

  return { user, business, contract };
}

const revalidateRoom = (id: string) => {
  revalidatePath(`/dashboard/contracts/${id}`);
  revalidatePath("/dashboard/contracts");
};

/**
 * אישור תוצר ושחרור התשלום ליוצר.
 * ⚠️ שכבת הכסף מנוטרלת (Stage 11) — כאן רק מעבר מצב לוגי:
 * EscrowHold.status → RELEASED_TO_PROVIDER + releasedAt, בלי תנועות/PSP אמיתיים.
 */
export async function approveAndRelease(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const contractId = String(formData.get("contractId") ?? "");
  const owned = await loadOwnedContract(contractId);
  if (!owned) return { status: "error", message: "החוזה לא נמצא או אינו שייך לחשבון זה." };

  const { contract } = owned;
  const latest = contract.submissions[0];

  if (contract.status !== "SUBMITTED_FOR_REVIEW" || latest?.status !== "PENDING_REVIEW") {
    return { status: "error", message: "אין תוצר שממתין לאישור." };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.deliverableSubmission.update({
      where: { id: latest.id },
      data: { status: "APPROVED" },
    }),
    prisma.contract.update({
      where: { id: contract.id },
      data: { status: "APPROVED", completedAt: now },
    }),
    ...(contract.escrowHold
      ? [
          prisma.escrowHold.update({
            where: { id: contract.escrowHold.id },
            data: { status: "RELEASED_TO_PROVIDER", releasedAt: now },
          }),
        ]
      : []),
    prisma.campaign.update({
      where: { id: contract.campaignId },
      data: { status: "COMPLETED" },
    }),
  ]);

  revalidateRoom(contract.id);
  return { status: "success", message: "התוצר אושר והתשלום סומן לשחרור ליוצר." };
}

/** בקשת סבב תיקונים נוסף — מגדיל את מונה הסבבים ומחזיר את החוזה לעבודה. */
export async function requestRevision(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const contractId = String(formData.get("contractId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const owned = await loadOwnedContract(contractId);
  if (!owned) return { status: "error", message: "החוזה לא נמצא או אינו שייך לחשבון זה." };

  const { user, contract } = owned;
  const latest = contract.submissions[0];

  if (contract.status !== "SUBMITTED_FOR_REVIEW" || latest?.status !== "PENDING_REVIEW") {
    return { status: "error", message: "אין תוצר פתוח לבקשת תיקון." };
  }
  if (contract.revisionRoundsUsed >= contract.revisionRoundsMax) {
    return { status: "error", message: "נוצלו כל סבבי התיקונים שבהסכם." };
  }

  await prisma.$transaction([
    prisma.deliverableSubmission.update({
      where: { id: latest.id },
      data: { status: "REVISION_REQUESTED" },
    }),
    prisma.contract.update({
      where: { id: contract.id },
      data: { status: "ACTIVE", revisionRoundsUsed: { increment: 1 } },
    }),
    ...(note
      ? [
          prisma.contentFeedback.create({
            data: {
              submissionId: latest.id,
              authorId: user.id,
              feedbackText: note,
            },
          }),
        ]
      : []),
  ]);

  revalidateRoom(contract.id);
  return { status: "success", message: "נשלחה בקשה לסבב תיקונים." };
}

/**
 * הוספת הערת בדיקה על תוצר, עם חותמת זמן אופציונלית בוידאו.
 * פעולת טופס פשוטה — הטופס מתאפס אוטומטית אחרי הצלחה (React).
 */
export async function addFeedback(formData: FormData): Promise<void> {
  const contractId = String(formData.get("contractId") ?? "");
  const submissionId = String(formData.get("submissionId") ?? "");
  const feedbackText = String(formData.get("feedbackText") ?? "").trim();
  const rawTs = formData.get("timestampSeconds");
  const timestampSeconds =
    rawTs != null && rawTs !== "" && Number.isFinite(Number(rawTs))
      ? Math.max(0, Math.floor(Number(rawTs)))
      : null;

  if (!feedbackText) return;

  const owned = await loadOwnedContract(contractId);
  if (!owned) return;

  const submission = await prisma.deliverableSubmission.findFirst({
    where: { id: submissionId, contractId },
    select: { id: true },
  });
  if (!submission) return;

  await prisma.contentFeedback.create({
    data: { submissionId: submission.id, authorId: owned.user.id, feedbackText, timestampSeconds },
  });

  revalidateRoom(contractId);
}

/** סימון הערה כטופלה / לא-טופלה. פעולת טופס פשוטה (בלי state). */
export async function toggleFeedbackResolved(formData: FormData): Promise<void> {
  const contractId = String(formData.get("contractId") ?? "");
  const feedbackId = String(formData.get("feedbackId") ?? "");
  const resolved = formData.get("resolved") === "true";

  const owned = await loadOwnedContract(contractId);
  if (!owned) return;

  const feedback = await prisma.contentFeedback.findFirst({
    where: { id: feedbackId, submission: { contractId } },
    select: { id: true },
  });
  if (!feedback) return;

  await prisma.contentFeedback.update({
    where: { id: feedback.id },
    data: { isResolved: resolved },
  });
  revalidateRoom(contractId);
}

/** שליחת הודעה בצ'אט חדר העבודה. ללא realtime — revalidate בלבד (Stage 8 יוסיף). */
export async function sendRoomMessage(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const contractId = String(formData.get("contractId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { status: "error", message: "" };

  const owned = await loadOwnedContract(contractId);
  if (!owned) return { status: "error", message: "החוזה לא נמצא או אינו שייך לחשבון זה." };

  const { user, contract } = owned;

  let conversationId = contract.conversations[0]?.id;
  if (!conversationId) {
    const created = await prisma.conversation.create({
      data: {
        contractId: contract.id,
        campaignId: contract.campaignId,
        participants: {
          create: [{ userId: user.id }, { userId: contract.providerId }],
        },
      },
      select: { id: true },
    });
    conversationId = created.id;
  }

  await prisma.message.create({
    data: { conversationId, senderId: user.id, body },
  });

  revalidateRoom(contract.id);
  return { status: "success" };
}
