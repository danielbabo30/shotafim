"use server";

import { randomUUID } from "node:crypto";
import { isRateLimited } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { SocialPlatform, DeliverableType } from "@prisma/client";
import { z, type ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { requireActiveUser } from "@/lib/app-user";
import { bytesMatchMime } from "@/lib/deliverable-upload";
import { decryptOAuthToken } from "@/lib/oauth-crypto";
import { getValidCityIds } from "@/lib/cities";
import { getPartnerCategoriesForScope } from "@/lib/partner-categories-query";
import type { SettingsFormState } from "@/lib/actions/settings-form-state";
import {
  MAX_PROFILE_IMAGE_BYTES,
  MAX_PROFILE_IMAGE_MB,
  PROFILE_IMAGE_MIME,
  PROFILE_IMAGE_URL_PREFIX,
  isAllowedProfileImageMime,
} from "@/lib/profile-image-upload";

/**
 * פעולות כתיבה למסך ההגדרות (/dashboard/settings) — כל פעולה מתחילה ב-requireActiveUser(),
 * בודקת בעלות על הרשומה (userId/creatorId שייך למשתמש המחובר) לפני כל כתיבה,
 * וכותבת בפועל ל-DB (ראה CLAUDE.md §"האזור האישי"). אין mock, אין stub.
 *
 * SettingsFormState/SETTINGS_FORM_INITIAL עברו ל-settings-form-state.ts: קובץ
 * "use server" מותר לו לייצא רק async functions, לא קבועים.
 */

// הודעות ברירת-מחדל של zod בעברית (במקום "Too big…" / "Invalid input…")
z.config(z.locales.he());

const REVALIDATE_PATH = "/dashboard/settings";

/** ערך שדה מ-FormData כמחרוזת — שדה חסר (null) הופך ל-"" ולא ל"expected string, received null" */
function fv(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

/** טלפון: ספרות, רווחים, +, -, סוגריים בלבד; 7–20 תווים */
const phoneNumber = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s()]{7,20}$/, "מספר טלפון לא תקין");

/** כתובת http(s) בלבד (חוסם javascript: וסכמות אחרות) */
const httpUrl = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "הכתובת ארוכה מדי")
    .refine(
      (v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v),
      "הכתובת חייבת להתחיל ב-http:// או https://",
    )
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

function fieldErrorsFrom(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    out[key] ??= issue.message;
  }
  return out;
}

/** SEC-A-14: הודעה אחידה — לא חושפת איזה נתון כבר קיים במערכת. */
const DUPLICATE_MESSAGE = "לא ניתן לשמור את הפרט הזה. אם הוא שלך — פנו לתמיכה.";

const bankSchema = z.object({
  bank: z.string().trim().max(120).optional().default(""),
  branch: z
    .string()
    .trim()
    .regex(/^(\d{1,4})?$/, "מספר סניף: 1–4 ספרות")
    .optional()
    .default(""),
  account: z
    .string()
    .trim()
    .regex(/^([\d-]{4,20})?$/, "מספר חשבון: 4–20 ספרות")
    .optional()
    .default(""),
  accountHolder: z.string().trim().max(120).optional().default(""),
});

function bankToJson(
  bank: z.infer<typeof bankSchema>,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  const hasAny = bank.bank || bank.branch || bank.account || bank.accountHolder;
  return hasAny ? bank : Prisma.DbNull;
}

/* ─────────────────────────── חשבון (User) ─────────────────────────── */

