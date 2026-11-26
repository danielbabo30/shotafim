# Privacy hashing (SEC-P-13) — hash v2 לזיהויי לקוח/IP

סטטוס: ממומש (תוסף 0.2.0). ממצא: `docs/spec/security/audit-plugin-2026-11-25.md` § SEC-P-13.

## מה שונה

| שדה | v1 (ישן) | v2 (חדש) |
| --- | --- | --- |
| `ipHash` | `sha256(ip + siteId + YYYY-MM-DD)` | `"v2:" + HMAC-SHA256(k_ip, "YYYY-MM-DD\|" + ipמצומצם)`; IPv4 → /24, IPv6 → /48 (IPv4-mapped כ-IPv4) |
| `uaHash` | `sha256(ua + siteId + date)` | `"v2:" + HMAC-SHA256(k_ua, "date\|" + ua)` |
| `customerHash` | `sha256(email + sha256("pepper:"+apiKey))` | `"v2:" + HMAC-SHA256(k_customer, lower(trim(email)))` |

- `k_x = HMAC-SHA256(privacyKey, x)` (בינארי) עבור `x ∈ {ip, ua, customer}` — הפרדת דומיינים.
- `privacyKey` = 64 hex = `HKDF-SHA256(ikm = TRACK_KEY_SECRET, salt = siteId, info = "bridgead/privacy/v2", 32 bytes)`.
- ה-IP מצומצם **לפני** ה-HMAC, כך שגם עם המפתח מרחב החיפוש הוא 2^24 ל-IPv4 בלבד ואין שחזור של IP בודד.
- `ipHash` כולל תאריך (UTC) — לא ניתן לקשר בין ימים; dedup של קליקים (חלון 30 שניות) ממשיך לעבוד.
- `customerHash` ללא תאריך — יציב לאורך זמן לאותו לקוח באותה חנות (נדרש לרכישה עצמית).
- הבקשות נושאות `hashVersion: 2`. השרת דוחה (422) בקשה עם `hashVersion=2` שהערכים בה אינם `v2:<64 hex>`.
  בלי `hashVersion` (או 1) — מתנהג כמו קודם.

## מודל איום ובחירה

מטרה: מי שמחזיק ב-DB של BridgeAd (גם יחד עם דליפת `apiKey` של חנות) לא יכול לאמת כתובת אימייל מול `customerHash`.

נשקלו:
1. **מפתח אקראי בצימוד, רק בתוסף** — החזק ביותר, אבל השרת חייב לחשב את hash היוצר לזיהוי `SELF_PURCHASE` (cron monitor), אז השרת צריך לגשת למפתח; וקוד הצימוד (`siteId.apiKey`) אינו ניתן להרחבה בלי לשבור תוספים ישנים (הם מנקים כל תו לא-alnum ומדביקים אותו ל-apiKey).
2. **HKDF(apiKey)** — נגזר ממה שהשרת מחזיק; דליפת apiKey = דליפת המפתח (זו הבעיה המקורית). נדחה.
3. **נבחר: HKDF מסוד השרת `TRACK_KEY_SECRET` + siteId**, נמסר לתוסף פעם אחת ב-heartbeat החתום (TLS) ונשמר רק ב-`wp_options` (autoload=no). לא נשמר ב-DB (אין שינוי סכמה), לא נגזר מ-`apiKey`, יציב לאורך סיבוב `apiKey` (`rotateStoreKey`) — כך `customerHash` לא "מתאפס" בסיבוב.

מה זה מגן ממנו: דליפת DB בלבד; דליפת DB + apiKey; דליפת apiKey של חנות בודדת.
מה לא: מי שמחזיק גם ב-`TRACK_KEY_SECRET` (או בהרצת השרת) יכול לגזור את המפתח ולאמת אימיילים — זו הפשרה הישירה של היכולת לזהות רכישה עצמית בצד השרת. הפחתה עתידית: חישוב hash היוצר בצד התוסף לפי בקשה (דורש endpoint חדש; לא נעשה).
כמו כן: חנות/אדמין חנות שמחזיקים `privacyKey` יכולים לאמת אימיילים של לקוחות שלהם — זה מצופה (הם מחזיקים את האימיילים).
המפתח נחשף במעבר ב-heartbeat (HTTPS בלבד). `TRACK_KEY_SECRET` סיבוב ⇒ גם `privacyKey` משתנה (כבר היום שובר את `apiKeyEnc`), וידרוש `delete_option('bridgead_privacy_key')` בתוסף או ניתוק/חיבור מחדש.

## תאימות לאחור

- ללא שינוי סכמה/DB. נתונים קיימים (`AffiliateClick.ipHash`, `AttributedOrder.customerHash`) נשארים כפי שהם; v2 מזוהה לפי קידומת `v2:`.
- תוסף ישן (0.1.x) ממשיך לשלוח v1 — מתקבל כרגיל (`hashVersion` ברירת מחדל 1).
- תוסף 0.2.0 לפני קבלת המפתח (עד ה-heartbeat הראשון; מתבצע גם מיד בשמירת קוד צימוד) שולח v1.
- השוואת `SELF_PURCHASE` (cron monitor) מחשבת **גם v1 וגם v2** לכל אתר של העסק.
- `isNewCustomer` מחושב מקומית בתוסף (`wc_get_orders`) ולכן לא תלוי ב-hash. הזמנה היסטורית ב-v1 לא תותאם ל-v2 של אותו לקוח — אין לוגיקה בשרת שמסתמכת על זה (רק זיהוי רכישה עצמית, מכוסה בשני ה-hash).
- הנתונים ההיסטוריים נשארים ב-v1 (חלשים). מחיקה/מיגרציה — מחוץ לתחום (קשור SEC-P-14, שמירה).

## מה נדרש מהמפרסמים הקיימים

עדכון תוסף ל-0.2.0 (הורדה מחדש מהאזור האישי). אין צורך בצימוד מחדש: המפתח מתקבל אוטומטית ב-heartbeat (עד 6 שעות, או מיד ב"בדיקת חיבור"). עד אז — v1.

## קבצים

`src/lib/track/crypto.ts` (derivePrivacyKey, customerHashV1/V2, isHashV2), `schemas.ts` (hashVersion, validate*Hashes), `src/app/api/track/{click,order}/route.ts`, `src/app/api/plugin/heartbeat/route.ts`, `src/lib/track/cron/monitor.ts`, `wp-plugin/bridgead-woo/includes/class-bridgead-{api,tracker,orders,cron,settings}.php`, `uninstall.php`.

## איך לאמת

`node wp-plugin/tests/privacy-hash-check.mjs` (דורש `php` ב-CLI) — מריץ את `Bridgead_Api` ב-PHP ומשווה למימוש ייחוס ב-Node (וגם עקביות /24, /48, נרמול אימייל). דוגמת וקטור, `privacyKey = 00112233…eeff` (32 בייט ascending-pattern כמו בסקריפט):
- `customerHash("  Alice@Example.COM ") == customerHash("alice@example.com")` = `"v2:" + HMAC_SHA256(HMAC_SHA256(key,"customer"), "alice@example.com")`.
- `203.0.113.77` ו-`203.0.113.200` ⇒ אותו `ipHash` באותו יום; `2001:db8:abcd:1234::1` ו-`2001:db8:abcd:ffff::9` ⇒ אותו `ipHash`.
ידנית: heartbeat עם `needsPrivacyKey:true` מחזיר `privacyKey`; click עם `hashVersion:2` ו-`ipHash:"abc"` ⇒ 422.
