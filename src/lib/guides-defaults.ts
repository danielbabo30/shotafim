import type { GuideCategoryValue, GuideAudienceValue } from "@/payload-types";

/**
 * מדריכי ברירת מחדל — משמשים גם כ-seed ראשוני ל-collection `guides`
 * וגם כ-fallback כשה-CMS ריק או לא זמין (ראה src/lib/guides.ts).
 */

export type GuideSeedBlock =
  | { blockType: "lead"; text: string }
  | { blockType: "prose"; text: string }
  | { blockType: "heading"; level: "h2" | "h3"; text: string }
  | { blockType: "quote"; text: string; attribution?: string }
  | { blockType: "keyPoints"; title: string; points: { text: string }[] }
  | { blockType: "callout"; title: string; body: string }
  | {
      blockType: "steps";
      heading?: string;
      steps: { title: string; body: string; ctaLabel?: string; ctaHref?: string }[];
    }
  | { blockType: "caution"; title: string; body: string };

export type GuideSeed = {
  title: string;
  slug: string;
  excerpt: string;
  category: GuideCategoryValue;
  audience: GuideAudienceValue;
  readingMinutes: number;
  publishedAt: string;
  official?: boolean;
  popular?: boolean;
  stepsBadge?: string;
  intro: string;
  prerequisites?: { text: string }[];
  body: GuideSeedBlock[];
  nextGuideSlug?: string;
  seo?: { metaTitle?: string; metaDescription?: string };
};

/** מדריך "בסיס" — כותרת, תקציר, פתיחה וכמה שלבים. מקצר את ההגדרות למדריכי המילוי. */
function stub(
  s: Omit<GuideSeed, "body" | "readingMinutes" | "publishedAt"> & {
    readingMinutes?: number;
    publishedAt?: string;
    steps: { title: string; body: string }[];
    stepsHeading?: string;
    tip?: { title: string; body: string };
  },
): GuideSeed {
  const { steps, stepsHeading, tip, readingMinutes, publishedAt, ...rest } = s;
  return {
    ...rest,
    readingMinutes: readingMinutes ?? 3,
    publishedAt: publishedAt ?? "2026-08-01",
    body: [
      { blockType: "steps", ...(stepsHeading ? { heading: stepsHeading } : {}), steps },
      ...(tip ? [{ blockType: "callout" as const, title: tip.title, body: tip.body }] : []),
    ],
  };
}

