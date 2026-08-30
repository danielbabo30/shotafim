import type { GlobalConfig, Field } from "payload";

/**
 * תוכן עמוד "פתרונות — לעסקים ומפרסמים" (/solutions/brands) — נשלט במלואו מפאנל הניהול.
 * האייקונים והפריסה קבועים בקוד; רק הטקסטים והקישורים נערכים כאן.
 * כל שינוי במבנה כאן → לעדכן ידנית את `SolutionsBrands` ב-src/payload-types.ts.
 */

const cta = (name: string, label: string, required = false): Field => ({
  name,
  label: { he: label },
  type: "group",
  fields: [
    { name: "label", label: { he: "טקסט" }, type: "text", required },
    { name: "href", label: { he: "כתובת (URL)" }, type: "text", required },
  ],
});

export const SolutionsBrands: GlobalConfig = {
  slug: "solutions-brands",
  label: { he: "עמוד — פתרונות לעסקים" },
  access: {
    read: () => true,
  },
  admin: {
    group: { he: "עיצוב האתר" },
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
                { name: "badge", label: { he: "תווית קטנה (מעל הכותרת)" }, type: "text" },
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
                { name: "headingTail", label: { he: "כותרת — חלק אחרון" }, type: "text" },
                {
                  name: "body",
                  label: { he: "פסקת תיאור" },
                  type: "textarea",
                  required: true,
                },
                cta("primaryCta", "כפתור ראשי"),
                cta("secondaryCta", "כפתור משני"),
              ],
            },
          ],
        },

        // ── נתונים ──
        {
          label: { he: "נתונים" },
          fields: [
            {
              name: "stats",
              label: { he: "מספרים מרכזיים" },
              type: "array",
              labels: { singular: { he: "מספר" }, plural: { he: "מספרים" } },
              admin: { description: "מומלץ 3 פריטים." },
              fields: [
                { name: "value", label: { he: "ערך" }, type: "text", required: true },
                { name: "label", label: { he: "תיאור" }, type: "text", required: true },
              ],
            },
          ],
        },

        // ── מקטע יתרונות (זיג-זג) ──
        {
          label: { he: "יתרונות" },
          fields: [
            {
              name: "showcase",
              label: { he: "מקטע יתרונות" },
              type: "group",
              fields: [
                { name: "heading", label: { he: "כותרת המקטע" }, type: "text" },
                {
                  name: "items",
                  label: { he: "יתרונות" },
                  type: "array",
                  labels: { singular: { he: "יתרון" }, plural: { he: "יתרונות" } },
                  admin: { description: "מוצג בפריסת זיג-זג לסירוגין." },
                  fields: [
                    {
                      name: "icon",
                      label: { he: "אייקון" },
                      type: "select",
                      required: true,
                      defaultValue: "chart",
                      options: [
                        { label: { he: "גרף / ביצועים" }, value: "chart" },
                        { label: { he: "מנעול / נאמנות" }, value: "lock" },
                        { label: { he: "מגן" }, value: "shield" },
                        { label: { he: "חשבונית" }, value: "receipt" },
                        { label: { he: "ברק / אוטומציה" }, value: "bolt" },
                        { label: { he: "טיל / התחלה" }, value: "rocket" },
                      ],
                    },
                    { name: "title", label: { he: "כותרת" }, type: "text", required: true },
                    { name: "body", label: { he: "תיאור" }, type: "textarea", required: true },
                    {
                      name: "points",
                      label: { he: "נקודות (רשימת וי)" },
                      type: "array",
                      labels: { singular: { he: "נקודה" }, plural: { he: "נקודות" } },
                      fields: [
                        { name: "text", label: { he: "טקסט" }, type: "text", required: true },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },

        // ── תהליך העבודה ──
        {
          label: { he: "תהליך העבודה" },
          fields: [
            {
              name: "workflow",
              label: { he: "מקטע תהליך העבודה" },
              type: "group",
              fields: [
                {
                  name: "heading",
                  label: { he: "כותרת המקטע" },
                  type: "text",
                  required: true,
                },
                { name: "subheading", label: { he: "תת-כותרת" }, type: "textarea" },
                {
                  name: "steps",
                  label: { he: "שלבים" },
                  type: "array",
                  labels: { singular: { he: "שלב" }, plural: { he: "שלבים" } },
                  admin: { description: "3 שלבים." },
                  fields: [
                    { name: "title", label: { he: "כותרת" }, type: "text", required: true },
                    { name: "body", label: { he: "תיאור" }, type: "textarea", required: true },
                  ],
                },
              ],
            },
          ],
        },

        // ── קריאה לפעולה ──
        {
          label: { he: "קריאה לפעולה" },
          fields: [
            {
              name: "cta",
              label: { he: "מקטע קריאה לפעולה" },
              type: "group",
              fields: [
                {
                  name: "headingLead",
                  label: { he: "כותרת — חלק ראשון" },
                  type: "text",
                  required: true,
                },
                { name: "headingTail", label: { he: "כותרת — חלק אחרון" }, type: "text" },
                {
                  name: "body",
                  label: { he: "פסקת תיאור" },
                  type: "textarea",
                  required: true,
                },
                cta("action", "כפתור", true),
              ],
            },
          ],
        },
      ],
    },
  ],
};
