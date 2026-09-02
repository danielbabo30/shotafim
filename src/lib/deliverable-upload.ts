/**
 * העלאת תוצרים בחדר העבודה — קבועים משותפים (לקוח + server action).
 * קובץ טהור (בלי server-only).
 */

export const MAX_UPLOAD_MB = 50;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/** סוגי קבצים מותרים להעלאה כתוצר */
export const ALLOWED_UPLOAD_MIME_PREFIXES = ["video/", "image/"] as const;
export const ALLOWED_UPLOAD_MIME_EXACT = ["application/pdf"] as const;

/** ל-accept של input[type=file] */
export const UPLOAD_ACCEPT = "video/*,image/*,application/pdf";

export function isAllowedUploadMime(mime: string): boolean {
  return (
    ALLOWED_UPLOAD_MIME_PREFIXES.some((p) => mime.startsWith(p)) ||
    (ALLOWED_UPLOAD_MIME_EXACT as readonly string[]).includes(mime)
  );
}

/** כיצד לרנדר את התוצר בחדר העבודה */
export type DeliverableMediaKind = "video" | "image" | "file";

export function mediaKindFromMime(mime: string | null | undefined): DeliverableMediaKind {
  if (!mime) return "file";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  return "file";
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}
