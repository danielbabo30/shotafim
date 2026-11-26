# ביקורת אבטחה — האזור האישי והאימות (2026-11-25)

**היקף:** `(app)`, `(auth)`, `src/app/api/**` (ללא `api/track`, `api/plugin/*`), `src/lib/actions/**`, `src/lib/app-user.ts`, תצורת Auth.js, הרשמה, OAuth connect, העלאות/הגשת קבצים, חוזים, הודעות, מחלוקות, נאמנות (סקירת קוד בלבד), `dev/**`, cron.
**שיטה:** סקירת קוד מלאה של כל server action ו-route handler בתחום + בדיקות חיות לא-הרסניות נגד `https://localhost:3000` (cookie jars: `/tmp/sec-app-{brand,space,creator}.jar`, כניסה דרך `/dev/login` עם משתמשי seed חד-תפקידיים). לא שונה קוד, לא נוצרו/נמחקו נתונים (נוצרו רק שורות Session בכניסות ה-dev). אין בדוח ערכי סודות.

---

## ממצאים

### SEC-A-01 — בינוני — קטגוריה 6/7 — קישור חשבונות Google ללא בדיקת `email_verified`
- **מיקום:** `src/auth.ts:13-17` (`allowDangerousEmailAccountLinking: true`), ואין `signIn` callback ב-`src/auth.ts:40-50`.
- **תיאור:** Auth.js מקשר התחברות Google לחשבון קיים לפי כתובת המייל בלבד. הקוד לא בודק `profile.email_verified`.
- **תרחיש:** תוקף יוצר חשבון Google עם כתובת מייל של קורבן (דומיין שאינו Gmail, ללא אימות הכתובת, או חשבון Workspace שבשליטתו), מתחבר ל"שותפים" דרך Google, ומקבל את חשבון הקורבן הקיים (כולל חוזים, נתוני בנק, תפקיד אדמין אם קיים). זו התקפת pre-hijacking מוכרת.
- **תיקון:** להוסיף `callbacks.signIn` שמחזיר `false` כש-`account.provider === "google"` ו-`profile.email_verified !== true`. לשקול להסיר את הדגל ולבקש קישור מפורש מתוך הגדרות המשתמש.

