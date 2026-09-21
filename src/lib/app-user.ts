import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { UserStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ROLE_META,
  resolveActiveRole,
  roleKeyFromUserRole,
  sortRoleKeys,
  type RoleKey,
} from "@/lib/app-nav";

/** המשתמש המחובר כפי שהמעטפת צריכה אותו — נורמליזציה של רשומת ה-DB */
export type AppUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  status: UserStatus;
  /** מפתחות התפקידים של המשתמש, ממוינים לפי סדר עדיפות קבוע */
  roleKeys: RoleKey[];
  /** התפקיד הפעיל האפקטיבי (תמיד תקף כשיש לפחות תפקיד אחד) */
  activeRole: RoleKey;
};

/**
 * מאמת את המשתמש מול ה-DB ומחזיר אותו מנורמל — לשימוש ב-layout של האזור המוגן.
 * שער ה-onboarding: כל עוד המשתמש לא ACTIVE (או בלי תפקיד / בלי אישור תנאים) —
 * מפנים לשלב ההרשמה המתאים (/register/roles) ולא מציגים את המעטפת.
 */
export const requireActiveUser = cache(async (): Promise<AppUser> => {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/dashboard");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      status: true,
      roles: true,
      activeRole: true,
      termsAcceptedAt: true,
      deletedAt: true,
    },
  });

  if (!dbUser || dbUser.deletedAt) {
    redirect("/sign-in?error=account");
  }

  if (dbUser.status === "SUSPENDED" || dbUser.status === "BANNED") {
    redirect("/sign-in?error=account");
  }

  const roleKeys = sortRoleKeys(dbUser.roles.map(roleKeyFromUserRole));
  const onboardingDone =
    dbUser.status === "ACTIVE" && roleKeys.length > 0 && dbUser.termsAcceptedAt != null;

  if (!onboardingDone) {
    redirect("/register/roles");
  }

  const activeRole = resolveActiveRole(roleKeys, dbUser.activeRole);
  if (!activeRole) {
    redirect("/register/roles");
  }

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    image: dbUser.image,
    status: dbUser.status,
    roleKeys,
    activeRole,
  };
});

/** תווית התפקיד הפעיל להצגה (למשל "מצב מפרסם") */
export const activeRoleLabel = (user: AppUser): string => ROLE_META[user.activeRole].label;
