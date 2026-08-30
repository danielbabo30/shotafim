import type { GlobalConfig } from "payload";
import { previewPath } from "@/lib/admin-preview";

/**
 * הגדרות אתר גלובליות — לוגו, כפתורי כניסה, וכל תוכן ה-Footer.
 * כמעט כל מה שרואים במעטפת האתר נשלט מכאן.
 */
export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: { he: "הגדרות אתר" },
  access: {
    read: () => true,
  },
  admin: {
    group: { he: "הגדרות אתר" },
    preview: previewPath("/"),
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        // ── מיתוג ──
        {
          label: { he: "מיתוג" },
          fields: [
            {
              name: "siteName",
              label: { he: "שם האתר" },
              type: "text",
              required: true,
              defaultValue: "שותפים",
              admin: { description: "משמש לכותרות, meta, וכטקסט חלופי ללוגו" },
            },
            {
              name: "logo",
              label: { he: "לוגו" },
              type: "upload",
              relationTo: "media",
              admin: { description: "מוצג בהדר ובפוטר. ניתן להחליף בכל עת." },
            },
          ],
        },

        // ── כפתורי כניסה / איזור אישי ──
        {
          label: { he: "כניסה ואיזור אישי" },
          fields: [
            {
              name: "auth",
              label: { he: "כניסה" },
              type: "group",
              fields: [
                {
                  name: "personalAreaUrl",
                  label: { he: "קישור לאיזור האישי" },
                  type: "text",
                  required: true,
                  defaultValue: "/dashboard",
                },
                {
                  name: "loginUrl",
                  label: { he: "קישור להתחברות" },
                  type: "text",
                  required: true,
                  defaultValue: "/sign-in",
                },
                {
                  name: "signupUrl",
                  label: { he: "קישור להרשמה" },
                  type: "text",
                  required: true,
                  defaultValue: "/sign-in",
                },
                {
                  name: "loginLabel",
                  label: { he: "טקסט כפתור התחברות" },
                  type: "text",
                  required: true,
                  defaultValue: "התחברות",
                },
                {
                  name: "signupLabel",
                  label: { he: "טקסט כפתור הרשמה" },
                  type: "text",
                  required: true,
                  defaultValue: "הרשמה למערכת",
                },
                {
                  name: "loggedInLabel",
                  label: { he: "טקסט כפתור כשמחוברים" },
                  type: "text",
                  required: true,
                  defaultValue: "האזור האישי",
                },
              ],
            },
          ],
        },

        // ── Footer ──
        {
          label: { he: "פוטר" },
          fields: [
            {
              name: "footerTagline",
              label: { he: "תיאור קצר (מתחת ללוגו)" },
              type: "textarea",
              defaultValue:
                "המרקטפלייס הבטוח והמתקדם ביותר לחיבור בין מותגים ליוצרי תוכן ושטחי פרסום דיגיטליים.",
            },
            {
              name: "footerColumns",
              label: { he: "עמודות קישורים" },
              type: "array",
              labels: { singular: { he: "עמודה" }, plural: { he: "עמודות" } },
              fields: [
                {
                  name: "heading",
                  label: { he: "כותרת העמודה" },
                  type: "text",
                  required: true,
                },
                {
                  name: "links",
                  label: { he: "קישורים" },
                  type: "array",
                  labels: { singular: { he: "קישור" }, plural: { he: "קישורים" } },
                  fields: [
                    { name: "label", label: { he: "טקסט" }, type: "text", required: true },
                    { name: "href", label: { he: "כתובת" }, type: "text", required: true },
                  ],
                },
              ],
            },
            {
              name: "newsletter",
              label: { he: "ניוזלטר" },
              type: "group",
              fields: [
                {
                  name: "enabled",
                  label: { he: "הצג טופס ניוזלטר" },
                  type: "checkbox",
                  defaultValue: true,
                },
                {
                  name: "heading",
                  label: { he: "כותרת" },
                  type: "text",
                  defaultValue: "הצטרפו לניוזלטר",
                },
                {
                  name: "text",
                  label: { he: "טקסט" },
                  type: "text",
                  defaultValue: "עדכונים חודשיים על הזדמנויות וקמפיינים חדשים.",
                },
                {
                  name: "placeholder",
                  label: { he: "טקסט בשדה" },
                  type: "text",
                  defaultValue: "אימייל עסקי",
                },
              ],
            },
            {
              name: "legalLinks",
              label: { he: "קישורים משפטיים (שורה תחתונה)" },
              type: "array",
              labels: { singular: { he: "קישור" }, plural: { he: "קישורים" } },
              fields: [
                { name: "label", label: { he: "טקסט" }, type: "text", required: true },
                { name: "href", label: { he: "כתובת" }, type: "text", required: true },
              ],
            },
            {
              name: "copyrightHolder",
              label: { he: "שם בזכויות היוצרים" },
              type: "text",
              defaultValue: "שותפים",
              admin: { description: "יוצג כ: © {שנה} {שם}. כל הזכויות שמורות." },
            },
          ],
        },
      ],
    },
  ],
};
