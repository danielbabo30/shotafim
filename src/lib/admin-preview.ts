/**
 * עוזר לכפתור "פתח בפרונט" בעורך של Payload (admin.preview).
 * מחזיר URL מלא לעמוד באתר, כדי שאחרי עריכה קל לקפוץ ולראות איך המשתמש רואה אותו.
 */
const BASE = process.env.AUTH_URL || "http://localhost:3000";

export function frontendUrl(pathname: string): string {
  return `${BASE}${pathname}`;
}

/** ל-globals עם עמוד קבוע */
export const previewPath = (pathname: string) => () => frontendUrl(pathname);

/** ל-collections עם עמוד לפי slug */
export const previewBySlug =
  (prefix: string) =>
  (doc: unknown): string | null => {
    const slug = (doc as { slug?: string } | null)?.slug;
    return slug ? frontendUrl(`${prefix}/${slug}`) : null;
  };
