"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma, type MediaFileType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import { storage } from "@/lib/storage";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, isAllowedUploadMime } from "@/lib/deliverable-upload";
import { getValidCityIds } from "@/lib/cities";
import type { ContractActionState, ContractParty } from "@/lib/contract-room";

const contractInclude = {
  escrowHold: true,
  submissions: { orderBy: { version: "desc" as const }, take: 1 },
  conversations: { take: 1, orderBy: { createdAt: "asc" as const }, select: { id: true } },
  business: { select: { userId: true } },
  campaign: { select: { hasPhysicalProduct: true } },
  shipping: { select: { id: true } },
} satisfies Prisma.ContractInclude;

/**
 * מאתר חוזה שהמשתמש המחובר צד בו (מפרסם או ספק) ומחזיר את החוזה + הצד.
 */
async function loadContractParty(contractId: string) {
  const user = await requireActiveUser();
  const contract = await prisma.contract.findFirst({
    where: {
      id: contractId,
      OR: [{ business: { userId: user.id } }, { providerId: user.id }],
    },
    include: contractInclude,
  });
  if (!contract) return null;
  const party: ContractParty = contract.providerId === user.id ? "provider" : "brand";
  return { user, contract, party };
}

/** גרסה מוגבלת למפרסם בלבד — לפעולות הבדיקה/האישור */
async function loadOwnedContract(contractId: string) {
  const loaded = await loadContractParty(contractId);
  if (!loaded || loaded.party !== "brand") return null;
  return loaded;
}

const revalidateRoom = (id: string) => {
  revalidatePath(`/dashboard/contracts/${id}`);
  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reports");
};

const isUrl = (v: string) => /^https?:\/\/.+/i.test(v);

/**
 * הפקדת התקציב לנאמנות (מפרסם, כשהחוזה AWAITING_ESCROW).
 * ⚠️ שכבה פיקטיבית (CLAUDE.md §"האזור האישי"): מעבר מצב ידני שנכתב ל-DB,
 * בלי PSP אמיתי. יוצר EscrowHold(HELD) + Transaction(ESCROW_DEPOSIT) ומעביר את החוזה ל-ACTIVE.
 */
export async function fundEscrow(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const contractId = String(formData.get("contractId") ?? "");
  const owned = await loadOwnedContract(contractId);
  if (!owned) return { status: "error", message: "החוזה לא נמצא או אינו שייך לחשבון זה." };

  const { user, contract } = owned;
  if (contract.status !== "AWAITING_ESCROW" || contract.escrowHold) {
    return { status: "error", message: "התקציב כבר הופקד או שהחוזה אינו ממתין להפקדה." };
  }

  const total = Number(contract.agreedPriceILS) + Number(contract.platformFeeILS);
  const now = new Date();

  await prisma.$transaction([
    prisma.escrowHold.create({
      data: {
        contractId: contract.id,
        amountILS: new Prisma.Decimal(total),
        status: "HELD",
        fundedAt: now,
      },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        contractId: contract.id,
        type: "ESCROW_DEPOSIT",
        amountILS: new Prisma.Decimal(total),
        feeAmountILS: new Prisma.Decimal(0),
        status: "SUCCESS",
      },
    }),
    prisma.contract.update({ where: { id: contract.id }, data: { status: "ACTIVE" } }),
  ]);

  revalidateRoom(contract.id);
  return { status: "success", message: "התקציב הופקד לנאמנות והעבודה יכולה להתחיל." };
}

/**
 * העלאת תוצר לבדיקה (ספק). URL בשדה טקסט — אין תשתית העלאת קבצים אמיתית בשלב זה.
 * מותר רק כשהחוזה ACTIVE (הגשה ראשונה או אחרי בקשת תיקון). כל הגשה מגדילה version.
 */
