import type { ContractStatus, SubmissionStatus } from "@prisma/client";

/**
 * קבועים + עוזרי מצב לחדר העבודה של חוזה (עמוד אישור תוצרים).
 * קובץ טהור (בלי server-only) — משמש גם רכיבי לקוח.
 */

/** מצב שמחזירות פעולות החוזה (useActionState) */
export type ContractActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const CONTRACT_ACTION_INITIAL: ContractActionState = { status: "idle" };

/** מי מהצדדים צופה בחדר העבודה */
export type ContractParty = "brand" | "provider";

/** האם המפרסם יכול להפקיד תקציב לנאמנות עכשיו */
export const canFundEscrow = (status: ContractStatus, hasEscrow: boolean): boolean =>
  status === "AWAITING_ESCROW" && !hasEscrow;

/** האם הספק יכול להעלות תוצר עכשיו */
export const canSubmitDeliverable = (status: ContractStatus): boolean => status === "ACTIVE";

export const CONTRACT_STATUS_META: Record<ContractStatus, { label: string; className: string }> = {
  AWAITING_ESCROW: {
    label: "ממתין להפקדה",
    className: "bg-warning-container text-warning",
  },
  ACTIVE: { label: "בעבודה", className: "bg-primary-fixed text-on-primary-fixed" },
  SUBMITTED_FOR_REVIEW: {
    label: "ממתין לאישור",
    className: "bg-warning-container text-warning",
  },
  APPROVED: { label: "אושר ושולם", className: "bg-success-container text-success" },
  DISPUTED: { label: "במחלוקת", className: "bg-error-container text-on-error-container" },
  REFUNDED: { label: "הוחזר למפרסם", className: "bg-surface-container text-on-surface-variant" },
};

export const SUBMISSION_STATUS_META: Record<
  SubmissionStatus,
  { label: string; className: string }
> = {
  PENDING_REVIEW: { label: "ממתין לבדיקה", className: "bg-warning-container text-warning" },
  REVISION_REQUESTED: {
    label: "נדרש תיקון",
    className: "bg-error-container text-on-error-container",
  },
  APPROVED: { label: "אושר", className: "bg-success-container text-success" },
};

/** האם ניתן לאשר תוצר ולשחרר תשלום במצב הנוכחי */
export const canApproveContract = (
  status: ContractStatus,
  latestSubmissionStatus: SubmissionStatus | null,
): boolean => status === "SUBMITTED_FOR_REVIEW" && latestSubmissionStatus === "PENDING_REVIEW";

/** האם נותרו סבבי תיקונים ויש הגשה פתוחה לבדיקה */
export const canRequestRevision = (
  status: ContractStatus,
  latestSubmissionStatus: SubmissionStatus | null,
  roundsUsed: number,
  roundsMax: number,
): boolean =>
  status === "SUBMITTED_FOR_REVIEW" &&
  latestSubmissionStatus === "PENDING_REVIEW" &&
  roundsUsed < roundsMax;

/** שניות → "MM:SS" */
export const formatTimecode = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
};

/** "MM:SS" → שניות, או null אם לא תקין */
export const parseTimecode = (value: string): number | null => {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const seconds = Number(m[1]) * 60 + Number(m[2]);
  return Number.isFinite(seconds) ? seconds : null;
};