### SEC-A-02 — בינוני — קטגוריה 6 (זרימת אימות) — Open redirect בדף הכניסה
- **מיקום:** `src/app/(frontend)/(auth)/sign-in/page.tsx:17` — `if (session?.user) redirect(callbackUrl || "/dashboard")`.
- **אומת חי:** משתמש מחובר שנכנס ל-`/sign-in?callbackUrl=https://evil.example/x` מקבל `307 → https://evil.example/x`. גם `//evil.example` מופנה.
- **תרחיש:** קישור פישינג בדומיין האמיתי של האתר שמעביר משתמש מחובר (או אחרי כניסה) לאתר זדוני בעל מראה זהה. (ה-`signIn(..., {redirectTo})` בשורות 53/72 מסונן ע"י Auth.js ולכן בטוח; רק שורה 17 פגיעה.)
- **תיקון:** לאמת `callbackUrl` — לקבל רק נתיב יחסי שמתחיל ב-`/` ולא ב-`//` או `/\`, אחרת ליפול ל-`/dashboard`. לעשות זאת גם ב-`redirectTo` בשורה 19.

### SEC-A-03 — בינוני — קטגוריה 10 — אין Rate Limiting בשום מקום
- **מיקום:** כל המערכת (חיפוש `ratelimit|throttle|upstash` ב-`src` ו-`package.json` — אפס תוצאות). רלוונטי במיוחד: `signIn("resend")` (`sign-in/page.tsx:70`, `register/page.tsx:89`), `sendMessage` / `sendRoomMessage` / `startBusinessConversation` (`message-actions.ts`, `contract-actions.ts:446`), `submitDeliverable`/`uploadCreatorImage`, `openDispute`, `inviteToCampaign`, `reserveAdSpace`.
- **תרחיש:** (1) הצפת תיבת דואר של קורבן בקישורי קסם ושריפת מכסת Resend / פגיעה במוניטין הדומיין; (2) ספאם הודעות/הזמנות לכל משתמש פעיל — `startBusinessConversation` מאפשר לכל משתמש מחובר לפתוח שיחה עם כל בעל עסק ACTIVE; (3) יצירת הרבה שורות Session/VerificationToken; (4) העלאות חוזרות של 50MB (ראו SEC-A-11).
- **תיקון:** שכבת rate-limit (Upstash/Vercel KV או Vercel WAF) לפי IP+משתמש: כניסה/magic link (למשל 5/שעה לכתובת), הודעות, העלאות, פתיחת מחלוקות.

### SEC-A-04 — בינוני — קטגוריות 1/2 — אין Security Headers (clickjacking, CSP, HSTS, nosniff)
- **מיקום:** `next.config.ts` (אין `headers()`), `src/proxy.ts` (לא מוסיף כותרות).
- **אומת חי:** תגובות `/sign-in`, `/dashboard` ללא `X-Frame-Options`/`frame-ancestors`, `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`.
- **תרחיש:** אתר זדוני מטמיע את `/dashboard/contracts/<id>` ב-iframe שקוף ומשטה במשתמש ללחוץ "הפקד תקציב"/"אשר ושחרר תשלום"/"פתח מחלוקת" (clickjacking). היעדר CSP מגדיל נזק של כל XSS עתידי.
- **תיקון:** `headers()` ב-`next.config.ts`: `frame-ancestors 'none'` (+`X-Frame-Options: DENY`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS בפרודקשן, ו-CSP עם nonce (תואם Payload `/admin` בנפרד).

### SEC-A-05 — בינוני — קטגוריות 13/14 — מפרסם יכול לבטל עמלה בכל סטטוס, כולל APPROVED/PAID, ללא אישור הספק או אדמין
- **מיקום:** `src/lib/actions/partner-actions.ts:269-273` (`decision === "REVERSE"` דורש רק `status !== "REVERSED"`), מימוש ב-`src/lib/track/ingest.ts:266-311` (תומך ב-`wasApproved`/`wasPaid` ו-clawback).
- **תרחיש:** מפרסם שהיוצר כבר הביא לו מכירות מבטל באופן ידני את כל העמלות שאושרו או שולמו (הערת `manual:<טקסט חופשי>`), ומעקף את תהליך המחלוקות/האדמין.
- **תיקון:** לאפשר REVERSE ידני רק על PENDING/ON_HOLD; ל-APPROVED/PAID לדרוש פתיחת מחלוקת/אישור אדמין ורישום AuditLog.

### SEC-A-06 — גבוה (חוסם שחרור לפרודקשן; מכוון בשלב הפיתוח) — קטגוריה 13 — מעברי נאמנות/פיקדון הם "מתג" בצד הלקוח ללא PSP
- **מיקום:** `contract-actions.ts:68-108` (`fundEscrow`), `partner-actions.ts:30-93` (`fundPartnerDeposit`), `partner-actions.ts:125-193` (`topUpPartnerDeposit`), `contract-actions.ts:224-288` (`approveAndRelease`).
- **תיאור:** הסכומים ב-`fundEscrow`/`fundPartnerDeposit` נגזרים נכון מה-DB (טוב — לא מקלט לקוח). אבל "הפקדה" היא לחיצת כפתור שיוצרת `EscrowHold(HELD)` ו-`Transaction(SUCCESS)` ללא כל אימות תשלום. ב-`topUpPartnerDeposit` הסכום (`addAmountILS`, שורה 133) מגיע מהלקוח ללא תקרה ומתווסף ל-hold ול-`requiredDepositILS` (חריגה מגבול `Decimal(12,2)` תגרום ל-500). `approveAndRelease` ממשיך גם כשאין `escrowHold` (שורות 252-259).
- **תרחיש בפרודקשן:** כל מפרסם "מפקיד" חינם, היוצר רואה "כסף בנאמנות", ושחרור התשלום נרשם ב-DB בלי כסף אמיתי.
- **תיקון:** CLAUDE.md מתיר שכבה פיקטיבית רק עד חיבור PSP — יש לחסום את הפעולות האלה בפרודקשן (feature flag) עד חיבור PSP עם webhook חתום שהוא היחיד שמעביר `AWAITING_ESCROW → ACTIVE`; להגביל `addAmountILS` (`.max`); ב-`approveAndRelease` לדרוש `escrowHold.status === "HELD"`.

### SEC-A-07 — נמוך — קטגוריה 13/14 — Race / TOCTOU במעברי סטטוס
- **מיקום:** `contract-actions.ts:77-104` (fundEscrow), `235-284` (approveAndRelease), `304-327` (requestRevision); `dispute-actions.ts:112-163` (resolveDispute); `application-actions.ts:214-261` (acceptApplication, בדיקת הסטטוס מחוץ לטרנזקציה ו-`update` ללא תנאי סטטוס).
- **תיאור:** בדיקת הסטטוס נעשית לפני הטרנזקציה, והכתיבה אינה מותנית (`updateMany` עם `status`). שתי בקשות במקביל (double-click / תוקף) יוצרות שורות `Transaction` כפולות (`ESCROW_RELEASE`/`PLATFORM_FEE`), `revisionRoundsUsed` כפול, או 500 על `applicationId @unique`. הכספים הנצברים מחושבים מ-`EscrowHold` ולכן ההשפעה כרגע בעיקר על נתיב הביקורת, אך תהפוך משמעותית עם PSP.
- **תיקון:** `updateMany({ where: { id, status: <expected> } })` ובדיקת `count === 1` בתוך הטרנזקציה; או `Serializable` כמו ב-`acceptApplication`.

### SEC-A-08 — נמוך — קטגוריות 6/14 — משתמש מושעה/חסום לא מנותק ויש routes שלא בודקים סטטוס
- **מיקום:** `dispute-actions.ts:220-225` (SUSPENSION/BAN רק משנים `status`, לא מוחקים `Session`); `src/app/api/contract-files/[attachmentId]/route.ts:17-20,42-45` משתמש ב-`auth()` בלבד (בניגוד ל-`plugin-download/route.ts:23-34` שבודק status/deletedAt); `app-actions.ts:14-34` (`setActiveRole`) כנ"ל.
- **תרחיש:** משתמש BANNED שעדיין יש לו cookie ממשיך להוריד תוצרי חוזים (קבצים פרטיים של הצד השני) עד תום ה-session (30 יום).
- **תיקון:** למחוק `Session` של המשתמש בעת אכיפה (`prisma.session.deleteMany`), ולהשתמש ב-helper אחיד שבודק status/deletedAt גם ב-route handlers.

### SEC-A-09 — נמוך — קטגוריות 6/11 — `/dev/*` נשלח עם הקוד ומוגן רק ב-`NODE_ENV`
- **מיקום:** `src/app/(frontend)/dev/login/route.ts:31-33` ועוד 10 routes תחת `dev/` (כולם עם אותו תנאי `process.env.NODE_ENV !== "development"`).
- **אימות פרודקשן:** `NODE_ENV` מוטבע בזמן build, ולכן ב-build ייצור כל route מחזיר 404 (אומת בקוד; לא הורצה build). `env.ts` מגביל `NODE_ENV` ל-enum.
- **סיכון שנותר:** כל הרצה עם `NODE_ENV=development` על שרת נגיש (preview/staging עם `next dev`) = התחזות מלאה לכל משתמש (`?email=` + `?role=admin`), יצירת משתמש `dev@bridgead.local` עם כל התפקידים כולל ADMIN, ו-GET שמשנה מצב (login-CSRF: דף זדוני יכול להכניס את דפדפן המפתח לחשבון). `?next=` לא מאומת (open redirect בפיתוח). קיים ב-DB משתמש ADMIN (`dev@bridgead.local`) — אם ה-DB משותף לפרודקשן הוא חשבון אדמין קבוע שעוקף אימות מייל לכל מי שיגיע ל-dev/login.
- **תיקון:** כפי שהקובץ עצמו מציין — להסיר את `dev/` מה-build (או להוסיף `import "server-only"` + דגל `ENABLE_DEV_ROUTES` נפרד), לא להשתמש באותו DB לפיתוח ולפרודקשן, ולהסיר את משתמש `dev@` מכל DB ייצור.

### SEC-A-10 — נמוך — קטגוריות 3/4 — אחסון: דרייבר `blob` לא ממומש; ברירת המחדל כותבת לדיסק מקומי
- **מיקום:** `src/lib/storage.ts:87-98`.
- **תיאור:** אם `STORAGE_DRIVER` לא מוגדר בפרודקשן (Vercel) הקבצים נכתבים ל-`.storage` בדיסק זמני — אובדן תוצרים בין הפעלות/instances, או שגיאות כתיבה. `blob` זורק תמיד. (path traversal: `safeKey` מסנן `.`/`..`; נבדק חי על `/api/profile-images/` עם `../`, `%2e%2e`, `..%2f` — 404 בכולם, לא נחשף `.env`/`package.json`.) בנוסף `/api/contract-files/<id>` מחזיר 403 לקיים-לא-שלך ו-404 ללא קיים — מאפשר אימות קיום מזהה (cuid, לא ניתן לניחוש בפועל).
- **תיקון:** לממש blob פרטי (`access: "private"`) לפני עלייה לפרודקשן; להיכשל בעלייה (throw) אם `NODE_ENV=production` ו-`STORAGE_DRIVER` לא `blob`; להחזיר 404 אחיד.

### SEC-A-11 — נמוך — קטגוריה 3 — הקשחות חסרות בהעלאות
- **מיקום:** `deliverable-upload.ts:63-83`, `contract-actions.ts:148-188`, `settings-actions.ts:387-405`, `next.config.ts:11`, `profile-images/[...key]/route.ts:17-23`.
- **תיאור:** (א) סוג הקובץ מגיע מ-`File.type` של הלקוח; בדיקת ה-magic bytes לוידאו כללית (כל קובץ עם `ftyp`/EBML/AVI נחשב `video/*`, וה-`Content-Type` המוגש הוא המחרוזת שהלקוח שלח ל-`video/*`). (ב) אין סריקת וירוסים; PDF מוגש `inline` (מוגן ב-CSP sandbox + nosniff — טוב). (ג) כל הקובץ נטען לזיכרון (`arrayBuffer` + `Buffer.from` ≈ פי 2) ו-`serverActions.bodySizeLimit = 55mb` חל על **כל** server action באתר, כולל כאלה הנגישים לפני אימות. (ד) `/api/profile-images` ציבורי ומוגש בלי `X-Content-Type-Options`/CSP (הסוגים מאומתים בהעלאה, SVG חסום — סיכון נמוך). (ה) אין מכסת אחסון למשתמש. שם הקובץ בטוח (`encodeURIComponent`, מזהה אחסון = cuid/uuid, לא שם המשתמש).
- **תיקון:** allowlist של סוגי וידאו (`video/mp4|webm|quicktime`); `nosniff`+`Content-Disposition` גם ב-profile-images; direct-to-blob עם URL חתום (כבר מתוכנן ב-`next.config.ts`) והורדת `bodySizeLimit` הגלובלי; מכסה למשתמש/חוזה.

### SEC-A-12 — נמוך — קטגוריות 8/15 — מידע רגיש בטקסט גלוי ב-DB ונשלח במלואו ללקוח
- **מיקום:** `src/lib/settings.ts:186-273` (מחזיר `idNumber` ו-`payoutBankDetails` מלאים ל-client component), `settings-actions.ts:103-108` (`payoutBankDetails` JSON לא מוצפן), `registration-actions.ts:176-186`.
- **תיאור:** פרטי בנק ות"ז נשמרים כטקסט רגיל ונשלחים בכל טעינת `/dashboard/settings` ב-RSC payload (רק של המשתמש עצמו — אין חשיפה בין משתמשים; אומת: `business-directory.ts` / `marketplace-query.ts` בוחרים רק שדות בטוחים; `oauthRefreshTokenEnc` לא נשלף בשום fetcher). בנוסף `ipAddress` ב-`LegalConsent`/`CreatorSocialConsent` נלקח מ-`x-forwarded-for` (`registration-actions.ts:128`, `settings-actions.ts:529`) — ניתן לזיוף מחוץ ל-proxy מהימן.
- **תיקון:** הצפנה ברמת שדה (אותה תבנית AES-GCM) או מיסוך בצד השרת (4 ספרות אחרונות) בטפסים; לקחת IP מ-`x-real-ip`/הכותרת של הפלטפורמה בלבד.

### SEC-A-13 — נמוך — קטגוריה 15 — לוגים עם מידע אישי/תפעולי
- **מיקום:** `api/connect/facebook/callback/route.ts:79-82,134-137,140-143,179,190-193` (שמות עמודים, מזהי IG, מספר עוקבים, הודעות שגיאה של Meta); `src/lib/email.ts:19,39,45` (כתובת נמען; גוף תגובת Resend המלא).
- **תיאור:** לא נמצאו לוגים של טוקנים/קודי OAuth/סודות, ו-Prisma מתעד `query` רק ב-development (`src/lib/prisma.ts:15`). עם זאת לוגי prod כוללים PII עסקי.
- **תיקון:** להסיר את `console.info` של פרטי העמוד; לצמצם `email.ts` ללוג של סטטוס בלבד.

### SEC-A-14 — נמוך — קטגוריות 7/14 — חשיפת קיום (enumeration) דרך הודעות שגיאה
- **מיקום:** `registration-actions.ts:52-57,238-250`; `settings-actions.ts:73-84,146-148` ("מספר הטלפון כבר רשום למשתמש אחר", "ח.פ/ת.ז כבר רשום").
- **תרחיש:** משתמש מחובר בודק אם טלפון/ת.ז/ח.פ/מייל רשומים במערכת (ובדיקת ח.פ של עסקים מתחרים).
- **תיקון:** הודעה כללית, או הגבלת קצב (SEC-A-03). (כניסה במייל/Google: ללא enumeration — תמיד "שלחנו קישור".)

### SEC-A-15 — נמוך — קטגוריה 14 — כפילות זהות ערוץ + קוד קופון ניתן לניחוש
- **מיקום:** `prisma/schema.prisma:633` (`@@unique([creatorId, platform])` בלבד, ללא unique על `platform + externalAccountId`); `src/lib/partner-codes.ts:28-36` (קופון = עד 5 אותיות משם היוצר + 2 ספרות = ~90 אפשרויות לשם נתון).
- **תיאור:** אותו ערוץ YouTube/Facebook מאומת יכול להיות מקושר לכמה חשבונות יוצר (נדרש בעל הערוץ, אך מאפשר ריבוי זהויות/ביקורות); קודי הקופון קצרים וניתנים לניחוש ע"י צד שלישי.
- **תיקון:** unique חלקי על `(platform, externalAccountId)`; להוסיף 4+ תווים אקראיים לקופון.

### SEC-A-16 — מידע — קטגוריה 14 — fetchers ללא guard פנימי (defense-in-depth)
- **מיקום:** `src/lib/disputes.ts:98-112` (`getContractDisputeContext` — `findUnique` לפי id בלבד), `138` (`getDisputeQueue`), `235` (`getDisputeDetail`).
- **תיאור:** כיום הדפים מגנים (`requireAdmin` / `getContractRoom` רץ קודם), ואומת חי: צד ג' מקבל 404 על `/dashboard/contracts/<id>` ועל קמפיין לא שלו, ו-brand/space מקבלים 307 מ-`/dashboard/disputes`. אבל קריאה ישירה מקוד חדש תעקוף. מומלץ `requireAdmin()` בתוך שני האחרונים ו-scoping לפי משתמש בראשון.

### SEC-A-17 — מידע — קטגוריה 6/8 — תצורת Auth.js ו-session
- `session: { strategy: "database" }` (ביטול בפועל ביציאה — `signOut` מוחק שורה); cookie של Auth.js: HttpOnly, SameSite=Lax, Secure ב-https (בדיקת ה-jar של dev/login מצביעה על אותן דגלים; ל-cookie אמיתי של Auth.js ברירות המחדל זהות); תוקף ברירת מחדל 30 יום עם `updateAge` 24ש'; אין תוקף מוחלט/idle קצר. `trustHost: true` מקובל מאחר ש-`AUTH_URL` מוגדר ב-`.env` — אבל `env.ts:19` מגדיר אותו optional; בפרודקשן ללא `AUTH_URL` ה-magic link נבנה מכותרת `Host` (Host header injection). ב-DB 145 שורות Session ללא ניקוי תקופתי. `src/proxy.ts` בודק קיום cookie בלבד (מתועד כ"אופטימי"; האימות האמיתי ב-`requireActiveUser`). קישור הקסם: Resend, token חד-פעמי מגובב (ברירת מחדל Auth.js), אין סיסמאות ולכן אין איפוס סיסמה (`passwordHash` ו-`twoFactorEnabled` בסכימה — לא בשימוש).
- **המלצה:** לאכוף `AUTH_URL` ב-production ב-`env.ts`, `session.maxAge` קצר יותר לתפקיד admin, ו-job לניקוי sessions שפגו.

### SEC-A-18 — מידע — קטגוריה 1 — JSON-LD ב-`dangerouslySetInnerHTML` (מחוץ לתחום, להעברה לביקורת השיווק)
- `src/app/(frontend)/(marketing)/resources/blog/[slug]/page.tsx:69`, `guides/[slug]/page.tsx:76`: `JSON.stringify` ללא הימלטות מ-`<`; תוכן מ-CMS שמכיל `</script>` ישבור את התגית. באזור האישי אין `dangerouslySetInnerHTML`; React מבצע escape להודעות/הערות/תיאורים. קישורי משתמש (`websiteUrl`, `briefAssetsUrl`, `fileUrl`) מאומתים ל-`http(s)://` ומוצגים עם `rel=noopener`; לא נמצא שימוש בכתובות משתמש כ-`src` של מדיה (חוץ מ-`logoUrl` שעלול לדלוף IP לצד שלישי).

### SEC-A-19 — מידע — קטגוריה 12 — cron
- `src/lib/track/cron/guard.ts`: ב-production בלי `CRON_SECRET` → 503; עם סוד → Bearer בלבד (`x-vercel-cron` לא נחשב). אומת חי: `GET /api/cron/monitor` ללא כותרת → 401. השוואה ב-`===` (לא constant-time; סיכון זניח). בפיתוח ללא סוד הנתיב פתוח (מתועד). Webhooks של PSP/WooCommerce — לא קיימים באזור האישי (התוסף מכוסה בביקורת התוסף).

---

## טבלת 16 הקטגוריות

| # | קטגוריה | סטטוס | ממצאים / הערות |
|---|---|---|---|
| 1 | XSS | תקין (עם הערה) | אין `dangerouslySetInnerHTML` באזור האישי; React escape. הערה: JSON-LD שיווקי — SEC-A-18 |
| 2 | CSRF | תקין חלקית | Server actions: בדיקת Origin של Next נבדקה חי (Origin זר → 500 דחייה; ללא Origin/אותו Origin → מתקבל). OAuth state בעוגייה HttpOnly+SameSite. ה-GET היחידים שמשנים: callbacks (מוגנים ב-state) ו-`/dev/*` (SEC-A-09). חסרות כותרות clickjacking — SEC-A-04 |
| 3 | העלאת קבצים | נדרש שיפור | סוג+גודל+magic bytes+SVG חסום+CSP sandbox בהגשה; חולשות — SEC-A-11, SEC-A-10 |
| 4 | Path traversal | תקין | `safeKey` + בדיקות חיות על `[...key]` (כולל קידוד כפול) = 404; ההגשה רק דרך route מאומת |
| 5 | SSRF | תקין | אין `fetch` לכתובת שמסופקת ע"י משתמש; כל ה-fetch לדומיינים קבועים (Google/Meta/Resend). `siteUrl` של חנות לא נגש ע"י השרת באזור זה |
| 6 | סשנים | נדרש שיפור | SEC-A-01, 02, 08, 09, 17 |
| 7 | איפוס סיסמה / magic link / אימות מייל | קיים, תקין | אין סיסמאות. magic link (Resend) ללא enumeration; אימות מייל = הכניסה עצמה. SEC-A-14 (enumeration בטפסים), SEC-A-03 (הצפת מיילים) |
| 8 | סודות ומפתחות | תקין | `.env` ב-.gitignore; אין ערך מ-`.env` בהיסטוריית git (נבדק לכל ערך ≥16 תווים); `.env.example` ריק; AES-256-GCM עם IV אקראי ומפתח 32 בייט מאומת (`oauth-crypto.ts`); `NEXT_PUBLIC_*` לא בשימוש. SEC-A-12 (נתונים רגישים ב-DB) |
| 9 | CORS | תקין | אין כותרות CORS; OPTIONS עם Origin זר ל-`/api/auth/*` לא החזיר `Access-Control-Allow-*` |
| 10 | Rate limiting | חסר | SEC-A-03 |
| 11 | Credentials ברירת מחדל | תקין חלקית | אין סיסמאות קשיחות; חשבונות seed (`*.local`) נכנסים רק דרך `/dev/login` (dev בלבד) — SEC-A-09 |
| 12 | Webhooks / cron ללא חתימה | תקין (באזור זה) | cron מאובטח — SEC-A-19. אין webhook PSP עדיין (נדרש בעת חיבור — SEC-A-06) |
| 13 | אימות תשלום בצד לקוח | נדרש תיקון לפני פרודקשן | סכומי fund/release מה-DB (תקין); חוסר PSP ו-`addAmountILS` מהלקוח — SEC-A-06, 05, 07 |
| 14 | IDOR / BOLA | תקין | נסרקו כל ~45 ה-actions והדפים: כולם מסננים לפי `user.id`/בעלות (חוזה/קמפיין/נכס/חבילה/ערוץ/חנות/שיחה/הוכחה/הצעה), אדמין דרך `requireAdmin`. אומת חי עם 3 משתמשים: 404 על חוזה/קמפיין של אחר, 403 על `contract-files` של אחר, 307 על מסכי תפקיד לא שלהם. SEC-A-15, 16 (הערות משניות) |
| 15 | דליפת מידע בלוגים | תקין חלקית | SEC-A-13 |
| 16 | Source maps | תקין | `productionBrowserSourceMaps` לא מוגדר (ברירת מחדל כבויה); ב-`.next/static` של build הייצור הקיים אין קבצי `.map` |
| + | Mass assignment | תקין | כל הכתיבות עם שדות מפורשים אחרי zod; אין spread של `formData`/body |
| + | העלאת הרשאות (roles/activeRole) | תקין | `saveRoles` מקבל רק brand/creator/space ונחסם אחרי השלמת הרשמה (`requireRegistrationUser`); `setActiveRole` מאמת בעלות; ADMIN נקבע רק ב-DB |
| + | חשיפת שדות רגישים ב-JSON | תקין | `oauthRefreshTokenEnc`, `apiKeyEnc/Hash`, `ipAddress` לא נשלפים ב-fetchers; אינדקס/מרקטפלייס בוחרים שדות בטוחים בלבד |

---

## מה לא נבדק / מגבלות

- **לא הורץ build ייצור** ולכן "NODE_ENV=production → 404 ל-/dev" אומת בסקירת קוד (הטבעת `process.env.NODE_ENV` בזמן build) ולא בהרצה.
- **לא נבדקו חי:** שליחת magic link (היה שולח מייל אמיתי דרך Resend), זרימות OAuth מול Google/Meta (חיצוני), cookie אמיתי של Auth.js (נבדק רק cookie של `/dev/login`; דגלי ברירת המחדל נלקחו מהקוד/תיעוד), server actions שמשנים כסף/סטטוס (הרסני; נבדקו בקוד).
- **לא נבדקו:** `api/track/*`, `api/plugin/*`, תוסף WooCommerce, פאנל `/admin` של Payload, דפי שיווק (חוץ מהערה SEC-A-18), הרשאות Neon/DB ברמת הרשת, תצורת Vercel (WAF, env), תלויות (`npm audit`).
- **תצפית לא מוסברת:** באמצע הבדיקות ה-session של משתמש ה-brand נעלם (שורת Session נמחקה/פגה), ככל הנראה בגלל תהליך seed/QA מקביל; לא נחקר.
- סימולציית race (SEC-A-07) לא הורצה — נקבעה מקריאת הקוד.

---

## סיכום לפי חומרה

| חומרה | כמות | מזהים |
|---|---|---|
| קריטי | 0 | — |
| גבוה | 1 | SEC-A-06 (חוסם פרודקשן; מכוון בשלב הפיתוח) |
| בינוני | 5 | SEC-A-01, 02, 03, 04, 05 |
| נמוך | 9 | SEC-A-07, 08, 09, 10, 11, 12, 13, 14, 15 |
| מידע | 4 | SEC-A-16, 17, 18, 19 |

**סה"כ 19 ממצאים: 0 קריטי · 1 גבוה · 5 בינוני · 9 נמוך · 4 מידע.**
סדר תיקון מומלץ: SEC-A-02 ו-SEC-A-01 (קלים וגבוהי ערך), SEC-A-04, SEC-A-03, ואז SEC-A-06/05/07 כחלק מחיבור שכבת הכספים.
