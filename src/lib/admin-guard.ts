import "server-only";
import { redirect } from "next/navigation";
import { requireActiveUser, type AppUser } from "@/lib/app-user";

/**
 * דורש שלמשתמש המחובר יהיה כובע ADMIN (ב-roleKeys). מפנה ל-/dashboard אם אין הרשאה.
 * דפוס requireActiveUser — לשימוש ב-Server Components / server actions של אזור הניהול.
 */
export async function requireAdmin(): Promise<AppUser> {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("admin")) {
    redirect("/dashboard");
  }
  return user;
}
