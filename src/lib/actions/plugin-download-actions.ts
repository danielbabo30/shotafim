"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import { PLUGIN_TERMS_VERSION } from "@/lib/plugin-terms";
import { readPluginVersion } from "@/lib/plugin-download-consent";

export type AcceptPluginTermsResult =
  { ok: true; downloadUrl: string } | { ok: false; message: string };

/** רושם אישור תקנון הורדה (ראיה משפטית). ההורדה עצמה נאכפת ב-/api/plugin-download. */
export async function acceptPluginTerms(accepted: boolean): Promise<AcceptPluginTermsResult> {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("brand")) {
    return { ok: false, message: "ההורדה זמינה למפרסמים בלבד." };
  }
  if (accepted !== true) {
    return { ok: false, message: "יש לאשר את התקנון כדי להמשיך." };
  }

  const [business, dbUser, pluginVersion, h] = await Promise.all([
    prisma.businessProfile.findUnique({ where: { userId: user.id }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true } }),
    readPluginVersion(),
    headers(),
  ]);

  // x-forwarded-for ניתן לזיוף ע"י הלקוח אם אין פרוקסי מהימן לפני האפליקציה (ב-Vercel הוא מוגדר
  // ע"י הפלטפורמה). זה ערך תיעודי בלבד — לא משמש להרשאה. אותו דפוס כמו ב-LegalConsent.
  const ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = h.get("user-agent")?.slice(0, 512) || null;

  await prisma.pluginDownloadConsent.create({
    data: {
      userId: user.id,
      businessId: business?.id ?? null,
      userName: dbUser?.name ?? null,
      userEmail: dbUser?.email ?? null,
      termsVersion: PLUGIN_TERMS_VERSION,
      pluginVersion: pluginVersion || null,
      ipAddress,
      userAgent,
    },
  });

  revalidatePath("/dashboard/settings");
  return { ok: true, downloadUrl: "/api/plugin-download" };
}
