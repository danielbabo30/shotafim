import type { GlobalConfig } from "payload";
import { previewPath } from "@/lib/admin-preview";

/**
 * תוכן עמוד "צור קשר" — נשלט במלואו מפאנל הניהול.
 * הפריסה (שתי עמודות) והאייקונים קבועים בקוד; רק הטקסטים והפרטים נערכים כאן.
 * כל שינוי במבנה כאן → לעדכן ידנית את `ContactPage` ב-src/payload-types.ts.
 */

export const ContactPage: GlobalConfig = {
  slug: "contact-page",
  label: { he: "עמוד — צור קשר" },
  access: {
    read: () => true,
  },
  admin: {
    group: { he: "עיצוב האתר" },
    preview: previewPath("/contact"),
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        // ── כותרת ראשית ──
        {
          label: { he: "כותרת ראשית" },
          fields: [
            {
              name: "hero",
              label: { he: "Hero" },
              type: "group",
              fields: [
                {
                  name: "headingLead",
                  label: { he: "כותרת — חלק ראשון" },
                  type: "text",
                  required: true,
                },
                {
                  name: "headingHighlight",
                  label: { he: "כותרת — חלק מודגש (בגרדיאנט)" },
                  type: "text",
                  required: true,
                },
                {
                  name: "headingTail",
                  label: { he: "כותרת — חלק אחרון" },
                  type: "text",
                },
                {
                  name: "body",
                  label: { he: "פסקת תיאור" },
                  type: "textarea",
                  required: true,
                },
              ],
            },
          ],
        },

        // ── טופס ──
        {
          label: { he: "טופס" },
          fields: [
            {
              name: "form",
              label: { he: "טופס הפנייה" },
              type: "group",
              fields: [
                {
                  name: "heading",
                  label: { he: "כותרת הטופס" },
                  type: "text",
                  required: true,
                },
                {
                  name: "note",
                  label: { he: "הודעת שירות (מוצגת מעל הטופס)" },
                  type: "textarea",
                  required: true,
                  admin: {
                    description: "כרגע הטופס להדגמה בלבד — הטקסט הזה מזכיר שפניות עדיין לא נשלחות.",
                  },
                },
                {
                  name: "submitLabel",
                  label: { he: "טקסט כפתור השליחה" },
                  type: "text",
                  required: true,
                },
                {
                  name: "successTitle",
                  label: { he: "כותרת הודעת הצלחה" },
                  type: "text",
                  required: true,
                },
                {
                  name: "successBody",
                  label: { he: "טקסט הודעת הצלחה" },
                  type: "textarea",
                  required: true,
                },
                {
                  name: "subjects",
                  label: { he: "נושאי פנייה (רשימה נפתחת)" },
                  type: "array",
                  labels: { singular: { he: "נושא" }, plural: { he: "נושאים" } },
                  fields: [{ name: "label", label: { he: "טקסט" }, type: "text", required: true }],
                },
              ],
            },
          ],
        },

        // ── פרטי קשר ──
        {
          label: { he: "פרטי קשר" },
          fields: [
            {
              name: "details",
              label: { he: "כרטיס פרטי קשר" },
              type: "group",
              admin: {
                description:
                  'האימייל, הטלפון, הכתובת והשעות עצמם מנוהלים ב"מידע על החברה" ומוצגים כאן אוטומטית. כאן רק הכותרת וההערה של הכרטיס.',
              },
              fields: [
                {
                  name: "heading",
                  label: { he: "כותרת הכרטיס" },
                  type: "text",
                  required: true,
                },
                {
                  name: "note",
                  label: { he: "הערה (מתחת לפרטים)" },
                  type: "textarea",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
