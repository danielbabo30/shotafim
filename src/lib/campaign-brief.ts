import { z } from "zod";
import { CampaignTargetType, DeliverableType } from "@prisma/client";
import type { CampaignStatus } from "@prisma/client";

/**
 * קבועים + סכמת ולידציה לבריף קמפיין.
 * קובץ "טהור" (בלי server-only) — משמש גם את הטופס בצד הלקוח לתוויות.
 */

export const CAMPAIGN_TARGET_TYPES = [
  {
    value: CampaignTargetType.CREATOR,
    title: "יוצרי תוכן ומשפיענים",
    description: "רילסים, סטוריז, סרטוני טיקטוק ואינטגרציות אורגניות",
  },
  {
    value: CampaignTargetType.AD_SPACE,
    title: "שטחי פרסום ומדיה",
    description: "שילוט, ניוזלטרים, פודקאסטים ומדיה מסחרית",
  },
  {
    value: CampaignTargetType.BOTH,
    title: "קמפיין משולב 360°",
    description: "יוצרים ושטחי פרסום יחד, תחת בריף אחד",
  },
] as const;

export const DELIVERABLE_OPTIONS = [
  { value: DeliverableType.IG_REEL, label: "רילס אינסטגרם" },
  { value: DeliverableType.IG_STORY, label: "סטורי אינסטגרם" },
  { value: DeliverableType.TIKTOK_VIDEO, label: "סרטון טיקטוק" },
  { value: DeliverableType.YOUTUBE_INTEGRATION, label: "אינטגרציה ביוטיוב" },
  { value: DeliverableType.EVENT_ATTENDANCE, label: "השתתפות באירוע" },
] as const;

const DELIVERABLE_LABEL = new Map<DeliverableType, string>(
  DELIVERABLE_OPTIONS.map((o) => [o.value, o.label]),
);

export const deliverableLabel = (value: DeliverableType): string =>
  DELIVERABLE_LABEL.get(value) ?? value;

export const targetTypeLabel = (value: CampaignTargetType): string =>
  CAMPAIGN_TARGET_TYPES.find((t) => t.value === value)?.title ?? value;

/** פלטפורמות מדיה נגזרות מהתוצרים — לשדה targetPlatforms הקיים */
const DELIVERABLE_PLATFORM: Record<DeliverableType, string> = {
  [DeliverableType.IG_REEL]: "INSTAGRAM",
  [DeliverableType.IG_STORY]: "INSTAGRAM",
  [DeliverableType.TIKTOK_VIDEO]: "TIKTOK",
  [DeliverableType.YOUTUBE_INTEGRATION]: "YOUTUBE",
  [DeliverableType.EVENT_ATTENDANCE]: "EVENT",
};

export const platformsFromDeliverables = (deliverables: DeliverableType[]): string[] => [
  ...new Set(deliverables.map((d) => DELIVERABLE_PLATFORM[d])),
];

export const CAMPAIGN_STATUS_META: Record<CampaignStatus, { label: string; className: string }> = {
  DRAFT: { label: "טיוטה", className: "bg-surface-container text-on-surface-variant" },
  OPEN_FOR_PITCHES: { label: "פתוח להצעות", className: "bg-primary-fixed text-on-primary-fixed" },
  IN_PROGRESS: { label: "בביצוע", className: "bg-warning-container text-warning" },
  COMPLETED: { label: "הושלם", className: "bg-success-container text-success" },
  CANCELLED: { label: "בוטל", className: "bg-error-container text-on-error-container" },
};

/**
 * סכמה אחת לשתי הפעולות. "draft" מאפשר שמירה חלקית;
 * "publish" מחייב את השדות שנדרשים כדי לפרסם בריף להצעות.
 */
export const campaignFormSchema = z
  .object({
    intent: z.enum(["draft", "publish"]),
    targetType: z.enum(CampaignTargetType),
    title: z.string().trim().min(2, "יש להזין כותרת לבריף").max(120, "הכותרת ארוכה מדי"),
    locationId: z.string().trim().max(60).optional(),
    description: z.string().trim().max(4000, "התיאור ארוך מדי").optional().default(""),
    briefAssetsUrl: z.string().trim().max(500).optional().default(""),
    hasPhysicalProduct: z
      .preprocess((v) => v === "on" || v === "true" || v === true, z.boolean())
      .default(false),
    deliverables: z.array(z.enum(DeliverableType)).default([]),
    totalBudgetILS: z.coerce
      .number({ error: "יש להזין תקציב תקין" })
      .nonnegative("התקציב לא יכול להיות שלילי")
      .max(100_000_000, "התקציב חורג מהמותר"),
    endDate: z.string().trim().optional().default(""),
  })
  .superRefine((v, ctx) => {
    if (v.briefAssetsUrl && !/^https?:\/\/.+/i.test(v.briefAssetsUrl)) {
      ctx.addIssue({
        code: "custom",
        path: ["briefAssetsUrl"],
        message: "הקישור חייב להתחיל ב-http:// או https://",
      });
    }
    if (v.endDate && Number.isNaN(Date.parse(v.endDate))) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "תאריך לא תקין" });
    }
    if (v.intent === "publish") {
      if (v.description.length < 20) {
        ctx.addIssue({
          code: "custom",
          path: ["description"],
          message: "לפני פרסום צריך תיאור מפורט יותר (לפחות 20 תווים)",
        });
      }
      if (v.deliverables.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["deliverables"],
          message: "בחרו לפחות תוצר אחד",
        });
      }
      if (v.totalBudgetILS <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["totalBudgetILS"],
          message: "יש להזין תקציב לפני פרסום",
        });
      }
    }
  });

export type CampaignFormValues = z.infer<typeof campaignFormSchema>;

/** מצב הטופס שמחזירה פעולת createCampaign (useActionState) */
export type CampaignFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const CAMPAIGN_FORM_INITIAL: CampaignFormState = { status: "idle" };
