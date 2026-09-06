"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import type { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import { getValidCityIds } from "@/lib/cities";
import { getPartnerCategoriesForScope } from "@/lib/partner-categories-query";
import {
  adSpaceAssetSchema,
  type AdSpaceAssetFormState,
  type AdSpaceAssetInput,
} from "@/lib/ad-space-asset-form";

/**
 * פעולות כתיבה לנכסי מדיה של בעל שטחים — יצירה, עריכה, הפעלה/השבתה.
 * כתיבה אמיתית ל-DB (ראה CLAUDE.md §"האזור האישי"): prisma.adSpaceAsset.create/update
 * בטרנזקציה עם AdSpaceAssetCategory. כל פעולה מאמתת שהמשתמש הוא בעל שטחים עם פרופיל,
 * ובעריכה — שהנכס שייך לו.
 */

type OwnerContext = { userId: string; ownerId: string };

async function resolveOwner(): Promise<OwnerContext | null> {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("space")) return null;
  const owner = await prisma.adSpaceOwnerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return owner ? { userId: user.id, ownerId: owner.id } : null;
}

function readForm(formData: FormData) {
  return {
    title: formData.get("title") ?? "",
    type: formData.get("type") ?? "",
    description: formData.get("description") ?? "",
    cityId: formData.get("cityId") ?? "",
    address: formData.get("address") ?? "",
    dimensions: formData.get("dimensions") ?? "",
    resolution: formData.get("resolution") ?? "",
    spotLengthSeconds: formData.get("spotLengthSeconds") ?? "",
    estimatedReach: formData.get("estimatedReach") ?? "",
    pricingModel: formData.get("pricingModel") ?? "",
    basePriceILS: formData.get("basePriceILS") ?? "",
    proofRequirement: formData.get("proofRequirement") ?? "",
    images: formData
      .getAll("images")
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean),
    categories: formData.getAll("categories").map(String).filter(Boolean),
  };
}

function fieldErrorsFrom(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    out[key] ??= issue.message;
  }
  return out;
}

/** בונה את גוף הכתיבה ל-DB מתוך הקלט המאומת (בלי הקשרים) */
function toAssetData(d: AdSpaceAssetInput) {
  const specs: Record<string, string | number> = {};
  if (d.resolution) specs.resolution = d.resolution;
  if (d.spotLengthSeconds != null) specs.spotLengthSeconds = d.spotLengthSeconds;

  return {
    title: d.title,
    type: d.type,
    description: d.description,
    cityId: d.cityId,
    address: d.address,
    dimensions: d.dimensions,
    technicalSpecs:
      Object.keys(specs).length > 0 ? (specs as Prisma.InputJsonValue) : Prisma.DbNull,
    estimatedReach: d.estimatedReach,
    pricingModel: d.pricingModel,
    basePriceILS: new Prisma.Decimal(d.basePriceILS),
    proofRequirement: d.proofRequirement,
    images: d.images,
  };
}

/** ולידציה משותפת: סכמה + עיר קיימת + קטגוריות ב-scope AD_SPACE */
async function validate(
  formData: FormData,
): Promise<{ ok: true; data: AdSpaceAssetInput } | { ok: false; state: AdSpaceAssetFormState }> {
  const parsed = adSpaceAssetSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "יש לתקן את השדות המסומנים.",
        fieldErrors: fieldErrorsFrom(parsed.error),
      },
    };
  }
  const data = parsed.data;

  if (data.cityId) {
    const validCities = await getValidCityIds();
    if (!validCities.has(data.cityId)) {
      return {
        ok: false,
        state: {
          status: "error",
          message: "עיר לא תקינה.",
          fieldErrors: { cityId: "עיר לא תקינה" },
        },
      };
    }
  }

  if (data.categories.length > 0) {
    const allowed = new Set((await getPartnerCategoriesForScope("AD_SPACE")).map((c) => c.slug));
    data.categories = data.categories.filter((slug) => allowed.has(slug));
  }

  return { ok: true, data };
}

