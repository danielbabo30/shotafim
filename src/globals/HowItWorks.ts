import type { GlobalConfig } from "payload";
import { previewPath } from "@/lib/admin-preview";

/**
 * תוכן עמוד "איך זה עובד" — נשלט במלואו מפאנל הניהול.
 * האייקונים והפריסה קבועים בקוד; רק הטקסטים והקישורים נערכים כאן.
 * כל שינוי במבנה כאן → לעדכן ידנית את `HowItWorks` ב-src/payload-types.ts.
 */

export const HowItWorks: GlobalConfig = {
  slug: "how-it-works",
  label: { he: "עמוד — איך זה עובד" },
  access: {
    read: () => true,
  },
  admin: {
    group: { he: "עיצוב האתר" },
    preview: previewPath("/how-it-works"),
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        // ── Hero ──
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

        // ── ציר התהליך ──
        {
          label: { he: "ציר התהליך" },
          fields: [
            {
              name: "timeline",
              label: { he: "מקטע ציר התהליך" },
              type: "group",
              fields: [
                {
                  name: "heading",
                  label: { he: "כותרת המקטע" },
                  type: "text",
                  required: true,
                },
                {
                  name: "steps",
                  label: { he: "שלבים" },
                  type: "array",
                  labels: { singular: { he: "שלב" }, plural: { he: "שלבים" } },
                  admin: { description: "4 שלבים." },
                  fields: [
                    {
                      name: "icon",
                      label: { he: "אייקון" },
                      type: "select",
                      required: true,
                      defaultValue: "lock",
                      options: [
                        { label: { he: "מנעול" }, value: "lock" },
                        { label: { he: "העלאת קובץ" }, value: "upload" },
                        { label: { he: "רמקול / קמפיין" }, value: "campaign" },
                        { label: { he: "חשבונית" }, value: "receipt" },
                        { label: { he: "מגן" }, value: "shield" },
                      ],
                    },
                    { name: "title", label: { he: "כותרת" }, type: "text", required: true },
                    { name: "body", label: { he: "תיאור" }, type: "textarea", required: true },
                  ],
                },
              ],
            },
          ],
        },

        // ── טבלת השוואה ──
        {
          label: { he: "טבלת השוואה" },
          fields: [
            {
              name: "comparison",
              label: { he: "מקטע השוואה" },
              type: "group",
              fields: [
                {
                  name: "heading",
                  label: { he: "כותרת המקטע" },
                  type: "text",
                  required: true,
                },
                {
                  name: "oldWay",
                  label: { he: "השיטה הישנה (ללא הגנה)" },
                  type: "group",
                  fields: [
                    { name: "title", label: { he: "כותרת" }, type: "text", required: true },
                    {
                      name: "points",
                      label: { he: "נקודות" },
                      type: "array",
                      labels: { singular: { he: "נקודה" }, plural: { he: "נקודות" } },
                      fields: [
                        { name: "text", label: { he: "טקסט" }, type: "textarea", required: true },
                      ],
                    },
                  ],
                },
                {
                  name: "newWay",
                  label: { he: "עסקה מוגנת במערכת" },
                  type: "group",
                  fields: [
                    { name: "title", label: { he: "כותרת" }, type: "text", required: true },
                    {
                      name: "points",
                      label: { he: "נקודות" },
                      type: "array",
                      labels: { singular: { he: "נקודה" }, plural: { he: "נקודות" } },
                      fields: [
                        {
                          name: "lead",
                          label: { he: "מילה מודגשת (בתחילת השורה)" },
                          type: "text",
                        },
                        { name: "text", label: { he: "טקסט" }, type: "textarea", required: true },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },

        // ── שאלות נפוצות ──
        {
          label: { he: "שאלות נפוצות" },
          fields: [
            {
              name: "faq",
              label: { he: "מקטע שאלות נפוצות" },
              type: "group",
              fields: [
                {
                  name: "heading",
                  label: { he: "כותרת המקטע" },
                  type: "text",
                  required: true,
                },
                {
                  name: "items",
                  label: { he: "שאלות" },
                  type: "array",
                  labels: { singular: { he: "שאלה" }, plural: { he: "שאלות" } },
                  fields: [
                    { name: "question", label: { he: "שאלה" }, type: "text", required: true },
                    { name: "answer", label: { he: "תשובה" }, type: "textarea", required: true },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
