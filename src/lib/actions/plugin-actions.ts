"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import { pairingToken } from "@/lib/plugin-connection";
import { generateApiKey, sha256Hex, encryptApiKey } from "@/lib/track/crypto";
import type { PluginActionState } from "@/lib/plugin-form";

/**
 * פעולות חיבור חנות WooCommerce (WP-4). כתיבה אמיתית ל-`TrackedSite`.
 * הסוד מוחזר פעם אחת ב-state (`status: "key"`) ואינו נשמר בשום מקום כטקסט.
 * טיפוס ה-state + הערך ההתחלתי: src/lib/plugin-form.ts (קובץ "use server" מייצא רק פונקציות async).
 */

const siteUrlSchema = z
  .string()
  .trim()
  .min(1, "יש להזין את כתובת החנות")
  .transform((v) => v.replace(/\/+$/, ""))
  .refine(
    (v) => /^https?:\/\/[^\s/]+\.[^\s/]+/.test(v),
    "כתובת חנות לא תקינה — לדוגמה https://mystore.co.il",
  );

async function brandBusiness() {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("brand")) return null;
  const business = await prisma.businessProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return business ? { userId: user.id, businessId: business.id } : null;
}

export async function connectStore(
  _prev: PluginActionState,
  formData: FormData,
): Promise<PluginActionState> {
  const ctx = await brandBusiness();
  if (!ctx) {
    return { status: "error", message: "רק חשבון מפרסם עם פרופיל עסקי יכול לחבר חנות." };
  }

  const parsed = siteUrlSchema.safeParse(formData.get("siteUrl") ?? "");
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "כתובת לא תקינה." };
  }
  const siteUrl = parsed.data;

  const apiKey = generateApiKey();
  let apiKeyEnc: string;
  try {
    apiKeyEnc = encryptApiKey(apiKey);
  } catch {
    return {
      status: "error",
      message: "הצפנת מפתחות אינה מוגדרת בשרת (TRACK_KEY_SECRET). פנה לתמיכה.",
    };
  }
  const site = await prisma.trackedSite.upsert({
    where: { businessId_siteUrl: { businessId: ctx.businessId, siteUrl } },
    create: {
      businessId: ctx.businessId,
      siteUrl,
      apiKeyHash: sha256Hex(apiKey),
      apiKeyEnc,
      status: "ACTIVE",
    },
    update: { apiKeyHash: sha256Hex(apiKey), apiKeyEnc, status: "ACTIVE" },
    select: { id: true },
  });

  revalidatePath("/dashboard/plugin");
  return { status: "key", siteUrl, token: pairingToken(site.id, apiKey) };
}

export async function rotateStoreKey(
  _prev: PluginActionState,
  formData: FormData,
): Promise<PluginActionState> {
  const ctx = await brandBusiness();
  if (!ctx) return { status: "error", message: "אין הרשאה." };

  const siteId = String(formData.get("siteId") ?? "");
  const site = await prisma.trackedSite.findFirst({
    where: { id: siteId, businessId: ctx.businessId },
    select: { id: true, siteUrl: true },
  });
  if (!site) return { status: "error", message: "החנות לא נמצאה." };

  const apiKey = generateApiKey();
  let apiKeyEnc: string;
  try {
    apiKeyEnc = encryptApiKey(apiKey);
  } catch {
    return {
      status: "error",
      message: "הצפנת מפתחות אינה מוגדרת בשרת (TRACK_KEY_SECRET). פנה לתמיכה.",
    };
  }
  await prisma.trackedSite.update({
    where: { id: siteId },
    data: { apiKeyHash: sha256Hex(apiKey), apiKeyEnc, status: "ACTIVE" },
  });

  revalidatePath("/dashboard/plugin");
  return { status: "key", siteUrl: site.siteUrl, token: pairingToken(site.id, apiKey) };
}

/** ניתוק חנות — סימון DEACTIVATED (לא מחיקה — שומר על ההזמנות המשויכות ההיסטוריות). */
export async function disconnectStore(formData: FormData): Promise<void> {
  const ctx = await brandBusiness();
  if (!ctx) return;

  const siteId = String(formData.get("siteId") ?? "");
  await prisma.trackedSite.updateMany({
    where: { id: siteId, businessId: ctx.businessId },
    data: { status: "DEACTIVATED" },
  });

  revalidatePath("/dashboard/plugin");
}
