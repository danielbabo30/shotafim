import "server-only";
import { z } from "zod";
import type { RegistrationRoleKey } from "@/lib/registration";
import { adSpaceAssetObjectSchema } from "@/lib/ad-space-asset-form";

/**
 * ולידציה של טופס שלב 3 (הגדרת פרופיל). כל לשונית שולחת את שדותיה עם prefix
 * (`brand.` / `creator.` / `space.`); כאן מחלצים ומאמתים לפי התפקידים שנבחרו בפועל.
 * ערכי ה-<option> של שדות ה-enum הם ה-literal של Prisma — אין מיפוי מעברית.
 */

const reqStr = (msg: string) => z.string().trim().min(1, msg);
const optStr = z
  .string()
  .trim()
  .transform((v) => v || null)
  .nullable();

const companyId = z
  .string()
  .trim()
  .regex(/^\d{8,9}$/, "מספר ח.פ / ע.מ חייב להיות 8–9 ספרות");

const emailField = z.string().trim().email("כתובת דוא״ל לא תקינה");
const urlField = z
  .string()
  .trim()
  .transform((v) => v || null)
  .nullable()
  .refine((v) => v === null || /^https?:\/\/.+/.test(v), "כתובת אתר חייבת להתחיל ב-http(s)://");

const brandSchema = z.object({
  name: reqStr("שם המותג הוא שדה חובה"),
  legalName: optStr,
  companyId,
  entityType: z.enum(["LTD", "LICENSED_DEALER", "EXEMPT_DEALER", "PARTNERSHIP"]),
  description: reqStr("תיאור פעילות הוא שדה חובה"),
  businessModel: z.enum(["ONLINE", "PHYSICAL", "HYBRID"]),
  contactName: reqStr("שם איש קשר הוא שדה חובה"),
  contactPhone: reqStr("טלפון איש קשר הוא שדה חובה"),
  billingEmail: emailField,
  billingAddress: reqStr("כתובת לחשבוניות היא שדה חובה"),
  websiteUrl: urlField,
  instagram: optStr,
  category: reqStr("יש לבחור קטגוריית פעילות"),
  locations: z
    .array(
      z.object({
        cityId: reqStr("יש לבחור עיר"),
        address: reqStr("כתובת הסניף היא שדה חובה"),
        name: optStr,
      }),
    )
    .min(1, "יש להזין לפחות סניף אחד"),
});

const creatorSchema = z.object({
  displayName: reqStr("שם במה הוא שדה חובה"),
  legalFullName: reqStr("שם מלא לפי ת.ז הוא שדה חובה"),
  idNumber: z
    .string()
    .trim()
    .regex(/^\d{8,9}$/, "מספר ת.ז / ע.מ חייב להיות 8–9 ספרות"),
  taxStatus: z.enum(["EXEMPT_DEALER", "LICENSED_DEALER", "COMPANY", "INDIVIDUAL_WITHHOLDING"]),
  bio: reqStr("ביו הוא שדה חובה"),
  billingAddress: optStr,
  categories: z.array(z.string().trim().min(1)).min(1, "יש לבחור לפחות תחום תוכן אחד"),
  channels: z
    .array(
      z.object({
        platform: z.enum(["INSTAGRAM", "TIKTOK", "YOUTUBE", "FACEBOOK", "LINKEDIN"]),
        handle: reqStr("שם המשתמש בערוץ הוא שדה חובה"),
        channelUrl: z
          .string()
          .trim()
          .regex(/^https?:\/\/.+/, "כתובת הערוץ חייבת להתחיל ב-http(s)://"),
        followersCount: z.coerce.number().int().min(0).catch(0),
      }),
    )
    .min(1, "יש לחבר לפחות ערוץ אחד"),
});

const spaceSchema = z.object({
  companyName: reqStr("שם חברת המדיה הוא שדה חובה"),
  legalName: reqStr("שם תאגיד רשמי הוא שדה חובה"),
  companyId,
  entityType: z.enum(["LTD", "LICENSED_DEALER", "EXEMPT_DEALER", "PARTNERSHIP"]),
  contactName: reqStr("שם איש קשר הוא שדה חובה"),
  contactPhone: reqStr("טלפון איש קשר הוא שדה חובה"),
  billingEmail: emailField,
  billingAddress: reqStr("כתובת רשמית היא שדה חובה"),
  // מבנה הנכס — סכמה משותפת עם טופס «הוספת / עריכת נכס» (src/lib/ad-space-asset-form.ts)
  asset: adSpaceAssetObjectSchema,
});

export type BrandInput = z.infer<typeof brandSchema>;
export type CreatorInput = z.infer<typeof creatorSchema>;
export type SpaceInput = z.infer<typeof spaceSchema>;

export type RegistrationInput = {
  brand?: BrandInput;
  creator?: CreatorInput;
  space?: SpaceInput;
};

export type RegistrationParseResult =
  | { ok: true; data: RegistrationInput }
  | {
      ok: false;
      fieldErrors: Record<string, string>;
      formError: string;
      errorTab: RegistrationRoleKey;
    };

