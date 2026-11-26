"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";

/** מסמן את כל ההתראות הלא-נקראות של המשתמש כנקראו */
export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireActiveUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/dashboard/notifications");
}
