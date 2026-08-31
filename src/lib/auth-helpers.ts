import { redirect } from "next/navigation";
import { auth } from "@/auth";
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