export const GUIDE_SEEDS: GuideSeed[] = [
  // ── מדריך מלא ──
  {
    title: "כיצד לאשר תוכן ולשחרר תשלום מנאמנות ליוצר",
    slug: "approve-and-release-escrow",
    excerpt:
      "השלבים הדרושים לאישור התוכן הסופי שהוגש על ידי היוצר ולשחרור מאובטח של כספי הקמפיין מנאמנות.",
    category: "escrow",
    audience: "advertiser",
    readingMinutes: 4,
    publishedAt: "2026-08-20",
    popular: true,
    stepsBadge: "מדריך ב-4 שלבים",
    intro:
      "מדריך זה מפרט את השלבים הדרושים לאישור התוכן הסופי שהוגש על ידי היוצר, ושחרור מאובטח של כספי הקמפיין מנאמנות לידי היוצר.",
    prerequisites: [
      { text: 'קמפיין פעיל בסטטוס "ממתין לאישור".' },
      { text: "סקיצה או קובץ סופי הועלו על ידי היוצר למערכת." },
    ],
    body: [
      {
        blockType: "steps",
        steps: [
          {
            title: "כניסה לחדר הקמפיין",
            body: 'נווטו ללוח הבקרה הראשי ולחצו על "הקמפיינים שלי". מצאו את הקמפיין הרלוונטי ולחצו על כפתור "ניהול" כדי להיכנס לחדר העבודה המשותף שלכם עם היוצר.',
          },
          {
            title: "סקירת הקבצים שהועלו",
            body: 'באזור "קבצי קמפיין", תוכלו למצוא את התוכן הסופי שהיוצר העלה. לחצו על הקובץ כדי לצפות בו בגודל מלא או להוריד אותו לבדיקה מעמיקה.',
          },
          {
            title: "מתן פידבק או אישור סופי",
            body: 'אם נדרשים תיקונים, השתמשו בתיבת השיחה כדי לכתוב ליוצר. אם התוכן עונה על הדרישות לשביעות רצונכם, סמנו "מאושר" כדי להמשיך לשלב הבא.',
          },
          {
            title: 'לחיצה על "שחרור כספי נאמנות"',
            body: 'לאחר האישור, יופיע כפתור הפעולה המרכזי "שחרור כספי נאמנות". לחיצה עליו תעביר את התשלום המוחזק במערכת ישירות לארנק של היוצר.',
            ctaLabel: "שחרור כספי נאמנות",
            ctaHref: "/dashboard",
          },
        ],
      },
      {
        blockType: "caution",
        title: "שימו לב: פעולה בלתי הפיכה",
        body: 'לאחר לחיצה על "שחרור כספי נאמנות", התשלום מועבר מיידית ליוצר ולא ניתן לבטל או לשחזר פעולה זו דרך המערכת. אנא ודאו שקיבלתם את כל התוצרים כנדרש לפני האישור הסופי.',
      },
    ],
    nextGuideSlug: "open-arbitration",
  },

  // ── התחלת עבודה ואימות ──
  stub({
    title: "איך פותחים חשבון מפרסם?",
    slug: "open-advertiser-account",
    excerpt: "פתיחת חשבון עסקי, הזנת פרטי החברה והגדרת המשתמשים הראשונים בארגון.",
    category: "getting-started",
    audience: "advertiser",
    readingMinutes: 2,
    publishedAt: "2026-07-10",
    intro: "פתיחת חשבון מפרסם אורכת דקות ספורות. לאחריה תוכלו ליצור קמפיין ראשון ולהזמין יוצרים.",
    steps: [
      {
        title: "הרשמה עם אימייל עסקי",
        body: "השתמשו בכתובת אימייל של הארגון. קישור אימות יישלח אליכם מיידית לאישור הכתובת.",
      },
      {
        title: "הזנת פרטי החברה",
        body: "שם רשום, מספר ח.פ / עוסק ופרטי איש קשר לחיוב. הפרטים משמשים להפקת חשבוניות אוטומטית.",
      },
      {
        title: "הזמנת חברי צוות",
        body: "הוסיפו מנהלי קמפיינים נוספים והגדירו לכל אחד הרשאות צפייה או ניהול.",
      },
    ],
    nextGuideSlug: "set-brand-payment-method",
  }),
  stub({
    title: "תהליך אימות פרופיל משפיען",
    slug: "verify-creator-profile",
    excerpt: "אימות הזהות וחיבור הרשתות החברתיות כדי להציג נתוני חשיפה אמיתיים למותגים.",
    category: "getting-started",
    audience: "creator",
    readingMinutes: 4,
    publishedAt: "2026-07-12",
    intro:
      "אימות הפרופיל הוא תנאי לקבלת הצעות קמפיין. התהליך מוודא שהחשבונות שלכם אמיתיים ושהנתונים מדויקים.",
    stepsHeading: "שלבי האימות",
    steps: [
      {
        title: "אימות זהות",
        body: "העלאת תעודה מזהה וסלפי קצר. האימות נסרק אוטומטית ומאושר לרוב תוך דקות.",
      },
      {
        title: "חיבור רשתות חברתיות",
        body: "התחברו לחשבונות דרך ההרשאה הרשמית של כל פלטפורמה. המערכת מושכת נתוני חשיפה ומעורבות ישירות.",
      },
      {
        title: "הגדרת נישות ותעריפים",
        body: "בחרו את תחומי התוכן שלכם והזינו טווח מחירים. מותגים מסננים לפיהם בחיפוש יוצרים.",
      },
    ],
    tip: {
      title: "טיפ",
      body: "חברו לפחות שתי רשתות — פרופילים מרובי-פלטפורמה מקבלים פי כמה הצעות קמפיין.",
    },
    nextGuideSlug: "connect-instagram",
  }),
  stub({
    title: "חיבור רשתות חברתיות למערכת",
    slug: "connect-social-accounts",
    excerpt: "חיבור מאובטח של אינסטגרם, טיקטוק ויוטיוב דרך ההרשאה הרשמית של כל פלטפורמה.",
    category: "getting-started",
    audience: "creator",
    readingMinutes: 3,
    publishedAt: "2026-07-14",
    intro:
      "החיבור נעשה דרך מסך ההרשאה הרשמי של הפלטפורמה — המערכת לעולם לא מבקשת את הסיסמה שלכם ברשת החברתית.",
    steps: [
      {
        title: 'פתיחת "החשבונות שלי"',
        body: "בהגדרות הפרופיל, במקטע הרשתות החברתיות, לחצו על הפלטפורמה שברצונכם לחבר.",
      },
      {
        title: "אישור ההרשאה",
        body: "תועברו למסך ההתחברות הרשמי של הרשת. אשרו את הרשאות הקריאה לנתוני חשיפה ומעורבות.",
      },
      {
        title: "המתנה לסנכרון ראשון",
        body: "הנתונים ההיסטוריים נמשכים תוך מספר דקות ומתעדכנים אוטומטית מדי יום.",
      },
    ],
    nextGuideSlug: "verify-creator-profile",
  }),
  stub({
    title: "חיבור חשבון אינסטגרם",
    slug: "connect-instagram",
    excerpt: "כיצד לאמת את פרופיל האינסטגרם שלך כדי להציג נתוני חשיפה אמיתיים למותגים.",
    category: "getting-started",
    audience: "creator",
    readingMinutes: 3,
    publishedAt: "2026-08-05",
    popular: true,
    stepsBadge: "מדריך ב-3 שלבים",
    intro:
      "חשבון אינסטגרם מסוג Creator או Business ניתן לחיבור ישיר. חשבון פרטי יש להסב תחילה בהגדרות האפליקציה.",
    steps: [
      {
        title: "המרת החשבון לחשבון יוצר",
        body: "באפליקציית אינסטגרם: הגדרות → סוג חשבון וכלים → מעבר לחשבון מקצועי.",
      },
      {
        title: "התחברות דרך המערכת",
        body: 'ב"החשבונות שלי" לחצו על אינסטגרם ואשרו את ההרשאה במסך של Meta.',
      },
      {
        title: "בדיקת הנתונים שנמשכו",
        body: "ודאו שמספרי העוקבים והחשיפה בפרופיל שלכם במערכת תואמים לנתונים באפליקציה.",
      },
    ],
    nextGuideSlug: "connect-social-accounts",
  }),

  // ── ניהול תקציב ונאמנות ──
  stub({
    title: "איך עובד ארנק הנאמנות?",
    slug: "how-escrow-wallet-works",
    excerpt: "הסבר על מנגנון ה-Escrow — נעילת התקציב מראש ושחרורו רק לאחר אישור התוצרים.",
    category: "escrow",
    audience: "advertiser",
    readingMinutes: 3,
    publishedAt: "2026-07-20",
    intro:
      "ארנק הנאמנות מחזיק את תקציב הקמפיין בנפרד מכספי המערכת, ומשחרר אותו ליוצר רק בהתקיים תנאי החוזה.",
    stepsHeading: "מחזור החיים של הכסף",
    steps: [
      {
        title: "הפקדה",
        body: "עם יצירת הקמפיין מופקד מלוא התקציב לארנק הנאמנות. הכסף מוקפא ואינו נגיש לאף צד.",
      },
      {
        title: "הקפאה",
        body: "לאורך העבודה הכסף שמור. במקרה מחלוקת הוא נשאר מוקפא עד להכרעה.",
      },
      {
        title: "שחרור",
        body: "עם אישור סופי (או בתום מועד ההגבה שבחוזה) הסכום עובר לארנק היוצר בניכוי עמלת המערכת.",
      },
    ],
    nextGuideSlug: "when-funds-release",
  }),
  stub({
    title: "מתי הכסף משתחרר ליוצר?",
    slug: "when-funds-release",
    excerpt: "התנאים המדויקים לשחרור התשלום — אישור המותג או חלוף מועד ההגבה שנקבע בחוזה.",
    category: "escrow",
    audience: "creator",
    readingMinutes: 2,
    publishedAt: "2026-07-22",
    intro: "התשלום משתחרר אוטומטית באחד משני מצבים — אין צורך לרדוף אחרי המותג.",
    steps: [
      {
        title: "אישור סופי של המותג",
        body: 'ברגע שהמותג לוחץ "אישור סופי" על התוצר, השחרור מתבצע מיידית.',
      },
      {
        title: "חלוף מועד ההגבה",
        body: "אם המותג לא הגיב תוך פרק הזמן שבחוזה (לרוב 7 ימי עסקים), המערכת משחררת את התשלום אוטומטית.",
      },
    ],
    tip: {
      title: "טיפ",
      body: "עקבו אחרי הסטטוס בחדר הקמפיין — הוא מציג את הספירה לאחור למועד ההגבה.",
    },
    nextGuideSlug: "central-tax-invoices",
  }),
  stub({
    title: "עמלות מערכת והחזרים",
    slug: "system-fees-and-refunds",
    excerpt: "מבנה העמלה של המערכת, מתי היא נגבית, ובאילו מקרים תקציב מוחזר למפרסם.",
    category: "escrow",
    audience: "finance",
    readingMinutes: 3,
    publishedAt: "2026-07-25",
    intro: "עמלת המערכת נגבית פעם אחת, בעת שחרור התשלום, ומחושבת כאחוז מסכום העסקה.",
    steps: [
      {
        title: "חישוב העמלה",
        body: "העמלה מוצגת בבירור במסך יצירת הקמפיין, לפני ההפקדה. אין דמי מנוי או עמלות נסתרות.",
      },
      {
        title: "מקרי החזר מלא",
        body: "אם קמפיין בוטל לפני שהיוצר התחיל בעבודה, מלוא התקציב מוחזר לאמצעי התשלום המקורי.",
      },
      {
        title: "מקרי החזר חלקי",
        body: "בביטול באמצע העבודה או לאחר גישור, ההחזר נקבע לפי חלק העבודה שבוצע.",
      },
    ],
    nextGuideSlug: "how-escrow-wallet-works",
  }),
  stub({
    title: "הגדרת אמצעי תשלום למותגים",
    slug: "set-brand-payment-method",
    excerpt: "הוספת כרטיס אשראי או חיבור חשבון בנק לצורך הפקדת תקציבי קמפיין לנאמנות.",
    category: "escrow",
    audience: "advertiser",
    readingMinutes: 4,
    publishedAt: "2026-08-08",
    popular: true,
    stepsBadge: "מדריך ב-4 שלבים",
    intro: "לפני הפקדת תקציב ראשון יש להגדיר אמצעי תשלום מאומת ברמת הארגון.",
    steps: [
      {
        title: "כניסה להגדרות התשלום",
        body: 'בתפריט הארגון בחרו "חיוב ותשלומים" ולאחר מכן "אמצעי תשלום".',
      },
      {
        title: "הוספת כרטיס אשראי",
        body: "הזינו את פרטי הכרטיס במסך המאובטח. חיוב אימות זעום מתבצע ומזוכה מיד.",
      },
      {
        title: "או: חיבור חשבון בנק",
        body: "להעברות גדולות ניתן לחבר חשבון בנק עסקי ולאשר אותו בשתי הפקדות אימות.",
      },
      {
        title: "קביעת אמצעי ברירת מחדל",
        body: "סמנו את האמצעי שישמש להפקדות אוטומטיות בעת יצירת קמפיין.",
      },
    ],
    nextGuideSlug: "how-escrow-wallet-works",
  }),
  stub({
    title: "הפקת חשבוניות מס מרכזות",
    slug: "central-tax-invoices",
    excerpt: "מערכת החשבוניות האוטומטית והורדת דוחות חודשיים מרוכזים לרואה החשבון.",
    category: "escrow",
    audience: "finance",
    readingMinutes: 3,
    publishedAt: "2026-08-10",
    popular: true,
    stepsBadge: "מדריך וידאו",
    intro:
      "המערכת מפיקה חשבונית מס דיגיטלית לכל עסקה, ומאפשרת להוריד קובץ מרוכז לכל חודש בפורמט לרואה חשבון.",
    steps: [
      {
        title: "צפייה בחשבוניות בודדות",
        body: 'תחת "חיוב ותשלומים" → "מסמכים", כל עסקה מציגה חשבונית וקבלה להורדה מיידית.',
      },
      {
        title: "הורדת דוח חודשי מרוכז",
        body: "בחרו טווח תאריכים ולחצו על ייצוא. מתקבל קובץ CSV + חבילת PDF של כל המסמכים.",
      },
      {
        title: "שליחה ישירה לרואה החשבון",
        body: "ניתן להגדיר כתובת אימייל שתקבל את הדוח המרוכז אוטומטית בתחילת כל חודש.",
      },
    ],
    nextGuideSlug: "system-fees-and-refunds",
  }),

  // ── אישור והעלאת חומרי מדיה ──
  stub({
    title: "שליחת סקיצה לאישור המותג",
    slug: "submit-draft-for-approval",
    excerpt: "העלאת טיוטת התוכן לחדר הקמפיין וניהול גרסאות עד לאישור הסופי.",
    category: "media-approval",
    audience: "creator",
    readingMinutes: 3,
    publishedAt: "2026-07-28",
    intro: "כל הטיוטות עוברות דרך חדר הקמפיין — כך שההיסטוריה והאישורים מתועדים במקום אחד.",
    steps: [
      {
        title: "העלאת הקובץ",
        body: 'בחדר הקמפיין לחצו על "העלאת גרסה" וצרפו את התוכן. אפשר להוסיף הערה שמסבירה מה השתנה.',
      },
      {
        title: "בקשת סקירה",
        body: 'לחצו "שלח לסקירה". המותג מקבל התראה ורואה את הגרסה עם כלי סימון והערות.',
      },
      {
        title: "טיפול בהערות",
        body: "הערות המותג מופיעות כרשימת משימות. סמנו כל אחת כטופלה והעלו גרסה מעודכנת.",
      },
    ],
    nextGuideSlug: "final-approval-and-publish",
  }),
  stub({
    title: "בקשת תיקונים על תוכן",
    slug: "request-content-revisions",
    excerpt: "איך לתת ליוצר פידבק ממוקד וברור באמצעות כלי הסימון בחדר הקמפיין.",
    category: "media-approval",
    audience: "advertiser",
    readingMinutes: 2,
    publishedAt: "2026-07-30",
    intro: "פידבק ממוקד מקצר את מספר סבבי התיקון. השתמשו בכלי הסימון במקום בהודעות כלליות.",
    steps: [
      {
        title: "סימון על גבי התוכן",
        body: "לחצו על נקודה בסרטון או בתמונה כדי להצמיד הערה למקום מדויק.",
      },
      {
        title: "ניסוח הבקשה",
        body: 'כתבו מה לשנות ולמה. הימנעו מ"לא אהבתי" — ציינו את התוצאה הרצויה.',
      },
      {
        title: "שליחה חזרה ליוצר",
        body: 'לחצו "בקש תיקונים". כל ההערות נשלחות יחד וסטטוס הקמפיין חוזר ל"בעבודה".',
      },
    ],
    nextGuideSlug: "final-approval-and-publish",
  }),
  stub({
    title: "אישור סופי ופרסום",
    slug: "final-approval-and-publish",
    excerpt: "השלב שבו המותג מאשר את התוצר הסופי ומאשר את מועד השידור לפי החוזה.",
    category: "media-approval",
    audience: "advertiser",
    readingMinutes: 2,
    publishedAt: "2026-08-01",
    intro: "האישור הסופי נועל את הגרסה המאושרת ומאפשר את שחרור התשלום ואת פרסום התוכן.",
    steps: [
      {
        title: 'לחיצה על "אישור סופי"',
        body: "המערכת מבקשת אישור נוסף ומתעדת את הזהות והשעה למניעת אי-הבנות.",
      },
      {
        title: "תיאום מועד שידור",
        body: "אם החוזה מגדיר חלון פרסום, בחרו את המועד המדויק. היוצר מקבל תזכורת אוטומטית.",
      },
    ],
    nextGuideSlug: "approve-and-release-escrow",
  }),

  // ── מחלוקות וביטולים ──
  stub({
    title: "פתיחת הליך בוררות",
    slug: "open-arbitration",
    excerpt: "מתי ואיך לפתוח הליך גישור מובנה כשמותג ויוצר לא מגיעים להסכמה.",
    category: "disputes",
    audience: "advertiser",
    readingMinutes: 4,
    publishedAt: "2026-08-12",
    intro:
      "כל עוד ההליך פתוח, כספי הקמפיין נשארים מוקפאים בנאמנות. ההכרעה מתבססת על הבריף המקורי והתיעוד בפלטפורמה.",
    stepsHeading: "שלבי ההליך",
    steps: [
      {
        title: "פנייה ליישוב ישיר",
        body: "לפני בוררות, המערכת מחייבת 48 שעות של ניסיון להגיע להסכמה בחדר הקמפיין.",
      },
      {
        title: "פתיחת בקשת בוררות",
        body: 'לחצו "פתח מחלוקת", בחרו את סוג הבעיה וצרפו את הראיות הרלוונטיות.',
      },
      {
        title: "הגשת עמדות",
        body: "כל צד מגיש את גרסתו תוך 3 ימי עסקים. אין תקשורת ישירה בין הצדדים בשלב זה.",
      },
      {
        title: "הכרעה",
        body: "צוות הבוררות מכריע תוך 7 ימי עסקים. ההחלטה סופית והכסף משוחרר בהתאם.",
      },
    ],
    tip: {
      title: "לפני שפותחים",
      body: "ודאו שכל התכתובת וההסכמות מתועדות בחדר הקמפיין ולא בערוצים חיצוניים — רק תיעוד בפלטפורמה נשקל.",
    },
    nextGuideSlug: "campaign-cancellation-policy",
  }),
  stub({
    title: "מדיניות ביטול קמפיין פעיל",
    slug: "campaign-cancellation-policy",
    excerpt: "מה קורה לתקציב ולתוצרים כשמבטלים קמפיין באמצע, ומהם דמי הביטול.",
    category: "disputes",
    audience: "advertiser",
    readingMinutes: 3,
    publishedAt: "2026-08-14",
    intro: "אפשר לבטל קמפיין בכל שלב, אך ההשלכות על התקציב תלויות בכמות העבודה שכבר בוצעה.",
    steps: [
      {
        title: "ביטול לפני תחילת עבודה",
        body: "החזר מלא של התקציב, ללא דמי ביטול. היוצר מקבל התראה.",
      },
      {
        title: "ביטול אחרי הגשת טיוטה",
        body: "משוחרר ליוצר תשלום חלקי עבור העבודה שבוצעה; היתרה מוחזרת למפרסם.",
      },
      {
        title: "ביטול הדדי",
        body: "אם שני הצדדים מסכימים על תנאי סיום, ניתן להזין חלוקה מותאמת שהמערכת מבצעת.",
      },
    ],
    nextGuideSlug: "missed-deadlines",
  }),
  stub({
    title: "התמודדות עם אי-עמידה בזמנים",
    slug: "missed-deadlines",
    excerpt: "הכלים במערכת כשצד אחד לא עומד בלוח הזמנים שנקבע בחוזה.",
    category: "disputes",
    audience: "creator",
    readingMinutes: 3,
    publishedAt: "2026-08-16",
    intro: "החוזה מגדיר מועדים לכל שלב. איחור מפעיל תזכורות אוטומטיות, ואחריו אפשרות להליך.",
    steps: [
      {
        title: "תזכורות אוטומטיות",
        body: "יום לפני מועד וביום המועד, שני הצדדים מקבלים התראה. הסטטוס בחדר הקמפיין מסומן באדום.",
      },
      {
        title: "בקשת הארכה",
        body: "אפשר להציע מועד חדש. ההארכה נכנסת לתוקף רק באישור הצד השני ומתועדת בחוזה.",
      },
      {
        title: "הסלמה להליך",
        body: "אם האיחור עולה על התקופה שבחוזה, הצד הנפגע יכול לפתוח מחלוקת ללא המתנה נוספת.",
      },
    ],
    nextGuideSlug: "open-arbitration",
  }),
];
