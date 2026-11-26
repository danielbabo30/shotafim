import { paymentsUiEnabled } from "@/env";
import { PAYMENTS_UNAVAILABLE_MESSAGE } from "@/lib/payments-notice";

export { PAYMENTS_UNAVAILABLE_MESSAGE, POC_PAYMENT_NOTICE } from "@/lib/payments-notice";

/**
 * דגל POC (PAYMENTS_UI_ENABLED) — שכבת הכסף (נאמנות/פיקדון/משיכה/חשבוניות) כבויה כשהדגל false.
 * שרת בלבד. רכיבי client מקבלים את הערך כ-prop מרכיב-שרת.
 */
export const arePaymentsEnabled = (): boolean => paymentsUiEnabled;

/** מחזיר state שגיאה מוכן (ContractActionState) לפעולות חסומות */
export const paymentsBlockedState = () => ({
  status: "error" as const,
  message: PAYMENTS_UNAVAILABLE_MESSAGE,
});
