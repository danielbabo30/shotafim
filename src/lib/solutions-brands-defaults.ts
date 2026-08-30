import type { SolutionsBrands } from "@/payload-types";

/**
 * תוכן עמוד "פתרונות — לעסקים ומפרסמים" — משמש גם כ-seed הראשוני ל-global
 * `solutions-brands`, וגם כ-fallback אם ה-CMS עדיין ריק או לא זמין.
 * לאחר seed, העריכה נעשית מ-/admin.
 */

type SolutionsBrandsData = Omit<SolutionsBrands, "id" | "updatedAt" | "createdAt">;

export const DEFAULT_SOLUTIONS_BRANDS_HERO: SolutionsBrands["hero"] = {
  badge: "מיוחד לעסקים ומפרסמים",
  headingLead: "נהלו קמפיינים משפיענים",
  headingHighlight: "בביטחון מלא",
  body: "הפלטפורמה המאובטחת לחיבור בין מותגים ליוצרי תוכן מובילים. אוטומציה מלאה, תקציב מוגן בנאמנות ותוצאות מדידות — בלי חוזים מסורבלים ובלי מרדף אחרי תוצרים.",
  primaryCta: { label: "הצטרפו כמותג", href: "/sign-in" },
  secondaryCta: { label: "איך זה עובד?", href: "/how-it-works" },
};

export const DEFAULT_SOLUTIONS_BRANDS_STATS: NonNullable<SolutionsBrands["stats"]> = [
  { value: "+1,200", label: "מותגים פעילים" },
  { value: "98%", label: "שביעות רצון" },
  { value: "100%", label: "הגנת תקציב בנאמנות" },
];

export const DEFAULT_SOLUTIONS_BRANDS_SHOWCASE: SolutionsBrands["showcase"] = {
  heading: "כל מה שצריך כדי לנהל קמפיין — במקום אחד",
  items: [
    {
      icon: "chart",
      title: "ניהול קמפיינים חכם",
      body: "מערכת ניהול מתקדמת למעקב אחר ביצועים, אישור תכנים ותשלומים במקום אחד. קבלו שליטה מלאה על התקציב לאורך כל הקמפיין.",
      points: [
        { text: "דשבורד ביצועים בזמן אמת" },
        { text: "תהליך אישור תוכן מובנה עם ניהול גרסאות" },
      ],
    },
    {
      icon: "lock",
      title: "תשלומים מאובטחים (Escrow)",
      body: "התקציב שלכם מוגן בארנק נאמנות ומשתחרר ליוצר רק לאחר אישור התוכן הסופי. פתרון שמבטיח שקט נפשי לשני הצדדים.",
      points: [
        { text: "הגנת תקציב מלאה עד לאישור הסופי" },
        { text: "שחרור תשלום אוטומטי והפקת חשבונית מס דיגיטלית" },
      ],
    },
  ],
};

export const DEFAULT_SOLUTIONS_BRANDS_WORKFLOW: SolutionsBrands["workflow"] = {
  heading: "איך זה עובד?",
  subheading: "שלושה צעדים — מהגדרת הקמפיין ועד לשחרור התשלום.",
  steps: [
    {
      title: "הגדרת קמפיין",
      body: "הגדירו תקציב, יעדים ודרישות תוכן. התקציב מופקד לארנק הנאמנות ונעול עד לאישור.",
    },
    {
      title: "בחירת יוצרים",
      body: "סננו ובחרו יוצרים מתאימים מתוך מאגר היוצרים המאומת, לפי נתוני קהל אמיתיים.",
    },
    {
      title: "אישור ושחרור תשלום",
      body: "אשרו את התוכן הסופי במערכת — והתשלום משתחרר ליוצר אוטומטית ובבטחה.",
    },
  ],
};

export const DEFAULT_SOLUTIONS_BRANDS_CTA: SolutionsBrands["cta"] = {
  headingLead: "מוכנים להתחיל לעבוד חכם יותר?",
  body: "הצטרפו למאות מותגים שכבר מנהלים קמפיינים בביטחון מלא ובמינימום חיכוך.",
  action: { label: "התחילו עכשיו", href: "/sign-in" },
};

export const DEFAULT_SOLUTIONS_BRANDS: SolutionsBrandsData = {
  hero: DEFAULT_SOLUTIONS_BRANDS_HERO,
  stats: DEFAULT_SOLUTIONS_BRANDS_STATS,
  showcase: DEFAULT_SOLUTIONS_BRANDS_SHOWCASE,
  workflow: DEFAULT_SOLUTIONS_BRANDS_WORKFLOW,
  cta: DEFAULT_SOLUTIONS_BRANDS_CTA,
};
