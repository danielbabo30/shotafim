import type { CollectionConfig } from "payload";
import { CATEGORY_SCOPES } from "@/lib/partner-categories";

/**
 * קטגוריות הדומיין — תחומי פעילות של מותגים, יוצרים ושטחי פרסום.
 * נתון עזר שנערך דרך /admin. טבלאות הקשר ב-Prisma (CreatorCategory וכו')
 * שומרות `categorySlug` בלבד — אין FK חוצה-schema.
 *
 * מחיקת קטגוריה בשימוש תשאיר שיוכים "יתומים" — עדיף isActive=false.
 * כל שינוי במבנה כאן → לעדכן ידנית את `Category` ב-src/payload-types.ts.
 */
export const Categories: CollectionConfig = {
  slug: "categories",
  labels: {
    singular: { he: "קטגוריה" },
    plural: { he: "קטגוריות" },
  },
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "scopes", "isActive", "sortOrder"],
    group: { he: "נתוני מערכת" },
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "name",
          label: { he: "שם הקטגוריה" },
          type: "text",
          required: true,
        },
        {
          name: "slug",
          label: { he: "מזהה (slug)" },
          type: "text",
          required: true,
          unique: true,
          index: true,
          admin: {
            description:
              "אותיות אנגלית קטנות, מספרים ומקפים בלבד. משמש כמפתח בשיוכים — שינוי בקטגוריה קיימת מנתק שיוכים.",
          },
          validate: (value: unknown) =>
            typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
              ? true
              : "slug חייב להיות אותיות אנגלית קטנות/מספרים עם מקפים (למשל: food-beverage)",
        },
      ],
    },
    {
      name: "scopes",
      label: { he: "רלוונטי ל־" },
      type: "select",
      hasMany: true,
      required: true,
      admin: { description: "לאילו סוגי פרופילים הקטגוריה מוצעת." },
      options: CATEGORY_SCOPES.map((s) => ({ value: s.value, label: { he: s.he } })),
    },
    {
      type: "row",
      fields: [
        {
          name: "parent",
          label: { he: "קטגוריית אב" },
          type: "relationship",
          relationTo: "categories",
          admin: { description: "אופציונלי — להגדרת היררכיה. ריק = קטגוריה ראשית." },
        },
        {
          name: "iconName",
          label: { he: "שם אייקון (Lucide)" },
          type: "text",
          admin: { description: "אופציונלי. למשל: shopping-bag, utensils, car." },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "isActive",
          label: { he: "פעילה" },
          type: "checkbox",
          defaultValue: true,
          admin: { description: "כבה במקום למחוק קטגוריה שכבר בשימוש." },
        },
        {
          name: "sortOrder",
          label: { he: "סדר הצגה" },
          type: "number",
          defaultValue: 0,
          admin: { description: "מספר נמוך = מוקדם יותר ברשימה." },
        },
      ],
    },
  ],
};
