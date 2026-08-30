import type { GlobalConfig } from "payload";
import { previewPath } from "@/lib/admin-preview";

/**
 * תפריט הניווט הראשי (Header).
 * ניתן להוסיף/להסיר/לסדר מחדש פריטים דרך פאנל הניהול.
 * כל פריט הוא קישור, או תפריט-נפתח עם פריטי-משנה.
 */
export const MainNavigation: GlobalConfig = {
  slug: "main-navigation",
  label: { he: "תפריט ניווט ראשי" },
  access: {
    read: () => true,
  },
  admin: {
    group: { he: "הגדרות אתר" },
    preview: previewPath("/"),
  },
  fields: [
    {
      name: "items",
      label: { he: "פריטי תפריט" },
      type: "array",
      labels: {
        singular: { he: "פריט" },
        plural: { he: "פריטים" },
      },
      fields: [
        {
          name: "label",
          label: { he: "כותרת" },
          type: "text",
          required: true,
        },
        {
          name: "type",
          label: { he: "סוג" },
          type: "radio",
          defaultValue: "link",
          options: [
            { label: { he: "קישור" }, value: "link" },
            { label: { he: "תפריט נפתח" }, value: "dropdown" },
          ],
          admin: { layout: "horizontal" },
        },
        {
          name: "href",
          label: { he: "כתובת (URL)" },
          type: "text",
          required: true,
          admin: {
            condition: (_, siblingData) => siblingData?.type !== "dropdown",
            description: "לדוגמה: /how-it-works",
          },
        },
        {
          name: "children",
          label: { he: "פריטי משנה" },
          type: "array",
          admin: {
            condition: (_, siblingData) => siblingData?.type === "dropdown",
          },
          labels: {
            singular: { he: "פריט משנה" },
            plural: { he: "פריטי משנה" },
          },
          fields: [
            {
              name: "label",
              label: { he: "כותרת" },
              type: "text",
              required: true,
            },
            {
              name: "href",
              label: { he: "כתובת (URL)" },
              type: "text",
              required: true,
            },
            {
              name: "description",
              label: { he: "תיאור קצר" },
              type: "text",
            },
          ],
        },
      ],
    },
  ],
};
