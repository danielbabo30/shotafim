import type { GlobalConfig } from "payload";
import { previewPath } from "@/lib/admin-preview";

/**
 * מידע על החברה — מקור אמת יחיד.
 * כל מקום באתר שמציג פרטי חברה (עמוד צור-קשר, פוטר, סכמת Organization ל-SEO וכו')
 * קורא מכאן בלבד דרך `getCompanyInfo()` ב-src/lib/company-info.ts.
 * שינוי מבנה כאן → לעדכן ידנית את `CompanyInfo` ב-src/payload-types.ts.
 */
export const SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "linkedin",
  "x",
  "tiktok",
  "youtube",
] as const;

export const CompanyInfo: GlobalConfig = {
  slug: "company-info",
  label: { he: "מידע על החברה" },
  access: {
    read: () => true,
  },
  admin: {
    group: { he: "הגדרות אתר" },
    preview: previewPath("/contact"),
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        // ── כללי ──
        {
          label: { he: "כללי" },
          fields: [
            {
              name: "legalName",
              label: { he: "שם החברה" },
              type: "text",
              required: true,
              admin: { description: "השם הרשום. משמש בזכויות יוצרים ובסכמת SEO." },
            },
            {
              name: "registrationNumber",
              label: { he: "ח.פ. / ע.מ." },
              type: "text",
            },
          ],
        },

        // ── פרטי קשר ──
        {
          label: { he: "פרטי קשר" },
          fields: [
            {
              name: "email",
              label: { he: "אימייל ראשי" },
              type: "text",
              required: true,
            },
            {
              name: "supportEmail",
              label: { he: "אימייל תמיכה" },
              type: "text",
              admin: { description: "אופציונלי. אם ריק — משתמשים באימייל הראשי." },
            },
            {
              name: "phone",
              label: { he: "טלפון" },
              type: "text",
              required: true,
            },
            {
              name: "whatsapp",
              label: { he: "מספר WhatsApp" },
              type: "text",
              admin: {
                description: "עם קידומת מדינה, ספרות בלבד (למשל 972501234567). ריק = לא מוצג.",
              },
            },
          ],
        },

        // ── כתובת ושעות ──
        {
          label: { he: "כתובת ושעות" },
          fields: [
            {
              name: "address",
              label: { he: "כתובת מלאה" },
              type: "text",
              required: true,
              admin: { description: "בשורה אחת, למשל: רחוב הארבעה 21, תל אביב-יפו" },
            },
            {
              name: "mapUrl",
              label: { he: "קישור למפה (Google Maps)" },
              type: "text",
            },
            {
              name: "hours",
              label: { he: "שעות מענה" },
              type: "text",
              required: true,
              admin: { description: "למשל: ימים א׳–ה׳, 9:00–18:00" },
            },
            {
              name: "hoursNote",
              label: { he: "הערה לשעות" },
              type: "text",
            },
          ],
        },

        // ── רשתות חברתיות ──
        {
          label: { he: "רשתות חברתיות" },
          fields: [
            {
              name: "social",
              label: { he: "קישורים" },
              type: "array",
              labels: { singular: { he: "רשת" }, plural: { he: "רשתות" } },
              fields: [
                {
                  name: "platform",
                  label: { he: "פלטפורמה" },
                  type: "select",
                  required: true,
                  options: SOCIAL_PLATFORMS.map((value) => ({ label: value, value })),
                },
                {
                  name: "url",
                  label: { he: "כתובת" },
                  type: "text",
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
