import type { CollectionConfig } from "payload";
import { POST_CATEGORIES } from "@/lib/post-categories";
import { previewBySlug } from "@/lib/admin-preview";

/**
 * מאמרים / משאבים — בלוג האתר (/resources/blog).
 * גוף המאמר נבנה מבלוקים מעוצבים (blocks); הפריסה והאייקונים קבועים בקוד.
 * כל שינוי במבנה כאן → לעדכן ידנית את `Post` / `PostBlock` ב-src/payload-types.ts.
 */
export const Posts: CollectionConfig = {
  slug: "posts",
  labels: {
    singular: { he: "מאמר" },
    plural: { he: "מאמרים" },
  },
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "category", "publishedAt", "featured"],
    group: { he: "תוכן" },
    preview: previewBySlug("/resources/blog"),
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "title",
          label: { he: "כותרת" },
          type: "text",
          required: true,
        },
        {
          name: "slug",
          label: { he: "מזהה כתובת (slug)" },
          type: "text",
          required: true,
          unique: true,
          index: true,
          admin: {
            description: "אותיות אנגלית קטנות, מספרים ומקפים בלבד. מופיע ב-URL.",
          },
          validate: (value: unknown) =>
            typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
              ? true
              : "slug חייב להיות אותיות אנגלית קטנות/מספרים עם מקפים (למשל: results-based-campaigns)",
        },
      ],
    },
    {
      name: "excerpt",
      label: { he: "תקציר" },
      type: "textarea",
      required: true,
      admin: { description: "משפט–שניים. מוצג בכרטיסי המאמרים וכ-meta description." },
    },
    {
      type: "row",
      fields: [
        {
          name: "category",
          label: { he: "קטגוריה" },
          type: "select",
          required: true,
          options: POST_CATEGORIES.map((c) => ({ value: c.value, label: { he: c.he } })),
        },
        {
          name: "readingMinutes",
          label: { he: "דקות קריאה" },
          type: "number",
          required: true,
          min: 1,
          defaultValue: 5,
        },
        {
          name: "publishedAt",
          label: { he: "תאריך פרסום" },
          type: "date",
          required: true,
          admin: { date: { pickerAppearance: "dayOnly" } },
        },
      ],
    },
    {
      name: "featured",
      label: { he: "מאמר מרכזי (מוצג בראש עמוד המשאבים)" },
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "coverImage",
      label: { he: "תמונת נושא" },
      type: "upload",
      relationTo: "media",
    },
    {
      name: "author",
      label: { he: "כותב/ת" },
      type: "group",
      fields: [
        { name: "name", label: { he: "שם" }, type: "text", required: true },
        { name: "role", label: { he: "תפקיד" }, type: "text" },
        { name: "avatar", label: { he: "תמונה" }, type: "upload", relationTo: "media" },
        { name: "bio", label: { he: "תיאור קצר" }, type: "textarea" },
      ],
    },
    {
      name: "body",
      label: { he: "גוף המאמר" },
      type: "blocks",
      minRows: 1,
      labels: { singular: { he: "בלוק" }, plural: { he: "בלוקים" } },
      blocks: [
        {
          slug: "lead",
          labels: { singular: { he: "פסקת פתיחה" }, plural: { he: "פסקאות פתיחה" } },
          fields: [{ name: "text", label: { he: "טקסט" }, type: "textarea", required: true }],
        },
        {
          slug: "prose",
          labels: { singular: { he: "פסקה" }, plural: { he: "פסקאות" } },
          fields: [
            {
              name: "text",
              label: { he: "טקסט" },
              type: "textarea",
              required: true,
              admin: { description: "שורה ריקה כפולה = פסקה חדשה." },
            },
          ],
        },
        {
          slug: "heading",
          labels: { singular: { he: "כותרת ביניים" }, plural: { he: "כותרות ביניים" } },
          fields: [
            {
              name: "level",
              label: { he: "רמה" },
              type: "select",
              required: true,
              defaultValue: "h2",
              options: [
                { value: "h2", label: { he: "H2 — כותרת ראשית בגוף" } },
                { value: "h3", label: { he: "H3 — תת-כותרת" } },
              ],
            },
            { name: "text", label: { he: "טקסט" }, type: "text", required: true },
          ],
        },
        {
          slug: "image",
          labels: { singular: { he: "תמונה" }, plural: { he: "תמונות" } },
          fields: [
            {
              name: "image",
              label: { he: "קובץ" },
              type: "upload",
              relationTo: "media",
              required: true,
            },
            { name: "caption", label: { he: "כיתוב" }, type: "text" },
          ],
        },
        {
          slug: "quote",
          labels: { singular: { he: "ציטוט" }, plural: { he: "ציטוטים" } },
          fields: [
            { name: "text", label: { he: "טקסט" }, type: "textarea", required: true },
            { name: "attribution", label: { he: "מקור / שם" }, type: "text" },
          ],
        },
        {
          slug: "keyPoints",
          labels: { singular: { he: "תיבת נקודות מפתח" }, plural: { he: "תיבות נקודות מפתח" } },
          fields: [
            { name: "title", label: { he: "כותרת התיבה" }, type: "text", required: true },
            {
              name: "points",
              label: { he: "נקודות" },
              type: "array",
              minRows: 1,
              labels: { singular: { he: "נקודה" }, plural: { he: "נקודות" } },
              fields: [{ name: "text", label: { he: "טקסט" }, type: "text", required: true }],
            },
          ],
        },
        {
          slug: "callout",
          labels: { singular: { he: "כרטיס טיפ (כהה)" }, plural: { he: "כרטיסי טיפ" } },
          fields: [
            { name: "title", label: { he: "כותרת" }, type: "text", required: true },
            { name: "body", label: { he: "טקסט" }, type: "textarea", required: true },
          ],
        },
        {
          slug: "list",
          labels: { singular: { he: "רשימה" }, plural: { he: "רשימות" } },
          fields: [
            {
              name: "ordered",
              label: { he: "רשימה ממוספרת" },
              type: "checkbox",
              defaultValue: false,
              admin: { description: "מסומן = 1, 2, 3. לא מסומן = תבליטים." },
            },
            {
              name: "items",
              label: { he: "פריטים" },
              type: "array",
              minRows: 1,
              labels: { singular: { he: "פריט" }, plural: { he: "פריטים" } },
              fields: [
                {
                  name: "lead",
                  label: { he: "מילים מודגשות (בתחילת השורה)" },
                  type: "text",
                  admin: { description: "אופציונלי — מוצג במודגש לפני הטקסט." },
                },
                { name: "text", label: { he: "טקסט" }, type: "textarea", required: true },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "seo",
      label: { he: "SEO (אופציונלי)" },
      type: "group",
      admin: { description: "אם ריק — נגזר מהכותרת והתקציר." },
      fields: [
        { name: "metaTitle", label: { he: "כותרת מטא" }, type: "text" },
        { name: "metaDescription", label: { he: "תיאור מטא" }, type: "textarea" },
      ],
    },
  ],
};