const mediaFileTypeFromMime = (mime: string): MediaFileType => {
  if (mime.startsWith("video/")) return "VIDEO_DRAFT";
  return "IMAGE_ASSET"; // תמונות + PDF
};

export async function submitDeliverable(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const contractId = String(formData.get("contractId") ?? "");
  const fileUrl = String(formData.get("fileUrl") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const upload = formData.get("file");
  const hasFile = upload instanceof File && upload.size > 0;

  const loaded = await loadContractParty(contractId);
  if (!loaded || loaded.party !== "provider") {
    return { status: "error", message: "רק הספק בחוזה יכול להעלות תוצר." };
  }
  const { user, contract } = loaded;

  if (contract.status !== "ACTIVE") {
    return { status: "error", message: "אפשר להעלות תוצר רק כשהחוזה בעבודה." };
  }
  if (!hasFile && (!fileUrl || !isUrl(fileUrl))) {
    return { status: "error", message: "צרפו קובץ או הזינו קישור תקין (מתחיל ב-http)." };
  }

  let submissionFileUrl = fileUrl;
  let mediaAttachmentId: string | null = null;

  if (hasFile) {
    const file = upload as File;
    if (file.size > MAX_UPLOAD_BYTES) {
      return { status: "error", message: `הקובץ גדול מדי (מקסימום ${MAX_UPLOAD_MB}MB).` };
    }
    if (!isAllowedUploadMime(file.type)) {
      return { status: "error", message: "סוג קובץ לא נתמך — וידאו, תמונה או PDF בלבד." };
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(bytes).digest("hex");

    const attachment = await prisma.mediaAttachment.create({
      data: {
        uploaderId: user.id,
        fileUrl: "", // מתעדכן מיד לאחר הכתיבה לאחסון
        originalFilename: file.name || null,
        fileType: mediaFileTypeFromMime(file.type),
        mimeType: file.type,
        fileSizeBytes: BigInt(bytes.byteLength),
        checksum,
      },
    });

    try {
      await storage.put(`deliverables/${attachment.id}`, bytes, file.type);
    } catch (e) {
      await prisma.mediaAttachment.delete({ where: { id: attachment.id } });
      throw e;
    }

    submissionFileUrl = `/api/contract-files/${attachment.id}`;
    mediaAttachmentId = attachment.id;
    await prisma.mediaAttachment.update({
      where: { id: attachment.id },
      data: { fileUrl: submissionFileUrl },
    });
  }

  const nextVersion = (contract.submissions[0]?.version ?? 0) + 1;

  await prisma.$transaction([
    prisma.deliverableSubmission.create({
      data: {
        contractId: contract.id,
        version: nextVersion,
        fileUrl: submissionFileUrl,
        mediaAttachmentId,
        notes: notes || null,
        status: "PENDING_REVIEW",
      },
    }),
    prisma.contract.update({
      where: { id: contract.id },
      data: { status: "SUBMITTED_FOR_REVIEW" },
    }),
  ]);

  revalidateRoom(contract.id);
  const shippingNudge =
    contract.campaign.hasPhysicalProduct && !contract.shipping
      ? " שימו לב: טרם עדכנתם כתובת משלוח למוצר הפיזי."
      : "";
  return {
    status: "success",
    message: `גרסה v${nextVersion} הועלתה לבדיקת המפרסם.${shippingNudge}`,
  };
}

/**
 * אישור תוצר ושחרור התשלום ליוצר (מפרסם).
 * שכבה פיקטיבית: EscrowHold → RELEASED_TO_PROVIDER + רישום תנועות ESCROW_RELEASE / PLATFORM_FEE.
 */
export async function approveAndRelease(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const contractId = String(formData.get("contractId") ?? "");
  const owned = await loadOwnedContract(contractId);
  if (!owned) return { status: "error", message: "החוזה לא נמצא או אינו שייך לחשבון זה." };

  const { user, contract } = owned;
  const latest = contract.submissions[0];

  if (contract.status !== "SUBMITTED_FOR_REVIEW" || latest?.status !== "PENDING_REVIEW") {
    return { status: "error", message: "אין תוצר שממתין לאישור." };
  }

  const now = new Date();
  const agreed = Number(contract.agreedPriceILS);
  const fee = Number(contract.platformFeeILS);

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
    prisma.transaction.create({
      data: {
        userId: user.id,
        contractId: contract.id,
        type: "ESCROW_RELEASE",
        amountILS: new Prisma.Decimal(agreed),
        feeAmountILS: new Prisma.Decimal(0),
        status: "SUCCESS",
      },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        contractId: contract.id,
        type: "PLATFORM_FEE",
        amountILS: new Prisma.Decimal(fee),
        feeAmountILS: new Prisma.Decimal(0),
        status: "SUCCESS",
      },
    }),
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
            data: { submissionId: latest.id, authorId: user.id, feedbackText: note },
          }),
        ]
      : []),
  ]);

  revalidateRoom(contract.id);
  return { status: "success", message: "נשלחה בקשה לסבב תיקונים." };
}

