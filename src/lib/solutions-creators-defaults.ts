import type { SolutionsCreators } from "@/payload-types";

/**
 * תוכן עמוד "פתרונות — ליוצרי תוכן" — משמש גם כ-seed הראשוני ל-global
 * `solutions-creators`, וגם כ-fallback אם ה-CMS עדיין ריק או לא זמין.
 * לאחר seed, העריכה נעשית מ-/admin.
 */

type SolutionsCreatorsData = Omit<SolutionsCreators, "id" | "updatedAt" | "createdAt">;

export const DEFAULT_SOLUTIONS_CREATORS_HERO: SolutionsCreators["hero"] = {
  badge: "מיוחד ליוצרי תוכן ומשפיענים",
  headingLead: "התמקד ביצירת תוכן.",
  headingHighlight: "התשלום שלך כבר מובטח מראש.",
  body: "בלי מרדף אחרי לקוחות, בלי 'שוטף פלוס', ובלי חוזים מורכבים. שתף פעולה עם מותגים מובילים כשהכסף מחכה לך בנאמנות.",
  primaryCta: { label: "הצטרף כיוצר תוכן", href: "/sign-in" },
  secondaryCta: { label: "איך עובד התשלום?", href: "/how-it-works" },
};

export const DEFAULT_SOLUTIONS_CREATORS_STATS: NonNullable<SolutionsCreators["stats"]> = [
  { value: "₪850K+", label: "שולמו ליוצרים" },
  { value: "0", label: "עיכובים בתשלומים מאושרים" },
  { value: "100%", label: "הגנת נאמנות" },
];

export const DEFAULT_SOLUTIONS_CREATORS_SHOWCASE: SolutionsCreators["showcase"] = {
  heading: "כל מה שצריך כדי לעבוד מול מותגים — במקום אחד",
  items: [
    {
      icon: "workspace",
      title: "סביבת עבודה מקצועית",
      body: "העלאת סקיצות, קבלת פידבק מסודר מהמותג והגנה מלאה על זכויות היוצרים שלך. הכל מנוהל במקום אחד נקי ומאורגן, בלי הודעות שהולכות לאיבוד במייל או בוואטסאפ.",
    },
    {
      icon: "wallet",
      title: "משיכת כספים חלקה",
      body: "שחרור מיידי לחשבון הבנק שלך מיד עם אישור פרסום התוכן. המערכת מנפיקה חשבונית דיגיטלית אוטומטית למותג, כך שאתה יכול להתעסק ביצירה ולא בהנהלת חשבונות.",
    },
  ],
};

export const DEFAULT_SOLUTIONS_CREATORS_WORKFLOW: SolutionsCreators["workflow"] = {
  heading: "איך זה עובד?",
  subheading: "תהליך פשוט, שקוף ומאובטח. מהפרופיל ועד לתשלום.",
  steps: [
    {
      title: "חיבור רשתות ובניית Media Kit",
      body: "חבר את חשבונות הסושיאל שלך כדי להציג נתונים אמיתיים למותגים. צור כרטיס ביקור דיגיטלי מרשים ובולט.",
    },
    {
      title: "קבלת בריפים והסכמה על תנאים",
      body: "קבל הצעות קמפיינים מותאמות אישית. סכם על התקציב, והכסף יופקד בנאמנות לפני שתתחיל לעבוד.",
    },
    {
      title: "העלאת תוכן ומשיכת הכסף",
      body: "העלה את התוכן לאישור בסביבת העבודה. ברגע שהקמפיין עולה לאוויר, הכסף משתחרר לחשבון שלך אוטומטית.",
    },
  ],
};

export const DEFAULT_SOLUTIONS_CREATORS_CTA: SolutionsCreators["cta"] = {
  headingLead: "הפסק לרדוף אחרי תשלומים.",
  headingTail: "התחל לעבוד בטוח.",
  body: "הצטרף לאלפי יוצרי תוכן שכבר מנהלים את העסקים שלהם בצורה חכמה ומקצועית יותר.",
  action: { label: "פתח פרופיל יוצר חינם", href: "/sign-in" },
};

export const DEFAULT_SOLUTIONS_CREATORS: SolutionsCreatorsData = {
  hero: DEFAULT_SOLUTIONS_CREATORS_HERO,
  stats: DEFAULT_SOLUTIONS_CREATORS_STATS,
  showcase: DEFAULT_SOLUTIONS_CREATORS_SHOWCASE,
  workflow: DEFAULT_SOLUTIONS_CREATORS_WORKFLOW,
  cta: DEFAULT_SOLUTIONS_CREATORS_CTA,
};
