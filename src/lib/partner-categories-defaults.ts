import type { CategoryScope } from "@/lib/partner-categories";

/**
 * רשימת קטגוריות התחלתית — משמשת גם כ-seed ל-Payload (GET /dev/seed) וגם
 * כ-fallback אם ה-collection ריק/לא זמין. אחרי הזריעה ניתן לערוך/להוסיף דרך /admin.
 *
 * slug: אותיות אנגלית קטנות, מספרים ומקפים. משמש כמפתח בטבלאות הקשר ב-Prisma —
 * שינוי slug של קטגוריה קיימת ינתק שיוכים קיימים.
 */

export type PartnerCategorySeed = {
  slug: string;
  name: string;
  scopes: CategoryScope[];
  iconName?: string;
  parentSlug?: string;
};

export const PARTNER_CATEGORY_SEEDS: PartnerCategorySeed[] = [
  { slug: "food-beverage", name: "מזון ומשקאות", scopes: ["BRAND", "CREATOR"] },
  { slug: "restaurants-cafes", name: "מסעדנות ובתי קפה", scopes: ["BRAND", "AD_SPACE"] },
  { slug: "fashion", name: "אופנה והנעלה", scopes: ["BRAND", "CREATOR"] },
  { slug: "beauty-cosmetics", name: "יופי וקוסמטיקה", scopes: ["BRAND", "CREATOR"] },
  { slug: "health-wellness", name: "בריאות ואיכות חיים", scopes: ["BRAND", "CREATOR"] },
  { slug: "fitness-sport", name: "כושר וספורט", scopes: ["BRAND", "CREATOR"] },
  { slug: "technology", name: "טכנולוגיה וגאדג'טים", scopes: ["BRAND", "CREATOR", "AD_SPACE"] },
  { slug: "gaming", name: "גיימינג", scopes: ["BRAND", "CREATOR"] },
  { slug: "travel-tourism", name: "תיירות ונופש", scopes: ["BRAND", "CREATOR", "AD_SPACE"] },
  { slug: "home-design", name: "בית ועיצוב", scopes: ["BRAND", "CREATOR"] },
  { slug: "parenting-family", name: "הורות ומשפחה", scopes: ["BRAND", "CREATOR"] },
  { slug: "automotive", name: "רכב ותחבורה", scopes: ["BRAND", "CREATOR", "AD_SPACE"] },
  { slug: "finance-insurance", name: "פיננסים וביטוח", scopes: ["BRAND", "CREATOR", "AD_SPACE"] },
  { slug: "real-estate", name: 'נדל"ן', scopes: ["BRAND", "CREATOR", "AD_SPACE"] },
  { slug: "education-learning", name: "חינוך והדרכה", scopes: ["BRAND", "CREATOR"] },
  { slug: "business-b2b", name: "עסקים ו-B2B", scopes: ["BRAND", "CREATOR", "AD_SPACE"] },
  { slug: "ecommerce-retail", name: "קמעונאות ומסחר", scopes: ["BRAND", "AD_SPACE"] },
  { slug: "entertainment-music", name: "בידור ומוזיקה", scopes: ["BRAND", "CREATOR", "AD_SPACE"] },
  { slug: "culture-arts", name: "תרבות ואמנות", scopes: ["BRAND", "CREATOR", "AD_SPACE"] },
  { slug: "news-current-affairs", name: "חדשות ואקטואליה", scopes: ["CREATOR", "AD_SPACE"] },
  { slug: "lifestyle", name: "לייפסטייל", scopes: ["CREATOR"] },
  { slug: "comedy-content", name: "קומדיה ובידור רשת", scopes: ["CREATOR"] },
  { slug: "pets", name: "חיות מחמד", scopes: ["BRAND", "CREATOR"] },
  { slug: "sustainability", name: "קיימות וסביבה", scopes: ["BRAND", "CREATOR"] },
  { slug: "outdoor-billboards", name: "שילוט חוצות", scopes: ["AD_SPACE"] },
  { slug: "digital-screens", name: "מסכים דיגיטליים", scopes: ["AD_SPACE"] },
  { slug: "public-transport", name: "תחבורה ציבורית", scopes: ["AD_SPACE"] },
  { slug: "newsletters", name: "ניוזלטרים", scopes: ["AD_SPACE"] },
  { slug: "podcasts", name: "פודקאסטים", scopes: ["AD_SPACE", "CREATOR"] },
];
