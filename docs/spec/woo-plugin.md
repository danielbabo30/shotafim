# Spec: WooCommerce plugin (bridgead-woo)

> status: documented · updated: 2026-09-30 · owning agent: partnerships-tracking

## 1. Business purpose

`wp-plugin/bridgead-woo/` is a standalone WordPress/WooCommerce plugin (plain PHP, **not** part
of the Next.js app — `wp-plugin/README.md:4-5`) that a brand (`BRAND` role) installs in their own
WooCommerce store to make revenue-share ("תשלום פר רכישה") `PartnerProgram` partnerships
possible. It is the *client* half of the tracking protocol whose *server* half
(`src/app/api/track/**`, `src/app/api/plugin/**`, `src/lib/track/**`) is documented in
`tracking-engine.md` (queue #15, not yet merged as of this pass — see note in `INDEX.md`). This
spec covers the plugin's own code: what it ships, how a brand installs and pairs it, what it
sends, and its retry/health-reporting behavior — cross-referencing the server contract only where
needed to explain plugin behavior or flag a mismatch.

Without this plugin a `PartnerProgram` has no way to observe real store activity: clicks on a
creator's affiliate link and purchases made through it/their coupon are otherwise invisible to
BridgeAd, so no commission could ever be computed or paid.

## 2. Roles involved

- **`BRAND`** — the only role that can download the plugin ZIP (`src/app/api/plugin-download/route.ts:27-35`,
  checked against `User.roles`) and the only role that can create/rotate/disconnect a pairing
  (`brandBusiness()`, `src/lib/actions/plugin-actions.ts:27-35`, requires an active user **and**
  an existing `BusinessProfile`).
- **WooCommerce store admin** (`manage_woocommerce` WP capability) — installs the plugin in
  WP-admin, pastes the pairing code, and clicks "בדיקת חיבור" on the `WooCommerce ▸ BridgeAd`
  settings screen (`class-bridgead-settings.php`). This is a WordPress-side capability, entirely
  separate from BridgeAd's own `UserRole` system — in practice the same person for a small brand,
  but the plugin has no way to verify that.
- **Creators / ad-space owners** are not directly involved with the plugin; they only see its
  downstream effects (attributed orders, commission) inside the `PartnerProgram` contract room.

## 3. User flow

### 3a. Install + pair (brand side, in the BridgeAd app)
1. Brand opens `/dashboard/plugin` (`src/app/(frontend)/(app)/dashboard/plugin/page.tsx`).
   Gated by `requireActiveUser()` + `roleKeys.includes("brand")` (`page.tsx:19-20`); if the brand
   has no `BusinessProfile` yet, the page shows a "complete your business profile first" empty
   state instead of the connect form (`page.tsx:36-42`, `getPluginConnections()` →
   `{ hasBusiness: false }`, `src/lib/plugin-connection.ts:30-37`).
2. Brand downloads the ZIP via `PluginDownloadCard` → `GET /api/plugin-download`
   (`src/components/app/plugin/plugin-download-card.tsx:25-32`). The route re-checks auth+role
   server-side independent of the page (`src/app/api/plugin-download/route.ts:16-35`) and streams
   `wp-plugin/dist/bridgead-woo-plugin.zip` from disk.
3. Brand enters their store URL in `StoreConnectPanel` (`src/components/app/plugin/store-connect-panel.tsx:40-72`)
   → `connectStore` server action (`src/lib/actions/plugin-actions.ts:37-77`):
   - validates URL shape (`siteUrlSchema`, strips trailing slashes),
   - generates a 40-char base32 `apiKey` (`generateApiKey()`, `src/lib/track/crypto.ts:24-30`),
   - `upsert`s a `TrackedSite` row keyed on `(businessId, siteUrl)`, storing `apiKeyHash` (sha256,
     for fast lookup/rejection) and `apiKeyEnc` (AES-256-GCM, for HMAC verification later) —
     **never** the plaintext key (`plugin-actions.ts:62-73`),
   - returns the pairing token `"<TrackedSite.id>.<apiKey>"` (`pairingToken()`,
     `src/lib/plugin-connection.ts:28`) in action state, shown exactly once by `KeyReveal`
     (`store-connect-panel.tsx:140-177`) with a copy-to-clipboard button. Re-pairing the same
     `siteUrl` (re-submitting the form) **overwrites** the existing key (`update:` branch,
     `plugin-actions.ts:71`) — no confirmation prompt.
   - "החלף מפתח" (`rotateStoreKey`, `plugin-actions.ts:79-110`) re-generates the key for an
     existing `TrackedSite.id` the same way, flips `status` back to `"ACTIVE"`.
   - "ניתוק חנות" (`disconnectStore`, `plugin-actions.ts:113-124`) soft-disconnects by setting
     `status: "DEACTIVATED"` — no delete, so historical `AttributedOrder` rows referencing the
     site survive.

### 3b. Install + pair (store admin side, inside WordPress)
1. Upload the ZIP under **Plugins ▸ Add New ▸ Upload Plugin**, activate. Requires WooCommerce
   active or the plugin no-ops with an admin notice (`bridgead-woo.php:46-62`).
   `register_activation_hook` schedules the three cron jobs and seeds the `bridgead_settings`/
   `bridgead_queue` options (`bridgead-woo.php:67-83`).
2. **WooCommerce ▸ BridgeAd** settings screen (`class-bridgead-settings.php:22-31`, gated by the
   WP capability `manage_woocommerce`): paste the `siteId.apiKey` pairing code, save
   (`handle_save()` splits on the first `.`, sanitizes both halves, persists to the
   `bridgead_settings` option — `class-bridgead-settings.php:65-75`). Also configurable here:
   cookie lifetime (1–90 days, default 90) and the nightly digest lookback window (1–60 days,
   default 7).
3. "בדיקת חיבור" button → AJAX `bridgead_verify` (`admin.js:12-57` →
   `Bridgead_Settings::ajax_verify()`, `class-bridgead-settings.php:93-125`) — there is **no
   dedicated verify endpoint**; it just fires a real `POST /api/plugin/heartbeat` and reports the
   response. On success it stores `last_verified_at` and the UI flips to "מחובר ל-BridgeAd" with
   the live `siteStatus`/`linksLive` figures from the response body.

### 3c. Runtime tracking (no user interaction)
- A visitor lands on the store with `?bgad_ref=<creatorCode>` → `Bridgead_Tracker::capture_click()`
  fires on WP `init` (priority 1): sets three first-party cookies (`bgad_ref`, `bgad_ts`,
  `bgad_land`, `SameSite=Lax`, **not** `HttpOnly`), mirrors into the WooCommerce session if
  available, and fires `POST /api/track/click` (fire-and-forget via the retry queue).
- At checkout, `woocommerce_checkout_update_order_meta` / the Store API equivalent stamp the order
  with `_bridgead_ref`/`_bridgead_landing` meta from the session or cookie
  (`Bridgead_Tracker::stamp_order()`) — this is what survives even if the cookie is cleared before
  `woocommerce_payment_complete` fires.
- On payment completion (`woocommerce_payment_complete` / `woocommerce_order_status_completed`),
  `Bridgead_Orders::on_paid()` reports the order once (guarded by `_bridgead_reported` order meta)
  if it carries a ref **or** any coupon code.
- Subsequent status transitions (`completed`/`refunded`/`cancelled`/`failed`/`on-hold`) and partial
  refunds report via `/api/track/order-status`, but **only** for orders already flagged
  `_bridgead_reported` (see §10 finding 1).
- Every 6h: heartbeat. Every 5min: retry-queue flush. Nightly at 03:00 local: digest of all orders
  in the lookback window that carry a ref or coupon, sent regardless of individual report status —
  the stated last-resort reconciliation ("שום רכישה משויכת לא הולכת לאיבוד", `readme.txt:22`).
- Plugin deactivation (`register_deactivation_hook`) posts a best-effort
  `POST /api/plugin/deactivated` (4s timeout) before unscheduling cron.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Plugin bootstrap | `wp-plugin/bridgead-woo/bridgead-woo.php` | Defines constants (`BRIDGEAD_API_BASE`, filterable via `bridgead_api_base`), loads includes, activation/deactivation hooks |
| Bootstrap/DI | `wp-plugin/bridgead-woo/includes/class-bridgead.php` | Singleton; wires `Tracker`/`Orders`/`Cron`/`Settings` (admin-only), adds the admin-bar status indicator |
| HTTP client | `wp-plugin/bridgead-woo/includes/class-bridgead-api.php` | Builds/signs every request (HMAC-SHA256), `enqueue_or_send()` decides retry vs. drop by HTTP status |
| Retry queue | `wp-plugin/bridgead-woo/includes/class-bridgead-queue.php` | `wp_options` (`bridgead_queue`, cap 500 items, exponential backoff, 8-try cap) |
| Click tracking | `wp-plugin/bridgead-woo/includes/class-bridgead-tracker.php` | `?bgad_ref` capture, cookie + WC session, order stamping |
| Order tracking | `wp-plugin/bridgead-woo/includes/class-bridgead-orders.php` | Payment/status/refund hooks → `/api/track/{order,order-status}` |
| Cron | `wp-plugin/bridgead-woo/includes/class-bridgead-cron.php` | Heartbeat (6h), digest (nightly 03:00), queue flush (5min) |
| Settings UI | `wp-plugin/bridgead-woo/includes/class-bridgead-settings.php` | `WooCommerce ▸ BridgeAd` admin page, pairing form, AJAX verify |
| Admin assets | `wp-plugin/bridgead-woo/assets/{admin.js,admin.css}` | Verify-button AJAX handler + status pill styling |
| Uninstall | `wp-plugin/bridgead-woo/uninstall.php` | Clears all `wp_options` + cron hooks; **order meta is deliberately left in place** |
| Packaging | `wp-plugin/build.mjs`, `wp-plugin/dist/{bridgead-woo-plugin.zip,version.txt}` | Zips `bridgead-woo/` (version read from the plugin header); runs in `prebuild`, output is committed |
| Download route | `src/app/api/plugin-download/route.ts` | `BRAND`-only, streams the committed ZIP; shipped to the serverless function via `outputFileTracingIncludes` in `next.config.ts:15-17` |
| Download UI | `src/components/app/plugin/plugin-download-card.tsx`, `src/app/(frontend)/(app)/dashboard/plugin/page.tsx` | Entry point + install instructions |
| Pairing UI | `src/components/app/plugin/store-connect-panel.tsx` | Client component: create/rotate/disconnect a `TrackedSite` |
| Pairing fetcher | `src/lib/plugin-connection.ts` | `getPluginConnections()` — lists a business's `TrackedSite` rows |
| Pairing actions | `src/lib/actions/plugin-actions.ts` | `connectStore` / `rotateStoreKey` / `disconnectStore` — writes `TrackedSite` |
| Shared form types | `src/lib/plugin-form.ts` | `PluginActionState` (plain file — a `"use server"` file can't export non-function values for the client component to import) |
| Crypto (shared with server) | `src/lib/track/crypto.ts` | `generateApiKey`, `encryptApiKey`/`decryptApiKey`, `trackSignature` — the Next-side mirror of the PHP HMAC/pepper logic |
| Ingestion auth | `src/lib/track/auth.ts` | Verifies every plugin request (`authenticateTrackRequest`) — see §7 |
| Ingestion routes | `src/app/api/track/{click,order,order-status,digest}/route.ts`, `src/app/api/plugin/{heartbeat,deactivated}/route.ts` | Receive what the plugin sends (full ingestion logic is `tracking-engine.md`'s scope, not repeated here) |
| Payload schemas | `src/lib/track/schemas.ts` | zod schemas the server validates plugin payloads against — used below to cross-check the PHP payload shapes |

## 5. Data model

The plugin has no database of its own beyond WordPress `wp_options` (`bridgead_settings`,
`bridgead_queue`) and `WC_Order` meta (`_bridgead_ref`, `_bridgead_landing`, `_bridgead_reported`).
Everything durable lives in Prisma, written by the *server* routes the plugin talks to — full
detail in `tracking-engine.md`. The one model the plugin's pairing flow writes directly (via the
Next server actions, not the PHP code) is:

**`TrackedSite`** (`prisma/schema.prisma:1338-1363`) — `apiKeyHash` (sha256, fast-reject),
`apiKeyEnc` (AES-256-GCM, decrypted per-request to verify HMAC), `status: SiteStatus` (`ACTIVE →
STALE →` `OFFLINE`, driven by the monitor cron reading `lastHeartbeatAt`, not by the plugin itself
— the plugin only ever pushes it back to `ACTIVE` via a successful heartbeat/order/click, or to
`DEACTIVATED` via `disconnectStore` or the plugin's own deactivation ping), `pluginVersion` /
`wooVersion` / `wpVersion` / `phpVersion` (all last-heartbeat snapshots), `pairedAt`.

`PluginAlertType` (`schema.prisma:362-366`): `DEACTIVATED` (written by
`/api/plugin/deactivated`), `HEARTBEAT_ABSENT` (written by the monitor cron when
`lastHeartbeatAt` goes stale — `tracking-engine.md` scope), `WEBHOOK_MISMATCH` (schema-only as far
as this pass traced — no plugin-side event maps to it).

## 6. API contracts (plugin → BridgeAd)

All requests are `POST`, `Content-Type: application/json`, with three custom headers built by
`Bridgead_Api::post()` (`class-bridgead-api.php:67-110`) and verified by
`authenticateTrackRequest()` (`src/lib/track/auth.ts:19-72`):

```
X-BridgeAd-Site       = TrackedSite.id
X-BridgeAd-Timestamp  = unix seconds (±300s skew, HMAC_SKEW_SECONDS, src/lib/partner-constants.ts:16)
X-BridgeAd-Signature  = "sha256=" + HMAC-SHA256(timestamp + "." + rawBody, apiKey)
```

Confirmed byte-for-byte identical on both sides: `trackSignature()` (`src/lib/track/crypto.ts:66-67`)
vs. the inline HMAC in `class-bridgead-api.php:75`; `site_pepper()`
(`class-bridgead-api.php:49-51`, `sha256("pepper:" + apiKey)`) vs. the server computing
`customerHash` the same way in `class-bridgead-orders.php:54` (the server-side hashing itself is
`tracking-engine.md` scope).

| Endpoint | Plugin trigger | Payload built by | Server schema |
| --- | --- | --- | --- |
| `POST /api/track/click` | `?bgad_ref=` query param, on `init` | `Bridgead_Tracker::capture_click()` | `clickPayloadSchema` |
| `POST /api/track/order` | `woocommerce_payment_complete` / order marked `completed` | `Bridgead_Orders::on_paid()` | `orderPayloadSchema` |
| `POST /api/track/order-status` | order status change / partial refund (only if already reported) | `Bridgead_Orders::on_status_changed()` / `on_partial_refund()` | `orderStatusPayloadSchema` |
| `POST /api/track/digest` | nightly cron, 03:00 local | `Bridgead_Cron::digest()` | `digestPayloadSchema` |
| `POST /api/plugin/heartbeat` | every 6h + manual "בדיקת חיבור" | `Bridgead_Cron::heartbeat()` / `Bridgead_Settings::ajax_verify()` | `heartbeatPayloadSchema` → `{ siteStatus, linksLive, serverTime, recoveredFrom }` |
| `POST /api/plugin/deactivated` | `register_deactivation_hook` | `bridgead_deactivate()` | `deactivatedPayloadSchema` → `{ graceEndsAt }` (`MONITOR_GRACE_HOURS = 36`) |

Payload field names line up 1:1 with the zod schemas on every endpoint checked (`refCode`,
`occurredAt`, `landingUrl`, `ipHash`/`uaHash`/`country` for click; `amounts.{itemsSubtotal,
discountTotal,taxTotal,shippingTotal,grandTotal}`, `lineItems[].{sku,productId,name,quantity,
lineSubtotal,lineDiscount,isReferredProduct}`, `couponCodes`, `customerHash`, `isNewCustomer` for
order). One asymmetry: `orderStatusPayloadSchema` accepts `newStatus ∈ {completed, processing,
paid, refunded, partially-refunded, cancelled, failed, on-hold}` but the plugin's own status map
(`class-bridgead-orders.php:86-92`) only ever sends `completed | refunded | cancelled | failed |
on-hold` (+ `partially-refunded` from the separate refund hook) — `processing`/`paid` are
reachable only via some other integration, never from this plugin.

## 7. Guards & permissions

- **Pairing/rotate/disconnect** (Next side): `requireActiveUser()` + `roleKeys.includes("brand")`
  + an existing `BusinessProfile`, re-checked inside every action (`plugin-actions.ts:27-35`), not
  just at the page level.
- **Plugin download**: independent `BRAND`-role + not-suspended/banned/deleted check directly in
  the route handler (`src/app/api/plugin-download/route.ts:22-35`), not delegated to the page.
- **WP settings screen / pairing entry / verify AJAX**: gated by the WordPress capability
  `manage_woocommerce` (`class-bridgead-settings.php:27,58,95`) — a WordPress-side permission
  entirely independent of BridgeAd's own auth. Whoever has that WP capability can read/replace the
  pairing code and trigger a heartbeat; BridgeAd has no visibility into who that is.
- **Ingestion requests**: `authenticateTrackRequest()` — HMAC signature (see §6), timestamp skew,
  `TrackedSite.status !== "DEACTIVATED"`, plus an Origin/Referer-vs-`siteUrl` host check. See §10
  finding 2 — that last check does not do what it appears to for this plugin's actual traffic.

## 8. Known edge cases

- Re-pairing an already-paired `siteUrl` from the BridgeAd side silently overwrites the key with
  no warning that the old plugin installation will stop authenticating (`plugin-actions.ts:62-73`)
  — the old key simply starts failing with 401s on its next request, queuing forever until
  `MAX_TRIES` (8) is hit, then silently dropped (`class-bridgead-queue.php:85-89`).
- `is_referred()`'s product-attribution matching (`class-bridgead-orders.php:164-177`) is landing
  URL substring/permalink matching — a store with query-string-based permalinks, translated URLs,
  or a URL-rewriting caching layer in front of WordPress can produce false negatives (line item
  under-counted as "not referred") silently; no logging on mismatch.
- Multi-store businesses: each `TrackedSite` is paired independently, but `site_pepper()`
  (`class-bridgead-api.php:49-51`) is derived from that store's own `apiKey`, so `customerHash`
  values are **not** comparable across a brand's two stores even for the same real customer.
- Deactivating the plugin but forgetting to also click "ניתוק חנות" in the BridgeAd dashboard
  leaves `TrackedSite.status` to be corrected only by the next real event: the deactivation ping
  (best-effort, 4s timeout, `bridgead-woo.php:89-102`) sets it to `DEACTIVATED` server-side
  *if it lands*; if the ping itself fails (network blip during deactivation, or the 4s timeout is
  exceeded) nothing marks the site deactivated and it is left looking merely stale until the
  monitor cron's `HEARTBEAT_ABSENT` path catches it later (`tracking-engine.md` scope).
- `bridgead_api_base` is a public WP filter — any other active plugin/theme on the same install
  can repoint where signed events are sent (the HMAC key itself is never transmitted, so this
  can't leak the key, but it can silently exfiltrate/blackhole all tracking events).

## 9. Tech debt / TODOs in code

- No explicit `TODO`/`FIXME` markers found in `wp-plugin/bridgead-woo/**` (grepped) — the plugin
  reads as a deliberately-scoped v0.1.0, not a stub.
- `wp-plugin/README.md:33-34` itself flags: *"לפני פרודקשן: לוודא שברירת המחדל היא הדומיין הסופי
  הנכון"* — `BRIDGEAD_API_BASE` defaults to `https://bridgead.co.il` (`bridgead-woo.php:32`); this
  pass did not verify that domain is actually the production one (out of scope — no production
  deploy config in this repo to check against).
- `wp-plugin/README.md:41` — *"שרת עדכונים: מתוכנן"* (a WP-panel auto-update manifest endpoint is
  explicitly planned, not built). Today a brand must manually re-download and re-upload the ZIP
  for every version bump; no in-WP update path exists.
- The queue's own drop-after-8-tries (`class-bridgead-queue.php:85-89`) only `error_log()`s —
  nothing surfaces to the WP admin UI (the settings page only ever shows the *current* queue
  length, `class-bridgead-settings.php:206-213`, never a lifetime-dropped count) and nothing pings
  BridgeAd about the drop either.

## 10. Findings for the team lead

1. **A permanently-rejected order report silently disables all future refund/cancellation
   tracking for that order.** `on_paid()` sets `_bridgead_reported = 1`
   (`class-bridgead-orders.php:69-70`) unconditionally after calling `enqueue_or_send()` —
   regardless of whether the send succeeded, was queued for retry, or was permanently rejected
   (400/401/409/422, the "not retrying" branch in `class-bridgead-api.php:118-124`). But
   `on_status_changed()` and `on_partial_refund()` both gate on that exact same meta flag
   (`class-bridgead-orders.php:82`, `:117`) before reporting a later refund/cancel/status change.
   Net effect: if the *original* order POST is permanently rejected (e.g. a stale/rotated key
   mid-checkout, or a malformed payload the server 400s), the order is marked "reported" anyway,
   and its refund/cancellation will never be reported via the real-time path — only the nightly
   digest might catch it, and the digest payload (`digestPayloadSchema`) carries just a point-in-time
   `status` string, not a refund amount, so a partial refund on such an order has no path to the
   server at all.
2. **The domain-binding check in `authenticateTrackRequest()` never actually runs for this
   plugin's real traffic.** `src/lib/track/auth.ts:58-69` rejects a request with 409 if its
   `Origin`/`Referer` header's host doesn't match the paired `TrackedSite.siteUrl` — but every
   plugin request is built with `wp_remote_post()` (`class-bridgead-api.php:77-95`), which is a
   PHP-to-PHP server-side HTTP call and never sets an `Origin` or `Referer` header. So `origin` is
   always `null` for legitimate traffic, and the check's `if (origin)` guard means it silently
   no-ops every time — it can only ever fire against a browser-originated forgery, not the
   documented server-to-server integration it reads as protecting. If domain binding was intended
   as a real control here, it isn't providing one today.
3. **Re-pairing/rotating a key from the BridgeAd dashboard gives the old plugin install no
   warning** before it starts silently failing (queued, retried 8x, then dropped with only a PHP
   error_log entry — see §8/§9). A brand who rotates a key without also updating the plugin loses
   tracking for that store with no signal on either side until someone notices commissions look
   wrong.
4. **No in-product auto-update path** for the plugin (`wp-plugin/README.md:41` — "planned", not
   built) — every brand must be manually walked through re-downloading and re-uploading the ZIP to
   get a bug fix or protocol change, with no version-skew detection beyond the `pluginVersion`
   string logged on heartbeat (which nothing currently alerts on if outdated).

## Typecheck/lint/build

Not run this pass — same pre-existing environment gap earlier `spec/*` PRs already reported:
`node_modules` isn't installed in this sandbox, so `npm run typecheck`/`lint` fail on missing
packages (`@prisma/client`, `zod`, `next/server`, etc.), unrelated to this docs-only change. Not
attempted to fix, per the systems-analyst rules (docs-only scope).
