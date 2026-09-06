/**
 * העלאת תמונות פרופיל/רקע ליוצר — קבועים משותפים (לקוח + server action).
 * קובץ טהור (בלי server-only).
 */

export const MAX_PROFILE_IMAGE_MB = 5;
export const MAX_PROFILE_IMAGE_BYTES = MAX_PROFILE_IMAGE_MB * 1024 * 1024;

/** סוגי קבצים מותרים לתמונת פרופיל/רקע */
export const PROFILE_IMAGE_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/** ל-accept של input[type=file] */
export const PROFILE_IMAGE_ACCEPT = Object.keys(PROFILE_IMAGE_MIME).join(",");

export function isAllowedProfileImageMime(mime: string): boolean {
  return mime in PROFILE_IMAGE_MIME;
}

export type ProfileImageField = "avatar" | "cover";

/** הקידומת של תמונות שהועלו למערכת (בניגוד לקישור חיצוני שהוזן ידנית בעבר). */
export const PROFILE_IMAGE_URL_PREFIX = "/api/profile-images/";