const accountSchema = z.object({
  name: z.string().trim().min(1, "שם הוא שדה חובה").max(120),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[0-9+\-\s()]{7,20}$/.test(v), "מספר טלפון לא תקין")
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export async function updateAccountSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireActiveUser();

  const parsed = accountSchema.safeParse({
    name: fv(formData, "name"),
    phone: fv(formData, "phone"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "יש לתקן את השדות המסומנים.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name, phone: parsed.data.phone },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { status: "error", message: DUPLICATE_MESSAGE };
    }
    throw e;
  }

  revalidatePath(REVALIDATE_PATH);
  return { status: "success", message: "פרטי החשבון עודכנו." };
}

/* ─────────────────────────── מותג (BusinessProfile) ─────────────────────────── */

const brandSchema = z.object({
  name: z.string().trim().min(1, "שם המותג הוא שדה חובה").max(160),
  description: z.string().trim().min(1, "תיאור הוא שדה חובה").max(2000, "התיאור ארוך מדי"),
  websiteUrl: httpUrl(300),
  logoUrl: httpUrl(500),
  contactName: z.string().trim().min(1, "שם איש קשר הוא שדה חובה").max(120),
  contactPhone: phoneNumber,
  billingEmail: z.string().trim().email("אימייל לא תקין"),
  billingAddress: z.string().trim().min(1, "כתובת לחיוב היא שדה חובה").max(300),
  instagram: z.string().trim().max(80).optional().default(""),
  tiktok: z.string().trim().max(80).optional().default(""),
  facebook: z.string().trim().max(80).optional().default(""),
  categories: z.array(z.string().trim().min(1)).default([]),
});

export async function updateBrandSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("brand")) {
    return { status: "error", message: "רק חשבון מותג יכול לערוך פרטים אלה." };
  }

  const business = await prisma.businessProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!business) {
    return { status: "error", message: "לא נמצא פרופיל מותג לחשבון שלך." };
  }

  const parsed = brandSchema.safeParse({
    name: fv(formData, "name"),
    description: fv(formData, "description"),
    websiteUrl: fv(formData, "websiteUrl"),
    logoUrl: fv(formData, "logoUrl"),
    contactName: fv(formData, "contactName"),
    contactPhone: fv(formData, "contactPhone"),
    billingEmail: fv(formData, "billingEmail"),
    billingAddress: fv(formData, "billingAddress"),
    instagram: fv(formData, "instagram"),
    tiktok: fv(formData, "tiktok"),
    facebook: fv(formData, "facebook"),
    categories: formData.getAll("categories").map(String).filter(Boolean),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "יש לתקן את השדות המסומנים.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const d = parsed.data;

  const allowedCategories = new Set(
    (await getPartnerCategoriesForScope("BRAND")).map((c) => c.slug),
  );
  if (d.categories.length === 0 || d.categories.some((slug) => !allowedCategories.has(slug))) {
    return {
      status: "error",
      message: "יש לבחור קטגוריית פעילות תקינה אחת לפחות.",
      fieldErrors: { categories: "יש לבחור קטגוריה תקינה" },
    };
  }
  const categories = [...new Set(d.categories)];

  const socialLinks: Prisma.InputJsonValue | typeof Prisma.DbNull =
    d.instagram || d.tiktok || d.facebook
      ? { instagram: d.instagram, tiktok: d.tiktok, facebook: d.facebook }
      : Prisma.DbNull;

  await prisma.$transaction([
    prisma.businessCategory.deleteMany({ where: { businessId: business.id } }),
    prisma.businessProfile.update({
      where: { id: business.id },
      data: {
        name: d.name,
        description: d.description,
        websiteUrl: d.websiteUrl,
        logoUrl: d.logoUrl,
        socialLinks,
        contactName: d.contactName,
        contactPhone: d.contactPhone,
        billingEmail: d.billingEmail,
        billingAddress: d.billingAddress,
        categories: { create: categories.map((categorySlug) => ({ categorySlug })) },
      },
    }),
  ]);

  revalidatePath(REVALIDATE_PATH);
  return { status: "success", message: "פרטי המותג עודכנו." };
}

/* ─────────────────────────── יוצר (CreatorProfile) ─────────────────────────── */

const creatorSchema = z.object({
  displayName: z.string().trim().min(1, "שם במה הוא שדה חובה").max(120),
  bio: z.string().trim().min(1, "ביו הוא שדה חובה").max(2000, "הביו ארוך מדי"),
  // avatarUrl / coverImageUrl מנוהלים בנפרד דרך uploadCreatorImage (העלאת קובץ), לא כאן.
  primaryCityId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  billingAddress: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  bank: bankSchema,
  categories: z.array(z.string().trim().min(1)).default([]),
});

export async function updateCreatorSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("creator")) {
    return { status: "error", message: "רק חשבון יוצר יכול לערוך פרטים אלה." };
  }

  const creator = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!creator) {
    return { status: "error", message: "לא נמצא פרופיל יוצר לחשבון שלך." };
  }

  const parsed = creatorSchema.safeParse({
    displayName: fv(formData, "displayName"),
    bio: fv(formData, "bio"),
    primaryCityId: fv(formData, "primaryCityId"),
    billingAddress: fv(formData, "billingAddress"),
    bank: {
      bank: fv(formData, "bank.bank"),
      branch: fv(formData, "bank.branch"),
      account: fv(formData, "bank.account"),
      accountHolder: fv(formData, "bank.accountHolder"),
    },
    categories: formData.getAll("categories").map(String).filter(Boolean),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "יש לתקן את השדות המסומנים.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const d = parsed.data;

  if (d.primaryCityId) {
    const validCities = await getValidCityIds();
    if (!validCities.has(d.primaryCityId)) {
      return {
        status: "error",
        message: "עיר לא תקינה.",
        fieldErrors: { primaryCityId: "עיר לא תקינה" },
      };
    }
  }

  const allowedCategories = new Set(
    (await getPartnerCategoriesForScope("CREATOR")).map((c) => c.slug),
  );
  if (d.categories.length === 0 || d.categories.some((slug) => !allowedCategories.has(slug))) {
    return {
      status: "error",
      message: "יש לבחור תחום תוכן תקין אחד לפחות.",
      fieldErrors: { categories: "יש לבחור תחום תוכן תקין" },
    };
  }
  const categories = [...new Set(d.categories)];

  await prisma.$transaction([
    prisma.creatorCategory.deleteMany({ where: { creatorId: creator.id } }),
    prisma.creatorProfile.update({
      where: { id: creator.id },
      data: {
        displayName: d.displayName,
        bio: d.bio,
        primaryCityId: d.primaryCityId,
        billingAddress: d.billingAddress,
        payoutBankDetails: bankToJson(d.bank),
        categories: { create: categories.map((categorySlug) => ({ categorySlug })) },
      },
    }),
  ]);

  revalidatePath(REVALIDATE_PATH);
  return { status: "success", message: "פרטי היוצר עודכנו." };
}

/* ──────────────────── תמונת פרופיל / רקע של היוצר (העלאת קובץ) ──────────────────── */

/** מסיר אובייקט אחסון של תמונה שהועלתה למערכת (מתעלם מקישורים חיצוניים שהוזנו ידנית). */
async function removeStoredProfileImage(url: string | null | undefined): Promise<void> {
  if (!url || !url.startsWith(PROFILE_IMAGE_URL_PREFIX)) return;
  const key = url.slice("/api/".length); // "profile-images/<...>"
  try {
    await storage.remove(key);
  } catch {
    // אם הקובץ כבר לא קיים — ממשיכים
  }
}

/** העלאת תמונת פרופיל או רקע — מחליפה את הקיימת (כולל מחיקת הקובץ הישן מהאחסון). */
export async function uploadCreatorImage(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireActiveUser();
  const creator = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, avatarUrl: true, coverImageUrl: true },
  });
  if (!user.roleKeys.includes("creator") || !creator) {
    return { status: "error", message: "רק חשבון יוצר יכול לעדכן תמונות." };
  }

  if (await isRateLimited("profile-image:upload", 20, 600, user.id)) {
    return { status: "error", message: "יותר מדי העלאות בזמן קצר. נסו שוב בעוד מספר דקות." };
  }

  const field = formData.get("field");
  if (field !== "avatar" && field !== "cover") {
    return { status: "error", message: "שדה תמונה לא תקין." };
  }

  const upload = formData.get("file");
  if (!(upload instanceof File) || upload.size === 0) {
    return { status: "error", message: "יש לבחור קובץ תמונה." };
  }
  if (upload.size > MAX_PROFILE_IMAGE_BYTES) {
    return { status: "error", message: `הקובץ גדול מדי — עד ${MAX_PROFILE_IMAGE_MB}MB.` };
  }
  if (!isAllowedProfileImageMime(upload.type)) {
    return { status: "error", message: "סוג קובץ לא נתמך — JPG, PNG, WEBP, GIF או AVIF." };
  }

  const ext = PROFILE_IMAGE_MIME[upload.type];
  const relPath = `${creator.id}/${field}-${randomUUID()}.${ext}`;
  const key = `profile-images/${relPath}`;
  const bytes = Buffer.from(await upload.arrayBuffer());
  if (!bytesMatchMime(bytes, upload.type)) {
    return { status: "error", message: "תוכן הקובץ אינו תמונה תקינה מהסוג שנבחר." };
  }
  await storage.put(key, bytes, upload.type);

  const previousUrl = field === "avatar" ? creator.avatarUrl : creator.coverImageUrl;
  const newUrl = `${PROFILE_IMAGE_URL_PREFIX}${relPath}`;

  await prisma.creatorProfile.update({
    where: { id: creator.id },
    data: field === "avatar" ? { avatarUrl: newUrl } : { coverImageUrl: newUrl },
  });

  await removeStoredProfileImage(previousUrl);

  revalidatePath(REVALIDATE_PATH);
  return {
    status: "success",
    message: field === "avatar" ? "תמונת הפרופיל עודכנה." : "תמונת הרקע עודכנה.",
  };
}

