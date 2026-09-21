/**
 * קטגוריות הדומיין (מותגים / יוצרים / שטחי פרסום) — מקור אמת לתוויות ה-scope.
 * הקטגוריות עצמן מנוהלות ב-Payload (collection `categories`, עריכה דרך /admin);
 * טבלאות הקשר ב-Prisma שומרות `categorySlug` בלבד.
 *
 * קובץ זה נטול server-only בכוונה — נטען גם ב-CMS (הגדרת ה-collection),
 * גם ברכיבי שרת וגם ברכיבי לקוח (מסנני חיפוש).
 */

export const CATEGORY_SCOPES = [
  { value: "BRAND", he: "מותגים ועסקים" },
  { value: "CREATOR", he: "יוצרי תוכן" },
  { value: "AD_SPACE", he: "שטחי פרסום" },
] as const;

export type CategoryScope = (typeof CATEGORY_SCOPES)[number]["value"];

export const CATEGORY_SCOPE_VALUES = CATEGORY_SCOPES.map((s) => s.value) as CategoryScope[];

export const CATEGORY_SCOPE_LABELS = Object.fromEntries(
  CATEGORY_SCOPES.map((s) => [s.value, s.he]),
) as Record<CategoryScope, string>;

export function isCategoryScope(value: string): value is CategoryScope {
  return CATEGORY_SCOPE_VALUES.includes(value as CategoryScope);
}

/** צורת קטגוריה כפי שהאפליקציה צורכת אותה (מנורמלת מ-Payload / מברירות המחדל). */
export type PartnerCategory = {
  slug: string;
  name: string;
  scopes: CategoryScope[];
  iconName: string | null;
  parentSlug: string | null;
  sortOrder: number;
};
