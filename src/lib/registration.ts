import "server-only";
import { redirect } from "next/navigation";
import type { UserRole, UserStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { roleKeyFromUserRole, userRoleFromKey, sortRoleKeys, type RoleKey } from "@/lib/app-nav";

/** התפקידים שניתן לבחור בהרשמה (ADMIN לא נבחר עצמאית). */
export const REGISTRATION_ROLE_KEYS = ["brand", "creator", "space"] as const;
export type RegistrationRoleKey = (typeof REGISTRATION_ROLE_KEYS)[number];

export function isRegistrationRoleKey(value: unknown): value is RegistrationRoleKey {
  return typeof value === "string" && (REGISTRATION_ROLE_KEYS as readonly string[]).includes(value);
}

export const userRoleFromRegistrationKey = (key: RegistrationRoleKey): UserRole =>
  userRoleFromKey(key);

/** רשומת המשתמש כפי ששלבי ההרשמה צריכים אותה. */
export type RegistrationUser = {
  id: string;
  name: string | null;
  email: string | null;
  status: UserStatus;
  /** מפתחות התפקידים שכבר נשמרו (ממוינים), למשל אחרי שלב 2 */
  roleKeys: RegistrationRoleKey[];
};

/**
 * מאמת session לשלבי ההרשמה שאחרי יצירת החשבון (roles / profile / complete).
 * מרשה כל סטטוס שאינו חסום — משתמש PENDING_ONBOARDING הוא המצב הרגיל כאן.
 * אין session → /sign-in; חשבון חסום/מחוק → /sign-in?error=account.
 */
export async function requireRegistrationUser(): Promise<RegistrationUser> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/register/roles");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, status: true, roles: true, deletedAt: true },
  });

  if (!user || user.deletedAt || user.status === "SUSPENDED" || user.status === "BANNED") {
    redirect("/sign-in?error=account");
  }

  const roleKeys = sortRoleKeys(user.roles.map(roleKeyFromUserRole)).filter(isRegistrationRoleKey);

  return { id: user.id, name: user.name, email: user.email, status: user.status, roleKeys };
}

/** סדר קבוע לתפקידים (מפתחות) — לפי סדר העדיפות של app-nav. */
export const sortRegistrationRoleKeys = (keys: RegistrationRoleKey[]): RegistrationRoleKey[] =>
  sortRoleKeys(keys as RoleKey[]).filter(isRegistrationRoleKey);
