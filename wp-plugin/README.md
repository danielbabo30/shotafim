# wp-plugin/ — תוסף המעקב של BridgeAd ל-WooCommerce

תוסף WordPress שהמפרסם מתקין בחנות שלו כדי לדגום קליקים ורכישות עבור שותפויות
"תשלום פר רכישה". **לא חלק מאפליקציית ה-Next** — קוד PHP עצמאי.

```
wp-plugin/
  bridgead-woo/        קוד התוסף (PHP)
  build.mjs            בונה את ה-ZIP
  dist/                פלט ה-build (מקומיט)
    bridgead-woo-plugin.zip
    version.txt
```

## build

```bash
node wp-plugin/build.mjs
```

רץ אוטומטית ב-`prebuild` (לפני `next build`). דורש את ה-CLI `zip`.

## כתובת ה-API

`BRIDGEAD_API_BASE` — קבוע ב-`bridgead-woo.php`, ברירת מחדל `https://bridgead.co.il`.
עקיפה לסביבות אחרות (staging / self-hosted):

```php
// wp-config.php
define( 'BRIDGEAD_API_BASE', 'https://staging.bridgead.co.il' );
```

או דרך הפילטר `bridgead_api_base`. הכתובת הפעילה מוצגת במסך ההגדרות.
**לפני פרודקשן:** לוודא שברירת המחדל היא הדומיין הסופי הנכון.

## הפצה

- **הורדה מהאזור האישי:** `GET /api/plugin-download` — מוגן ל-role `brand`, מזרים את
  `dist/bridgead-woo-plugin.zip`. ה-ZIP נכלל ב-serverless function דרך
  `outputFileTracingIncludes` ב-`next.config.ts`.
- **שרת עדכונים:** מתוכנן — endpoint manifest שיאפשר עדכון מתוך פאנל התוספים של WP.

## חוזה ה-endpoints (צד BridgeAd)

נבנה מול המסמך **"BridgeAd Tracking API" (draft-1, WP-2)**. כל בקשה חתומה:

```
signingString = "{unix_timestamp}.{raw_json_body}"
headers:
  X-BridgeAd-Site       siteId  (מזהה TrackedSite מהצימוד)
  X-BridgeAd-Timestamp  unix seconds  (skew מותר 300s)
  X-BridgeAd-Signature  "sha256=" + hmac_sha256_hex(signingString, apiKey)
```

**צימוד:** האזור האישי מנפיק `siteId.apiKey`. התוסף מפצל ושומר את שניהם ב-`wp_options`.
`X-BridgeAd-Site` = `siteId`. `apiKey` הוא מפתח ה-HMAC — לא נשלח אחרי הצימוד.
**Hash פרטיות (v2, תוסף 0.2.0+, SEC-P-13):** ראו `docs/spec/privacy-hashing.md`.
`privacyKey` (64 hex) נגזר בשרת (HKDF מ-`TRACK_KEY_SECRET`, salt=`siteId`) ונמסר לתוסף פעם אחת בתשובת `heartbeat`
כשהבקשה כוללת `needsPrivacyKey: true`; התוסף שומר ב-`bridgead_privacy_key` (autoload=no). תת-מפתחות: `HMAC(privacyKey, "ip"|"ua"|"customer")`.
`ipHash = "v2:" + HMAC(k_ip, "YYYY-MM-DD|" + truncatedIp)` (IPv4→/24, IPv6→/48) · `uaHash = "v2:" + HMAC(k_ua, date|ua)` ·
`customerHash = "v2:" + HMAC(k_customer, lower(trim(email)))`. בקליק/הזמנה נשלח `hashVersion: 2`; השרת מחייב פורמט `v2:<64 hex>` (422 אחרת).
ללא `hashVersion` (תוסף ישן / אין עדיין מפתח) = v1 הישן: `sha256(ip+siteId+date)`, `sha256(email + sha256("pepper:"+apiKey))`.

| endpoint | מתי | payload |
| --- | --- | --- |
| `POST /api/track/click` | קליק על `?bgad_ref` | `refCode, occurredAt, landingUrl, ipHash, uaHash?, country?, hashVersion?` |
| `POST /api/track/order` | `woocommerce_payment_complete` | `externalOrderId, orderPlacedAt, currency, orderStatus, amounts{itemsSubtotal,discountTotal,taxTotal,shippingTotal,grandTotal}, lineItems[]{sku,productId,name,quantity,lineSubtotal,lineDiscount,isReferredProduct}, couponCodes[], refCode?, customerHash, isNewCustomer, hashVersion?` |
| `POST /api/track/order-status` | מעבר סטטוס / החזר חלקי | `externalOrderId, newStatus, refundedAmount?, occurredAt` |
| `POST /api/plugin/heartbeat` | כל 6 שעות · גם "בדיקת חיבור" | `pluginVersion, wooVersion, wpVersion?, phpVersion?, ordersSinceLast, stuckWebhookQueue, sentAt, needsPrivacyKey?` (תשובה כוללת `privacyKey` רק כשנתבקש) → `{ siteStatus, linksLive }` |
| `POST /api/plugin/deactivated` | `register_deactivation_hook` | `deactivatedAt, reason?` |
| `POST /api/track/digest` | לילי | `periodStart, periodEnd, orders[], totals{orderCount,grossAmount}` |

> אם החוזה הסופי משתנה — העדכונים: נתיבים/כותרות ב-`class-bridgead-api.php`,
> מבני payload ב-`class-bridgead-orders.php` / `class-bridgead-tracker.php` / `class-bridgead-cron.php`.
