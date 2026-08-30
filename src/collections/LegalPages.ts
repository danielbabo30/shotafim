import type { CollectionConfig } from "payload";
import { PROSE_BLOCKS } from "@/collections/content-blocks";
import { LEGAL_PAGES } from "@/lib/legal-pages";

/**
 * מסמכים משפטיים — /legal/[slug]. קבוצה סגורה של 4 מסמכים (נגישות, פרטיות,
 * תנאי שימוש, קובצי Cookie); ה-slug נבחר מרשימה קבועה כדי שלא ייווצרו כתובות
 * שבורות. גוף המסמך נבנה מבלוקי הפרוזה המשותפים.
 *
 * כל שינוי במבנה כאן → לעדכן ידנית את `LegalPage` ב-src/payload-types.ts.
 * הוספת מסמך → להוסיף גם ל-`LEGAL_PAGES` ב-src/lib/legal-pages.ts.
 */
export const LegalPages: CollectionConfig = {
  slug: "legal-pages",
  labels: {
    singular: { he: "מסמך משפטי" },
    plural: { he: "מסמכים משפטיים" },
  },
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "updatedAt"],
    group: { he: "תוכן" },
  },
  fields: [
    {
      name: "slug",
      label: { he: "מסמך" },
      type: "select",
      required: true,
      unique: true,
      index: true,
      admin: { description: "קובע את כתובת ה-URL: /legal/<slug>. לכל מסמך ערך אחד בלבד." },
      options: LEGAL_PAGES.map((p) => ({ value: p.slug, label: { he: p.label } })),
    },
    {
      name: "title",
      label: { he: "כותרת המסמך" },
      type: "text",
      required: true,
    },
    {
      name: "intro",
      label: { he: "פסקת פתיחה (מתחת לכותרת)" },
      type: "textarea",
      admin: { description: "אופציונלי. משמשת גם כ-meta description כברירת מחדל." },
    },
    {
      name: "body",
      label: { he: "גוף המסמך" },
      type: "blocks",
      minRows: 1,
      labels: { singular: { he: "בלוק" }, plural: { he: "בלוקים" } },
      blocks: PROSE_BLOCKS,
    },
    {
      name: "seo",
      label: { he: "SEO (אופציונלי)" },
      type: "group",
      admin: { description: "אם ריק — נגזר מהכותרת ומפסקת הפתיחה." },
      fields: [
        { name: "metaTitle", label: { he: "כותרת מטא" }, type: "text" },
        { name: "metaDescription", label: { he: "תיאור מטא" }, type: "textarea" },
      ],
    },
  ],
};
