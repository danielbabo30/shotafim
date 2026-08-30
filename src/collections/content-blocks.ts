import type { Block } from "payload";

/**
 * בלוקי גוף משותפים לתוכן ארוך (מאמרים, מדריכים).
 * ה-rendering של הבלוקים האלה חי ב-`src/components/marketing/prose-blocks.tsx`.
 * כל שינוי כאן → לעדכן ידנית את `PostBlock` / `GuideBlock` ב-src/payload-types.ts.
 *
 * הערה: `src/collections/Posts.ts` מגדיר את אותם בלוקים inline מטעמים היסטוריים;
 * תוכן חדש (Guides) צורך מכאן.
 */
export const PROSE_BLOCKS: Block[] = [
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
      { name: "image", label: { he: "קובץ" }, type: "upload", relationTo: "media", required: true },
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
];
