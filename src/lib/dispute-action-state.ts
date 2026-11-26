import type { DisputeActionState } from "@/lib/actions/dispute-actions";

/** מצב התחלתי ל-useActionState של פעולות מחלוקת (לא יכול לחיות בקובץ "use server"). */
export const DISPUTE_ACTION_INITIAL: DisputeActionState = { status: "idle" };
