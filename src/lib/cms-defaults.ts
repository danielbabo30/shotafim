import type { MainNavigation, SiteSetting } from "@/payload-types";

/**
 * ברירות מחדל למעטפת — משמשות אם ה-global עדיין לא נשמר ב-CMS,
 * וגם כערכי ה-seed הראשוני (ראה scripts/seed.ts).
 */

export const DEFAULT_AUTH: NonNullable<SiteSetting["auth"]> = {
  personalAreaUrl: "/dashboard",
  loginUrl: "/sign-in",
  signupUrl: "/register",
  loginLabel: "התחברות",
  signupLabel: "הרשמה למערכת",
  loggedInLabel: "האזור האישי",
};

export const DEFAULT_NAV_ITEMS: NonNullable<MainNavigation["items"]> = [
  { label: "איך זה עובד", type: "link", href: "/how-it-works" },
  {
    label: "פתרונות",
    type: "dropdown",
    children: [
      {
        label: "לעסקים ומפרסמים",
        href: "/solutions/brands",
        description: "קמפיינים, תקציב, מדידה",
      },
      {
        label: "למשפיענים ויוצרי תוכן",
        href: "/solutions/creators",
        description: "הזדמנויות ותשלום מאובטח",
      },
      {
        label: "לבעלי שטחי פרסום",
        href: "/solutions/ad-spaces",
        description: "ניהול והשכרת נכסים",
      },
    ],
  },
  { label: "מאגר יוצרים", type: "link", href: "/explore/creators" },
  { label: "מדריכים", type: "link", href: "/guides" },
  { label: "מאמרים", type: "link", href: "/resources/blog" },
  { label: "תמחור", type: "link", href: "/pricing" },
];

export const DEFAULT_FOOTER_COLUMNS: NonNullable<SiteSetting["footerColumns"]> = [
  {
    heading: "פלטפורמה",
    links: [
      { label: "איך זה עובד", href: "/how-it-works" },
      { label: "פתרונות לעסקים", href: "/solutions/brands" },
      { label: "מדריך ליוצרים", href: "/solutions/creators" },
      { label: "תמחור", href: "/pricing" },
    ],
  },
  {
    heading: "חברה",
    links: [
      { label: "אודותינו", href: "/about" },
      { label: "צור קשר", href: "/contact" },
      { label: "מרכז העזרה והמדריכים", href: "/guides" },
      { label: "בלוג ומשאבים", href: "/resources/blog" },
      { label: "סיפורי הצלחה", href: "/resources/case-studies" },
    ],
  },
];

export const DEFAULT_LEGAL_LINKS: NonNullable<SiteSetting["legalLinks"]> = [
  { label: "הצהרת נגישות", href: "/legal/accessibility" },
  { label: "מדיניות פרטיות", href: "/legal/privacy" },
  { label: "תנאי שימוש", href: "/legal/terms" },
  { label: "מדיניות קובצי Cookie", href: "/legal/cookies" },
];

export const DEFAULT_SITE_NAME = "שותפים";

export const DEFAULT_FOOTER_TAGLINE =
  "המרקטפלייס הבטוח והמתקדם ביותר לחיבור בין מותגים ליוצרי תוכן ושטחי פרסום דיגיטליים.";

export const DEFAULT_NEWSLETTER: NonNullable<SiteSetting["newsletter"]> = {
  enabled: true,
  heading: "הצטרפו לניוזלטר",
  text: "עדכונים חודשיים על הזדמנויות וקמפיינים חדשים.",
  placeholder: "אימייל עסקי",
};