/** הסרת תמונת פרופיל או רקע. */
export async function removeCreatorImage(formData: FormData): Promise<void> {
  const user = await requireActiveUser();
  const creator = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, avatarUrl: true, coverImageUrl: true },
  });
  if (!user.roleKeys.includes("creator") || !creator) return;

  const field = formData.get("field");
  if (field !== "avatar" && field !== "cover") return;
  const previousUrl = field === "avatar" ? creator.avatarUrl : creator.coverImageUrl;

  await prisma.creatorProfile.update({
    where: { id: creator.id },
    data: field === "avatar" ? { avatarUrl: null } : { coverImageUrl: null },
  });
  await removeStoredProfileImage(previousUrl);

  revalidatePath(REVALIDATE_PATH);
}

/* ─────────────────────────── ערוצי יוצר (CreatorChannel) ─────────────────────────── */

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "FACEBOOK",
  "LINKEDIN",
];

/** מוצא את creatorId של המשתמש המחובר (או null אם אין לו תפקיד/פרופיל יוצר). משותף גם ל-route של חיבור ה-OAuth ליוטיוב. */
export async function resolveCreatorId(
  user: Awaited<ReturnType<typeof requireActiveUser>>,
): Promise<string | null> {
  if (!user.roleKeys.includes("creator")) return null;
  const creator = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return creator?.id ?? null;
}

