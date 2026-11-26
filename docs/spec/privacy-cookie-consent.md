# אישור עוגיות (Cookie Consent)

עודכן: 2026-11-26. אתר שיווקי + עמודי auth ציבוריים בלבד (לא האזור האישי).

## התנהגות
- באנר בתחתית המסך בביקור ראשון, עד בחירה: "אישור הכל" / "דחיית עוגיות לא הכרחיות" (אותו כפתור primary, ללא dark pattern) / "התאמה אישית" (ghost).
- התאמה אישית: חלון modal עם הכרחיות (נעול), סטטיסטיקה, שיווק, מתגי `role="switch"`. ESC או "סגירה בלי שמירה" סוגרים בלי לשמור הסכמה. מלכודת פוקוס, החזרת פוקוס.
- קישור קבוע "הגדרות עוגיות" בפוטר פותח מחדש את החלון (שינוי/הסרת הסכמה).
- cookie `bridgead_consent`: JSON `{v, necessary, analytics, marketing, ts}`, Path=/, SameSite=Lax, Secure ב-https, Max-Age ~183 יום.
- שינוי נוסח/קטגוריות: להעלות `CONSENT_VERSION` ב-`src/lib/consent.ts` => הבאנר יופיע שוב.

## שימוש בעתיד
- `getConsent()` / `hasConsent("analytics" | "marketing")` מ-`src/lib/consent.ts` (צד לקוח).
- `<ConsentGate category="analytics">...</ConsentGate>` עוטף סקריפט/פיקסל/iframe; לא מרנדר דבר בשרת ובלי הסכמה.

## בדיקת צד שלישי (grep)
כרגע אין סקריפטי צד שלישי, אנליטיקס, פיקסלים, iframes או פונטים חיצוניים (פונטים דרך `next/font`, מתארחים עצמית; ה-`<script>` היחיד הוא JSON-LD פנימי). לכן אין מה לחסום כרגע.

## קבצים
- חדשים: `src/lib/consent.ts`, `src/components/consent/{cookie-consent,consent-gate,cookie-settings-link}.tsx`, `src/app/(frontend)/(auth)/layout.tsx`
- שונו: `src/app/(frontend)/(marketing)/layout.tsx`, `src/components/marketing/site-footer.tsx`, `src/lib/legal-defaults.ts` (עמוד cookies)

## בדיקה
1. פתח אתר בחלון פרטי: הבאנר מופיע; בחר כל אפשרות ובדוק ב-DevTools את ה-cookie.
2. רענן: הבאנר לא חוזר. לחץ "הגדרות עוגיות" בפוטר: החלון נפתח עם הבחירה השמורה.
3. מחק את ה-cookie או העלה `CONSENT_VERSION`: הבאנר חוזר.
4. מקלדת: Tab נשאר בתוך החלון, ESC סוגר בלי לשמור.

## הערה
תוכן /legal/cookies נקרא מ-Payload כשיש רשומה; `legal-defaults.ts` הוא seed/fallback. הנוסח החדש יופיע אחרי עדכון הרשומה ב-/admin (או seed מחדש).
