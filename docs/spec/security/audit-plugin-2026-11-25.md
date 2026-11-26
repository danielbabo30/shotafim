# ביקורת אבטחה — שכבת התוסף והמעקב (2026-11-25)

**תחום:** `wp-plugin/bridgead-woo/**`, `wp-plugin/build.mjs`, `wp-plugin/dist/*`, `src/app/api/track/**`, `src/app/api/plugin/**`, `/api/plugin-download`, `src/lib/track/**`, `src/lib/actions/plugin-actions.ts`, `src/lib/plugin-connection.ts`.
**שיטה:** קריאת קוד בלבד + בדיקות curl לא הרסניות מול `https://localhost:3000` (בקשות ללא חתימה / חתימה שגויה / timestamp ישן / אתר לא קיים; 20 בקשות ל-rate limit; גוף 3MB אחד). לא נוצרו הזמנות, לא נשלח HMAC תקף, אף ערך סוד לא הודפס.
**מסקנה כללית:** מנגנון ה-HMAC עצמו תקין (השוואה ב-constant time, חלון 300 שניות, מפתח מוצפן AES-256-GCM במנוחה, בידוד בין חנויות). עיקר הסיכון הוא **מודל האמון**: כל נתון כספי (סכום, תאריך, דגל "מוצר מופנה", customerHash, סטטוס החזר) מגיע מהחנות, שנשלטת בידי המפרסם, והשרת כמעט לא מאמת אותו. בנוסף יש פערי פרטיות/הסכמה, היעדר rate limiting, ובעיות אידמפוטנטיות בחישובי החזר.

---

## ממצאים

