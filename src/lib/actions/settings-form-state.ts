/**
 * טיפוס ה-state המשותף לכל טפסי ההגדרות (useActionState) + ערך ההתחלה שלו.
 * בקובץ נפרד ובלי "use server": קובץ "use server" (settings-actions.ts) מותר לו
 * לייצא רק async functions — קבוע (SETTINGS_FORM_INITIAL) לא חוקי שם.
 */

export type SettingsFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
} | null;

export const SETTINGS_FORM_INITIAL: SettingsFormState = { status: "idle" };
