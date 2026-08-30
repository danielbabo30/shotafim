/**
 * קטגוריות ו-audience של מדריכים — מקור אמת יחיד.
 * ה-collection `guides` בונה מכאן את אפשרויות ה-select;
 * הרכיבים משתמשים ב-`*_LABELS` להצגת התווית בעברית.
 * אין "server-only" — נצרך גם ברכיבי שרת וגם בהגדרת ה-CMS.
 */

export type GuideCategoryIcon = "rocket" | "bank" | "upload" | "gavel";

export const GUIDE_CATEGORIES = [
  {
    value: "getting-started",
    he: "התחלת עבודה ואימות",
    description: "מדריכים בסיסיים להקמת חשבון, אימות זהות והגדרות ראשוניות.",
    icon: "rocket",
  },
  {
    value: "escrow",
    he: "ניהול תקציב ונאמנות (Escrow)",
    description: "הכל על מנגנון התשלום המאובטח שלנו, הפקדות ושחרור כספים.",
    icon: "bank",
  },
  {
    value: "media-approval",
    he: "אישור והעלאת חומרי מדיה",
    description: "תהליכי אישור תוכן בין מותג ליוצר לפני פרסום הקמפיין.",
    icon: "upload",
  },
  {
    value: "disputes",
    he: "מחלוקות וביטולים",
    description: "מה עושים כשמשהו משתבש? תהליכי גישור וביטול עסקאות.",
    icon: "gavel",
  },
] as const satisfies ReadonlyArray<{
  value: string;
  he: string;
  description: string;
  icon: GuideCategoryIcon;
}>;

export type GuideCategory = (typeof GUIDE_CATEGORIES)[number]["value"];

export const GUIDE_CATEGORY_LABELS = Object.fromEntries(
  GUIDE_CATEGORIES.map((c) => [c.value, c.he]),
) as Record<GuideCategory, string>;

export const GUIDE_AUDIENCES = [
  { value: "advertiser", he: "מדריכים למפרסמים" },
  { value: "creator", he: "מדריכים למשפיענים" },
  { value: "media-owner", he: "מדריכים לבעלי מדיה" },
  { value: "finance", he: "כספים וחשבוניות" },
] as const;

export type GuideAudience = (typeof GUIDE_AUDIENCES)[number]["value"];

export const GUIDE_AUDIENCE_LABELS = Object.fromEntries(
  GUIDE_AUDIENCES.map((a) => [a.value, a.he]),
) as Record<GuideAudience, string>;
