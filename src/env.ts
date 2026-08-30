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
});

const parsed = schema.safeParse(process.env);

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
