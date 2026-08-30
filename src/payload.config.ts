import path from "path";
import { fileURLToPath } from "url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { he } from "@payloadcms/translations/languages/he";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Users } from "@/collections/Users";
import { Media } from "@/collections/Media";
import { Posts } from "@/collections/Posts";
import { Guides } from "@/collections/Guides";
import { LegalPages } from "@/collections/LegalPages";
import { SiteSettings } from "@/globals/SiteSettings";
import { MainNavigation } from "@/globals/MainNavigation";
import { CompanyInfo } from "@/globals/CompanyInfo";
import { Homepage } from "@/globals/Homepage";
import { HowItWorks } from "@/globals/HowItWorks";
import { SolutionsCreators } from "@/globals/SolutionsCreators";
import { SolutionsBrands } from "@/globals/SolutionsBrands";
import { SolutionsAdSpaces } from "@/globals/SolutionsAdSpaces";
import { ContactPage } from "@/globals/ContactPage";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

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

  collections: [Users, Media, Posts, Guides, LegalPages],
  globals: [
    SiteSettings,
    MainNavigation,
    CompanyInfo,
    Homepage,
    HowItWorks,
    SolutionsCreators,
    SolutionsBrands,
    SolutionsAdSpaces,
    ContactPage,
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
    push: process.env.NODE_ENV === "development",
  }),

  sharp,
});
