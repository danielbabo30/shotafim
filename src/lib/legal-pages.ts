/**
 * המסמכים המשפטיים — קבוצה סגורה של 4 מסמכים, כל אחד עם URL משלו תחת /legal.
 * מקור אמת יחיד לסדר הטאבים, לתוויות ול-slugs. נטען גם בשרת (route, lib/legal.ts,
 * collection) וגם בלקוח (legal-nav). קובץ זה נטול server-only בכוונה.
 *
 * הוספת/הסרת מסמך כאן → לעדכן `LegalPageSlugValue` ב-src/payload-types.ts
 * ואת האפשרויות בשדה `slug` ב-src/collections/LegalPages.ts.
 */

export const LEGAL_PAGES = [
  { slug: "accessibility", label: "הצהרת נגישות", short: "נגישות" },
  { slug: "privacy", label: "מדיניות פרטיות", short: "פרטיות" },
  { slug: "terms", label: "תנאי שימוש", short: "תנאי שימוש" },
  { slug: "cookies", label: "מדיניות קובצי Cookie", short: "קובצי Cookie" },
] as const;

export type LegalPageSlug = (typeof LEGAL_PAGES)[number]["slug"];

export const LEGAL_PAGE_SLUGS = LEGAL_PAGES.map((p) => p.slug) as LegalPageSlug[];

export function isLegalPageSlug(value: string): value is LegalPageSlug {
  return LEGAL_PAGE_SLUGS.includes(value as LegalPageSlug);
}

export function legalPageLabel(slug: LegalPageSlug): string {
  return LEGAL_PAGES.find((p) => p.slug === slug)?.label ?? slug;
}
