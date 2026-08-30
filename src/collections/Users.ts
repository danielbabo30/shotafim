import type { CollectionConfig } from "payload";

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
  auth: true,
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
