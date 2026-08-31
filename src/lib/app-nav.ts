import type { UserRole } from "@prisma/client";

/**
 * מפת הניווט של האזור האישי — לפי תפקיד (כובע) פעיל.
 * זה "chrome" של האפליקציה, לא תוכן שיווקי → נשמר סטטי בקוד (ראה CLAUDE.md §6).
 * הקישורים תואמים 1:1 לעץ הראוטים תחת /dashboard; חלקם ייבנו בשלבים הבאים.
 */

export type RoleKey = "brand" | "creator" | "space" | "admin";

/** מפתחות אייקונים — ממופים לרכיב ב-nav-icon.tsx (לא מעבירים רכיבים דרך גבול server/client) */
export type NavIconKey =
  | "dashboard"
  | "marketplace"
  | "campaign"
  | "inbox"
  | "contract"
  | "chat"
  | "chart"
  | "search"
  | "wallet"
  | "screen"
  | "calendar"
  | "verified"
  | "gavel"
  | "settings"
  | "help"
  | "plus";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
  /** התאמה מדויקת בלבד (לשורש /dashboard, כדי שלא יידלק לכל תת-נתיב) */
  exact?: boolean;
};

export type RoleMeta = {
  key: RoleKey;
  userRole: UserRole;
  /** תווית "מצב" בורר-התפקידים ובכותרת הסייד-בר */
  label: string;
  /** תת-כותרת בכותרת הסייד-בר */
  tagline: string;
  emoji: string;
  /** פעולת ה-CTA הראשית בראש הסייד-בר (אופציונלי — לאדמין אין) */
  cta?: { label: string; href: string; icon: NavIconKey };
  nav: NavItem[];
};

const DASHBOARD: NavItem = {
  href: "/dashboard",
  label: "לוח בקרה",
  icon: "dashboard",
  exact: true,
};

export const ROLE_META: Record<RoleKey, RoleMeta> = {
  brand: {
    key: "brand",
    userRole: "BRAND",
    label: "מצב מפרסם",
    tagline: "ניהול מותג",
    emoji: "💼",
    cta: { label: "קמפיין חדש", href: "/dashboard/campaigns/new", icon: "plus" },
    nav: [
      DASHBOARD,
      { href: "/dashboard/campaigns", label: "קמפיינים", icon: "campaign" },
      { href: "/dashboard/marketplace", label: "מרקטפלייס", icon: "marketplace" },
      { href: "/dashboard/ad-spaces", label: "שטחי פרסום", icon: "screen" },
      { href: "/dashboard/applications", label: "פניות והצעות", icon: "inbox" },
      { href: "/dashboard/contracts", label: "חוזים", icon: "contract" },
      { href: "/dashboard/messages", label: "הודעות", icon: "chat" },
      { href: "/dashboard/reports", label: "דוחות", icon: "chart" },
    ],
  },
  creator: {
    key: "creator",
    userRole: "CREATOR",
    label: "מצב יוצר",
    tagline: "יצירת תוכן",
    emoji: "✨",
    cta: { label: "עיון בקמפיינים", href: "/dashboard/discover", icon: "search" },
    nav: [
      DASHBOARD,
      { href: "/dashboard/discover", label: "גילוי קמפיינים", icon: "search" },
      { href: "/dashboard/applications", label: "ההצעות שלי", icon: "inbox" },
      { href: "/dashboard/contracts", label: "חוזים", icon: "contract" },
      { href: "/dashboard/messages", label: "הודעות", icon: "chat" },
      { href: "/dashboard/earnings", label: "הכנסות", icon: "wallet" },
    ],
  },
  space: {
    key: "space",
    userRole: "AD_SPACE_OWNER",
    label: "מצב בעל שטחים",
    tagline: "שטחי פרסום",
    emoji: "📺",
    cta: { label: "הוספת שטח", href: "/dashboard/assets/new", icon: "plus" },
    nav: [
      DASHBOARD,
      { href: "/dashboard/assets", label: "שטחי הפרסום שלי", icon: "screen" },
      { href: "/dashboard/discover", label: "גילוי קמפיינים", icon: "search" },
      { href: "/dashboard/applications", label: "הצעות שהגשתי", icon: "inbox" },
      { href: "/dashboard/contracts", label: "חוזים", icon: "contract" },
      { href: "/dashboard/bookings", label: "יומן שיבוצים", icon: "calendar" },
    ],
  },
  admin: {
    key: "admin",
    userRole: "ADMIN",
    label: "מצב ניהול",
    tagline: "צוות המערכת",
    emoji: "🛡️",
    nav: [
      DASHBOARD,
      { href: "/dashboard/verifications", label: "אימות פרופילים", icon: "verified" },
      { href: "/dashboard/disputes", label: "מחלוקות", icon: "gavel" },
      { href: "/dashboard/reports", label: "דוחות מערכת", icon: "chart" },
    ],
  },
};

/** ניווט תחתון — משותף לכל התפקידים */
export const FOOTER_NAV: NavItem[] = [
  { href: "/dashboard/settings", label: "הגדרות", icon: "settings" },
  { href: "/help", label: "עזרה", icon: "help" },
];

const USER_ROLE_TO_KEY: Record<UserRole, RoleKey> = {
  BRAND: "brand",
  CREATOR: "creator",
  AD_SPACE_OWNER: "space",
  ADMIN: "admin",
};

/** סדר עדיפות לבחירת תפקיד ברירת-מחדל כשאין activeRole שמור */
const ROLE_PRIORITY: RoleKey[] = ["brand", "creator", "space", "admin"];

export const roleKeyFromUserRole = (role: UserRole): RoleKey => USER_ROLE_TO_KEY[role];

export const userRoleFromKey = (key: RoleKey): UserRole => ROLE_META[key].userRole;

/** ממיין רשימת מפתחות תפקיד לפי סדר העדיפות הקבוע */
export const sortRoleKeys = (keys: RoleKey[]): RoleKey[] =>
  ROLE_PRIORITY.filter((k) => keys.includes(k));

/**
 * התפקיד הפעיל האפקטיבי: ה-activeRole השמור אם הוא עדיין תקף,
 * אחרת הראשון לפי סדר העדיפות.
 */
export const resolveActiveRole = (
  roleKeys: RoleKey[],
  activeRole: UserRole | null,
): RoleKey | null => {
  if (roleKeys.length === 0) return null;
  if (activeRole) {
    const key = roleKeyFromUserRole(activeRole);
    if (roleKeys.includes(key)) return key;
  }
  return sortRoleKeys(roleKeys)[0] ?? null;
};
