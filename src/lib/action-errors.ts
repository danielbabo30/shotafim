/**
 * שגיאות של server actions שמשמשים כ-form action (מחזירים void) — במקום `throw`
 * (שמציג דף 500 גולמי) מבצעים redirect עם קוד שגיאה ב-query, והעמוד מציג הודעה.
 * קובץ טהור (בלי server-only): מותר לייבא גם מרכיבי לקוח.
 */
export const ACTION_ERROR_MESSAGES = {
  "application-not-found": "ההצעה לא נמצאה.",
  "application-not-pending": "אפשר לאשר רק הצעה שממתינה למענה.",
  "asset-clash": "השטח כבר משובץ בתאריכים המבוקשים. בחרו חלון אחר.",
  "asset-unavailable": "שטח הפרסום שבהצעה אינו זמין יותר (הושבת או נמחק).",
  "missing-partner-terms": "לבריף חסרים תנאי שותפות — לא ניתן לאשר הצעת תשלום פר רכישה.",
  "campaign-not-found": "הקמפיין לא נמצא.",
  "campaign-has-contracts": "לא ניתן לבטל קמפיין שנפתחו בו חוזים.",
  "campaign-not-publishable": "אפשר לפרסם רק טיוטה.",
  "campaign-incomplete":
    "לפני פרסום יש להשלים תיאור (לפחות 20 תווים), תוצר אחד לפחות ותקציב — ערכו את הקמפיין ונסו שוב.",
  "campaign-ended": "תאריך הסיום של הקמפיין עבר.",
  "invitation-not-found": "ההזמנה לא נמצאה.",
  "conversation-invalid": "לא ניתן לפתוח שיחה עם משתמש זה.",
  "business-not-found": "העסק לא נמצא או אינו פעיל.",
  "busy-retry": "הפעולה לא הושלמה בגלל עומס — נסו שוב.",
} as const;

export type ActionErrorCode = keyof typeof ACTION_ERROR_MESSAGES;

export function actionErrorMessage(code: string | string[] | undefined): string | null {
  if (typeof code !== "string") return null;
  return (ACTION_ERROR_MESSAGES as Record<string, string>)[code] ?? null;
}

export function withActionError(path: string, code: ActionErrorCode): string {
  return `${path}${path.includes("?") ? "&" : "?"}err=${code}`;
}
