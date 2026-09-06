"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";

export type SendMessageResult = { status: "ok" } | { status: "error"; message: string };

/**
 * שליחת הודעה בשיחה. ה-UI מעדכן אופטימית בצד הלקוח; כאן נכתבת ההודעה בפועל
 * ל-DB בתוך טרנזקציה, אחרי בדיקת השתתפות בשיחה.
 *
 * ⚠️ אין NotificationType מתאים ל"הודעה חדשה" בסכימה הנוכחית (רק ESCROW_LOCKED /
 * SUBMISSION_RECEIVED / REVISION_NEEDED / PAYMENT_RELEASED / התראות שותפות) —
 * לכן לא נוצרת Notification כאן. אם רוצים "פעמון" להודעות יש להוסיף ל-enum
 * NotificationType מיגרציה ייעודית (למשל MESSAGE_RECEIVED).
 */
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<SendMessageResult> {
  const user = await requireActiveUser();

  const text = body.trim();
  if (!text) return { status: "error", message: "הודעה ריקה." };
  if (!conversationId) return { status: "error", message: "שיחה לא נמצאה." };

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    select: { conversationId: true },
  });
  if (!participant) {
    return { status: "error", message: "אין הרשאה לשלוח הודעה בשיחה זו." };
  }

  await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId: user.id, body: text },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  revalidatePath("/dashboard/messages");
  return { status: "ok" };
}

/**
 * פותח (או מאתר) שיחה ישירה — בלי הקשר קמפיין/חוזה — בין המשתמש המחובר
 * לבין בעל עסק פעיל, מעמוד העסק באזור האישי (`/dashboard/businesses/[businessId]`).
 * זמין לכל תפקיד מחובר. מפנה לרשימת ההודעות עם השיחה שנוצרה/נמצאה נבחרת.
 */
export async function startBusinessConversation(businessUserId: string): Promise<never> {
  const user = await requireActiveUser();

  if (!businessUserId || businessUserId === user.id) {
    throw new Error("לא ניתן לפתוח שיחה עם משתמש זה.");
  }

  const business = await prisma.businessProfile.findFirst({
    where: { userId: businessUserId, status: "ACTIVE", deletedAt: null },
    select: { userId: true },
  });
  if (!business) {
    throw new Error("העסק לא נמצא או אינו פעיל.");
  }

  const candidates = await prisma.conversation.findMany({
    where: {
      campaignId: null,
      contractId: null,
      AND: [
        { participants: { some: { userId: user.id } } },
        { participants: { some: { userId: businessUserId } } },
      ],
    },
    select: { id: true, participants: { select: { userId: true } } },
  });
  // "שיחה בדיוק בין השניים" — לא קבוצתית — ולכן בודקים מספר משתתפים בקוד.
  const existingId = candidates.find((c) => c.participants.length === 2)?.id ?? null;

  const conversationId =
    existingId ??
    (await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: { campaignId: null, contractId: null },
        select: { id: true },
      });
      await tx.conversationParticipant.createMany({
        data: [
          { conversationId: conversation.id, userId: user.id },
          { conversationId: conversation.id, userId: businessUserId },
        ],
      });
      return conversation.id;
    }));

  revalidatePath("/dashboard/messages");
  redirect(`/dashboard/messages?conversation=${conversationId}`);
}