### SEC-P-01 — גבוה — קטגוריה 13/12
**כל נתוני ההזמנה והעמלה נלקחים מהחנות ללא אימות סבירות**
- מיקום: `src/lib/track/schemas.ts:20-49`, `src/lib/track/ingest.ts:162-178`, `src/lib/track/commission.ts:80-109`.
- תיאור: הסכמה בודקת רק `>= 0`. אין תקרה לסכום הזמנה או לעמלה להזמנה, אין עקביות בין `itemsSubtotal` / `grandTotal` / סכום ה-`lineItems`, ואין מינימום להזמנה. בסקופ `WHOLE_CART` הבסיס הוא `amounts.itemsSubtotal` (לא קשור ל-`grandTotal` או לשורות). בסקופ `PRODUCT_ONLY` הדגל `isReferredProduct` נקבע בצד הלקוח. בעמלה `FIXED` כל הזמנה (גם של 0 ש"ח) מניבה עמלה מלאה.
- תרחיש: מפרסם שמשתף פעולה עם יוצר (או מפרסם עם חשבון בנק גנוב שהפקיד פיקדון) מזריק הזמנות מזויפות עם HMAC תקף של החנות שלו. ההזמנות עוברות ל-APPROVED ולתחנת תשלום, והפיקדון מתנקז ליוצר. אין אימות מול WooCommerce (למשל קריאת REST חוזרת לחנות) או אימות מול PSP.
- המלצה: ולידציית עקביות (סכום שורות בטווח סטייה מ-`itemsSubtotal`; `grandTotal ≈ subtotal - discount + tax + shipping`), תקרות לפי תוכנית (עמלה מקסימלית להזמנה, הזמנות ליום), הזמנות חשודות נכנסות ל-ON_HOLD לבדיקה ידנית, אימות דגימתי מול ה-REST של החנות, ואימות ידני לתחנה הראשונה של חנות חדשה.

### SEC-P-02 — גבוה — קטגוריה 12/13
**`orderPlacedAt` נשלט בידי הלקוח — עקיפת חלון ההחזרות של 14 יום**
- מיקום: `src/lib/track/schemas.ts:8,39`, `src/lib/track/ingest.ts:186`, `src/lib/track/cron/reconcile.ts:19-31`.
- תיאור: `orderPlacedAt` הוא כל מחרוזת ISO. ה-cron מאשר הזמנות PENDING עם `orderPlacedAt <= now-14d` וסטטוס גולמי "יציב" (`orderStatusRaw`, גם הוא מהלקוח). הזמנה שנשלחה היום עם תאריך ישן, בסטטוס `completed`, מאושרת ב-reconcile הקרוב. התאריך משמש גם ב-digest (`processDigest`) ובדגלי velocity.
- תרחיש: עקיפה מלאה של חלון ההחזרות שמגן על היוצר והפיקדון; הזמנות מזויפות נכנסות לתשלום כמעט מיד.
- המלצה: לקבוע את חלון היציבות לפי `createdAt` בשרת (זמן קליטה) ולא לפי תאריך הלקוח; לדחות `orderPlacedAt` שחורג מעבר ל-X שעות מעכשיו (עתידי או ישן); להתיר backfill רק דרך digest ובסימון `lateFromDigest` עם חלון נפרד.

### SEC-P-03 — בינוני — קטגוריה 13
**דגלי אנומליה לא חוסמים אישור או תשלום**
- מיקום: `src/lib/track/anomaly.ts` (כולו), `src/lib/track/cron/reconcile.ts`, `src/lib/track/cron/checkpoints.ts:33-48`.
- תיאור: האנומליות נכתבות בלבד (הערה בקוד: "לא חוסם אוטומטית"). `approveCommission` ו-`processCheckpoint` לא בודקים `AnomalyFlag` פתוח. ה-monitor רץ פעם בשעה, וה-checkpoint רץ ללא תלות בו. דגל SELF_PURCHASE ברמת HIGH לא עוצר תשלום.
- המלצה: הזמנה בתוכנית עם דגל HIGH פתוח עוברת ל-ON_HOLD ולא נכללת בתחנה עד פתרון אדמין.

### SEC-P-04 — בינוני — קטגוריה 13
**זיהוי רכישה עצמית ניתן לעקיפה בקלות**
- מיקום: `src/lib/track/cron/monitor.ts` (בלוק "דגלי אנומליה", סביב שורות 190-215), `src/lib/track/schemas.ts:47`, `class-bridgead-orders.php:54`.
- תיאור: (א) `customerHash` מחושב ושולח בצד החנות, ואפשר לשלוח כל ערך אקראי. (ב) השרת מחשב hash רק מהמייל של חשבון היוצר, עם ה-pepper של אתר אחד בלבד של העסק (`findFirst`), כך שאתר שני אינו מכוסה. (ג) alias של מייל (`+tag`, נקודות ב-Gmail) או מייל אחר, וכתובת משלוח/טלפון של היוצר אינם נבדקים. (ד) הזמנות שנקלטו דרך digest מקבלות `customerHash = digest:<id>` ולכן לא ניתנות לזיהוי בכלל.
- המלצה: נירמול מייל לפני hash; בדיקה מול כל האתרים של העסק; הוספת בדיקות (ריבוי הזמנות לאותו hash, אותו hash בהרבה תוכניות); לא לקבל `customerHash` שאינו hex של 64 תווים.

### SEC-P-05 — בינוני — קטגוריה 12/13
**החזר חלקי לא אידמפוטנטי ולא מצטבר; אין נעילה בעדכוני עמלה**
- מיקום: `src/lib/track/ingest.ts:266-346` (במיוחד 283-294), `src/app/api/track/order-status/route.ts:29-39`, `class-bridgead-orders.php:114-134`.
- תיאור: בכל קריאת `partially-refunded` השרת מחשב proration מחדש על העמלה *הנוכחית* (כבר מופחתת) מול `grossAmount`, ומשתמש בסכום ההחזר של האירוע בלבד. לכן: (1) retry של התוסף אחרי timeout (השרת עיבד, התגובה אבדה) או replay בתוך חלון ה-300 שניות מפחית שוב ושוב את העמלה ויוצר `COMMISSION_REVERSAL` נוסף; (2) שני החזרים חלקיים נותנים סכום שגוי (לא `gross - סכום מצטבר`). בנוסף, `$transaction` בלי נעילת שורה/serializable: שני עדכונים מקבילים קוראים אותו מצב (lost update). בהחזר על הזמנה PAID ללא תחנה עתידית (`nextCp` ריק) ה-clawback נעלם בשקט.
- המלצה: לשמור `refundedAmountILS` מצטבר ולחשב עמלה מ-`commissionAmount` המקורי; לדחות/להתעלם מ-idempotency key ('order-status:<id>:partial:<refund_id>') — להוסיף שדה `externalRefundId` יחיד בשרת; `SELECT ... FOR UPDATE` או `isolationLevel: Serializable`.

### SEC-P-06 — בינוני — קטגוריה 6/12
**אין הגנת replay בפועל והחתימה לא קשורה לנתיב**
- מיקום: `src/lib/track/auth.ts:28-31,52`, `src/lib/track/crypto.ts:66-68`, `class-bridgead-api.php:73-75`.
- תיאור: ההגנה היחידה היא חלון זמן של ±300 שניות. אין nonce/jti שמור, ו-signing string הוא `timestamp.body` בלבד (בלי method/path). בקשה חתומה תקפה לכל endpoint שהסכמה שלו מאפשרת אותה, וניתנת לשידור חוזר 5 דקות. ה-endpoints אידמפוטנטיים חלקית בלבד (click: חלון 30 שניות; order: idempotent; refund חלקי: ראו SEC-P-05).
- תרחיש: מי שרואה את התעבורה (למשל דרך הפילטר `bridgead_api_base` שחשוף לכל תוסף — SEC-P-23) שולח שוב החזר חלקי וצובר הפחתות.
- המלצה: לכלול `METHOD + path` ב-signing string; להוסיף כותרת `X-BridgeAd-Nonce` ולשמור נונסים ל-10 דקות (Redis/טבלה עם TTL); idempotency-key אמיתי בכל אירוע.

### SEC-P-07 — בינוני — קטגוריה 10
**אין rate limiting ב-/api/track ו-/api/plugin; העבודה לפני אימות**
- מיקום: `src/lib/track/auth.ts:33-35`, `src/proxy.ts` (ה-matcher מוציא `/api`).
- אימות בפועל: 20 בקשות רצופות עם חתימה שגויה החזירו כולן 401, ללא 429. גוף 3MB התקבל ונקרא במלואו (`request.text()`) לפני בדיקת האתר (401 לאחר 0.65 שניות).
- תיאור: כל בקשה עם timestamp תקין גורמת ל-`findUnique` ב-DB, גם כשהאתר לא קיים וגם ללא כל חתימה תקפה. אין הגבלת גודל גוף, אין throttle לפי IP/siteId.
- המלצה: rate limit לפי IP לפני כל DB (Vercel Firewall/Upstash); `Content-Length` מקסימלי (למשל 256KB; digest 2MB) לפני `text()`; throttle לפי siteId אחרי אימות.

### SEC-P-08 — בינוני — קטגוריה 10
**אין גבולות על גודל מערכים ומחרוזות בסכמות**
- מיקום: `src/lib/track/schemas.ts:10-17,28-49,85-104`.
- תיאור: `lineItems`, `couponCodes` ו-`digest.orders` ללא `.max()`. `refCode`, `externalOrderId` (ב-order-status ובדיגסט), `name`, `orderStatus`, `status` ללא אורך מקסימלי. דיגסט מעבד הזמנות בלולאה סדרתית (3-6 שאילתות לכל הזמנה). ערך כמו `1e30` עובר את zod ושובר את `Decimal` ב-DB (500 עם הודעת Prisma, SEC-P-19).
- תרחיש: מפתח מזויף או חנות פרוצה שולחים אלפי הזמנות בדיגסט אחד ושומטים את ה-DB; הזמנות זבל מנפחות את הטבלאות.
- המלצה: `.max()` לכל מערך (lineItems 200, couponCodes 20, digest 2000), לכל מחרוזת, ותקרת סכום (למשל 1,000,000).

### SEC-P-09 — בינוני — קטגוריה 10/11 (תוסף)
**שליחת הקליק חוסמת את בקשת המבקר — הגברת DoS על החנות**
- מיקום: `class-bridgead-tracker.php:84-88` מול `class-bridgead-api.php:67-95,115-117`.
- תיאור: ההערה אומרת "לא חוסמים את הבקשה", אך `enqueue_or_send` קורא ל-`post()` סינכרוני עם `blocking => true` ו-timeout 12 שניות, בתוך `init`, על כל בקשה עם `?bgad_ref=`. מי שמריץ בקשות עם הפרמטר (אין חסימת בוטים ואין rate limit מקומי) תוקע PHP workers כל עוד API של BridgeAd איטי/לא זמין.
- המלצה: `'blocking' => false` או שליחה בהוק `shutdown`/Action Scheduler; throttle מקומי לפי IP (transient).

### SEC-P-10 — בינוני — קטגוריה 10/13 (תוסף)
**זיוף קליקים וכתובת IP, ו-cookie stuffing**
- מיקום: `class-bridgead-tracker.php:51-53,124-133`.
- תיאור: `client_ip()` מעדיף `HTTP_CF_CONNECTING_IP` ואז `X-Forwarded-For` (האיבר הראשון) — ניתנים לזיוף בכל אתר שאינו מאחורי Cloudflare/פרוקסי מהימן. כל בקשה עם IP אחר מייצרת `ipHash` חדש ולכן לא נחסמת ב-dedupe של 30 שניות בשרת. ה-cookie משמש לשיוך last-click ונקבע לכל מי שמבקר בקישור, ללא אימות (cookie stuffing מ-iframe/img ברשת צד שלישי). התוצאה: ניפוח מדדי קליקים (`CLICK_ORDER_RATIO` ועוד) והחלפת שיוך.
- המלצה: להשתמש ב-`REMOTE_ADDR` כברירת מחדל, ולהוסיף פילטר/הגדרה לכותרות פרוקסי מהימנות; לא לעדכן cookie קיים בפחות מ-X דקות אלא אם הגיע top-level navigation; סינון UA של בוטים.

### SEC-P-11 — בינוני — קטגוריה 5/6
**שיוך אתר↔דומיין לא נאכף; בעלות על `siteUrl` לא מאומתת**
- מיקום: `src/lib/track/auth.ts:57-69`, `src/lib/actions/plugin-actions.ts:17-26,63-74`.
- תיאור: בדיקת ה-domain רצה רק אם יש `Origin`/`Referer`, ובקשות של `wp_remote_post` אינן שולחות אותם — הבדיקה בפועל לא פעילה. התוסף לא שולח את `home_url()`. `connectStore` מקבל כל כתובת https (גם דומיין של צד שלישי) ללא אתגר בעלות (קובץ/DNS TXT/קריאה חוזרת). אין unique על `siteUrl` בין עסקים. כתובת האתר מוצגת ליוצרים/אדמין (disputes, admin-dashboard) כאמינה.
- תרחיש: מפרסם מצמד `https://brand-big.co.il` שאינו שלו ומציג אותו ליוצרים כחנות שלו (הצגת שווא).
- המלצה: בצימוד, השרת שולח קריאה ל-`siteUrl/wp-json/bridgead/v1/verify?c=<challenge>` או מבקש TXT; התוסף שולח `X-BridgeAd-Home: home_url()` והשרת משווה ל-host הרשום; unique על host מנורמל.

### SEC-P-12 — גבוה — קטגוריה: פרטיות / GDPR / חוק הגנת הפרטיות
**מעקב server-side שמטרתו המוצהרת לעקוף הסכמה; cookie ללא הסכמה**
- מיקום: `wp-plugin/bridgead-woo/readme.txt` (Description: "עמיד לחוסמי פרסומות ובאנרי הסכמה"), `class-bridgead-tracker.php:42-54,61-81`.
- תיאור: התוסף קובע cookie (מזהה שיוך + חותמת זמן + landing, ללא `HttpOnly`) ושולח ל-BridgeAd `ipHash`/`uaHash`/`country` ו-`customerHash` (מייל) בלי כל מנגנון הסכמה או אינטגרציה עם פלאגין consent. הניסוח המוצהר של התוסף מציג עקיפת באנר הסכמה כיתרון, שמבחינה רגולטורית (GDPR/ePrivacy, תיקון 13 לחוק הגנת הפרטיות בישראל) הוא סיכון משפטי למפרסם ולפלטפורמה. אין מסמך DPA, הודעת פרטיות לקונה, או בסיס חוקי מתועד לעיבוד.
- המלצה: לבטל את הניסוח הזה; אינטגרציה עם WP Consent API (לא לקבוע cookie ולא לשלוח קליק אלא אם יש consent לקטגוריית "סטטיסטיקה/שיווק", או לתעד "אינטרס לגיטימי" מבוסס עריכת משפטן); טקסט פרטיות שהחנות מדביקה; חתימת DPA בצימוד; דגל "דורש הסכמה" בהגדרות.

### SEC-P-13 — בינוני — קטגוריה: פרטיות / סודות
**ה-"pepper/salt" אינם אנונימיזציה: ניתנים להפיכה בכוח גס**
- מיקום: `class-bridgead-api.php:49-60`, `class-bridgead-orders.php:54`, `src/lib/track/cron/monitor.ts` (חישוב pepper).
- תיאור: `ipHash = sha256(ip + siteId + YYYY-MM-DD)`: ה-siteId נשלח בכותרת והתאריך ידוע, כלומר מרחב IPv4 (2^32) ניתן לפענוח בדקות מדי GPU. `customerHash = sha256(email + sha256("pepper:"+apiKey))` — ה-pepper נגזר מ-apiKey שהשרת מחזיק (מפוענח בכל בקשה), כך שמי שבידיו DB + `TRACK_KEY_SECRET` (או כל דליפת apiKey) יכול לאמת כל כתובת מייל מול ה-hash. אין salt ייחודי לאתר שהוא סוד נפרד משמש ה-HMAC.
- המלצה: HMAC-SHA256 עם מפתח סודי נפרד מ-apiKey (נוצר בצימוד ונשמר רק אצל החנות, או רק בשרת לפי מודל איום); טרנקציה/רדוקציה של IP (/24) לפני hash; לחשב את ה-hash של היוצר בצד התוסף על בקשת השרת, או להשתמש ב-pepper נפרד.

### SEC-P-14 — נמוך — קטגוריה: פרטיות
**אין מדיניות שמירה ומחיקה; אין exporter/eraser של WP**
- מיקום: `src/lib/track/**` (אין `deleteMany`/retention), `uninstall.php:10-17`, schema `AffiliateClick`/`AttributedOrder`.
- תיאור: `AffiliateClick` (ipHash, uaHash, landingUrl) ו-`AttributedOrder.customerHash` נשמרים ללא הגבלה. התוסף לא רושם `wp_privacy_personal_data_erasers/exporters`; `uninstall.php` משאיר meta הזמנות (`_bridgead_ref`, `_bridgead_landing`, `_bridgead_reported`) — מתועד אך רלוונטי לבקשת מחיקה.
- המלצה: cron לשמירה (קליקים 90 יום, hash של לקוח אחרי סגירת חשבונאות); API/צעד אדמין למחיקה לפי customerHash; רישום eraser.

### SEC-P-15 — נמוך — קטגוריה 8
**`apiKey` נשמר ב-`wp_options` בטקסט גלוי ובטעינה אוטומטית**
- מיקום: `bridgead-woo.php:69-79`, `class-bridgead-settings.php:84` (`update_option` ברירת מחדל autoload=yes), `class-bridgead-api.php:33-39`.
- תיאור: המפתח נטען בכל בקשת WP, נכלל בגיבויי DB/ייצוא ובכל SQL injection בפלאגין אחר. בשרת הוא מאוחסן נכון (`apiKeyHash` + `apiKeyEnc` AES-GCM). המפתח לא נחשף בשדה ההגדרות (placeholder ממוסך), ולא נרשם בלוגים (נבדק).
- המלצה: `update_option(..., false)` (autoload=no) לפחות; אפשרות להגדיר `BRIDGEAD_API_KEY` ב-`wp-config.php`; תיעוד לרוטציה אחרי גיבוי שנחשף.

### SEC-P-16 — בינוני — קטגוריה 7/6
**401 נחשב "קבוע" בתוסף: סטיית שעון או רוטציית מפתח מאבדות אירועים**
- מיקום: `class-bridgead-api.php:119-123`, `class-bridgead-queue.php:76-89`, `auth.ts:28-31`.
- תיאור: בקבלת 400/401/409/422 האירוע לא נכנס לתור (ב-`enqueue_or_send`), ואילו אירוע שכבר בתור נמחק אחרי 8 נסיונות. חנות עם שעון שרת שסוטה יותר מ-300 שניות, או אחרי `rotateStoreKey` (המפתח הישן נפסל מיד, ללא תקופת חפיפה) תאבד כל אירוע שנשלח, כשהלוג מכיל רק `error_log`. ה-digest הלילי נכשל באותה סיבה. בנוסף: `DEACTIVATED` דביק — הפעלה מחדש של התוסף נחסמת ב-401 (auth.ts:36) עד שהמפרסם מבצע rotate ידנית.
- המלצה: לא להשליך 401/timestamp; להשאיר בתור עם backoff; לתמוך בשני מפתחות במקביל לחלון רוטציה (24 שעות); להחזיר קוד שגיאה ייעודי לסטיית שעון (`clock_skew` + `serverTime`) ולהציג בהגדרות התוסף.

### SEC-P-17 — נמוך — קטגוריה 7
**מחזור חיי מפתח: אין ביטול בהסרה, אין audit, rotate מחייה אתר מנותק**
- מיקום: `uninstall.php`, `src/lib/actions/plugin-actions.ts:63-74,104-107,114-125`.
- תיאור: `uninstall.php` לא מבטל את המפתח בשרת (נשאר תקף עד rotate ידני). `connectStore` על `siteUrl` קיים מחליף את המפתח בשקט ומחזיר ACTIVE; `rotateStoreKey` מחזיר גם אתר `DEACTIVATED` ל-ACTIVE. אין רישום audit, אין re-auth, אין התראה במייל על rotate/connect/disconnect. `disconnectStore` מבטל רק לפי סטטוס (המפתח נשאר מוצפן ב-DB).
- המלצה: audit log + מייל; endpoint `/api/plugin/uninstalled` (חתום) לביטול; מחיקת `apiKeyEnc` בניתוק; אישור מפורש להפעלה מחדש.

### SEC-P-18 — בינוני — קטגוריה 12
**זיהוי "תוסף אופליין" נשען על קליקים שהתוסף עצמו מדווח**
- מיקום: `src/lib/track/cron/monitor.ts:56-72`.
- תיאור: התראת `HEARTBEAT_ABSENT` נפתחת רק אם היו קליקים ב-24 השעות האחרונות, אך הקליקים נכתבים אך ורק ע"י התוסף. הסרת/כיבוי התוסף (מחיקת תיקייה, `mu-plugin`, חסימת יציאה) מפסיקה את הקליקים וההזמנות, ואחרי 24 שעות ההתראה אינה נורית יותר ("סתם אתר לא פעיל"). המפרסם יכול לדווח רק מה שנוח לו.
- המלצה: לבדוק קליקים בצד יוצר/שרת (redirect דרך BridgeAd) או לדרוש heartbeat בכל מקרה כשיש תוכנית פעילה; הצגת הפער ליוצר.

### SEC-P-19 — נמוך — קטגוריה 15
**הודעות שגיאה מפורטות מוחזרות לקורא**
- מיקום: `src/lib/track/http.ts:31-35`, `src/lib/track/auth.ts:36-50`.
- תיאור: `fromThrown` מחזיר `e.message` גולמי (כולל הודעות Prisma עם שמות מודלים/שדות). הודעות 401 נבדלות בין "אתר לא מוכר" / "חתימה לא תקינה", ו-500 נפרד על "אי-התאמת מפתח" — מאפשר אנומרציית siteId וחשיפת מצב תצורה לשרת. (siteId הוא cuid, ולכן סיכון בפועל נמוך.)
- המלצה: הודעה כללית לכל כשל אימות (401 אחיד), לוג פנימי של השגיאה האמיתית, מזהה בקשה.

### SEC-P-20 — נמוך — קטגוריה 1
**`landingUrl` נשמר כמות שהוא (ללא ולידציית URL) וכולל את כל ה-query string**
- מיקום: `src/lib/track/schemas.ts:13`, `src/lib/track/ingest.ts:61-71`, `class-bridgead-tracker.php:40,72`.
- תיאור: לא נבדק שמדובר ב-http(s) של הדומיין הרשום. כרגע הערך אינו מוצג בשום UI (חיפוש ב-tsx) ולכן אין XSS פעיל; ערכים אחרים שמוצגים (`externalOrderId`, `siteUrl`) מוצגים דרך React ומוסלפים. בצד ה-PHP כל ההדפסות ב-admin מוסלפות (`esc_html`/`esc_attr`) ו-`admin.js` מסלף דרך `esc()` — לא נמצא XSS. אבל ה-landing מכיל את כל פרמטרי ה-URL (utm, מזהי הזמנה, מייל אם הועבר) = דליפת PII לשרת.
- המלצה: ולידציית `https?://` + host תואם `siteUrl`; לשמור path בלבד או whitelist של פרמטרים; להקפיד על `rel="noopener noreferrer"` ובדיקת protocol אם יוצג כקישור.

### SEC-P-21 — נמוך — קטגוריה 13 (תוסף)
**זיהוי "מוצר מופנה" רופף ומבוסס על cookie שהמבקר שולט בו**
- מיקום: `class-bridgead-orders.php:164-177` (שורות 170, 173), `class-bridgead-tracker.php:111-113`.
- תיאור: `strpos($landing, '/'.$slug)` תואם גם מוצר `a` מול `/about`; `p=12` תואם `p=1` (בלי גבול); ה-`landing` יכול להגיע מ-cookie `bgad_land` שהמבקר כותב. בסקופ `PRODUCT_ONLY` זה מאפשר לקונה/יוצר לסמן מוצר יקר כ"מופנה".
- המלצה: להשוות permalink מלא (נתיב מדויק) או product_id בגבול מילה; לשמור landing רק ב-session בשרת/חתום (HMAC) ולא ב-cookie גלוי.

### SEC-P-22 — בינוני — קטגוריה 13
**קליטה מאוחרת מה-digest מחשבת עמלה על `grandTotal` (כולל מע"מ ומשלוח) ועוקפת בדיקות**
- מיקום: `src/lib/track/ingest.ts:379-402`, `src/lib/track/schemas.ts:85-104`.
- תיאור: `itemsSubtotal = grandTotal`, שורה בודדת `isReferredProduct: true`, `customerHash = digest:<id>`. כלומר הזמנה שנקלטת דרך digest מנופחת בכ-18% מע"מ + משלוח, מתעלמת מסקופ `PRODUCT_ONLY`, ולא ניתנת לזיהוי רכישה עצמית. חנות יכולה לדלג על `/api/track/order` ולהזרים הכל דרך digest כדי לקבל תנאי עמלה נוחים יותר מהמוסכם.
- המלצה: digest מעדכן/מאמת הזמנות קיימות בלבד, ובהזמנה חסרה יוצר `ON_HOLD` שמחכה לשליחת `/order` מלאה; או לחסום קליטת digest בלי `amounts` מפורטים.

### SEC-P-23 — נמוך — קטגוריה 5/11
**כתובת ה-API ניתנת לעקיפה ללא אכיפת HTTPS; הפילטר חשוף לכל תוסף**
- מיקום: `bridgead-woo.php:31-33`, `class-bridgead-api.php:26-28,77-79`.
- תיאור: `BRIDGEAD_API_BASE` מ-`wp-config.php` או `apply_filters('bridgead_api_base')` מאפשרים הפניית כל התעבורה החתומה (עם PII מגובב) לשרת אחר או ל-`http://`. SSRF אינו רלוונטי כי הערך נשלט ע"י מנהל/קוד מקומי; `redirection => 0` ו-`sslverify` ברירת מחדל מופעלים (טוב). ההגדרות מציגות "נדרס ב-wp-config", אך לא מזהירות על שינוי דרך פילטר. הדומיינים לא עקביים: `app.bridgead.co.il` ב-Plugin URI, `bridgead.co.il` ב-API ובקישור ההגדרות.
- המלצה: לדחות `http://` (חוץ מ-localhost בדיבאג), לאכוף host ברשימה לבנה או אזהרה ב-admin, ולהציג את הכתובת האפקטיבית אחרי הפילטר.

### SEC-P-24 — נמוך — קטגוריה 6/11
**שמירת cron: השוואת סוד לא ב-constant-time ופתוח בכל NODE_ENV שאינו production**
- מיקום: `src/lib/track/cron/guard.ts:12-20`.
- תיאור: `auth === \`Bearer ${CRON_SECRET}\`` (לא timing-safe). כש-`CRON_SECRET` חסר, הגנה נפתחת בכל סביבה ש-`NODE_ENV !== "production"` (staging/preview שהוגדרו אחרת יהיו פתוחים: `reconcile` ו-`checkpoints` מזיזים כסף). נבדק מקומית: 401 בשלושת ה-cron (הסוד מוגדר ב-`.env`).
- המלצה: `timingSafeEqual`; לדרוש `CRON_SECRET` בכל סביבה מלבד `development` מפורשת (`NODE_ENV === "development"`).

### SEC-P-25 — מידע — קטגוריות 2/3/4 (תוסף)
**מצב תקין עם הערות הקשחה**
- ABSPATH guard בכל קבצי ה-PHP, `uninstall.php` עם `WP_UNINSTALL_PLUGIN` — תקין. nonce נבדק ב-`handle_save` (`check_admin_referer`) וב-AJAX (`check_ajax_referer` + `current_user_can('manage_woocommerce')`) — תקין. אין `$wpdb`, אין `unserialize`, אין העלאת קבצים, אין `include` דינמי — אין SQL injection/deserialization/path traversal.
- הערות: אין `index.php` ריק בתיקיות (directory listing בשרתים מוגדרים רע); cookie ה-`bgad_*` עם `httponly => false` ללא צורך (אין JS שקורא אותו); `error_log` רושם רק נתיב/קוד/שגיאת רשת, ללא מפתח/PII (נבדק); `admin.js` משתמש ב-`.html()` אבל כל ערך עובר `esc()`.
- המלצה: להוסיף `index.php`, `httponly => true`.

### SEC-P-26 — מידע — קטגוריה 16
**אין source maps**
- ה-`admin.js` אינו מינימייזד ואין `.map`; `next.config.ts` לא מפעיל `productionBrowserSourceMaps`. אין בעיה.

### SEC-P-27 — נמוך — קטגוריות 3/8
**אריזת ה-ZIP: ללא allowlist, ללא checksum, בינארי ב-git**
- מיקום: `wp-plugin/build.mjs:33-42`, `wp-plugin/dist/`.
- בדיקה: תוכן ה-ZIP זהה בדיוק לעץ המקור (diff נקי), 15 קבצים, ללא `.env`/סודות/קבצי dev. עם זאת, הבנייה מוציאה רק `.DS_Store` ו-`__MACOSX`, כך שכל קובץ עתידי בתיקייה (בדיקות, `.env`, גיבוי) ייכנס אוטומטית. ה-ZIP נבנה ידנית ומקומיט (סיכון drift מול המקור), ללא חתימה/checksum להורדה. נתיב ההורדה `/api/plugin-download` מוגן: 401 ללא session; דורש תפקיד BRAND פעיל, `no-store` (נבדק).
- המלצה: allowlist מפורש (`*.php`, `assets/`, `readme.txt`) או `.distignore`; בנייה ב-CI; פרסום SHA-256 בדף ההורדה.

---

## טבלת 16 הקטגוריות

| # | קטגוריה | סטטוס | ממצאים |
|---|---|---|---|
| 1 | XSS | נבדק; לא נמצא XSS פעיל. latent ב-landingUrl | P-20, P-25 |
| 2 | CSRF / הרשאות WP | תקין (nonce + capability) | P-25 |
| 3 | העלאת קבצים | לא רלוונטי (אין העלאה); אריזה | P-27 |
| 4 | Path traversal / חשיפת קבצים | תקין (ABSPATH, uninstall); הקשחה | P-25 |
| 5 | SSRF | סיכון נמוך (נשלט ע"י מנהל); אימות בעלות דומיין חסר | P-11, P-23 |
| 6 | סשנים/אימות/HMAC | HMAC תקין; אין replay protection, אין binding לנתיב, דומיין לא נאכף | P-06, P-11, P-16, P-24 |
| 7 | איפוס/צימוד apiKey | פגוע חלקית (אין ביטול, אין חפיפה, אין audit) | P-16, P-17 |
| 8 | סודות | אחסון בשרת תקין; בתוסף טקסט גלוי; ZIP נקי | P-15, P-27 |
| 9 | CORS | תקין: OPTIONS ללא כותרות CORS, POST בלבד (נבדק) | — |
| 10 | Rate limiting | חסר | P-07, P-08, P-09, P-10 |
| 11 | ברירות מחדל / debug | ברירת מחדל HTTPS תקינה; בעיות בעקיפה ו-cron | P-23, P-24 |
| 12 | Webhooks / זיוף / replay | HMAC נדרש; אך תוכן לא מאומת, replay | P-01, P-02, P-05, P-06, P-18 |
| 13 | אימות תשלום בצד לקוח | חלש: הכל נשלט ע"י החנות | P-01, P-02, P-03, P-04, P-21, P-22 |
| 14 | IDOR | תקין: כל השאילתות מוגבלות ל-`site.id` / `site.businessId` (click, order, order-status, digest, deactivated, heartbeat; actions עם `businessId`) | — |
| 15 | לוגים | לא נמצאו מפתחות/PII בלוגים (PHP ושרת); שגיאות מוחזרות | P-19 |
| 16 | Source maps | תקין | P-26 |
| + | SQLi / deserialization (PHP) | אין `$wpdb`/`unserialize` | P-25 |
| + | PII / GDPR / pepper | בעייתי | P-12, P-13, P-14 |

## מה לא נבדק

- לא נשלחה בקשה עם HMAC תקף (אין `TrackedSite` בדיקה ברור, והכללים אסרו), ולכן לא אומת בפועל: אידמפוטנטיות של `order`, התנהגות partial refund, כשל `digest`, ו-race בשרת. הכל נסקר בקוד בלבד.
- לא הורץ WordPress/WooCommerce; ה-PHP נסקר סטטית (ללא PHPCS/WPCS/Psalm). לא נבדק קובץ `languages/`, כפילות הוקים עם פלאגינים אחרים, או התנהגות עם full-page cache.
- סביבת הפרודקשן (קיום `CRON_SECRET`/`TRACK_KEY_SECRET`, WAF/Vercel firewall, headers ב-TLS) לא נבדקה; רק `.env` מקומי (ערכים לא הודפסו, `.env` מוחרג ב-git).
- לא נבדקו: שכבת התשלומים/PSP, טבלאות Escrow/Transaction מעבר לקוד ה-track, דשבורדי אדמין/דיספיוט (`resolve-anomaly-button`), `npm audit` לתלויות, ו-`/dev/seed-partner-dashboard` (יש בו guard של `NODE_ENV !== "development"`, נקרא בלבד).
- לא נבדק עומס אמיתי או DoS (לפי ההנחיה); ממצאי P-07/P-08/P-09 מבוססים על קוד ועל 20 בקשות.

## סיכום

סה"כ 27 ממצאים: **קריטי 0 · גבוה 3 · בינוני 13 · נמוך 9 · מידע 2**.

- גבוה: P-01, P-02 (אמון מלא בנתוני החנות, עקיפת חלון החזרות), P-12 (הסכמה/פרטיות).
- בינוני: P-03, P-04, P-05, P-06, P-07, P-08, P-09, P-10, P-11, P-13, P-16, P-18, P-22.
- נמוך: P-14, P-15, P-17, P-19, P-20, P-21, P-23, P-24, P-27.
- מידע: P-25, P-26.

סדר טיפול מומלץ: P-02 ו-P-05 (תיקוני שרת קטנים עם תועלת גדולה), P-07/P-08 (גבולות וקצב), P-12 (משפטי), ולאחר מכן P-01/P-03/P-04/P-22 (מודל האמון — דורש החלטה עסקית).
