import type { CollectionConfig } from "payload";
import { publicContentAccess } from "@/lib/payload-access";

/**
 * קבצי מדיה — לוגו, תמונות, אייקונים. מנוהל דרך פאנל הניהול.
 */
export const Media: CollectionConfig = {
  slug: "media",
  labels: {
    singular: { he: "קובץ מדיה" },
    plural: { he: "מדיה" },
  },
  access: publicContentAccess,
  upload: {
    // SEC-M-05: ללא SVG (XSS ב-same-origin) — רשימה מפורשת בלבד
    mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"],
    imageSizes: [
      { name: "thumbnail", width: 300 },
      { name: "medium", width: 900 },
    ],
  },
  fields: [
    {
      name: "alt",
      label: { he: "טקסט חלופי (alt)" },
      type: "text",
      admin: {
        description: "תיאור קצר של התמונה לנגישות ו-SEO",
      },
    },
  ],
};
