import type { CollectionConfig } from "payload";
import { GUIDE_CATEGORIES, GUIDE_AUDIENCES } from "@/lib/guide-categories";
import { previewBySlug } from "@/lib/admin-preview";
import { PROSE_BLOCKS } from "@/collections/content-blocks";

/**
 * מדריכים / מרכז עזרה — /guides (לובי) ו-/guides/[slug] (מדריך בודד).
 * גוף המדריך נבנה מבלוקים מעוצבים (blocks); הפריסה והאייקונים קבועים בקוד.
 * כל שינוי במבנה כאן → לעדכן ידנית את `Guide` / `GuideBlock` ב-src/payload-types.ts.
 */
export const Guides: CollectionConfig = {
  slug: "guides",
  labels: {
    singular: { he: "מדריך" },
    plural: { he: "מדריכים" },
  },
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "category", "audience", "popular"],
    group: { he: "תוכן" },
    preview: previewBySlug("/guides"),
  },
  fields: [
    {
      type: "row",
      fields: [
        { name: "title", label: { he: "כותרת" }, type: "text", required: true },
        {
          name: "slug",
          label: { he: "מזהה כתובת (slug)" },
          type: "text",
          required: true,
          unique: true,
          index: true,
          admin: { description: "אותיות אנגלית קטנות, מספרים ומקפים בלבד. מופיע ב-URL." },
          validate: (value: unknown) =>
            typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
              ? true
              : "slug חייב להיות אותיות אנגלית קטנות/מספרים עם מקפים (למשל: release-escrow-funds)",
        },
      ],
    },
    {
      name: "excerpt",
      label: { he: "תקציר" },
      type: "textarea",
      required: true,
      admin: { description: "משפט–שניים. מוצג בכרטיסים בלובי וכ-meta description." },
    },
    {
      type: "row",
      fields: [
        {
          name: "category",
          label: { he: "קטגוריה" },
          type: "select",
          required: true,
          options: GUIDE_CATEGORIES.map((c) => ({ value: c.value, label: { he: c.he } })),
        },
        {
          name: "audience",
          label: { he: "קהל יעד" },
          type: "select",
          required: true,
          options: GUIDE_AUDIENCES.map((a) => ({ value: a.value, label: { he: a.he } })),
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "readingMinutes",
          label: { he: "דקות קריאה" },
          type: "number",
          required: true,
          min: 1,
          defaultValue: 4,
        },
        {
          name: "publishedAt",
          label: { he: "תאריך פרסום (למיון)" },
          type: "date",
          required: true,
          admin: { date: { pickerAppearance: "dayOnly" } },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "official",
          label: { he: 'תג "מדריך רשמי"' },
          type: "checkbox",
          defaultValue: true,
        },
        {
          name: "popular",
          label: { he: 'מוצג בשורת "מדריכים נפוצים ביותר"' },
          type: "checkbox",
          defaultValue: false,
        },
      ],
    },
    {
      name: "stepsBadge",
      label: { he: "תווית כרטיס (אופציונלי)" },
      type: "text",
      admin: {
        description: 'למשל "מדריך וידאו". אם ריק — נגזר אוטומטית "מדריך ב-N שלבים".',
      },
    },
    {
      name: "intro",
      label: { he: "פסקת פתיחה (מתחת לכותרת)" },
      type: "textarea",
      required: true,
    },
    {
      name: "prerequisites",
      label: { he: "תנאים מקדימים" },
      type: "array",
      labels: { singular: { he: "תנאי" }, plural: { he: "תנאים" } },
      fields: [{ name: "text", label: { he: "טקסט" }, type: "text", required: true }],
    },
    {
      name: "body",
      label: { he: "גוף המדריך" },
      type: "blocks",
      minRows: 1,
      labels: { singular: { he: "בלוק" }, plural: { he: "בלוקים" } },
      blocks: [
        ...PROSE_BLOCKS,
        {
          slug: "steps",
          labels: { singular: { he: "ציר שלבים" }, plural: { he: "צירי שלבים" } },
          fields: [
            { name: "heading", label: { he: "כותרת המקטע (אופציונלי)" }, type: "text" },
            {
              name: "steps",
              label: { he: "שלבים" },
              type: "array",
              minRows: 1,
              labels: { singular: { he: "שלב" }, plural: { he: "שלבים" } },
              fields: [
                { name: "title", label: { he: "כותרת השלב" }, type: "text", required: true },
                { name: "body", label: { he: "תיאור" }, type: "textarea", required: true },
                {
                  type: "row",
                  fields: [
                    { name: "ctaLabel", label: { he: "כפתור — טקסט (אופציונלי)" }, type: "text" },
                    { name: "ctaHref", label: { he: "כפתור — קישור" }, type: "text" },
                  ],
                },
              ],
            },
          ],
        },
        {
          slug: "caution",
          labels: { singular: { he: "אזהרה (אדום)" }, plural: { he: "אזהרות" } },
          fields: [
            { name: "title", label: { he: "כותרת" }, type: "text", required: true },
            { name: "body", label: { he: "טקסט" }, type: "textarea", required: true },
          ],
        },
      ],
    },
    {
      name: "nextGuideSlug",
      label: { he: "המדריך הבא — slug (אופציונלי)" },
      type: "text",
      admin: { description: 'slug של מדריך אחר, מוצג כקישור "המדריך הבא" בסרגל הצד.' },
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
