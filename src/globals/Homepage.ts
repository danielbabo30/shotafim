import type { GlobalConfig, Field } from "payload";
import { previewPath } from "@/lib/admin-preview";

/**
 * תוכן עמוד הבית — נשלט במלואו מפאנל הניהול.
 * האייקונים והפריסה (bento) קבועים בקוד; רק הטקסטים והקישורים נערכים כאן.
 * כל שינוי במבנה כאן → לעדכן ידנית את `Homepage` ב-src/payload-types.ts.
 */

const cta = (name: string, label: string): Field => ({
  name,
  label: { he: label },
  type: "group",
  fields: [
    { name: "label", label: { he: "טקסט" }, type: "text", required: true },
    { name: "href", label: { he: "כתובת (URL)" }, type: "text", required: true },
  ],
});

const bulletList = (name: string, label: string): Field => ({
  name,
  label: { he: label },
  type: "array",
  labels: { singular: { he: "פריט" }, plural: { he: "פריטים" } },
  fields: [{ name: "text", label: { he: "טקסט" }, type: "text", required: true }],
});

export const Homepage: GlobalConfig = {
  slug: "homepage",
  label: { he: "עמוד הבית" },
  access: {
    read: () => true,
  },
  admin: {
    group: { he: "עיצוב האתר" },
    preview: previewPath("/"),
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
                  name: "badge",
                  label: { he: "תווית קטנה (מעל הכותרת)" },
                  type: "text",
                },
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

        // ── כרטיסי תפקידים ──
        {
          label: { he: "כרטיסי תפקידים" },
          fields: [
            {
              name: "rolesHeading",
              label: { he: "כותרת המקטע" },
              type: "text",
              required: true,
            },
            {
              name: "rolesSubheading",
              label: { he: "תת-כותרת המקטע" },
              type: "textarea",
            },
            {
              name: "brandCard",
              label: { he: "כרטיס — מותגים" },
              type: "group",
              fields: [
                { name: "title", label: { he: "כותרת" }, type: "text", required: true },
                { name: "body", label: { he: "תיאור" }, type: "textarea", required: true },
                bulletList("features", "יתרונות"),
                cta("cta", "כפתור"),
              ],
            },
            {
              name: "influencerCard",
              label: { he: "כרטיס — משפיענים" },
              type: "group",
              fields: [
                { name: "badge", label: { he: "תווית פינה" }, type: "text" },
                { name: "title", label: { he: "כותרת" }, type: "text", required: true },
                { name: "body", label: { he: "תיאור" }, type: "textarea", required: true },
                bulletList("features", "יתרונות"),
                cta("cta", "כפתור"),
              ],
            },
            {
              name: "spaceCard",
              label: { he: "כרטיס — בעלי שטחים" },
              type: "group",
              fields: [
                { name: "title", label: { he: "כותרת" }, type: "text", required: true },
                { name: "body", label: { he: "תיאור" }, type: "textarea", required: true },
                bulletList("tags", "תגיות"),
                cta("cta", "כפתור"),
              ],
            },
          ],
        },

        // ── ארנק נאמנות ──
        {
          label: { he: "ארנק נאמנות" },
          fields: [
            {
              name: "escrow",
              label: { he: "מקטע ארנק נאמנות" },
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
                  label: { he: "כותרת — חלק מודגש" },
                  type: "text",
                  required: true,
                },
                {
                  name: "body",
                  label: { he: "פסקת תיאור" },
                  type: "textarea",
                  required: true,
                },
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

        // ── מאמרים אחרונים ──
        {
          label: { he: "מאמרים אחרונים" },
          fields: [
            {
              name: "articles",
              label: { he: "רצועת מאמרים אחרונים" },
              type: "group",
              admin: {
                description:
                  "המאמרים עצמם נמשכים אוטומטית (6 האחרונים לפי תאריך פרסום) מאוסף המאמרים. כאן עורכים רק את הכותרות והקישור.",
              },
              fields: [
                {
                  name: "enabled",
                  label: { he: "הצג את הרצועה בעמוד הבית" },
                  type: "checkbox",
                  defaultValue: true,
                },
                {
                  name: "heading",
                  label: { he: "כותרת המקטע" },
                  type: "text",
                  required: true,
                },
                {
                  name: "subheading",
                  label: { he: "תת-כותרת" },
                  type: "textarea",
                },
                {
                  name: "ctaLabel",
                  label: { he: "טקסט קישור (לכל המאמרים)" },
                  type: "text",
                },
                {
                  name: "ctaHref",
                  label: { he: "כתובת הקישור" },
                  type: "text",
                  defaultValue: "/resources/blog",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