/*
 * יצירה/עריכה ידנית של ערוץ (upsertCreatorChannel) הוסרה: ערוצים נוצרים רק דרך חיבור OAuth
 * (src/app/api/connect/*), כדי שלא ניתן יהיה להזין ערוץ/עוקבים שלא אומתו מול הפלטפורמה.
 */

/** מחיקת ערוץ — מוודא שהוא שייך ליוצר הנוכחי לפני המחיקה */
export async function deleteCreatorChannel(formData: FormData): Promise<void> {
  const user = await requireActiveUser();
  const creatorId = await resolveCreatorId(user);
  if (!creatorId) return;

  const channelId = String(formData.get("channelId") ?? "");
  if (!channelId) return;

  const existing = await prisma.creatorChannel.findFirst({
    where: { id: channelId, creatorId },
    select: { id: true, platform: true, oauthRefreshTokenEnc: true },
  });
  if (!existing) return;

  // ביטול ההרשאה מול גוגל (best-effort) — כדי שהטוקן לא יישאר תקף אחרי הניתוק.
  // (Meta: אין לנו טוקן משתמש שמור לביטול — ההרשאה נשארת עד הסרה ידנית בהגדרות פייסבוק.)
  if (existing.platform === "YOUTUBE" && existing.oauthRefreshTokenEnc) {
    try {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: decryptOAuthToken(existing.oauthRefreshTokenEnc) }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // כשל ברשת/פענוח לא חוסם את הניתוק המקומי
    }
  }

  await prisma.creatorChannel.delete({ where: { id: channelId } });
  revalidatePath(REVALIDATE_PATH);
  revalidatePath("/register/complete");
}

/**
 * רישום הסכמת היוצר להעברת נתונים מרשת חברתית — חובה לפני חיבור OAuth.
 * נשמר כרשומה משפטית (עם תאריך ו-IP); ניתוק הערוץ אינו מוחק אותה, וחיבור מחדש לא דורש הסכמה חוזרת.
 * הסכמת פייסבוק/אינסטגרם נרשמות יחד (אותה זרימת חיבור).
 */
