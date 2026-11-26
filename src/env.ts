import { z } from "zod";

/**
 * אימות משתני סביבה בזמן טעינה.
 * אם חסר משתנה חובה — האפליקציה תיפול מיד עם הודעה ברורה, ולא באמצע ריצה.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // בסיס נתונים
  DATABASE_URL: z.string().min(1, "חסר DATABASE_URL (מחרוזת חיבור ל-Postgres)"),
  DIRECT_URL: z.string().min(1, "חסר DIRECT_URL (חיבור ישיר למיגרציות)"),

  // Payload CMS
  PAYLOAD_SECRET: z.string().min(1, "חסר PAYLOAD_SECRET — צור עם: openssl rand -base64 33"),

  // Auth.js
  AUTH_SECRET: z.string().min(1, "חסר AUTH_SECRET — צור עם: openssl rand -base64 33"),
  AUTH_URL: z.url().optional(),
  AUTH_TRUST_HOST: z
    .string()
    .optional()
    .transform((v) => v === "true"),

  // ספקי כניסה — אופציונליים בשלב זה
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  AUTH_RESEND_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // "תשלום פר רכישה" — מנוע המעקב (WP-2)
  // סוד הצפנה למפתחות ה-API של תוסף ה-WooCommerce (base64 של 32 בייטים). אופציונלי בפיתוח —
  // בלעדיו הצימוד יכשל עם הודעה ברורה.
  TRACK_KEY_SECRET: z.string().optional(),
  // סוד ל-endpoints של ה-cron (Authorization: Bearer). אופציונלי בפיתוח (ראה /api/cron/*).
  CRON_SECRET: z.string().optional(),

  // חיבור OAuth אמיתי לפלטפורמות יוצרים (יוטיוב וכו') — WP-5.
  // סוד הצפנה לטוקני refresh (base64 של 32 בייטים), אותה תבנית AES-256-GCM כמו TRACK_KEY_SECRET.
  // אופציונלי בפיתוח — בלעדיו ההצפנה/פענוח ייכשלו עם הודעה ברורה.
  OAUTH_TOKEN_SECRET: z.string().optional(),
  // חיבור OAuth אמיתי ליוטיוב (Google) — src/app/api/connect/youtube/*.
  // אופציונליים בפיתוח — בלעדיהם ה-route של החיבור ייכשל עם הודעה ברורה.
  YOUTUBE_OAUTH_CLIENT_ID: z.string().optional(),
  YOUTUBE_OAUTH_CLIENT_SECRET: z.string().optional(),
  // חיבור OAuth אמיתי לפייסבוק/אינסטגרם (Meta Graph API) — src/app/api/connect/facebook/*.
  // אופציונליים בפיתוח — בלעדיהם ה-route של החיבור ייכשל עם הודעה ברורה.
  FACEBOOK_OAUTH_CLIENT_ID: z.string().optional(),
  FACEBOOK_OAUTH_CLIENT_SECRET: z.string().optional(),
  // "Facebook Login for Business" מתעלם מ-scope ב-URL — הוא דורש Configuration ID
  // (Meta dashboard → Facebook Login for Business → Configurations). בלעדיו מסך ההסכמה
  // מבקש רק שם+תמונה. עם config_id — מבקש את ההרשאות והנכסים שהוגדרו ב-configuration.
  FACEBOOK_LOGIN_CONFIG_ID: z.string().optional(),

  // אחסון קבצים. local (ברירת מחדל, dev בלבד) | gcs (Cloud Storage) | blob (לא ממומש).
  STORAGE_DRIVER: z.enum(["local", "gcs", "blob"]).default("local"),
  // שם ה-bucket הפרטי ב-Cloud Storage — חובה כש-STORAGE_DRIVER=gcs.
  GCS_BUCKET: z.string().optional(),
});

const parsed = schema
  .superRefine((v, ctx) => {
    if (v.STORAGE_DRIVER === "gcs" && !v.GCS_BUCKET) {
      ctx.addIssue({
        code: "custom",
        path: ["GCS_BUCKET"],
        message: "STORAGE_DRIVER=gcs דורש GCS_BUCKET (שם ה-bucket הפרטי)",
      });
    }
    // הקשחות ייצור (SEC-M-11 / SEC-A-17): כשל בהפעלה במקום ברירת מחדל חלשה
    if (v.NODE_ENV !== "production") return;
    if (v.PAYLOAD_SECRET.length < 16) {
      ctx.addIssue({
        code: "custom",
        path: ["PAYLOAD_SECRET"],
        message: "בפרודקשן PAYLOAD_SECRET חייב להיות באורך 16 תווים לפחות",
      });
    }
    if (v.AUTH_SECRET.length < 16) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_SECRET"],
        message: "בפרודקשן AUTH_SECRET חייב להיות באורך 16 תווים לפחות",
      });
    }
    if (!v.AUTH_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_URL"],
        message: "בפרודקשן חובה להגדיר AUTH_URL (מונע Host header injection בקישורי כניסה)",
      });
    }
  })
  .safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(
    `\n❌ משתני סביבה לא תקינים:\n${issues}\n\nהעתק .env.example ל-.env ומלא ערכים.\n`,
  );
}

export const env = parsed.data;

/** האם ספק Google מוגדר ומוכן לשימוש */
export const hasGoogle = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
/** האם כניסה במייל (Resend) מוגדרת ומוכנה לשימוש */
export const hasEmail = Boolean(env.AUTH_RESEND_KEY && env.EMAIL_FROM);
/** האם הצפנת מפתחות תוסף המעקב זמינה */
export const hasTrackKeySecret = Boolean(env.TRACK_KEY_SECRET);
/** האם הצפנת טוקני OAuth של ערוצי יוצרים זמינה */
export const hasOAuthTokenSecret = Boolean(env.OAUTH_TOKEN_SECRET);
/** האם חיבור OAuth ליוטיוב מוגדר ומוכן לשימוש */
export const hasYouTubeOAuth = Boolean(
  env.YOUTUBE_OAUTH_CLIENT_ID && env.YOUTUBE_OAUTH_CLIENT_SECRET,
);
/** האם חיבור OAuth לפייסבוק/אינסטגרם מוגדר ומוכן לשימוש */
export const hasFacebookOAuth = Boolean(
  env.FACEBOOK_OAUTH_CLIENT_ID && env.FACEBOOK_OAUTH_CLIENT_SECRET,
);
