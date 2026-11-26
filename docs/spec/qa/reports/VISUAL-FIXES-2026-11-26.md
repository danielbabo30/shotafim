# תיקוני ממצאים ויזואליים — 2026-11-26

מקור: `VISUAL-2026-11-26.md`. לא בוצע commit/push. לא נגעתי בשכבת הכסף, ב-`wp-plugin`, ב-`src/lib/track`, ולא בקבצי payments-gate. נבדקו: `npm run typecheck` ו-`npm run lint` עוברים; prettier רץ רק על קבצים ששונו.

## קישורים שמובילים ל-404 — מסומנים "-404" (הנחיה מאוחרת של המשתמש)

במקום להסיר, הצמדתי את הסיומת `-404` לטקסט הנראה. לחיפוש: `grep -rn "\-404" src`.

| טקסט מסומן | יעד | מקום |
| --- | --- | --- |
| תמחור-404 | `/pricing` | `src/lib/cms-defaults.ts` — `DEFAULT_NAV_ITEMS` (תפריט ראשי) |
| תמחור-404 | `/pricing` | `src/lib/cms-defaults.ts` — `DEFAULT_FOOTER_COLUMNS`, עמודת "פלטפורמה" |
| אודותינו-404 | `/about` | `src/lib/cms-defaults.ts` — פוטר, עמודת "חברה" |
| סיפורי הצלחה-404 | `/resources/case-studies` | `src/lib/cms-defaults.ts` — פוטר, עמודת "חברה" |
| הזמנה עכשיו-404 | `/dashboard/roster/invite` | `src/components/app/dashboard/roster-cta.tsx` (דשבורד מפרסם) |

- CMS החי: הורצו `/dev/sync-nav` (הורחב: מעדכן גם את `footerColumns` ב-site-settings, רק שדה זה) — התפריט הראשי והפוטר החיים מציגים עכשיו את הסיומת (אומת ב-curl על `/`).
- שיטת אימות: crawl מלא עם כניסה לשלושת התפקידים היה איטי מדי מול שרת ה-dev (מאות חוזים/בריפים מנתוני QA) ונקטע. במקומו: (1) סריקה סטטית של כל `href`/`redirect`/`push` מילוליים ב-`src` מול עץ ה-routes — נמצאו בדיוק 4 יעדים לא קיימים (למעלה); (2) curl חי על כל ה-href הפנימיים ב-15 עמודי האתר הציבורי (37 יעדים ייחודיים) — רק `/about`, `/pricing`, `/resources/case-studies` החזירו 404. קישורים דינמיים (`/dashboard/.../[id]`) לא נסרקו חי.
- קישורי תוכן ארוכים ב-CMS (פוסטים/מדריכים) בנתוני defaults — לא נמצאו יעדים שבורים נוספים.
- לא נוצרו דפים חדשים. כשייבנו — להסיר את הסיומת ולהריץ `/dev/sync-nav` (או לערוך ב-/admin).

## מצב לפי ממצא

