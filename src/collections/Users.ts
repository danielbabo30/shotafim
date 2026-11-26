import type { CollectionConfig } from "payload";
import { cmsUsersOnlyAccess } from "@/lib/payload-access";

/**
 * משתמשי ה-CMS (עורכי תוכן) — נפרד לגמרי ממשתמשי האפליקציה (טבלת User של Auth.js).
 * משמש להתחברות לפאנל הניהול ב-/admin.
 */
export const Users: CollectionConfig = {
  slug: "users",
  labels: {
    singular: { he: "משתמש" },
    plural: { he: "משתמשים" },
  },
  access: cmsUsersOnlyAccess,
  auth: {
    // נעילת חשבון אחרי 5 ניסיונות כושלים ל-10 דקות; עוגיות מחמירות (SEC-M-04)
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    cookies: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
    },
  },
  admin: {
    useAsTitle: "email",
    defaultColumns: ["name", "email"],
  },
  fields: [
    {
      name: "name",
      label: { he: "שם" },
      type: "text",
    },
  ],
};
