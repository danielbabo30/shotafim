import type { ReviewSentiment } from "@prisma/client";

/**
 * ביקורת דו-צדדית אחרי סיום חוזה — קבועים משותפים (לקוח + server action).
 * קובץ טהור (בלי server-only).
 */

/** ה-sentiment נגזר אוטומטית מהדירוג הכללי */
export function sentimentFromRating(rating: number): ReviewSentiment {
  if (rating >= 4) return "POSITIVE";
  if (rating === 3) return "NEUTRAL";
  return "NEGATIVE";
}

export const REVIEW_SUB_CRITERIA = [
  { name: "punctualityRating", label: "עמידה בזמנים" },
  { name: "communicationRating", label: "תקשורת ושירות" },
  { name: "paymentRating", label: "הוגנות ותשלום" },
] as const;

export type ReviewFormState = { ok?: boolean; error?: string } | null;
export const REVIEW_FORM_INITIAL: ReviewFormState = null;