| VIS | מצב | מה נעשה / קבצים | איך לאמת |
| --- | --- | --- | --- |
| 01 | תוקן | כלל גלובלי ב-`src/app/(frontend)/globals.css`: `overflow-wrap: break-word` על body ו-`overflow-wrap: anywhere` (specificity אפס, דרך `:where`) על p/h1-h6/li/dd/blockquote/figcaption — מכסה בריפים, הודעות, תיאורים, ביו, כרטיסים. נאומת שהכלל מקומפל ב-CSS החי. לא נבדק ויזואלית בדפדפן על הבריף "גימבורי". | `/dashboard/campaigns/cmtkf61jd00046r90tvl3ysqf` כיוצר ב-375px — אין גלישה אופקית. אם עדיין יש: טקסט בתוך `span`/`div` (לא p) שצריך `wrap-anywhere`. |
| 02 | תוקן חלקית (לפי הנחיה חדשה) | קישורים נשארו, סומנו "-404" (ראו טבלה). `sync-nav` מסנכרן תפריט + פוטר. | `/` — תפריט ופוטר. |
| 03 | תוקן חלקית (לפי הנחיה חדשה) | `roster-cta.tsx` — "הזמנה עכשיו-404". | דשבורד מפרסם. |
| 04 | תוקן | `src/app/global-not-found.tsx` (עברית, `lang=he dir=rtl`, הדר+פוטר+קישור לבית וליצירת קשר), `src/components/marketing/not-found-view.tsx`, `(marketing)/not-found.tsx`, `(frontend)/not-found.tsx` (ל-`notFound()`), `src/lib/fonts.ts` (פונטים משותפים), `next.config.ts` (`experimental.globalNotFound: true` — נדרש כי יש כמה root layouts; שינוי ב-config גורם ל-Next להפעיל מחדש את שרת ה-dev לבד). | `/nonexistent`, `/pricing` → 404 בעברית עם הדר/פוטר (אומת ב-curl: HTTP 404, `lang="he" dir="rtl"`). |
| 05 | תוקן | `cookie-consent.tsx`: כל הכפתורים `min-h-11` (44px), "סגירה בלי שמירה" 44px, אזור מגע מורחב למתגים. | באנר עוגיות ב-375px. |
| 06 | תוקן | `<bdi dir="ltr">` סביב @handle: `contracts/[id]/page.tsx`, `room-chat.tsx`, `marketplace/[id]/page.tsx`, `messages/message-thread.tsx`. | `/dashboard/contracts/<id>` — "@noastyle". |
| 07 | תוקן | `settings/form-ui.tsx` — `Field` מקשר תווית ל-input/textarea/select הישיר (useId). חל על כל טפסי ההגדרות. | `/dashboard/settings` — `input.labels.length === 1`. |
| 08 | תוקן | `aria-label` לשדות חיפוש (הודעות, מרקטפלייס, שטחי פרסום, הנכסים שלי), שדה הודעה, הערות/קובץ הגשה, הערות תיקון, אימייל ב-sign-in ובניוזלטר. לא כוסו: הערות בעל שטח ב-shipping-panel (עטוף ב-label קיים). | DOM. |
| 09 | תוקן | `sign-in`: `h1` "כניסה לאזור האישי", placeholder `name@company.com` עם `dir=ltr`. אין הדר/פוטר ב-auth (החלטת עיצוב, לא שונה). | `/sign-in`. |
| 10 | תוקן | `campaign-wizard.tsx`: שגיאת כותרת ליד השדה, `aria-invalid`, פוקוס וגלילה לשדה. | "המשך" בלי כותרת ב-375px. |
| 11 | תוקן | חיצי "חזרה" הופכו (`rotate-180`) ב-`assets/new`, `assets/[id]/edit`, `bookings`; `businesses/[businessId]` "←"→"→"; `▸`→`◂` ו-"→"→"←" בהוראות התוסף (`plugin-section.tsx`, `store-connect-panel.tsx`). | הדפים הנ"ל. |
| 12 | חלקי | 44px ל: "בריף חדש", "צפייה בבריף/הצעות". שאר היעדים (מועדפים, חודש קודם/הבא, צ'יפים, טאבי הודעות, צ'קבוקסים, כפתורי מחלוקת) לא שונו — דורש מעבר עיצובי. | — |
| 13 | תוקן | קישורי פוטר 44px במובייל (ללא שינוי בדסקטופ). | פוטר ב-375px. |
| 14 | חלקי — צריך מהמשתמש | אין מודל/endpoint לפניות — הטופס הדמה הוסתר ב-`contact/page.tsx`; מוצגים רק פרטי קשר מ-CMS. טלפון "מקום-שמור" (03-000-0000) מוסתר אוטומטית ב-`contact-info.tsx`. `contact-form.tsx` נשאר בקוד, לא בשימוש. **צריך מהמשתמש:** אימייל/טלפון/כתובת אמיתיים ב-/admin ← "מידע על החברה" (כרגע `hello@shutafim.co.il` וכתובת "רחוב הארבעה 21" הם ערכי ברירת מחדל מומצאים), והחלטה על פלטפורמת טפסים/מודל פניות. | `/contact`. |
| 15 | נדחה | איור Hero — דורש נכס עיצובי/צילום מוצר מהמשתמש. | — |
| 16 | תוקן | `deliverable-proofer.tsx`: `ImagePreview` — תמונה שבורה או קטנה מ-16px מציגה "אין תצוגה מקדימה" + קישור פתיחה. | חוזה `cmtkg885t00036r8kiaga56zz` כיוצר. |
| 17 | חלקי | ריבוי: `src/lib/plural.ts` (`pluralHe`), בשימוש ב-`dashboard-brand.ts`, `discover/page.tsx`, `campaigns/page.tsx` ("הצעה אחת"/"צפייה בהצעה"). נתוני QA בבסיס הנתונים — לא נמחקו. | רשימת קמפיינים עם הצעה אחת. |
| 18 | נדחה | רצועת טאבים משפטיים / טקסט משפטי באנגלית — לשיקול המשתמש/משפטי. | — |
| 19 | חלקי | "הפקדת Escrow" → "הפקדה לנאמנות" באשף. שאר המופעים כבר בצורת "נאמנות (Escrow)"; בטקסטים משפטיים/שיווקיים/מדריכים לא שונו. Media Kit / Proof of Play / Double Booking — דורש החלטת מינוח. "גילוי קמפיינים" מול "גילוי בריפים" — לא אוחד (החלטת מינוח). | — |
| 20 | לא-באג/נדחה | HMR/preload בסביבת dev; אזהרת preload של פונטים — לבדוק ב-build production. | — |
| 21 | לא אותר | `campaigns/new/page.tsx` — שרת, שתי קריאות DB אחרי guard, אין מצב מירוץ בקוד; הסבר סביר: קומפילציה קרה של Turbopack. לא שוחזר. | — |
| 22 | תוקן | `src/components/ui/skip-link.tsx` ("דילוג לתוכן הראשי", נראה בפוקוס) ב-layout השיווקי, ב-`app-shell.tsx`, ובעמוד 404; `id="main-content"` על ה-main. אין ב-auth (אין main). | Tab בראש העמוד. |

## דורש החלטה / תוכן מהמשתמש

- בניית `/pricing`, `/about`, `/resources/case-studies`, `/dashboard/roster/invite` או הסרתם (ואז להסיר "-404").
- פרטי קשר אמיתיים ופלטפורמת פניות (VIS-14).
- נכס Hero (VIS-15), מינוח באנגלית (VIS-19), יעדי מגע נוספים (VIS-12).
- שינוי `next.config.ts` (globalNotFound) מפעיל מחדש את שרת ה-dev אוטומטית; בפרודקשן נדרש build מחדש.
