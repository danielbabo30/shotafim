# תיקוני באגי E2E — תוסף bridgead-woo 0.2.2 (2026-11-26)

מקור: `PLUGIN-E2E-2026-11-26.md`. גרסה: 0.2.1 → **0.2.2** (header, `BRIDGEAD_VERSION`, readme Stable tag + changelog; ZIP נבנה ב-`node wp-plugin/build.mjs`). בדיקה חוזרת על אותה סביבה (WP 7.1.5 / Woo 11.3.1 / PHP 8.3 / HPOS, Playground) מול dev server `https://localhost:3000`, ה-ZIP הותקן דרך wp-admin (Upload → Replace current).

## סיכום
| # | סטטוס | הערה |
|---|---|---|
| B-1 | תוקן | DEACTIVATED ע"י התוסף מתאושש; ניתוק משתמש חוסם |
| B-2 | תוקן | קליק לא חוסם: 2.1-2.9s → 0.65-0.69s (= בסיס ללא ref) |
| B-3 | תוקן | קודי 401 + תיקון היסט שעון + תור עם backoff + התראה במסך הגדרות |
| B-4 | נדחה | לפי הוראה — דורש החלטה; לא נגעתי |
| B-5 | תוקן | HPOS + Blocks מוצהרים (אומת ב-FeaturesUtil) |
| B-6 | לא ניתן (פער) | אין ערך PENDING ב-`SiteStatus`; לא שיניתי סכמה |
| B-7 | תוקן | טעינת הזמנה מחדש ב-`on_status_changed` |
| B-8 | תוקן | מפתח dedup של קליק כולל hash מבקר |
| B-9 | תוקן | הוסר `__()` מ-`cron_schedules` |
| B-10 | תוקן | `wp_die` RTL + קישור "חזרה לתוספים" |
| B-11 | תוקן | ה-`code` מהשרת מופיע ב-`error` של התוסף (`http_401:bad_signature`) ובהודעה במסך ההגדרות |
| בקשה נוספת | נוסף | קישור "הגדרות" בשורת הפעולות במסך Plugins |

## B-1 — התאוששות אחרי השבתה
**שרת (`src/lib/track/auth.ts`):** אין שינוי סכמה. `SiteStatus` נשאר `DEACTIVATED` לשני המצבים; ההבחנה = קיום `PluginAlert` מסוג DEACTIVATED פתוחה (resolvedAt=null):
- כבוי ע"י התוסף (`/api/plugin/deactivated` יוצר התראה) → בקשה חתומה תקפה **מתקבלת** (קליקים/הזמנות לא נזרקים; לא תויגו כי ה-schema אין שדה מתאים — הם נקלטים רגיל).
- ניתוק ע"י המשתמש (`disconnectStore`) → עכשיו סוגר התראות DEACTIVATED פתוחות (שינוי קטן ב-`src/lib/actions/plugin-actions.ts`, מחוץ לרשימת הנתיבים שהותרה אך חיוני להבחנה) → אחרי חתימה תקפה: 401 `site_disconnected`. סיבוב מפתח — כמו קודם (חתימה ישנה נכשלת, `bad_signature`).
- הבדיקה נעשית רק אחרי אימות חתימה (לא חושף סטטוס לגורם לא מאומת).
- `heartbeat`: מחזיר ל-`ACTIVE`, מנקה `offlineAt`, סוגר התראות DEACTIVATED/HEARTBEAT_ABSENT. `deactivated`: לא יוצר התראה כפולה.
**תוסף:** heartbeat מיידי (timeout 5s) בהפעלה.
**בדיקה חוזרת:** wp-admin השבתה → `status=DEACTIVATED`+התראה פתוחה; הפעלה מחדש → תוך הבקשה `ACTIVE`, התראה נסגרה (`resolvedAt`). בנוסף עם בקשות חתומות ישירות: במצב DEACTIVATED קליק → 202 `counted:true`; heartbeat → 200 `recoveredFrom:"DEACTIVATED"`, ACTIVE; אחרי "ניתוק משתמש" (סימולציה ב-DB של מה שעושה `disconnectStore`) heartbeat וקליק → 401 `site_disconnected`.
**פתוח:** חבילות שהושהו אוטומטית (`PAUSED/tracking_offline`) בתום grace לא מופעלות מחדש אוטומטית ב-heartbeat (החלטת מוצר/מצב תוכנית, לא נגעתי).