const consentPlatformSchema = z.enum(SOCIAL_PLATFORMS as [SocialPlatform, ...SocialPlatform[]]);

export async function recordSocialConsent(formData: FormData): Promise<void> {
  const user = await requireActiveUser();
  const creatorId = await resolveCreatorId(user);
  if (!creatorId) return;

  const parsed = consentPlatformSchema.safeParse(formData.get("platform"));
  if (!parsed.success) return;

  // פייסבוק ואינסטגרם משתמשים באותה זרימת OAuth — הסכמה על אחת מהן רושמת את שתיהן.
  const platforms: SocialPlatform[] =
    parsed.data === "FACEBOOK" || parsed.data === "INSTAGRAM"
      ? ["FACEBOOK", "INSTAGRAM"]
      : [parsed.data];

  const ipAddress = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  await prisma.$transaction(
    platforms.map((platform) =>
      prisma.creatorSocialConsent.upsert({
        where: { creatorId_platform: { creatorId, platform } },
        create: { creatorId, platform, ipAddress },
        update: { ipAddress },
      }),
    ),
  );

  revalidatePath(REVALIDATE_PATH);
  revalidatePath("/register/complete");
}

/* ───────────────────── חבילות תמחור (CreatorPricingPackage) ───────────────────── */

const DELIVERABLE_TYPES: DeliverableType[] = [
  "IG_REEL",
  "IG_STORY",
  "TIKTOK_VIDEO",
  "YOUTUBE_INTEGRATION",
  "EVENT_ATTENDANCE",
];

const pricingPackageSchema = z.object({
  // .nullish() (לא .optional()) — formData.get() מחזיר null לשדה שלא קיים בטופס
  // (הוספת חבילה חדשה, בלי input חבוי packageId), ו-.optional() לבדו דוחה null.
  packageId: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  deliverableType: z.enum(DELIVERABLE_TYPES as [DeliverableType, ...DeliverableType[]], {
    message: "יש לבחור סוג תוצר",
  }),
  title: z.string().trim().min(1, "שם החבילה הוא שדה חובה").max(160),
  priceILS: z.coerce
    .number({ message: "מחיר לא תקין" })
    .positive("המחיר חייב להיות גדול מ-0")
    .max(100_000_000, "המחיר חורג מהמותר"),
  turnaroundDays: z.coerce
    .number({ message: "זמן אספקה לא תקין" })
    .int("מספר ימים שלם")
    .min(1, "זמן אספקה: לפחות יום אחד")
    .max(365, "זמן אספקה: עד שנה"),
  revisionsIncluded: z.coerce
    .number({ message: "מספר תיקונים לא תקין" })
    .int()
    .min(0, "מספר תיקונים לא תקין")
    .max(20, "מספר תיקונים חורג מהמותר")
    .default(1),
});

