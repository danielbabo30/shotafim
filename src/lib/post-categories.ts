/**
 * קטגוריות מאמרים — מקור אמת יחיד.
 * ה-collection `posts` בונה מכאן את אפשרויות ה-select;
 * הרכיבים משתמשים ב-`POST_CATEGORY_LABELS` להצגת התווית בעברית.
 * אין "server-only" — נצרך גם ברכיבי שרת וגם בהגדרת ה-CMS.
 */

export const POST_CATEGORIES = [
  { value: "strategy", he: "אסטרטגיה" },
  { value: "advertiser-guide", he: "מדריך מפרסמים" },
  { value: "creator-guide", he: "מדריך יוצרים" },
  { value: "case-study", he: "מקרה בוחן" },
  { value: "technology", he: "טכנולוגיה" },
  { value: "product-news", he: "חדשות המערכת" },
  { value: "tools", he: "כלים" },
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number]["value"];

export const POST_CATEGORY_LABELS = Object.fromEntries(
  POST_CATEGORIES.map((c) => [c.value, c.he]),
) as Record<PostCategory, string>;
