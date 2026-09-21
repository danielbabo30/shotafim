"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_META, userRoleFromKey, roleKeyFromUserRole, type RoleKey } from "@/lib/app-nav";

const ROLE_KEYS = Object.keys(ROLE_META) as RoleKey[];

const isRoleKey = (value: unknown): value is RoleKey =>
  typeof value === "string" && ROLE_KEYS.includes(value as RoleKey);

/** החלפת התפקיד ("כובע") הפעיל שה-UI מציג. מאמת שהתפקיד באמת שייך למשתמש. */
export async function setActiveRole(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const key = formData.get("role");
  if (!isRoleKey(key)) throw new Error("Invalid role");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { roles: true },
  });
  const ownedKeys = (dbUser?.roles ?? []).map(roleKeyFromUserRole);
  if (!ownedKeys.includes(key)) throw new Error("Role not owned by user");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { activeRole: userRoleFromKey(key) },
  });

  revalidatePath("/", "layout");
}

/** יציאה מהחשבון */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
