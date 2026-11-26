# תקנון הורדת תוסף + SEC-A-14

## א. תקנון הורדה
- זרימה: `/dashboard/plugin` (או כל מקום שמשבץ `PluginDownloadCard`) -> כפתור "הורדת התוסף" -> מודאל (`<dialog>` מקורי: focus trap, ESC/ביטול סוגר בלי הורדה) -> תיבת סימון (לא מסומנת) -> "אישור" (מושבת עד סימון) -> server action `acceptPluginTerms` כותב `PluginDownloadConsent` -> הורדה דרך `/api/plugin-download` + הודעת הצלחה.
- אכיפה בשרת: ה-route מחזיר 403 אם אין רשומת אישור של המשתמש ל-`PLUGIN_TERMS_VERSION` הנוכחית; בהורדה מוצלחת מעדכן `downloadedAt` ברשומה האחרונה.
- שורת "אישרת את תקנון ההורדה ב-<תאריך>" בעמוד התוסף (`getMyPluginTermsConsent`, cache, מסונן למשתמש).

### קבצים
- `src/lib/plugin-terms.ts` (נוסח + גרסה), `src/lib/plugin-download-consent.ts` (fetcher + קריאת גרסת התוסף)
- `src/lib/actions/plugin-download-actions.ts`
- `src/components/app/plugin/plugin-download-button.tsx` (חדש), `plugin-download-card.tsx`
- `src/app/api/plugin-download/route.ts`, `src/app/(frontend)/(app)/dashboard/plugin/page.tsx`
- `prisma/schema.prisma` + migration `20261126120017_plugin_download_consent`

### סכמה: `PluginDownloadConsent`
id, userId (FK User, Cascade — כמו LegalConsent), businessId (FK BusinessProfile, SetNull, אופציונלי), userName/userEmail (snapshot), acceptedAt (default now), termsVersion, pluginVersion, ipAddress (x-forwarded-for, ניתן לזיוף — תיעודי בלבד), userAgent, downloadedAt (nullable). אינדקסים: (userId, termsVersion), acceptedAt.
הערה: `prisma format` יישר מחדש כללית את `schema.prisma` (רעש ב-diff).

### החלפת נוסח התקנון
ערכו `PLUGIN_TERMS_TEXT` (מערך פסקאות) ב-`src/lib/plugin-terms.ts` ועדכנו `PLUGIN_TERMS_VERSION`. שינוי גרסה מחייב אישור מחדש.

### אימות
1. אחרי `prisma generate` חובה restart לשרת ה-dev (Prisma client ישן נטען בזיכרון; לפני restart ה-route מחזיר 500).
2. כניסה כ-brand1, `/dashboard/plugin`, לחיצה על הורדה, מודאל, סימון, אישור -> קובץ יורד, נוצרת רשומה עם downloadedAt.
3. `curl -k -b jar /api/plugin-download` ללא רשומת אישור -> 403; עם רשומה -> 200 ZIP.

## ב. SEC-A-14
ב-`registration-actions.ts` וב-`settings-actions.ts` הודעות הכפילות (P2002) הוחלפו בהודעה אחת: "לא ניתן לשמור את הפרט הזה. אם הוא שלך — פנו לתמיכה." השמירה עדיין נחסמת (אילוץ ה-unique נשאר).
