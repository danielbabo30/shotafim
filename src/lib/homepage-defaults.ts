import type { Homepage } from "@/payload-types";

/**
 * תוכן עמוד הבית — משמש גם כ-seed הראשוני ל-global `homepage`,
 * וגם כ-fallback אם ה-CMS עדיין ריק או לא זמין.
 * לאחר seed, העריכה נעשית מ-/admin.
 */

export const DEFAULT_HOMEPAGE_HERO: Homepage["hero"] = {
  badge: "רשת פרסום פרימיום",
  headingLead: "איפה שיוצרים, עסקים ו",
  headingHighlight: "שטחי פרסום פרימיום",
  headingTail: "מתחברים",
  body: "מרקטפלייס בעל ביצועים גבוהים שתוכנן לשותפויות שקופות. הבטיחו את הקמפיינים שלכם עם הגנת ארנק נאמנות מבוססת אבני דרך ואנליטיקת קהל מאומתת.",
  primaryCta: { label: "אני רוצה לפרסם", href: "/solutions/brands" },
  secondaryCta: { label: "יש לי קהל או שטח", href: "/solutions/creators" },
};

export const DEFAULT_HOMEPAGE_STATS: NonNullable<Homepage["stats"]> = [
  { value: "15,000+", label: "יוצרים מאומתים" },
  { value: "120K", label: "קמפיינים שהושלמו" },
  { value: "₪50M+", label: "נפח מאובטח בארנק נאמנות" },
];

export const DEFAULT_HOMEPAGE_ROLES_HEADING = "תוכנן לכל שותף";
export const DEFAULT_HOMEPAGE_ROLES_SUBHEADING =
  "תהליכי עבודה חלקים המותאמים לתפקיד שלכם באקוסיסטם, עם כלי ניהול מתקדמים.";

export const DEFAULT_HOMEPAGE_BRAND_CARD: Homepage["brandCard"] = {
  title: "למותגים",
  body: "גשו לנתוני קהל מאומתים, גלו שטחי פרסום פרימיום, ונהלו קמפיינים מרובים מלוח בקרה מרכזי אחד.",
  features: [
    { text: "סינון מתקדם מבוסס AI" },
    { text: "ניהול קמפיינים בכמות גדולה" },
    { text: "מעקב אחר החזר השקעה (ROI)" },
    { text: "דוחות מותאמים אישית" },
  ],
  cta: { label: "גלו כלי מותג", href: "/solutions/brands" },
};

export const DEFAULT_HOMEPAGE_INFLUENCER_CARD: Homepage["influencerCard"] = {
  badge: "פופולרי",
  title: "למשפיענים",
  body: "הפיקו רווחים מהקהל שלכם בביטחון. התחברו למותגים בדוקים והבטיחו אבטחת תשלום.",
  features: [
    { text: "הצעות מותג מאומתות" },
    { text: "תשלומים מובטחים" },
    { text: "בונה ערכת מדיה" },
  ],
  cta: { label: "קליטת יוצרים", href: "/solutions/creators" },
};

export const DEFAULT_HOMEPAGE_SPACE_CARD: Homepage["spaceCard"] = {
  title: "לבעלי שטחים",
  body: "רשמו שלטי חוצות דיגיטליים, משבצות ניוזלטר, או חללים פיזיים. נהלו מלאי והזמנות בצורה חלקה עם מערכת התמחור הדינמית שלנו.",
  tags: [{ text: "ניהול מלאי" }, { text: "תמחור דינמי" }],
  cta: { label: "רשמו שטח", href: "/solutions/ad-spaces" },
};

export const DEFAULT_HOMEPAGE_ESCROW: Homepage["escrow"] = {
  headingLead: "ארנק נאמנות מאובטח",
  headingHighlight: "ותהליך עבודה חלק",
  body: "מערכת ארנק הנאמנות שלנו המבוססת על אבני דרך מבטיחה שכספים מוגנים ומשוחררים רק כאשר תוצרי הביצוע המוסכמים מתקיימים. שקיפות מלאה.",
  steps: [
    {
      title: "הסכם והפקדה",
      body: "המותג מפקיד כספים לארנק נאמנות מאובטח עם ההסכמה על הקמפיין. הכספים נשמרים בנאמנות.",
    },
    {
      title: "מסירת תוכן",
      body: "היוצר מגיש תוצרי ביצוע לבדיקה מול הבריף. המערכת מודיעה למותג אוטומטית.",
    },
    {
      title: "אישור ושחרור",
      body: "המותג מאשר את התוכן, וכספי ארנק הנאמנות משוחררים מיידית ליוצר דרך חוזה חכם.",
    },
  ],
};

export const DEFAULT_HOMEPAGE_ARTICLES: Homepage["articles"] = {
  enabled: true,
  heading: "מהבלוג שלנו",
  subheading: "תובנות, מדריכים וחדשות על שיווק מבוסס תוצאות, ארנקי נאמנות וניהול קמפיינים שקוף.",
  ctaLabel: "לכל המאמרים",
  ctaHref: "/resources/blog",
};

export const DEFAULT_HOMEPAGE: Omit<Homepage, "id" | "updatedAt" | "createdAt"> = {
  hero: DEFAULT_HOMEPAGE_HERO,
  stats: DEFAULT_HOMEPAGE_STATS,
  rolesHeading: DEFAULT_HOMEPAGE_ROLES_HEADING,
  rolesSubheading: DEFAULT_HOMEPAGE_ROLES_SUBHEADING,
  brandCard: DEFAULT_HOMEPAGE_BRAND_CARD,
  influencerCard: DEFAULT_HOMEPAGE_INFLUENCER_CARD,
  spaceCard: DEFAULT_HOMEPAGE_SPACE_CARD,
  escrow: DEFAULT_HOMEPAGE_ESCROW,
  articles: DEFAULT_HOMEPAGE_ARTICLES,
};
