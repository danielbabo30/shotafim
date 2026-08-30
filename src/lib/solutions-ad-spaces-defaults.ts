import type { SolutionsAdSpaces } from "@/payload-types";

/**
 * תוכן עמוד "פתרונות — לבעלי שטחי פרסום" — משמש גם כ-seed הראשוני ל-global
 * `solutions-ad-spaces`, וגם כ-fallback אם ה-CMS עדיין ריק או לא זמין.
 * לאחר seed, העריכה נעשית מ-/admin.
 */

type SolutionsAdSpacesData = Omit<SolutionsAdSpaces, "id" | "updatedAt" | "createdAt">;

export const DEFAULT_SOLUTIONS_AD_SPACES_HERO: SolutionsAdSpaces["hero"] = {
  badge: "לבעלי שטחי מדיה ומסכים",
  headingLead: "הפוך שטחי מדיה ומסכים פנויים",
  headingHighlight: "להכנסה קבועה",
  body: "פלטפורמה מרכזית לניהול תפוסה, שיבוץ קמפיינים וסגירת עסקאות לשלטי חוצות, מסכי LED, ניוזלטרים ופודקאסטים. ייעל את תהליך המכירה ומקסם את פוטנציאל ההכנסות שלך.",
  primaryCta: { label: "רשום שטח פרסום", href: "/sign-in" },
  secondaryCta: { label: "צפה במפת שטחים", href: "/explore" },
};

export const DEFAULT_SOLUTIONS_AD_SPACES_STATS: NonNullable<SolutionsAdSpaces["stats"]> = [
  { value: "87%", label: "שיעור תפוסה ממוצע" },
  { value: "אלפים", label: "חשיפות יומיות מאומתות" },
  { value: "30%+", label: "גידול ממוצע בהכנסות" },
];

export const DEFAULT_SOLUTIONS_AD_SPACES_SHOWCASE: SolutionsAdSpaces["showcase"] = {
  heading: "כל מה שצריך כדי להשכיר שטחי מדיה — במקום אחד",
  items: [
    {
      icon: "calendar",
      title: "ניהול תפוסה בזמן אמת",
      body: "לוח שיבוצים חכם המונע כפילויות וממלא חלונות ריקים. סנכרן את זמינות המסכים שלך ישירות לפלטפורמה, אפשר למפרסמים להזמין שטחים בלחיצת כפתור, ונהל את הלוח שלך ממרכז שליטה אחד יעיל.",
      points: [
        { text: "תצוגת יומן ויזואלית של כלל הנכסים" },
        { text: "מניעת התנגשויות (Double Booking) אוטומטית" },
      ],
    },
    {
      icon: "chart",
      title: "שקיפות ואימות חשיפה",
      body: "הצגת נתוני מיקום וחשיפות מאומתות למפרסמים ישירות במערכת. בנה אמון עם לקוחות פוטנציאליים על ידי שיתוף נתוני ביצועים מדויקים, הוכחות שידור (POP) ואנליטיקה מפורטת על הקהל הנחשף לנכס שלך.",
      points: [
        { text: "הפקת דוחות הוכחת שידור (Proof of Play) בלחיצה" },
        { text: "אינטגרציה למצלמות ספירת קהל וחיישני תנועה" },
      ],
    },
  ],
};

export const DEFAULT_SOLUTIONS_AD_SPACES_WORKFLOW: SolutionsAdSpaces["workflow"] = {
  heading: "איך זה עובד?",
  subheading: "תהליך פשוט ומהיר להוספת הנכס שלך ולהתחלת מכירת שטחי פרסום.",
  steps: [
    {
      title: "הזנת פרטי שטח המדיה",
      body: "הגדר את מיקום הנכס, מידות, קהל יעד, זמינות ותמחור גמיש (לפי חשיפות או לפי תקופה).",
    },
    {
      title: "קבלת הזמנות ואישור",
      body: "קבל התראות על הזמנות חדשות, בדוק את חומרי הפרסום המצורפים, ואשר אותם בקליק.",
    },
    {
      title: "שידור וקבלת תשלום",
      body: "המודעה משודרת אוטומטית במועד שנקבע, והתשלום מועבר אליך באופן מאובטח ומובטח.",
    },
  ],
};

export const DEFAULT_SOLUTIONS_AD_SPACES_CTA: SolutionsAdSpaces["cta"] = {
  headingLead: "יש לך מסך, שלט או פלטפורמת מדיה שלא מנוצלת?",
  body: "הצטרף לרשת המדיה הצומחת שלנו והתחל לייצר הכנסות מהשטחים הפנויים שלך כבר היום.",
  action: { label: "הוסף שטח מדיה למערכת", href: "/sign-in" },
};

export const DEFAULT_SOLUTIONS_AD_SPACES: SolutionsAdSpacesData = {
  hero: DEFAULT_SOLUTIONS_AD_SPACES_HERO,
  stats: DEFAULT_SOLUTIONS_AD_SPACES_STATS,
  showcase: DEFAULT_SOLUTIONS_AD_SPACES_SHOWCASE,
  workflow: DEFAULT_SOLUTIONS_AD_SPACES_WORKFLOW,
  cta: DEFAULT_SOLUTIONS_AD_SPACES_CTA,
};
