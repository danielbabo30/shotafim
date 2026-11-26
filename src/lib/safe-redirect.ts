/**
 * מאפשר רק נתיב יחסי באתר (מתחיל ב-/ ולא ב-// או /\, בלי תווי בקרה).
 * כל ערך אחר (כתובת מוחלטת, //evil.com, javascript:) → fallback.
 * לשימוש בכל callbackUrl / next / redirectTo שמגיע מהלקוח.
 */
export function safeRelativePath(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\\\r\n\t]/.test(value)) return fallback;
  return value;
}