/**
 * הוספת הערת בדיקה על תוצר, עם חותמת זמן אופציונלית בוידאו (מפרסם).
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

/** סימון הערה כטופלה / לא-טופלה (מפרסם). */
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

/**
 * עדכון פרטי משלוח למוצר פיזי (ספק בלבד, כשהקמפיין מסומן hasPhysicalProduct).
 * Upsert — היוצר יכול לתקן את הכתובת כל עוד החוזה פעיל.
 */
export async function updateContractShipping(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const contractId = String(formData.get("contractId") ?? "");
  const recipientName = String(formData.get("recipientName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const rawCityId = String(formData.get("cityId") ?? "").trim();

  const loaded = await loadContractParty(contractId);
  if (!loaded || loaded.party !== "provider") {
    return { status: "error", message: "רק היוצר בחוזה יכול לעדכן פרטי משלוח." };
  }
  const { contract } = loaded;

  if (!contract.campaign.hasPhysicalProduct) {
    return { status: "error", message: "לקמפיין זה אין מוצר פיזי לשליחה." };
  }
  if (recipientName.length < 2 || address.length < 5 || phone.length < 6) {
    return { status: "error", message: "יש למלא שם מקבל, טלפון וכתובת מלאה." };
  }

  let cityId: string | null = null;
  if (rawCityId) {
    const valid = await getValidCityIds();
    if (!valid.has(rawCityId)) {
      return { status: "error", message: "עיר לא תקינה." };
    }
    cityId = rawCityId;
  }

  const data = { recipientName, phone, address, cityId, notes: notes || null };
  await prisma.contractShipping.upsert({
    where: { contractId: contract.id },
    create: { contractId: contract.id, ...data },
    update: data,
  });

  revalidateRoom(contract.id);
  return { status: "success", message: "פרטי המשלוח נשמרו ונשלחו למפרסם." };
}

/** שליחת הודעה בצ'אט חדר העבודה — משני הצדדים. */
export async function sendRoomMessage(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const contractId = String(formData.get("contractId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { status: "error", message: "" };

  const loaded = await loadContractParty(contractId);
  if (!loaded) return { status: "error", message: "החוזה לא נמצא או אינו שייך לחשבון זה." };

  const { user, contract } = loaded;

  let conversationId = contract.conversations[0]?.id;
  if (!conversationId) {
    const participantIds = [...new Set([contract.business.userId, contract.providerId])];
    const created = await prisma.conversation.create({
      data: {
        contractId: contract.id,
        campaignId: contract.campaignId,
        participants: { create: participantIds.map((userId) => ({ userId })) },
      },
      select: { id: true },
    });
    conversationId = created.id;
  }

  await prisma.message.create({ data: { conversationId, senderId: user.id, body } });

  revalidateRoom(contract.id);
  return { status: "success" };
}
