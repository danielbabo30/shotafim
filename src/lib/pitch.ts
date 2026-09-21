import { z } from "zod";
import type { ApplicationStatus, CampaignTargetType, UserRole } from "@prisma/client";
import type { ChipTone } from "@/lib/dashboard-brand";

/**
 * שלב 6 — הצעות (pitches) לבריף. קובץ "טהור" (בלי server-only): קבועים + סכמת
 * ולידציה, בשימוש גם בטופס הלקוח וגם ב-server action.
 */

export const APPLICATION_STATUS_META: Record<ApplicationStatus, { label: string; tone: ChipTone }> =
  {
    INVITED: { label: "הוזמנת להגיש הצעה", tone: "primary" },
    SUBMITTED: { label: "ממתין למענה", tone: "warning" },
    ACCEPTED: { label: "ההצעה התקבלה", tone: "success" },
    REJECTED: { label: "ההצעה נדחתה", tone: "neutral" },
    WITHDRAWN: { label: "ההצעה בוטלה", tone: "neutral" },
  };

/** אילו סוגי בריף רלוונטיים לכל כובע ספק */
export const TARGET_TYPES_FOR_ROLE: Partial<Record<UserRole, CampaignTargetType[]>> = {
  CREATOR: ["CREATOR", "BOTH"],
  AD_SPACE_OWNER: ["AD_SPACE", "BOTH"],
};

export const applicationFormSchema = z.object({
  campaignId: z.string().trim().min(1),
  proposedPriceILS: z.coerce
    .number({ error: "יש להזין מחיר תקין" })
    .positive("המחיר חייב להיות גדול מ-0")
    .max(100_000_000, "המחיר חורג מהמותר"),
  estimatedDeliveryDays: z.coerce
    .number({ error: "יש להזין מספר ימים" })
    .int("מספר ימים שלם")
    .positive("לפחות יום אחד")
    .max(365, "עד שנה"),
  coverLetter: z.string().trim().max(2000, "ההסבר ארוך מדי").optional().default(""),
  pricingPackageId: z.string().trim().optional(),
  adSpaceAssetId: z.string().trim().optional(),
});

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

export type ApplicationFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
} | null;

export const APPLICATION_FORM_INITIAL: ApplicationFormState = { status: "idle" };

/** עמלת הפלטפורמה מתוך העסקה */
export const PLATFORM_FEE_RATE = 0.1;
