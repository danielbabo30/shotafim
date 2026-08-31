"use server";

import { revalidatePath } from "next/cache";
import { requireActiveUser } from "@/lib/app-user";

export type SendMessageResult = { status: "ok" } | { status: "error"; message: string };

/**
 * שליחת הודעה בשיחה.
 *
 * ⚠️ STUB — ה-UI מעדכן אופטימית בצד הלקוח. כאן מבססים את ה-round-trip ואת האימות;
 * ההתמדה ל-DB נכנסת יחד עם חיווט ה-Prisma של getMessagesData (src/lib/messages.ts).
 */
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<SendMessageResult> {
  const user = await requireActiveUser();

  const text = body.trim();
  if (!text) return { status: "error", message: "הודעה ריקה." };
  if (!conversationId) return { status: "error", message: "שיחה לא נמצאה." };

  // TODO: לוודא שהמשתמש משתתף בשיחה, ואז:
  //   await prisma.message.create({ data: { conversationId, senderId: user.id, body: text } });
  //   await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  void user;

  revalidatePath("/dashboard/messages");
  return { status: "ok" };
}
