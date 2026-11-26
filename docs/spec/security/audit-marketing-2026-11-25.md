# ביקורת אבטחה — שכבת האתר השיווקי/ציבורי ותצורת הפריסה
תאריך: 2026-11-25 · היקף: (marketing), (payload)/admin, components/marketing, lib/cms*, collections, globals, next.config.ts, proxy.ts, כותרות, robots/sitemap, .gitignore, .env.example, build output.
שיטה: סקירת קוד סטטית + curl בטוח (GET/POST קל) מול https://localhost:3000 (שרת dev), npm audit. לא שונה קוד/DB. אין ערכי סודות בדוח.

## ממצאים

### SEC-M-01 — תלויות פגיעות קריטיות: Next 16.3.3 ו-Payload 3.88.0 — קריטי — קטגוריה: תלויות (+4,3,5)
- מיקום: package.json / node_modules (next 16.3.3, payload 3.88.0, sharp, prisma, zod, undici).
- npm audit --omit=dev: 25 פגיעויות (2 קריטיות, 10 גבוהות). Next (טווח 16.0.0–16.4.4): RCE לא מאומת ב-Image Optimization עם SVG, RCE ב-`use cache`, RCE ב-next/og, SSRF ב-Image Optimization, DoS ב-Server Actions, הרעלת cache ב-ISR/SSG. Payload (<=3.91): עקיפת field access ב-auth collections (קריטי), עדכון מסמכים ללא הרשאה (קריטי), RCE ב-first-register, חשיפת API keys, SVG/XML XSS בהעלאות, עקיפת בקרות הרשאה ב-relationship queries.
- תרחיש: תוקף חיצוני מנצל CVE ציבורי נגד אתר פרוס (בעיקר Image Optimization ו-/api של Payload שחשופים ללא אימות).
- תיקון: `next@16.4.6` (תיקון זמין, לא major), Payload/db-postgres/richtext-lexical ל-3.94.2 ומעלה (ליישר גרסאות כל חבילות @payloadcms/*), `npm audit fix` ל-sharp/zod; להריץ audit מחדש; ב-CI להוסיף `npm audit --omit=dev --audit-level=high`.

### SEC-M-02 — אין כותרות אבטחה כלל (CSP/HSTS/X-Frame-Options/nosniff/Referrer-Policy/Permissions-Policy) — בינוני — קטגוריה: כותרות (+1)
- מיקום: next.config.ts (אין `headers()`), proxy.ts (לא מוסיף כותרות). אומת ב-`curl -I /`: אין אף כותרת אבטחה.
- תרחיש: clickjacking על /sign-in, /admin ו-/dashboard (framing); אין שכבת הגנה שנייה מול XSS; MIME sniffing בקבצי מדיה; אין HSTS.
- תיקון: להוסיף `headers()` ב-next.config.ts: `Strict-Transport-Security: max-age=63072000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (או CSP `frame-ancestors 'none'`; ל-/admin 'self' בלבד אם נדרש live preview), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, ו-CSP מבוסס nonce (דרך proxy.ts) עם `object-src 'none'; base-uri 'self'`.

### SEC-M-03 — Payload REST/GraphQL חשופים ציבורית, introspection פתוח, והסכנה בגישת ברירת מחדל — בינוני — קטגוריה: 4/14
- מיקום: src/app/(payload)/api/[...slug], /api/graphql, /api/graphql-playground; payload.config.ts (אין `graphQL.disableIntrospectionInProduction`/`disablePlaygroundInProduction` מפורש; אין `csrf`/`cors`).
- אומת: `GET /api/posts`, `/api/media`, `/api/globals/site-settings` → 200 ללא אימות (מכוון: read ציבורי). `POST /api/graphql` {__schema} מחזיר את כל הסכמה. `/api/graphql-playground` → 200 (בשרת dev; בפרודקשן ברירת המחדל מכבה, אך לא מפורש). `/api/users` → 403 (תקין).
- תרחיש: מיפוי מלא של המודל + שאילות עמוקות (depth/complexity) ל-DoS; חשיפת שדות לא מיועדים אם יתווסף שדה פנימי ל-posts/guides/globals (access.read הוא `() => true` על כל הרשומה כולל drafts/versions אם יופעלו).
- תיקון: לקבוע ב-buildConfig `graphQL: { disablePlaygroundInProduction: true, disableIntrospectionInProduction: true, maxComplexity: ... }`, `routes`; אם GraphQL לא בשימוש — לא לחשוף (למחוק src/app/(payload)/api/graphql*). להגביל read ל-`_status == published` בעת הפעלת drafts. להגדיר `csrf` ו-`cors` מפורשים ב-config.

### SEC-M-04 — משתמש Payload ראשון ("first register") + אין rate limit לכניסה — בינוני — קטגוריה: 11/10/6
- מיקום: src/collections/Users.ts (`auth: true` ללא הגדרות), payload.config.ts.
- אומת: `GET /api/users/init` → initialized:true (כרגע קיים משתמש; אין חלון חשיפה בסביבה זו). בפריסה חדשה/DB ריק, כל מי שמגיע ראשון ל-/admin/create-first-user הופך לאדמין (ובגרסה 3.88 קיימת גם CVE RCE ב-first-register — ראה SEC-M-01).
- אין rate limit על /api/users/login מעבר ל-lockout ברירת מחדל של Payload (maxLoginAttempts 5, מאפשר DoS של נעילת חשבון אדמין — CVE "account-lockout DoS").
- תיקון: ליצור את אדמין ה-CMS ב-seed מבוקר לפני חשיפת האתר; להגדיר `auth: { maxLoginAttempts, lockTime, cookies: { secure: true, sameSite: 'Strict' } }`; להוסיף rate limit (WAF/Vercel Firewall/Upstash) על /api/users/login ו-/admin; לשקול הגבלת /admin לפי IP.

### SEC-M-05 — Media מאפשר `image/*` כולל SVG — בינוני — קטגוריה: 3/1
- מיקום: src/collections/Media.ts:16 (`mimeTypes: ["image/*"]`); `read: () => true`.
- תרחיש: עורך CMS (או חשבון Payload שנפרץ) מעלה SVG עם סקריפט; מוגש ב-same-origin (`/api/media/file/...`) ← XSS ב-origin של האתר, שגם מחזיק את עוגיית ה-session של האפליקציה. מאומת כבעיית CVE ב-Payload ("Bypassed sanitization of user uploaded SVGs").
- תיקון: מגבלה מפורשת: `["image/png","image/jpeg","image/webp","image/gif","image/avif"]`; להגיש מדיה עם `Content-Security-Policy: sandbox` / `Content-Disposition`; להגדיר `access.create/update/delete` מפורשים (admin בלבד); מגבלת גודל קובץ.

### SEC-M-06 — הזרקת `</script>` ב-JSON-LD (dangerouslySetInnerHTML) — נמוך — קטגוריה: 1
- מיקום: src/app/(frontend)/(marketing)/resources/blog/[slug]/page.tsx:69, src/app/(frontend)/(marketing)/guides/[slug]/page.tsx:76.
- תיאור: `JSON.stringify(jsonLd)` נכנס ל-`<script type="application/ld+json">` ללא escaping של `<`. שדות כמו title/excerpt מגיעים מ-Payload. מחרוזת `</script><script>...` בכותרת מאמר תבצע JS בדף הציבורי.
- תרחיש: דורש כתיבה ב-CMS (עורך זדוני/חשבון CMS שנפרץ/CVE של Payload מ-SEC-M-01) — הופך הרשאת עורך ל-XSS על כל המבקרים.
- תיקון: `JSON.stringify(jsonLd).replace(/</g, "\\u003c")` (פונקציית עזר משותפת `safeJsonLd`). נבדק: אלו מופעי dangerouslySetInnerHTML היחידים ב-src; rich text (ProseBlock) מרונדר כ-React nodes — אין ממצא.

### SEC-M-07 — כתובות URL שמנוהלות ב-CMS מוזרמות ל-href ללא בדיקת סכמה — נמוך — קטגוריה: 1
- מיקום: src/globals/CompanyInfo.ts:97 (mapUrl), Homepage.ts:16 (`href` text חופשי), hero/solution-hero/cta-banner/guide-steps (`href={...href}`), contact-info.tsx (mapUrl, mailto).
- תיאור: אין ולידציה לסכמה — `javascript:`/`data:` ב-href יתבצע בלחיצה (React 19 חוסם `javascript:` ב-href ומזהיר, אבל זה לא מחליף ולידציה; `next/link` עם כתובת חיצונית).
- תיקון: ולידציה ב-Payload (`validate`: רק `/…`, `https://`, `mailto:`, `tel:`) + helper `safeHref()` ברינדור.

### SEC-M-08 — טפסי ניוזלטר וצור-קשר הם UI בלבד (TODO) — מידע — קטגוריה: 7/10
- מיקום: src/components/marketing/newsletter-form.tsx:~33 (`setDone(true); // TODO`), contact-form.tsx:~56 (`setSent(true); // TODO`).
- אין endpoint שרת ← אין כרגע משטח התקפה (אין CSRF/spam/injection), אבל גם הודעה "תודה, נרשמת" מטעה: הנתונים אינם נשמרים (חוסר תפקודי; סותר כלל "אין STUB").
- המלצה לעת מימוש: server action/route עם ולידציית zod, rate limit לפי IP+אימייל, honeypot/Turnstile, אי-חשיפת קיום מנוי, הגנת header injection במייל, אימות Origin.

### SEC-M-09 — אין robots.txt / sitemap.xml ואין חסימת אינדוקס לנתיבים רגישים — נמוך — קטגוריה: 4
- אומת: `/robots.txt` ו-`/sitemap.xml` → 404. אין `robots`/`sitemap` ב-src/app.
- תרחיש: מנועי חיפוש עלולים לאנדקס /admin, /dashboard (מוגנים), /sign-in; אין חסימת /api ו-/dev. (רלוונטי ל-SEO ולחשיפה, לא לפרצה ישירה.)
- תיקון: `src/app/robots.ts` עם `disallow: ["/admin","/api","/dashboard","/dev","/register"]`, ו-`sitemap.ts`; להוסיף `X-Robots-Tag: noindex` ל-/admin ו-/api.

### SEC-M-10 — נתיבי /dev/* ו-dev/login: המגן היחיד הוא NODE_ENV — נמוך (בר-ניצול קריטי אם הדגל שגוי) — קטגוריה: 4/6/11
- מיקום: src/app/(frontend)/dev/{login,seed*,sync-nav}/route.ts — כל אחד בודק `process.env.NODE_ENV !== "development"` ומחזיר 404. הקובץ login/route.ts:3-5 עצמו מציין "יש להסיר לפני פרודקשן".
- `/dev/login` יוצר Session ב-DB לכל מייל קיים (`?email=`) כולל אדמין, ללא סיסמה. ב-build פרודקשן (`next build/start`) NODE_ENV=production ולכן חסום — נבדק רק בקוד (השרת הנוכחי הוא dev: `/dev/login` → 307 כצפוי). הסיכון: הרצת `next dev` על שרת מחובר לאינטרנט / DB משותף.
- תיקון: להוציא את תיקיית dev מה-build (למשל להסיר ב-CI או `pageExtensions`/env gate נוסף כמו `ALLOW_DEV_ROUTES=1` + הגבלה ל-localhost לפי host header), ולהוסיף בדיקת CI שהנתיב מחזיר 404 בבילד פרודקשן.

### SEC-M-11 — `trustHost: true` ו-`secret: process.env.PAYLOAD_SECRET || ""` — נמוך — קטגוריה: 6/8
- מיקום: src/auth.ts:33, src/payload.config.ts:61.
- תיאור: Payload יעלה עם secret ריק אם המשתנה חסר (חתימת JWT/הצפנה חלשה) במקום להיכשל. `trustHost: true` קבוע (לא רק Vercel) — host header injection בקישורי magic-link/OAuth אם האתר פרוס מאחורי proxy שלא מנרמל Host.
- תיקון: `if (!process.env.PAYLOAD_SECRET) throw` בעלייה בפרודקשן; לקבע `AUTH_URL` ולהשתמש ב-trustHost רק כשיש proxy מהימן.

### SEC-M-12 — Prisma query logging ב-dev + לוגי email — נמוך — קטגוריה: 15
- מיקום: src/lib/prisma.ts:15 (`log: [...,"query"]` רק ב-development — תקין), src/lib/email.ts:19,39,45 (`console.info` כולל כתובת נמען וכותרת; `console.error` מדפיס גוף תגובת Resend).
- תיקון: למסך כתובת נמען בלוג; לא להדפיס `res.text()` מלא.

### SEC-M-13 — `serverActions.bodySizeLimit: 55mb` — נמוך — קטגוריה: 10/3
- מיקום: next.config.ts. מגדיל משמעותית את משטח DoS של server actions (גם לא מאומתים אם הם נגישים) ו-Next בגרסה הנוכחית פגיע ל-DoS ב-Server Actions (SEC-M-01).
- תיקון: לאכוף אימות לפני עיבוד גוף, להעביר העלאות גדולות ל-direct-to-blob/presigned, ולהגביל בשכבת ה-edge.

### SEC-M-14 — `wp-plugin/dist/*.zip` נמצא ב-git ומוגש רק דרך route מאומת — מידע — קטגוריה: 4
- ה-ZIP מקומיט (נדרש להפצה); route `/api/plugin-download` דורש session ותפקיד BRAND (אומת: 401 ללא session). אין חשיפה ב-/public. מומלץ לוודא שהתוסף לא מכיל מפתחות (נבדק ב-grep: אין סודות בקוד המקור המעוקב).

## קטגוריות שנבדקו ללא ממצא
- **.env בהיסטוריית git**: `git log --all --diff-filter=A` — רק `.env.example` נוסף אי פעם; אין .pem/.key/.sql dump ב-git; `certificates/` ו-`.storage/`, `/media`, `*.pem`, `.env*` ב-.gitignore. ב-.env.example שדות סוד ריקים (אורך 2), ו-DATABASE_URL/DIRECT_URL הם placeholder (user/HOST/dbname) — לא סיסמאות אמיתיות. אין דפוסי מפתחות (sk_live, AKIA, re_, GOCSPX, ghp_, PRIVATE KEY) ב-git grep.
- **Source maps**: אין `productionBrowserSourceMaps`; קבצי `.map` ב-.next הם תוצר dev/turbopack פנימי ו-.next מוחרג מ-git; ב-public אין .map.
- **next/image / SSRF**: אין `images.remotePatterns` ו-fetch שרת לכתובות משתמש בשכבה זו (אין SSRF ישיר; ראה SEC-M-01 ל-CVE ב-image optimizer).
- **CORS**: אין תצורת cors; Payload ללא `cors` = ללא כותרות Access-Control (נבדק: תשובה בלי כותרות CORS).
- **Stack traces**: תשובות שגיאה של Payload/routes נבדקו — הודעה כללית, ללא stack (בדיקה: login שגוי → 401 עם הודעה עברית כללית).
- **proxy.ts**: בדיקה אופטימית של עוגיית session בלבד, ו-(app)/layout מאמת מול DB; ה-matcher מחריג /api ו-/admin (תקין כי ל-API יש אימות בעצמם — מחוץ להיקף שכבה זו).
- **IDOR**: בשכבה הציבורית אין משאבי משתמש; מחוץ להיקף (האזור האישי).

## טבלת 16 הקטגוריות
| # | קטגוריה | סטטוס |
|---|---|---|
| 1 | XSS | ממצאים: SEC-M-06, SEC-M-07, SEC-M-05 (SVG) |
| 2 | CSRF | נבדק חלקית — Payload ללא `csrf` מפורש (SEC-M-03); אין טפסים עם שרת בשכבה זו |
| 3 | העלאת קבצים | ממצא SEC-M-05 |
| 4 | חשיפת קבצים/dev routes | SEC-M-09, SEC-M-10, SEC-M-14; .env/.storage/certificates — אין חשיפה |
| 5 | SSRF | אין ממצא בקוד; CVE ב-Next (SEC-M-01) |
| 6 | סשנים | SEC-M-04, SEC-M-11 |
| 7 | איפוס סיסמה/newsletter/contact | SEC-M-08 (לא ממומש); איפוס סיסמה לא קיים (magic link/Google) |
| 8 | סודות/היסטוריית git | נבדק — אין ממצא (SEC-M-11 נמוך על secret ריק) |
| 9 | CORS | נבדק — אין ממצא |
| 10 | Rate limiting | SEC-M-04, SEC-M-13; אין rate limit בשום endpoint ציבורי |
| 11 | credentials ברירת מחדל | SEC-M-04 (first-user), אין סיסמאות קשיחות ב-seed של Payload (נבדק) |
| 12 | Webhooks | מחוץ להיקף השכבה (api/track, api/plugin) — לא נבדק |
| 13 | אימות תשלום בצד לקוח | לא רלוונטי לשכבה זו |
| 14 | IDOR | SEC-M-03 (access.read פתוח); האזור האישי לא נבדק |
| 15 | דליפת מידע בלוגים | SEC-M-12 |
| 16 | Source maps | נבדק — אין ממצא |
| + | כותרות אבטחה | SEC-M-02 |
| + | תלויות | SEC-M-01 |

## מה לא נבדק
- בילד פרודקשן אמיתי (`next build && next start`) — הבדיקות החיות רצו על שרת dev; התנהגות NODE_ENV ו-GraphQL playground בפרודקשן נבדקה בקוד/תיעוד בלבד.
- האזור האישי (app), /api/auth, /api/track, /api/plugin, /api/cron, /api/connect — בתחום של סוכנים אחרים.
- הפאנל /admin מבפנים (דורש התחברות), תצורת Vercel/CDN/WAF, הגדרות DB.
- בדיקת ניצול בפועל של CVE-ים (רק זיהוי גרסאות).

## סיכום לפי חומרה
קריטי: 1 · גבוה: 0 · בינוני: 4 (M-02..M-05) · נמוך: 7 (M-06, 07, 09, 10, 11, 12, 13) · מידע: 2 (M-08, M-14)
