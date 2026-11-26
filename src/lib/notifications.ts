import "server-only";
import { cache } from "react";
import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";

/** התראות של המשתמש המחובר — קריאה מ-DB (טבלת Notification) */
export type NotificationVM = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: Date;
};

export const getMyNotifications = cache(async (): Promise<NotificationVM[]> => {
  const user = await requireActiveUser();
  return prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      message: true,
      type: true,
      actionUrl: true,
      isRead: true,
      createdAt: true,
    },
  });
});
