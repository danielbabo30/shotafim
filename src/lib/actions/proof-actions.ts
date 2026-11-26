"use server";

import { revalidatePath } from "next/cache";
import { isRateLimited } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import type { ContractActionState } from "@/lib/contract-room";

const PROOF_TYPES = ["PHOTO_PROOF", "SYSTEM_LOG", "ANALYTICS_EXPORT"] as const;

const revalidateProofs = (contractId: string) => {
  revalidatePath(`/dashboard/contracts/${contractId}`);
  revalidatePath("/dashboard");
};

/**
 * הוספת הוכחת שידור לחוזה שטח פרסום (בעל השטח בלבד, חוזה פעיל).
 * כותב ProofOfPlay ל-DB. אינו משנה סטטוס חוזה / נאמנות — שחרור התשלום נשאר בשכבת הכספים.
 */
export async function submitProofOfPlay(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const user = await requireActiveUser();
  const contractId = String(formData.get("contractId") ?? "");
  const fileUrl = String(formData.get("fileUrl") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const proofType = String(formData.get("proofType") ?? "PHOTO_PROOF");

  if (await isRateLimited("proof:submit", 30, 600, user.id)) {
    return { status: "error", message: "יותר מדי שליחות בזמן קצר. נסו שוב בעוד מספר דקות." };
  }

  if (!(PROOF_TYPES as readonly string[]).includes(proofType)) {
    return { status: "error", message: "סוג הוכחה לא תקין." };
  }
  if (!/^https?:\/\/.+/i.test(fileUrl) || fileUrl.length > 500) {
    return { status: "error", message: "הזינו קישור תקין להוכחה (מתחיל ב-http)." };
  }
  if (notes.length > 1000) {
    return { status: "error", message: "ההערה ארוכה מדי (עד 1,000 תווים)." };
  }

  const contract = await prisma.contract.findFirst({
    where: { id: contractId, providerId: user.id, adSpaceAssetId: { not: null } },
    select: { id: true, status: true },
  });
  if (!contract) return { status: "error", message: "החוזה לא נמצא או אינו שייך לחשבון זה." };
  if (contract.status !== "ACTIVE" && contract.status !== "SUBMITTED_FOR_REVIEW") {
    return { status: "error", message: "אפשר להוסיף הוכחה רק לחוזה פעיל." };
  }

  await prisma.proofOfPlay.create({
    data: {
      contractId: contract.id,
      proofType: proofType as (typeof PROOF_TYPES)[number],
      fileUrl,
      notes: notes || null,
    },
  });

  revalidateProofs(contract.id);
  return { status: "success", message: "ההוכחה נשלחה לאישור המפרסם." };
}

/** אישור הוכחת שידור בידי המפרסם (verifiedByBrand). לא משחרר כסף. */
export async function verifyProofOfPlay(formData: FormData): Promise<void> {
  const user = await requireActiveUser();
  const proofId = String(formData.get("proofId") ?? "");
  if (!proofId) return;

  const proof = await prisma.proofOfPlay.findFirst({
    where: { id: proofId, contract: { business: { userId: user.id } } },
    select: { id: true, contractId: true, verifiedByBrand: true },
  });
  if (!proof || proof.verifiedByBrand) return;

  await prisma.proofOfPlay.update({ where: { id: proof.id }, data: { verifiedByBrand: true } });
  revalidateProofs(proof.contractId);
}
