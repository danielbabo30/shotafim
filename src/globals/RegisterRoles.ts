import type { GlobalConfig, Field } from "payload";
import { previewPath } from "@/lib/admin-preview";

/**
 * שלב 2 בהרשמה — "בחירת תפקיד במערכת".
 * שלושת התפקידים (מפרסם / יוצר / בעל שטחים) קבועים בקוד — הם מושגי דומיין.
 * כאן נערכים רק טקסטי השכנוע: כותרות, תיאורים ונקודות היתרון לכל כרטיס.
 * כל שינוי במבנה כאן → לעדכן ידנית את `RegisterRoles` ב-src/payload-types.ts.
 */

const roleGroup = (name: string, label: string): Field => ({
  name,
  label: { he: label },
  type: "group",
  fields: [
    { name: "eyebrow", label: { he: "תווית עליונה" }, type: "text", required: true },
    { name: "title", label: { he: "כותרת" }, type: "text", required: true },
    { name: "subtitle", label: { he: "תיאור קצר" }, type: "text", required: true },
    {
      name: "benefits",
      label: { he: "נקודות יתרון" },
      type: "array",
      labels: { singular: { he: "נקודה" }, plural: { he: "נקודות" } },
      admin: { description: "3 נקודות." },
      fields: [{ name: "text", label: { he: "טקסט" }, type: "text", required: true }],
    },
  ],
});

export const RegisterRoles: GlobalConfig = {
  slug: "register-roles",
  label: { he: "הרשמה — בחירת תפקיד" },
  access: {
    read: () => true,
  },
  admin: {
    group: { he: "עיצוב האתר" },
    preview: previewPath("/register/roles"),
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: { he: "כותרת" },
          fields: [
            {
              name: "heading",
              label: { he: "כותרת ראשית" },
              type: "text",
              required: true,
            },
            {
              name: "subheading",
              label: { he: "תת-כותרת" },
              type: "textarea",
              required: true,
            },
          ],
        },
        {
          label: { he: "כרטיסי תפקיד" },
          fields: [
            roleGroup("brandRole", "מפרסם / עסק"),
            roleGroup("creatorRole", "יוצר תוכן / משפיען"),
            roleGroup("spaceRole", "בעל שטחי פרסום"),
          ],
        },
      ],
    },
  ],
};
