import { z } from "zod";
import {
  AttributionMode,
  CommissionBasis,
  CommissionScope,
  CommissionType,
  type CompensationModel,
} from "@prisma/client";

/**
 * "תשלום פר רכישה" (revenue-share) — קבועים + ולידציה לתנאי השותפות שהמפרסם
 * מצהיר בבריף. קובץ "טהור" (בלי server-only) — משמש גם את אשף הקמפיין וגם את
 * ה-server actions. אפיון מלא: Artifact "תשלום פר רכישה".
 *
 * WP-1: המפרסם מצהיר את התנאים בבריף (הצעה חד-צדדית — בלי נגד-הצעה של היוצר).
 * ב-acceptApplication הם מועתקים ל-PartnerProgram ונעולים.
 */

/** עמלת הפלטפורמה מתוך העמלה ליוצר, באחוזים. §12: TBD סופי; ברירת מחדל 10. */
export const PARTNERSHIP_PLATFORM_FEE_PCT = 10;

/** ימי חלון ההחזרות אחרי תאריך הסיום — התחנה האחרונה נאכפת לתאריך הזה. §6. */
export const FINAL_CHECKPOINT_GRACE_DAYS = 14;

export const COMPENSATION_MODEL_OPTIONS: {
  value: CompensationModel;
  title: string;
  description: string;
  available: boolean;
}[] = [
  {
    value: "FIXED_FEE",
    title: "תשלום קבוע",
    description: "סכום ידוע מראש, מוגן בנאמנות, משוחרר באישור התוצר.",
    available: true,
  },
  {
    value: "REVENUE_SHARE",
    title: "תשלום פר רכישה",
    description: "עמלה על כל רכישה שהיוצר הביא, נמדדת דרך תוסף בחנות ה-WooCommerce.",
    available: true,
  },
  {
    value: "HYBRID",
    title: "היברידי — בסיס + עמלה",
    description: "דמי בסיס מובטחים + עמלה על מכירות. יתווסף בהמשך.",
    available: false,
  },
];

export const COMMISSION_TYPE_LABEL: Record<CommissionType, string> = {
  PERCENT: "אחוז מהרכישה",
  FIXED: "סכום קבוע לרכישה",
};

export const COMMISSION_BASIS_LABEL: Record<CommissionBasis, string> = {
  PRE_DISCOUNT: "לפני הנחת הקופון",
  POST_DISCOUNT: "אחרי הנחת הקופון",
};

export const COMMISSION_SCOPE_LABEL: Record<CommissionScope, string> = {
  PRODUCT_ONLY: "מחיר המוצר המופנה בלבד",
  WHOLE_CART: "כל הסל",
};

export const ATTRIBUTION_MODE_LABEL: Record<AttributionMode, string> = {
  LINK: "לינק בלבד",
  COUPON: "קופון בלבד",
  LINK_AND_COUPON: "לינק + קופון",
};

/** האם מצב השיוך כולל קופון ייחודי ליוצר */
export const attributionModeHasCoupon = (mode: AttributionMode): boolean =>
  mode === "COUPON" || mode === "LINK_AND_COUPON";

/** האם מצב השיוך כולל לינק (ואיתו נתוני קליקים ושיעור המרה) */
export const attributionModeHasLink = (mode: AttributionMode): boolean =>
  mode === "LINK" || mode === "LINK_AND_COUPON";

const isoDate = z
  .string()
  .trim()
  .refine((v) => v !== "" && !Number.isNaN(Date.parse(v)), "תאריך לא תקין");

/**
 * תנאי השותפות באשף הקמפיין. נדרש רק כש-compensationModel=REVENUE_SHARE
 * (ראה campaignFormSchema.superRefine).
 */
export const partnerTermsSchema = z
  .object({
    commissionType: z.enum(CommissionType),
    commissionValue: z.coerce
      .number({ error: "יש להזין ערך עמלה" })
      .positive("ערך העמלה חייב להיות גדול מ-0"),
    commissionBasis: z.enum(CommissionBasis).default("PRE_DISCOUNT"),
    commissionScope: z.enum(CommissionScope).default("PRODUCT_ONLY"),
    estimatedPurchases: z.coerce
      .number({ error: "יש להזין תחזית רכישות" })
      .int("מספר שלם")
      .positive("לפחות רכישה אחת")
      .max(1_000_000, "התחזית חורגת מהמותר"),
    assumedAovILS: z.coerce
      .number({ error: "יש להזין ערך הזמנה ממוצע" })
      .positive("ערך ההזמנה חייב להיות גדול מ-0")
      .max(1_000_000, "ערך ההזמנה חורג מהמותר"),
    attributionMode: z.enum(AttributionMode).default("LINK_AND_COUPON"),
    destinationUrl: z
      .string()
      .trim()
      .min(1, "יש להזין קישור לעמוד היעד")
      .regex(/^https?:\/\/.+/i, "הקישור חייב להתחיל ב-http:// או https://"),
    couponDiscountPct: z.coerce.number().min(0, "אחוז לא תקין").max(100, "עד 100%").optional(),
    // תחנות ביניים בלבד — התחנה האחרונה (סיום + 14) מתווספת אוטומטית ב-normalizeCheckpoints
    payoutCheckpoints: z.array(isoDate).default([]),
    startDate: isoDate,
    endDate: isoDate,
  })
  .superRefine((v, ctx) => {
    if (v.commissionType === "PERCENT" && v.commissionValue > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["commissionValue"],
        message: "אחוז עמלה עד 100",
      });
    }
    if (Date.parse(v.endDate) <= Date.parse(v.startDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "תאריך הסיום חייב להיות אחרי ההתחלה",
      });
    }
    if (attributionModeHasCoupon(v.attributionMode) && v.couponDiscountPct == null) {
      ctx.addIssue({
        code: "custom",
        path: ["couponDiscountPct"],
        message: "יש להזין את גובה הנחת הקופון",
      });
    }
    const startMs = Date.parse(v.startDate);
    const endMs = Date.parse(v.endDate);
    for (const iso of v.payoutCheckpoints) {
      const ms = Date.parse(iso);
      if (ms <= startMs || ms >= endMs) {
        ctx.addIssue({
          code: "custom",
          path: ["payoutCheckpoints"],
          message: "תחנת ביניים חייבת ליפול בין תאריך ההתחלה לסיום",
        });
        break;
      }
    }
  });

export type PartnerTermsValues = z.infer<typeof partnerTermsSchema>;

/**
 * מנרמל את מערך תחנות התשלום: ממיין, מסיר כפילויות, ואוכף שהתחנה האחרונה
 * היא תאריך הסיום + 14 יום (חלון ההחזרות). §6.
 */
export function normalizeCheckpoints(rawIso: string[], endDate: Date): Date[] {
  const finalStop = new Date(endDate.getTime() + FINAL_CHECKPOINT_GRACE_DAYS * 864e5);
  const finalKey = finalStop.toISOString().slice(0, 10);
  const seen = new Set<string>();
  const dates: Date[] = [];
  for (const iso of rawIso) {
    const d = new Date(iso);
    const key = d.toISOString().slice(0, 10);
    if (key >= finalKey || seen.has(key)) continue;
    seen.add(key);
    dates.push(d);
  }
  dates.sort((a, b) => a.getTime() - b.getTime());
  dates.push(finalStop);
  return dates;
}