function collectErrors(prefix: string, err: z.ZodError, into: Record<string, string>) {
  for (const issue of err.issues) {
    const key = `${prefix}.${issue.path.join(".")}`;
    if (!(key in into)) into[key] = issue.message;
  }
}

/** מחלץ מ-FormData את מערך הסניפים / הערוצים (שדות מקבילים לפי אינדקס). */
function zipRows(fd: FormData, keys: string[]): Record<string, string>[] {
  const cols = keys.map((k) => fd.getAll(k).map(String));
  const len = Math.max(0, ...cols.map((c) => c.length));
  return Array.from({ length: len }, (_, i) =>
    Object.fromEntries(keys.map((k, ci) => [k.split(".").pop()!, cols[ci][i] ?? ""])),
  );
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export function parseRegistration(
  fd: FormData,
  roleKeys: RegistrationRoleKey[],
): RegistrationParseResult {
  const fieldErrors: Record<string, string> = {};
  const data: RegistrationInput = {};
  let errorTab: RegistrationRoleKey | null = null;

  if (roleKeys.includes("brand")) {
    const raw = {
      name: str(fd, "brand.name"),
      legalName: str(fd, "brand.legalName"),
      companyId: str(fd, "brand.companyId"),
      entityType: str(fd, "brand.entityType"),
      description: str(fd, "brand.description"),
      businessModel: str(fd, "brand.businessModel"),
      contactName: str(fd, "brand.contactName"),
      contactPhone: str(fd, "brand.contactPhone"),
      billingEmail: str(fd, "brand.billingEmail"),
      billingAddress: str(fd, "brand.billingAddress"),
      websiteUrl: str(fd, "brand.websiteUrl"),
      instagram: str(fd, "brand.instagram"),
      category: str(fd, "brand.category"),
      locations: zipRows(fd, [
        "brand.locationCityId",
        "brand.locationAddress",
        "brand.locationName",
      ]).map((r) => ({
        cityId: r.locationCityId,
        address: r.locationAddress,
        name: r.locationName,
      })),
    };
    const parsed = brandSchema.safeParse(raw);
    if (parsed.success) data.brand = parsed.data;
    else {
      collectErrors("brand", parsed.error, fieldErrors);
      errorTab ??= "brand";
    }
  }

  if (roleKeys.includes("creator")) {
    const raw = {
      displayName: str(fd, "creator.displayName"),
      legalFullName: str(fd, "creator.legalFullName"),
      idNumber: str(fd, "creator.idNumber"),
      taxStatus: str(fd, "creator.taxStatus"),
      bio: str(fd, "creator.bio"),
      billingAddress: str(fd, "creator.billingAddress"),
      categories: fd.getAll("creator.category").map(String),
      channels: zipRows(fd, [
        "creator.channelPlatform",
        "creator.channelHandle",
        "creator.channelUrl",
        "creator.channelFollowers",
      ]).map((r) => ({
        platform: r.channelPlatform,
        handle: r.channelHandle,
        channelUrl: r.channelUrl,
        followersCount: r.channelFollowers,
      })),
    };
    const parsed = creatorSchema.safeParse(raw);
    if (parsed.success) data.creator = parsed.data;
    else {
      collectErrors("creator", parsed.error, fieldErrors);
      errorTab ??= "creator";
    }
  }

  if (roleKeys.includes("space")) {
    const raw = {
      companyName: str(fd, "space.companyName"),
      legalName: str(fd, "space.legalName"),
      companyId: str(fd, "space.companyId"),
      entityType: str(fd, "space.entityType"),
      contactName: str(fd, "space.contactName"),
      contactPhone: str(fd, "space.contactPhone"),
      billingEmail: str(fd, "space.billingEmail"),
      billingAddress: str(fd, "space.billingAddress"),
      asset: {
        title: str(fd, "space.assetTitle"),
        type: str(fd, "space.assetType"),
        description: str(fd, "space.assetDescription"),
        cityId: str(fd, "space.assetCityId"),
        address: str(fd, "space.assetAddress"),
        dimensions: str(fd, "space.assetDimensions"),
        spotLengthSeconds: str(fd, "space.assetSpotLength"),
        estimatedReach: str(fd, "space.assetReach"),
        pricingModel: str(fd, "space.pricingModel"),
        basePriceILS: str(fd, "space.basePrice"),
        proofRequirement: str(fd, "space.proofRequirement"),
      },
    };
    const parsed = spaceSchema.safeParse(raw);
    if (parsed.success) data.space = parsed.data;
    else {
      collectErrors("space", parsed.error, fieldErrors);
      errorTab ??= "space";
    }
  }

  if (errorTab) {
    return {
      ok: false,
      fieldErrors,
      formError: "יש שדות חובה שחסרים או שגויים — בדוק את הלשוניות המסומנות.",
      errorTab,
    };
  }
  return { ok: true, data };
}