/** יצירה/עריכה של חבילת תמחור — packageId ריק = יצירה */
export async function upsertCreatorPricingPackage(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireActiveUser();
  const creatorId = await resolveCreatorId(user);
  if (!creatorId) {
    return { status: "error", message: "רק חשבון יוצר יכול לנהל חבילות תמחור." };
  }

  const parsed = pricingPackageSchema.safeParse({
    packageId: fv(formData, "packageId"),
    deliverableType: fv(formData, "deliverableType"),
    title: fv(formData, "title"),
    priceILS: fv(formData, "priceILS"),
    turnaroundDays: fv(formData, "turnaroundDays"),
    revisionsIncluded: formData.get("revisionsIncluded") || undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "יש לתקן את השדות המסומנים.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const d = parsed.data;
  const data = {
    deliverableType: d.deliverableType,
    title: d.title,
    priceILS: new Prisma.Decimal(d.priceILS),
    turnaroundDays: d.turnaroundDays,
    revisionsIncluded: d.revisionsIncluded,
  };

  if (d.packageId) {
    const existing = await prisma.creatorPricingPackage.findFirst({
      where: { id: d.packageId, creatorId },
      select: { id: true },
    });
    if (!existing) {
      return { status: "error", message: "החבילה לא נמצאה או שאינה שייכת לחשבון שלך." };
    }
    await prisma.creatorPricingPackage.update({ where: { id: d.packageId }, data });
  } else {
    await prisma.creatorPricingPackage.create({ data: { ...data, creatorId } });
  }

  revalidatePath(REVALIDATE_PATH);
  return { status: "success", message: d.packageId ? "החבילה עודכנה." : "החבילה נוספה." };
}

/** הפעלה/השבתה של חבילת תמחור */
export async function toggleCreatorPricingPackage(formData: FormData): Promise<void> {
  const user = await requireActiveUser();
  const creatorId = await resolveCreatorId(user);
  if (!creatorId) return;

  const packageId = String(formData.get("packageId") ?? "");
  const nextActive = String(formData.get("active") ?? "") === "true";
  if (!packageId) return;

  const existing = await prisma.creatorPricingPackage.findFirst({
    where: { id: packageId, creatorId },
    select: { id: true },
  });
  if (!existing) return;

  await prisma.creatorPricingPackage.update({
    where: { id: packageId },
    data: { isActive: nextActive },
  });
  revalidatePath(REVALIDATE_PATH);
}

/**
 * מחיקת חבילת תמחור — רק אם אין applications/contracts תלויים.
 * אם יש תלויים — משביתים (isActive: false) במקום למחוק.
 */
export async function deleteCreatorPricingPackage(formData: FormData): Promise<void> {
  const user = await requireActiveUser();
  const creatorId = await resolveCreatorId(user);
  if (!creatorId) return;

  const packageId = String(formData.get("packageId") ?? "");
  if (!packageId) return;

  const existing = await prisma.creatorPricingPackage.findFirst({
    where: { id: packageId, creatorId },
    select: { id: true, _count: { select: { applications: true, contracts: true } } },
  });
  if (!existing) return;

  if (existing._count.applications > 0 || existing._count.contracts > 0) {
    await prisma.creatorPricingPackage.update({
      where: { id: packageId },
      data: { isActive: false },
    });
  } else {
    await prisma.creatorPricingPackage.delete({ where: { id: packageId } });
  }

  revalidatePath(REVALIDATE_PATH);
}

/* ─────────────────────── בעל שטחי פרסום (AdSpaceOwnerProfile) ─────────────────────── */

const adSpaceOwnerSchema = z.object({
  companyName: z.string().trim().min(1, "שם החברה הוא שדה חובה").max(160),
  contactName: z.string().trim().min(1, "שם איש קשר הוא שדה חובה").max(120),
  contactPhone: phoneNumber,
  billingEmail: z.string().trim().email("אימייל לא תקין"),
  billingAddress: z.string().trim().min(1, "כתובת לחיוב היא שדה חובה").max(300),
  bank: bankSchema,
});

export async function updateAdSpaceOwnerSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("space")) {
    return { status: "error", message: "רק חשבון בעל שטחים יכול לערוך פרטים אלה." };
  }

  const owner = await prisma.adSpaceOwnerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!owner) {
    return { status: "error", message: "לא נמצא פרופיל בעל שטחים לחשבון שלך." };
  }

  const parsed = adSpaceOwnerSchema.safeParse({
    companyName: fv(formData, "companyName"),
    contactName: fv(formData, "contactName"),
    contactPhone: fv(formData, "contactPhone"),
    billingEmail: fv(formData, "billingEmail"),
    billingAddress: fv(formData, "billingAddress"),
    bank: {
      bank: fv(formData, "bank.bank"),
      branch: fv(formData, "bank.branch"),
      account: fv(formData, "bank.account"),
      accountHolder: fv(formData, "bank.accountHolder"),
    },
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "יש לתקן את השדות המסומנים.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const d = parsed.data;

  await prisma.adSpaceOwnerProfile.update({
    where: { id: owner.id },
    data: {
      companyName: d.companyName,
      contactName: d.contactName,
      contactPhone: d.contactPhone,
      billingEmail: d.billingEmail,
      billingAddress: d.billingAddress,
      payoutBankDetails: bankToJson(d.bank),
    },
  });

  revalidatePath(REVALIDATE_PATH);
  return { status: "success", message: "פרטי בעל השטחים עודכנו." };
}