export async function createAdSpaceAsset(
  _prev: AdSpaceAssetFormState,
  formData: FormData,
): Promise<AdSpaceAssetFormState> {
  const owner = await resolveOwner();
  if (!owner) {
    return {
      status: "error",
      message: "רק חשבון בעל שטחים עם פרופיל מוגדר יכול להוסיף נכס מדיה.",
    };
  }

  const result = await validate(formData);
  if (!result.ok) return result.state;
  const data = result.data;

  await prisma.adSpaceAsset.create({
    data: {
      ownerId: owner.ownerId,
      ...toAssetData(data),
      categories: { create: data.categories.map((categorySlug) => ({ categorySlug })) },
    },
  });

  revalidatePath("/dashboard/assets");
  revalidatePath("/dashboard/bookings");
  redirect("/dashboard/assets?created=1");
}

export async function updateAdSpaceAsset(
  assetId: string,
  _prev: AdSpaceAssetFormState,
  formData: FormData,
): Promise<AdSpaceAssetFormState> {
  const owner = await resolveOwner();
  if (!owner) {
    return { status: "error", message: "רק חשבון בעל שטחים יכול לערוך נכס מדיה." };
  }

  const existing = await prisma.adSpaceAsset.findFirst({
    where: { id: assetId, owner: { userId: owner.userId }, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return { status: "error", message: "הנכס לא נמצא או שאינו שייך לחשבון שלך." };
  }

  const result = await validate(formData);
  if (!result.ok) return result.state;
  const data = result.data;

  await prisma.$transaction([
    prisma.adSpaceAssetCategory.deleteMany({ where: { adSpaceAssetId: assetId } }),
    prisma.adSpaceAsset.update({
      where: { id: assetId },
      data: {
        ...toAssetData(data),
        categories: { create: data.categories.map((categorySlug) => ({ categorySlug })) },
      },
    }),
  ]);

  revalidatePath("/dashboard/assets");
  revalidatePath(`/dashboard/assets/${assetId}/edit`);
  revalidatePath("/dashboard/bookings");
  redirect("/dashboard/assets?updated=1");
}

/** הפעלה / השבתה של נכס — action של <form> (assetId ו-active מגיעים כשדות נסתרים) */
export async function toggleAdSpaceActive(formData: FormData): Promise<void> {
  const owner = await resolveOwner();
  if (!owner) return;

  const assetId = String(formData.get("assetId") ?? "");
  const nextActive = String(formData.get("active") ?? "") === "true";
  if (!assetId) return;

  const existing = await prisma.adSpaceAsset.findFirst({
    where: { id: assetId, owner: { userId: owner.userId }, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return;

  await prisma.adSpaceAsset.update({
    where: { id: assetId },
    data: { isActive: nextActive },
  });

  revalidatePath("/dashboard/assets");
  revalidatePath("/dashboard/bookings");
  // redirect לאותו עמוד — מבטיח רינדור מחדש של המצב (form action בלי redirect לא תמיד מרענן)
  redirect(`/dashboard/assets/${assetId}/edit`);
}

/**
 * ארכוב/מחיקת נכס פרסום — soft-delete דרך deletedAt (הנכס נעלם מהקטלוג ומהניהול).
 * חסום אם יש שריונים פעילים/עתידיים (RESERVED / CONFIRMED שטרם הסתיימו) — כדי לא לשבור חוזים.
 */
export async function deleteAdSpaceAsset(formData: FormData): Promise<void> {
  const owner = await resolveOwner();
  if (!owner) return;

  const assetId = String(formData.get("assetId") ?? "");
  if (!assetId) return;

  const existing = await prisma.adSpaceAsset.findFirst({
    where: { id: assetId, owner: { userId: owner.userId }, deletedAt: null },
    select: {
      id: true,
      _count: {
        select: {
          bookings: {
            where: {
              status: { in: ["RESERVED", "CONFIRMED", "BROADCASTING"] },
              endDate: { gte: new Date() },
            },
          },
        },
      },
    },
  });
  if (!existing) return;

  if (existing._count.bookings > 0) {
    // יש שריון פעיל — לא מוחקים, רק מסתירים מהקטלוג
    await prisma.adSpaceAsset.update({ where: { id: assetId }, data: { isActive: false } });
    revalidatePath("/dashboard/assets");
    redirect(`/dashboard/assets/${assetId}/edit?blocked=bookings`);
  }

  await prisma.adSpaceAsset.update({
    where: { id: assetId },
    data: { deletedAt: new Date(), isActive: false },
  });

  revalidatePath("/dashboard/assets");
  revalidatePath("/dashboard/bookings");
  redirect("/dashboard/assets");
}
