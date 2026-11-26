import path from "path";
import { fileURLToPath } from "url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { gcsStorage } from "@payloadcms/storage-gcs";
import { he } from "@payloadcms/translations/languages/he";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Users } from "@/collections/Users";
import { Media } from "@/collections/Media";
import { Posts } from "@/collections/Posts";
import { Guides } from "@/collections/Guides";
import { LegalPages } from "@/collections/LegalPages";
import { Categories } from "@/collections/Categories";
import { SiteSettings } from "@/globals/SiteSettings";
import { MainNavigation } from "@/globals/MainNavigation";
import { CompanyInfo } from "@/globals/CompanyInfo";
import { Homepage } from "@/globals/Homepage";
import { HowItWorks } from "@/globals/HowItWorks";
import { AuthPanel } from "@/globals/AuthPanel";
import { RegisterRoles } from "@/globals/RegisterRoles";
import { SolutionsCreators } from "@/globals/SolutionsCreators";
import { SolutionsBrands } from "@/globals/SolutionsBrands";
import { SolutionsAdSpaces } from "@/globals/SolutionsAdSpaces";
import { ContactPage } from "@/globals/ContactPage";

// SEC-M-11: בפרודקשן לא עולים עם secret ריק/קצר (חתימת JWT/הצפנה חלשה)
if (process.env.NODE_ENV === "production" && (process.env.PAYLOAD_SECRET ?? "").length < 16) {
  throw new Error("PAYLOAD_SECRET חסר או קצר מדי (נדרשים 16 תווים לפחות) — לא עולים בפרודקשן.");
}

// Cloud Run: אין דיסק קבוע — קבצי Media נשמרים ב-bucket פרטי של Cloud Storage.
const useGcs = process.env.STORAGE_DRIVER === "gcs";
if (useGcs && !process.env.GCS_BUCKET) {
  throw new Error("STORAGE_DRIVER=gcs דורש את המשתנה GCS_BUCKET.");
}

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * מקורות מורשים ל-CSRF/CORS של Payload (SEC-M-03). Payload דורש Origin תואם לבקשות
 * עם עוגייה — כל מקור אחר נדחה. מקור האתר מגיע מ-AUTH_URL.
 */
const siteOrigin = process.env.AUTH_URL?.replace(/\/+$/, "");
const allowedOrigins = [siteOrigin, "http://localhost:3000", "https://localhost:3000"].filter(
  (o): o is string =>
    Boolean(o) && (process.env.NODE_ENV !== "production" || !o!.includes("localhost")),
);

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: "· ניהול שותפים",
    },
  },

  // עברית בפאנל הניהול
  i18n: {
    fallbackLanguage: "he",
    supportedLanguages: { he },
  },

  collections: [Users, Media, Posts, Guides, LegalPages, Categories],
  globals: [
    SiteSettings,
    MainNavigation,
    CompanyInfo,
    Homepage,
    HowItWorks,
    AuthPanel,
    RegisterRoles,
    SolutionsCreators,
    SolutionsBrands,
    SolutionsAdSpaces,
    ContactPage,
  ],

  // CSRF: בקשות עם עוגייה רק ממקורות מורשים. CORS: אותה רשימה — אין CORS פתוח (*).
  csrf: allowedOrigins,
  cors: allowedOrigins,

  // GraphQL: בפרודקשן ללא playground וללא introspection, עם הגבלת מורכבות (SEC-M-03)
  graphQL: {
    disablePlaygroundInProduction: true,
    disableIntrospectionInProduction: true,
    maxComplexity: 1000,
  },

  // תקרת גודל קובץ להעלאות ל-Media (10MB)
  upload: { limits: { fileSize: 10 * 1024 * 1024 } },

  // ב-GCS ההגשה נשארת דרך ה-route של Payload (/api/media/file/...) — ה-bucket פרטי.
  // התחברות דרך Application Default Credentials (ה-service account של Cloud Run).
  // alwaysInsertFields: שדה ה-prefix קיים בסכמה בכל סביבה (בלי drift בין dev לפרודקשן).
  plugins: [
    gcsStorage({
      enabled: useGcs,
      alwaysInsertFields: true,
      bucket: process.env.GCS_BUCKET || "unset",
      collections: { media: true },
      options: {},
    }),
  ],

  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",

  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },

  db: postgresAdapter({
    // חיבור ישיר (לא דרך pooler) — יציב יותר ל-DDL
    pool: {
      connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
    // סכמת PG נפרדת כדי לא להתנגש בטבלאות של Prisma (schema public)
    schemaName: "payload",
    // push רק ב-development — בפרודקשן אין שינוי סכמה אוטומטי (ראה docs/deploy/gcp-cloud-run.md).
    push: process.env.NODE_ENV === "development",
  }),

  sharp,
});