## B-2 — קליק לא חוסם
`class-bridgead-tracker.php`: האירוע נכתב לתור (`enqueue_only`) ונשלח ב-`shutdown` (priority 999) אחרי `fastcgi_finish_request` / `litespeed_finish_request` (+`session_write_close`); אם אינם קיימים (Apache mod_php, Playground) → `wp_schedule_single_event(bridgead_flush_now)` + `spawn_cron()` (loopback לא חוסם), עם ניקוז ה-cron הקיים כגיבוי. נוספה נעילה (transient) וגבול זמן 25s ל-`Bridgead_Queue::flush`, ומיזוג פריטים שנוספו בזמן ריצה. אידמפוטנטיות: מפתח `click:<ref>:<30s>:<hash מבקר>` (גם B-8).
**מדידה (Playground, מסלול ה-fallback כי אין finish_request):** עמוד בלי ref: 0.66-0.67s; עם `bgad_ref` אחרי התיקון: 0.65-0.69s (לפני: 2.1-2.9s). האירוע נכנס לתור ונשלח בתוך שניות (התור התרוקן, `AffiliateClick` נוסף). **לא נבדק:** מסלול `fastcgi_finish_request` על PHP-FPM אמיתי.
**פתוח:** שליחות הזמנה (`on_paid`) והשבתה עדיין סינכרוניות (בזרימת אדמין/צ'קאאוט, לא בקליק) — לא שונה.

## B-3 — הבחנה בין 401
**שרת:** גוף 401 כולל `code`: `missing_headers`/`clock_skew` (+`serverTime` unix)/`unknown_site`/`bad_signature`/`site_disconnected`. `authErrorBody` משותף לכל 6 ה-routes.
**תוסף:** `post()` — על `clock_skew` שומר היסט (`bridgead_clock_offset`, ±24h) ושולח שוב פעם אחת; חתימה לפי `time()+offset`. 401 אחר אינו קבוע → נשאר בתור עם backoff (8 ניסיונות); רק 400/409/422 ו-`site_disconnected` קבועים. `site_disconnected` → עצירה (אין הצטברות בתור; ה-flush נעצר ושומר את התור) + `bridgead_conn_state` + הודעה אדומה במסך ההגדרות; צימוד מחדש מנקה. `_bridgead_reported` מסומן רק אם נשלח/נכנס לתור.
**בדיקה חוזרת (mu-plugin לבדיקות מדמה שעון מפגר שעה):** heartbeat → 200 אחרי תיקון, `offset=3600`; קליק נשלח. היסט ישן (3600) עם שעון תקין → השרת מחזיר clock_skew, התוסף מתקן ל-0 ושולח (self-heal). `badsig`: קליק והזמנה (+order-status) נשארים בתור (`last_err: http_401:bad_signature`), `_bridgead_reported=1`, מצב `rejected` מוצג; אחרי שהשרת "חזר" → flush → התור ריק, המצב נוקה.
**הערה:** הזמנה שנבדקה קיבלה externalOrderId שכבר קיים באתר הבדיקה (סביבת WP חדשה) — הקליטה אידמפוטנטית ולכן מספר ה-AttributedOrder לא גדל.

## B-5 / B-7 / B-8 / B-9 / B-10 / B-11
- B-5: `before_woocommerce_init` מצהיר `custom_order_tables` ו-`cart_checkout_blocks`. אומת: `get_compatible_plugins_for_feature` — שניהם compatible. הקוד משתמש רק ב-CRUD API ו-Store API hooks.
- B-9: `display` ב-`cron_schedules` ללא `__()`. (לא נוסף `load_plugin_textdomain`/languages.)
- B-10: `wp_die` עם `text_direction=rtl` (אומת `<html dir='rtl'>`), הקישור "חזרה לתוספים" (במקום `javascript:history.back()`), התוסף נשאר לא פעיל, אין fatal. כיבוי Woo כשהתוסף פעיל: מסך Plugins ו-front 200.
- B-7: `wc_get_order()` מחדש ב-`on_status_changed` (עלול לשלוח order-status "completed" מיותר אחרי on_paid — אידמפוטנטי בשרת).

## קישור "הגדרות" (בקשה נוספת)
`plugin_action_links_{basename}` נרשם רק בתוך `bridgead_bootstrap` (WooCommerce פעיל); `array_unshift` של `admin.php?page=bridgead-woo` (תת-תפריט של `woocommerce`, capability `manage_woocommerce` — נבדק גם בתוך ה-filter). אומת: מופיע ופועל (200) אצל אדמין; לא מופיע כשהתוסף לא פעיל / Woo כבוי (אין קריסה); הרשאות — מנוי אינו יכול לגשת ל-plugins.php (302), ה-filter מוגן בכל מקרה ב-capability.

## בדיקות רגרסיה שרצו
צימוד (שמירת הגדרות ללא שינוי קוד → 302 saved, heartbeat תקין), הפעלה/השבתה, heartbeat, קליק (נשמר, תור), הזמנת COD → completed → order + order-status בתור → נשלחו, שינוי סטטוס, תור (backoff/flush), `privacy-hash-check.mjs` OK, `typecheck`+`lint` עוברים, `php -l` נקי לכל קבצי ה-PHP ששונו.

## הערות סביבה
- ה-dev server איטי (כ-4s לבקשה מאומתת — DB מרוחק) וגרם ל-500 לסירוגין ב-heartbeat (טרנזקציה אינטראקטיבית, timeout 5s). הוחלפה ל-`$transaction([...])` (batch) ב-heartbeat וב-deactivated; אחר כך 0 שגיאות ב-5 ניסיונות.
- נוספו כלים לבדיקה ב-`wp-plugin/tests/e2e/wp-env/mu/` (mode `wrongclock`, `deact_ping`, `state`, `meta`, `features`, `hbraw`, `creds` — **לבדיקות מקומיות בלבד**). ב-`creds` נחשפים סודות הצימוד של סביבת הבדיקה.
- נתוני בדיקה חדשים ב-DB (קטנים): ~4 AffiliateClick ו-PluginAlert DEACTIVATED נוספות לאתר `cmwxo55jl…` + הזמנה 19/20 (merged לקיימות). האתר הוחזר ל-ACTIVE. נוספו לרשימת הניקוי.

## מה נשאר פתוח
B-4 (נדחה, דורש החלטה) · B-6 (דורש `PENDING` ב-`SiteStatus` — migration + data-cms; חלופה בלי סכמה: להציג ב-UI "ממתין לצימוד" כש-`lastHeartbeatAt == null`, לא בוצע) · בדיקת FPM אמיתי ל-B-2 · החלטה על הפעלה מחדש של חבילות שהושהו אחרי התאוששות.
