import type { ContactPage } from "@/payload-types";

/**
 * תוכן עמוד "צור קשר" — משמש גם כ-seed הראשוני ל-global `contact-page`,
 * וגם כ-fallback אם ה-CMS עדיין ריק או לא זמין.
 * לאחר seed, העריכה נעשית מ-/admin. הפרטים כאן הם ברירת מחדל לדוגמה — לעדכן בפאנל.
 */

type ContactData = Omit<ContactPage, "id" | "updatedAt" | "createdAt">;

export const DEFAULT_CONTACT_HERO: ContactPage["hero"] = {
  headingLead: "נשמח ",
  headingHighlight: "לשמוע ממך",
  headingTail: null,
  body: "שאלה על הפלטפורמה, רעיון לשיתוף פעולה או צורך בתמיכה — מלאו את הטופס ונחזור אליכם בתוך יום עסקים אחד.",
};

export const DEFAULT_CONTACT_FORM: ContactPage["form"] = {
  heading: "שליחת פנייה",
  note: "הטופס להדגמה בלבד — פניות עדיין אינן נשלחות או נשמרות. חיבור למערכת הפניות יתווסף בהמשך.",
  submitLabel: "שליחת הפנייה",
  successTitle: "הפנייה נקלטה",
  successBody: "תודה! נחזור אליכם בתוך יום עסקים אחד.",
  subjects: [
    { label: "שאלה כללית" },
    { label: "תמיכה טכנית" },
    { label: "שיתוף פעולה עסקי" },
    { label: "עיתונות ומדיה" },
  ],
};

export const DEFAULT_CONTACT_DETAILS: ContactPage["details"] = {
  heading: "דרכים נוספות ליצירת קשר",
  note: "משתמשים רשומים — פניות תמיכה דחופות דרך האזור האישי.",
};

export const DEFAULT_CONTACT: ContactData = {
  hero: DEFAULT_CONTACT_HERO,
  form: DEFAULT_CONTACT_FORM,
  details: DEFAULT_CONTACT_DETAILS,
};
