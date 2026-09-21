"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import { sentimentFromRating, type ReviewFormState } from "@/lib/review-form";

/** מאתר חוזה שהמשתמש צד בו ושהושלם; מחזיר את מזהה הצד השני (target) */
async function loadReviewableContract(contractId: string, userId: string) {
  const contract = await prisma.contract.findFirst({
    where: {
      id: contractId,
      completedAt: { not: null },
      OR: [{ business: { userId } }, { providerId: userId }],
    },
    select: { id: true, providerId: true, business: { select: { userId: true } } },
  });
  if (!contract) return null;
  const targetId = contract.providerId === userId ? contract.business.userId : contract.providerId;
  return { contract, targetId };
}

const subRating = (formData: FormData, name: string): number | null => {
  const n = Number(formData.get(name));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
};

/** הגשת ביקורת על הצד השני בחוזה שהושלם */
export async function submitReview(
  _prev: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const user = await requireActiveUser();
  const contractId = String(formData.get("contractId") ?? "");
  const rating = Number(formData.get("rating"));
  const feedbackText = String(formData.get("feedbackText") ?? "").trim();
  const isPublic = formData.get("isPublic") === "on";

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "בחרו דירוג בין כוכב אחד לחמישה." };
  }
  if (feedbackText.length < 3) {
    return { error: "כתבו חוות דעת קצרה (לפחות כמה מילים)." };
  }

  const loaded = await loadReviewableContract(contractId, user.id);
  if (!loaded) return { error: "החוזה לא נמצא או שטרם הושלם." };

  try {
    await prisma.review.create({
      data: {
        contractId,
        authorId: user.id,
        targetId: loaded.targetId,
        rating,
        feedbackText,
        isPublic,
        sentiment: sentimentFromRating(rating),
        punctualityRating: subRating(formData, "punctualityRating"),
        communicationRating: subRating(formData, "communicationRating"),
        paymentRating: subRating(formData, "paymentRating"),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "כבר השארת ביקורת על החוזה הזה." };
    }
    throw e;
  }

  revalidatePath("/", "layout");
  revalidatePath(`/dashboard/contracts/${contractId}`);
  return { ok: true };
}

/** "דלג" על המודאל — המודאל יחזור 3 ימים אחרי, עד cap של 3 דחיות */
export async function dismissReviewPrompt(formData: FormData): Promise<void> {
  const user = await requireActiveUser();
  const contractId = String(formData.get("contractId") ?? "");

  const contract = await prisma.contract.findFirst({
    where: {
      id: contractId,
      OR: [{ business: { userId: user.id } }, { providerId: user.id }],
    },
    select: { id: true },
  });
  if (!contract) return;

  await prisma.reviewPrompt.upsert({
    where: { contractId_userId: { contractId, userId: user.id } },
    create: { contractId, userId: user.id, dismissedAt: new Date(), dismissCount: 1 },
    update: { dismissedAt: new Date(), dismissCount: { increment: 1 } },
  });

  revalidatePath("/", "layout");
}
