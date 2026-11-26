/**
 * העלאת תוצרים בחדר העבודה — קבועים משותפים (לקוח + server action).
 * קובץ טהור (בלי server-only).
 */

export const MAX_UPLOAD_MB = 50;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/** סוגי קבצים מותרים להעלאה כתוצר */
export const ALLOWED_UPLOAD_MIME_PREFIXES = ["video/"] as const;
/** תמונות: רשימה סגורה בלבד. בכוונה בלי image/svg+xml (XSS מאוחסן — SVG יכול להכיל script). */
export const ALLOWED_UPLOAD_MIME_EXACT = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

/** ל-accept של input[type=file] */
export const UPLOAD_ACCEPT =
  "video/*,image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf";

export function isAllowedUploadMime(mime: string): boolean {
  const m = mime.toLowerCase().trim();
  return (
    ALLOWED_UPLOAD_MIME_PREFIXES.some((p) => m.startsWith(p)) ||
    (ALLOWED_UPLOAD_MIME_EXACT as readonly string[]).includes(m)
  );
}

/** סוגים שבטוח להציג inline בדפדפן; כל השאר מוגש כ-attachment. */
export function isSafeInlineMime(mime: string): boolean {
  const m = mime.toLowerCase().trim();
  return (
    m.startsWith("video/") ||
    m === "application/pdf" ||
    ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(m)
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

/**
 * בדיקת "magic bytes": האם תוכן הקובץ תואם לסוג שהלקוח הצהיר עליו.
 * `File.type` מגיע מהלקוח ואינו אמין, ולכן מאמתים גם את חתימת הקובץ בצד השרת.
 */
export function bytesMatchMime(bytes: Uint8Array, mime: string): boolean {
  const m = mime.toLowerCase().trim();
  const startsWith = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  const ascii = (offset: number, text: string) =>
    [...text].every((c, i) => bytes[offset + i] === c.charCodeAt(0));

  if (m === "image/jpeg") return startsWith(0xff, 0xd8, 0xff);
  if (m === "image/png") return startsWith(0x89, 0x50, 0x4e, 0x47);
  if (m === "image/gif") return ascii(0, "GIF8");
  if (m === "image/webp") return ascii(0, "RIFF") && ascii(8, "WEBP");
  if (m === "image/avif") return ascii(4, "ftyp") && (ascii(8, "avif") || ascii(8, "avis"));
  if (m === "application/pdf") return ascii(0, "%PDF");
  if (m.startsWith("video/")) {
    // mp4 / mov / m4v: "ftyp" ב-offset 4. webm / mkv: EBML. avi: RIFF....AVI
    return (
      ascii(4, "ftyp") ||
      startsWith(0x1a, 0x45, 0xdf, 0xa3) ||
      (ascii(0, "RIFF") && ascii(8, "AVI "))
    );
  }
  return false;
}
