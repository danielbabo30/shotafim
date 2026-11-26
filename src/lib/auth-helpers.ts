import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

/**
 * מחזיר את המשתמש המחובר, או מפנה ל-sign-in אם אין.
 * לשימוש ב-Server Components / layouts של האזור המוגן.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }
  return session.user;
}

/** דורש שלמשתמש יהיה תפקיד מסוים (למשל ADMIN). מפנה ל-dashboard אם אין הרשאה. */
export async function requireRole(role: UserRole) {
  const user = await requireUser();
  if (!user.roles.includes(role)) {
    redirect("/dashboard");
  }
  return user;
}

/**
 * עבור route handlers / server actions שלא עוברים דרך `requireActiveUser()`:
 * מחזיר את מזהה המשתמש המחובר רק אם החשבון עדיין תקף ב-DB
 * (לא נמחק, לא SUSPENDED ולא BANNED). אחרת null. (SEC-A-08)
 */
export async function getActiveSessionUserId(): Promise<string | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { status: true, deletedAt: true },
  });
  if (!user || user.deletedAt || user.status === "SUSPENDED" || user.status === "BANNED") {
    return null;
  }
  return id;
}
