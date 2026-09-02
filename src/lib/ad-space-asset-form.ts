import { z } from "zod";
import type { AdSpaceType, AdPricingModel, ProofRequirement } from "@prisma/client";

/**
 * סכמה + תוויות משותפות לטופס נכס מדיה (AdSpaceAsset).
 *
 * קובץ טהור (בלי server-only) — בשימוש גם ב-registration-schema (בלוק asset של
 * הרשמת בעל שטחים) וגם בטופס העצמאי «הוספת / עריכת נכס» תחת /dashboard/assets.
 * ערכי ה-<option> של שדות ה-enum הם ה-literal של Prisma — אין מיפוי מעברית.
 */

export const AD_SPACE_TYPE_LABELS: Record<AdSpaceType, string> = {
  DIGITAL_BILLBOARD: "מסך דיגיטלי (LED)",
  STATIC_BILLBOARD: "שלט חוצות סטטי",
  TRANSIT: "מדיה בתחבורה",
  NEWSLETTER: "ניוזלטר",
  PODCAST_SPONSORSHIP: "חסות בפודקאסט",
};

export const AD_SPACE_TYPE_HINTS: Record<AdSpaceType, string> = {
  DIGITAL_BILLBOARD: "מסך וידאו / תמונות מתחלפות",
  STATIC_BILLBOARD: "שילוט חוצות מודפס קבוע",
  TRANSIT: "עטיפת אוטובוס / רכבת / תחנה",
  NEWSLETTER: "מיקום מודעה ברשימת תפוצה",
  PODCAST_SPONSORSHIP: "אזכור חסות בפרקים",
};

export const AD_PRICING_MODEL_LABELS: Record<AdPricingModel, string> = {
  DAILY: "ליום",
  WEEKLY: "לשבוע",
  MONTHLY: "לחודש",
  PER_CPM: "לכל 1,000 חשיפות (CPM)",
  PER_BROADCAST: "לפרק / שידור",
};

export const PROOF_REQUIREMENT_LABELS: Record<ProofRequirement, string> = {
  PHOTO_CONFIRMATION: "אישור בצילום שטח",
  ANALYTICS_REPORT: "דוח אנליטיקס",
  SYSTEM_LOG: "לוג מערכת אוטומטי",
};

export const AD_SPACE_TYPES = Object.keys(AD_SPACE_TYPE_LABELS) as AdSpaceType[];
export const AD_PRICING_MODELS = Object.keys(AD_PRICING_MODEL_LABELS) as AdPricingModel[];
export const PROOF_REQUIREMENTS = Object.keys(PROOF_REQUIREMENT_LABELS) as ProofRequirement[];

/** סוגי מדיה שמחייבים מיקום גאוגרפי (עיר + כתובת) */
const LOCATION_REQUIRED_TYPES: AdSpaceType[] = ["DIGITAL_BILLBOARD", "STATIC_BILLBOARD", "TRANSIT"];

export const typeNeedsLocation = (type: AdSpaceType): boolean =>
  LOCATION_REQUIRED_TYPES.includes(type);

const nullableText = z
  .string()
  .trim()
  .transform((v) => v || null)
  .nullable();

/** שדה טקסט אופציונלי שעשוי לא להיות קיים כלל ב-payload (מפתח חסר) */
const softNullableText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const nullableInt = z.coerce.number().int().min(0).nullable().catch(null);

/**
 * מבנה הנכס עצמו. שדות ה-URL של התמונות והקטגוריות אופציונליים — בהרשמה הם לא
 * נשלחים כלל, בטופס העצמאי כן.
 */
export const adSpaceAssetObjectSchema = z.object({
  title: z.string().trim().min(1, "שם הנכס הוא שדה חובה"),
  type: z.enum([
    "DIGITAL_BILLBOARD",
    "STATIC_BILLBOARD",
    "TRANSIT",
    "NEWSLETTER",
    "PODCAST_SPONSORSHIP",
  ]),
  description: z.string().trim().min(1, "תיאור הנכס הוא שדה חובה"),
  cityId: nullableText,
  address: nullableText,
  dimensions: nullableText,
  resolution: softNullableText,
  spotLengthSeconds: nullableInt,
  estimatedReach: nullableInt,
  pricingModel: z.enum(["DAILY", "WEEKLY", "MONTHLY", "PER_CPM", "PER_BROADCAST"]),
  basePriceILS: z.coerce.number({ message: "מחיר בסיס לא תקין" }).min(0, "מחיר בסיס לא תקין"),
  proofRequirement: z.enum(["PHOTO_CONFIRMATION", "ANALYTICS_REPORT", "SYSTEM_LOG"]),
  images: z
    .array(
      z
        .string()
        .trim()
        .regex(/^https?:\/\/.+/, "כתובת תמונה חייבת להתחיל ב-http(s)://"),
    )
    .optional()
    .transform((v) => v ?? []),
  categories: z
    .array(z.string().trim().min(1))
    .optional()
    .transform((v) => v ?? []),
});

/** גרסה עם ולידציה מותנית של מיקום — לטופס העצמאי (לא בהרשמה, כדי לא לשנות התנהגות). */
export const adSpaceAssetSchema = adSpaceAssetObjectSchema.superRefine((val, ctx) => {
  if (typeNeedsLocation(val.type)) {
    if (!val.cityId) {
      ctx.addIssue({ code: "custom", path: ["cityId"], message: "יש לבחור עיר עבור שטח פיזי" });
    }
    if (!val.address) {
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: "כתובת / מיקום הם שדה חובה עבור שטח פיזי",
      });
    }
  }
});

export type AdSpaceAssetInput = z.infer<typeof adSpaceAssetSchema>;

/** מצב הטופס שמחזירות פעולות create/update (useActionState) */
export type AdSpaceAssetFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const AD_SPACE_ASSET_FORM_INITIAL: AdSpaceAssetFormState = { status: "idle" };

/** ערכים ראשוניים לטופס (מ-DB בעריכה) — מחרוזות ל-<input defaultValue> */
export type AdSpaceAssetFormValues = {
  title: string;
  type: AdSpaceType;
  description: string;
  cityId: string;
  address: string;
  dimensions: string;
  resolution: string;
  spotLengthSeconds: string;
  estimatedReach: string;
  pricingModel: AdPricingModel;
  basePriceILS: string;
  proofRequirement: ProofRequirement;
  images: string[];
  categories: string[];
};

export const EMPTY_ASSET_FORM_VALUES: AdSpaceAssetFormValues = {
  title: "",
  type: "DIGITAL_BILLBOARD",
  description: "",
  cityId: "",
  address: "",
  dimensions: "",
  resolution: "",
  spotLengthSeconds: "",
  estimatedReach: "",
  pricingModel: "WEEKLY",
  basePriceILS: "",
  proofRequirement: "PHOTO_CONFIRMATION",
  images: [],
  categories: [],
};
