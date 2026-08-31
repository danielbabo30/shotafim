import type { RegisterRoles } from "@/payload-types";

/**
 * תוכן ברירת מחדל לשלב 2 בהרשמה (בחירת תפקיד) — משמש גם כ-seed הראשוני
 * ל-global `register-roles`, וגם כ-fallback אם ה-CMS עדיין ריק או לא זמין.
 */

type RegisterRolesData = Omit<RegisterRoles, "id" | "updatedAt" | "createdAt">;

export const DEFAULT_REGISTER_ROLES: RegisterRolesData = {
  heading: "מה תרצה לעשות בשותפים?",
  subheading: "אפשר לבחור יותר מתפקיד אחד ולנהל הכל מחשבון יחיד. הגדרות התפקיד יותאמו בהמשך.",
  brandRole: {
    eyebrow: "מפרסם / עסק",
    title: "אני רוצה לפרסם עסק",
    subtitle: "עסקים, מותגים וסוכנויות",
    benefits: [
      { text: "תשלום משתחרר רק לאחר אישור תוכן" },
      { text: "גישה למאגר יוצרים ושטחי פרסום מאומתים" },
      { text: "חשבוניות מס מרוכזות בלחיצת כפתור" },
    ],
  },
  creatorRole: {
    eyebrow: "יוצר תוכן / משפיען",
    title: "אני יוצר תוכן / משפיען",
    subtitle: "יוצרי תוכן, מובילי דעה וטאלנטים",
    benefits: [
      { text: "ודאות תשלום מלאה ללא מרדף אחרי כספים" },
      { text: "חדר עבודה דיגיטלי להגשת סקיצות" },
      { text: "משיכת כספים ישירה לחשבון הבנק" },
    ],
  },
  spaceRole: {
    eyebrow: "בעל שטחי פרסום",
    title: "אני בעל שטחי פרסום",
    subtitle: "מסכי LED, שלטי חוצות, מדיה דיגיטלית",
    benefits: [
      { text: "מקסום אחוזי תפוסה לאורך השנה" },
      { text: "שידור רק לאחר הבטחת התקציב" },
      { text: "אימות שידור פשוט לשחרור כספים" },
    ],
  },
};
