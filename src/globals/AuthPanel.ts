import type { GlobalConfig } from "payload";
import { previewPath } from "@/lib/admin-preview";

/**
 * הפאנל הצדדי (הכהה) של מסכי ההרשמה והכניסה — נשלט במלואו מפאנל הניהול.
 * הפריסה, הגרדיאנט והאייקונים קבועים בקוד; רק טקסטים ותמונות נערכים כאן.
 * כל שינוי במבנה כאן → לעדכן ידנית את `AuthPanel` ב-src/payload-types.ts.
 */

export const AuthPanel: GlobalConfig = {
  slug: "auth-panel",
  label: { he: "פאנל הרשמה / כניסה" },
  access: {
    read: () => true,
  },
  admin: {
    group: { he: "עיצוב האתר" },
    preview: previewPath("/register"),
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        // ── כותרת ──
        {
          label: { he: "כותרת" },
          fields: [
            {
              name: "statusLabel",
              label: { he: "תווית סטטוס (בפינה העליונה)" },
              type: "text",
              defaultValue: "מערכת פעילה",
            },
            {
              name: "heading",
              label: { he: "כותרת ראשית" },
              type: "group",
              fields: [
                {
                  name: "lead",
                  label: { he: "כותרת — חלק ראשון" },
                  type: "text",
                  required: true,
                },
                {
                  name: "highlight",
                  label: { he: "כותרת — חלק מודגש (בצבע)" },
                  type: "text",
                  required: true,
                },
              ],
            },
            {
              name: "body",
              label: { he: "פסקת תיאור" },
              type: "textarea",
              required: true,
            },
          ],
        },

        // ── וידג'ט נתונים ──
        {
          label: { he: "וידג'ט נתונים" },
          fields: [
            {
              name: "metric",
              label: { he: "וידג'ט נאמנות" },
              type: "group",
              fields: [
                {
                  name: "label",
                  label: { he: "תווית (מעל המספר)" },
                  type: "text",
                  required: true,
                },
                {
                  name: "value",
                  label: { he: "מספר מרכזי" },
                  type: "text",
                  required: true,
                  admin: { description: 'לדוגמה: "₪1,842,500"' },
                },
                {
                  name: "steps",
                  label: { he: "שלבי התהליך" },
                  type: "array",
                  labels: { singular: { he: "שלב" }, plural: { he: "שלבים" } },
                  admin: { description: "3 שלבים." },
                  fields: [
                    {
                      name: "icon",
                      label: { he: "אייקון" },
                      type: "select",
                      required: true,
                      defaultValue: "lock",
                      options: [
                        { label: { he: "מנעול" }, value: "lock" },
                        { label: { he: "וידאו" }, value: "video" },
                        { label: { he: "תשלום" }, value: "payments" },
                      ],
                    },
                    { name: "label", label: { he: "טקסט" }, type: "text", required: true },
                  ],
                },
                {
                  name: "trustText",
                  label: { he: "טקסט אמון (ליד האווטרים)" },
                  type: "text",
                  admin: { description: 'לדוגמה: "+850 יוצרים מאומתים"' },
                },
                {
                  name: "trustAvatars",
                  label: { he: "תמונות אווטר" },
                  type: "array",
                  labels: { singular: { he: "תמונה" }, plural: { he: "תמונות" } },
                  admin: { description: "מומלץ 3. אם ריק — יוצגו עיגולים ניטרליים." },
                  fields: [
                    {
                      name: "image",
                      label: { he: "תמונה" },
                      type: "upload",
                      relationTo: "media",
                      required: true,
                    },
                  ],
                },
              ],
            },
          ],
        },

        // ── המלצה ──
        {
          label: { he: "המלצה" },
          fields: [
            {
              name: "testimonial",
              label: { he: "ציטוט המלצה" },
              type: "group",
              fields: [
                {
                  name: "quote",
                  label: { he: "טקסט הציטוט" },
                  type: "textarea",
                  required: true,
                },
                { name: "name", label: { he: "שם הממליץ" }, type: "text", required: true },
                {
                  name: "photo",
                  label: { he: "תמונת הממליץ" },
                  type: "upload",
                  relationTo: "media",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
