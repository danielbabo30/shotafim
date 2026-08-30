import type { CollectionConfig } from "payload";

/**
 * קבצי מדיה — לוגו, תמונות, אייקונים. מנוהל דרך פאנל הניהול.
 */
export const Media: CollectionConfig = {
  slug: "media",
  labels: {
    singular: { he: "קובץ מדיה" },
    plural: { he: "מדיה" },
  },
  access: {
    read: () => true,
  },
  upload: {
    mimeTypes: ["image/*"],
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
