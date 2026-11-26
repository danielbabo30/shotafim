"use server";

import { revalidatePath } from "next/cache";
import { isRateLimited } from "@/lib/rate-limit";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";
import { withActionError } from "@/lib/action-errors";

const MAX_MESSAGE_LENGTH = 4000;

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
  if (text.length > MAX_MESSAGE_LENGTH) {
    return { status: "error", message: `ההודעה ארוכה מדי (עד ${MAX_MESSAGE_LENGTH} תווים).` };
  }
  if (!conversationId) return { status: "error", message: "שיחה לא נמצאה." };

  // SEC-A-03: הגבלת קצב הודעות לפי משתמש
  if (await isRateLimited("message:send", 40, 60, user.id)) {
    return { status: "error", message: "שולחים הודעות מהר מדי. נסו שוב בעוד רגע." };
  }

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

  // SEC-A-03: מניעת ספאם של פתיחת שיחות
  if (await isRateLimited("conversation:start", 20, 3600, user.id)) {
    redirect(withActionError("/dashboard/businesses", "conversation-invalid"));
  }

  if (!businessUserId || businessUserId === user.id) {
    redirect(withActionError("/dashboard/businesses", "conversation-invalid"));
  }

  const business = await prisma.businessProfile.findFirst({
    where: { userId: businessUserId, status: "ACTIVE", deletedAt: null },
    select: { userId: true },
  });
  if (!business) {
    redirect(withActionError("/dashboard/businesses", "business-not-found"));
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

/**
 * מסמן כנקראו את ההודעות הנכנסות בשיחה (readAt) — נקרא כשהמשתמש פותח שיחה.
 * מסונן לשיחות שהמשתמש משתתף בהן; הודעות שנשלחו על-ידיו לא מושפעות.
 */
export async function markConversationRead(conversationId: string): Promise<void> {
  const user = await requireActiveUser();
  if (!conversationId) return;

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    select: { conversationId: true },
  });
  if (!participant) return;

  const { count } = await prisma.message.updateMany({
    where: { conversationId, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });
  if (count > 0) revalidatePath("/dashboard/messages");
}
