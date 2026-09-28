# Spec: Tracking engine (clicks, attribution)

> status: documented · updated: 2026-09-28 · owning agent: partnerships-tracking

Scope note: this spec covers the click/order ingestion and attribution engine for
revenue-share (`CompensationModel.REVENUE_SHARE`) partnerships — the WooCommerce
plugin protocol, site pairing, HMAC auth, click/order/digest ingestion, commission
calculation, and site health monitoring. It deliberately does **not** cover, beyond
what's needed to explain a call site:
- `PartnerProgram` lifecycle / deposit / 80% gate — queue #14 (`partner-programs.md`, open PR #22)
- `AnomalyFlag` detection rules in depth — queue #16 (`anomaly-enforcement.md`)
- `PayoutCheckpoint` scheduling / reconcile payout math — queue #18 (`payout-cron.md`)

All source comments in this domain are Hebrew and repeatedly cite an external design
doc, "Artifact 'תשלום פר רכישה' (WP-2)" with section numbers (§2–§12). That artifact is
**not checked into this repo** (searched `docs/` — no match) — section numbers below are
copied from code comments for traceability, not verified against a source doc.

## 1. Business purpose

Lets a brand's WooCommerce store report clicks and purchases attributed to a
creator's affiliate link and/or personal coupon code, so a revenue-share
(`REVENUE_SHARE`) `PartnerProgram` can compute commission per order automatically
instead of relying on manual reporting. A companion WordPress/WooCommerce plugin
(`wp-plugin/bridgead-woo/`) is the only client; there is no other supported
integration path (`SitePlatform` enum has one value, `WOOCOMMERCE`,
`prisma/schema.prisma:337-339`).

## 2. Roles involved

- **Brand** (`roleKeys.includes("brand")`) — pairs their WooCommerce store to a
  `TrackedSite`, downloads the plugin, rotates/revokes the API key
  (`src/lib/actions/plugin-actions.ts:27-124`).
- **Creator (provider)** — passive recipient of attribution; sees the same
  read-only numbers as the brand in the shared partner dashboard
  (`src/lib/partner-dashboard.ts:16-19`).
- **WooCommerce plugin** (not a human role — a machine client authenticated by
  per-site API key) — the only writer of `AffiliateClick` and `AttributedOrder`.
- **Cron / system** — `/api/cron/{monitor,reconcile}` (admin/Vercel-cron only, via
  `authorizeCron`, `src/lib/track/cron/guard.ts:10-21`) drives site-health state
  transitions, commission approval, and anomaly flags.

## 3. User flow

### 3a. Pairing a store (brand, `/dashboard/plugin`)
1. Brand opens `/dashboard/plugin` (`src/app/(frontend)/(app)/dashboard/plugin/page.tsx:18-73`);
   gated to `brand` role only (line 20), requires a `BusinessProfile` to exist
   (checked in `getPluginConnections`, `src/lib/plugin-connection.ts:33-37`) —
   otherwise the page shows a "complete your business profile first" message
   instead of the pairing UI (page.tsx:36-42).
2. Brand downloads the plugin ZIP (`PluginDownloadCard`) and submits a store URL
   via `StoreConnectPanel` → `connectStore` server action
   (`src/lib/actions/plugin-actions.ts:37-77`).
3. `connectStore` validates/normalizes the URL (strips trailing slashes, requires
   `http(s)://host.tld`, `plugin-actions.ts:17-25`), generates a 40-char base32 API
   key (`generateApiKey`, `src/lib/track/crypto.ts:24-30`), stores
   `sha256(key)` as `apiKeyHash` and `AES-256-GCM(key)` as `apiKeyEnc`
   (`crypto.ts:46-52`), and upserts a `TrackedSite` keyed on
   `(businessId, siteUrl)` (`plugin-actions.ts:62-73`).
4. The one-time "pairing token" `<siteId>.<apiKey>` (`pairingToken`,
   `src/lib/plugin-connection.ts:28`) is returned in the action's `PluginActionState`
   (`status: "key"`, `src/lib/plugin-form.ts:6-10`) and shown once — it is never
   persisted in plaintext anywhere.
5. Brand pastes the token into the plugin's WooCommerce settings screen
   (`wp-plugin/bridgead-woo/includes/class-bridgead-settings.php`); the plugin
   splits it into `site_id`/`api_key` and stores them in its own `wp_options`
   (`bridgead_settings`).
6. `rotateStoreKey` (`plugin-actions.ts:79-110`) reissues a new key for an existing
   `TrackedSite` (brand must re-paste into the plugin). `disconnectStore`
   (`plugin-actions.ts:113-124`) soft-deletes by setting `status: "DEACTIVATED"` —
   historical `AttributedOrder`/`AffiliateClick` rows are kept.

### 3b. Runtime ingestion (plugin → server, no human in the loop)
1. **Click**: `Bridgead_Tracker::capture_click` (`wp-plugin/.../class-bridgead-tracker.php:27-79`)
   fires on `init` when `?bgad_ref=<code>` is present; sets first-party cookies
   (`bgad_ref`/`bgad_ts`/`bgad_land`, default 90-day TTL) and a WC session mirror,
   then fires-and-forgets `POST /api/track/click` with a salted IP hash (never the
   raw IP). Server side: `POST /api/track/click`
   (`src/app/api/track/click/route.ts:7-21`) → `authenticateTrackRequest` →
   `recordClick` (`src/lib/track/ingest.ts:28-73`), which resolves `refCode` to a
   *live* (`ACTIVE`/`GATE_80`) `PartnerProgram` scoped to the site's business
   (ingest.ts:32-42), dedups repeat clicks from the same `ipHash` within 30s
   (ingest.ts:44-53), and records `unverifiable: true` if the click falls inside a
   declared `MaintenanceWindow` (ingest.ts:55-69) — see §8/§10 for why this never
   actually happens today.
2. **Order stamping**: on `woocommerce_checkout_update_order_meta` /
   `woocommerce_store_api_checkout_update_order_meta`,
   `Bridgead_Tracker::stamp_order` (tracker.php:92-119) copies the session/cookie
   `ref` + landing URL onto the order as post meta (`_bridgead_ref`,
   `_bridgead_landing`) at creation time, so attribution survives cookie deletion
   before payment.
3. **Order report**: on `woocommerce_payment_complete` /
   `woocommerce_order_status_completed`, `Bridgead_Orders::on_paid`
   (`wp-plugin/.../class-bridgead-orders.php:29-67`) — only if the order carries a
   `_bridgead_ref` or a coupon code (line 24-26) and hasn't been reported before
   (`_bridgead_reported` meta flag) — builds an `OrderPayload` (amounts, line
   items with `isReferredProduct` computed by matching the click's landing URL to
   the product permalink/slug, `orders.php:157-172`) and posts it to
   `/api/track/order`. Server side: `POST /api/track/order`
   (`src/app/api/track/order/route.ts`) → `ingestOrder`
   (`src/lib/track/ingest.ts:99-228`):
   - Idempotent on `(siteId, externalOrderId)` (ingest.ts:105-110).
   - Rejects non-ILS currency with HTTP 422 (ingest.ts:112-114) — the plugin sends
     `order.get_currency()` as-is with no currency conversion, so a store not
     billing in ILS can never be attributed (see §8).
   - Matches against every `ATTRIBUTABLE_STATUS` (`ACTIVE`/`GATE_80`/`PAUSED`)
     program on the business, **coupon match wins over cookie/link match**
     (`resolveAttribution`, `src/lib/track/commission.ts:35-47`; loop in
     ingest.ts:140-158 breaks immediately on first `COUPON` hit but only tentatively
     keeps the first `COOKIE` hit).
   - Computes commission via `computeCommission`
     (`src/lib/track/commission.ts:97-109`): `commissionableAmount` is either the
     referred line items' subtotal (`PRODUCT_ONLY`) or the whole cart's items
     subtotal (`WHOLE_CART`), before/after discount per `commissionBasis` — always
     excluding tax and shipping (commission.ts:79-95); commission is `%` or fixed
     (`commissionType`); `platformFeeAmount` is `commissionAmount * platformFeePct/100`.
   - Writes `AttributedOrder` (`status: PENDING`) + a `Transaction`
     (`type: COMMISSION_ACCRUAL`, `status: PENDING`) in one `$transaction`
     (ingest.ts:180-220), then notifies both parties (ingest.ts:222-225).
4. **Order status changes**: `Bridgead_Orders::on_status_changed` /
   `on_partial_refund` (orders.php:74-137) post to `/api/track/order-status`
   (`src/app/api/track/order-status/route.ts`) → `reverseCommission`
   (`src/lib/track/ingest.ts:266-346`) on `refunded`/`cancelled`/`failed`/
   `partially-refunded`; a partial refund pro-rates the commission down
   (`proRateCommission`, `commission.ts:112-125`) rather than reversing it fully.
   Any other status (`completed`/`paid`/`processing`) just records the raw status
   for later stability checking (order-status/route.ts:40-45).
5. **Digest (nightly reconciliation)**: `Bridgead_Cron::digest`
   (`wp-plugin/.../class-bridgead-cron.php:88-131`, scheduled daily at 03:00,
   default 7-day lookback) posts every order with a ref or coupon in the window to
   `/api/track/digest` → `processDigest` (`src/lib/track/ingest.ts:362-446`):
   back-fills orders the webhook missed (`lateFromDigest: true`, with a
   `WHOLE_CART`-only fallback since the digest carries no line items,
   ingest.ts:379-402), corrects drifted `refunded`/`cancelled` statuses
   (ingest.ts:407-412), and raises a `PluginAlert` (`type: WEBHOOK_MISMATCH`) if
   the digest's own gross/count totals don't match what the server recorded for
   that window (ingest.ts:415-443).
6. **Heartbeat**: every 6h (`Bridgead_Cron::heartbeat`, cron.php:57-83) →
   `POST /api/plugin/heartbeat` (`src/app/api/plugin/heartbeat/route.ts`) updates
   `lastHeartbeatAt`/version fields and flips the site back to `ACTIVE`, clearing
   any open `HEARTBEAT_ABSENT` alert (heartbeat/route.ts:16-39).
7. **Plugin deactivation**: WordPress `register_deactivation_hook` fires
   `POST /api/plugin/deactivated` (`src/app/api/plugin/deactivated/route.ts`) —
   marks the site `DEACTIVATED`, opens a `PluginAlert` with a grace window, and
   notifies both parties + admins immediately (deactivated/route.ts:28-51).

### 3c. Background health/commission cron (no human trigger)
- **`/api/cron/monitor`** (hourly, per code comment `cron.php`-adjacent route
  comment) → `runMonitor` (`src/lib/track/cron/monitor.ts:21-180`): flips
  `ACTIVE → STALE` after 12h without a heartbeat (`HEARTBEAT_STALE_HOURS`,
  `src/lib/partner-constants.ts:22`) *only if there were affiliate clicks in the
  last 24h* (`MONITOR_CLICK_LOOKBACK_HOURS`, monitor.ts:62-70) — a quiet site with
  no clicks is never flagged; `STALE → OFFLINE` opens a `PluginAlert`
  (`HEARTBEAT_ABSENT`) with a 36h grace window (`MONITOR_GRACE_HOURS`) and emails
  the business (monitor.ts:79-106); when the grace window expires with no
  heartbeat, every live `PartnerProgram` for that business is force-`PAUSED`
  (`pauseReason: "tracking_offline"`, monitor.ts:110-137). A declared
  `MaintenanceWindow` suppresses the whole cycle for that site (monitor.ts:50) —
  see §10 finding 1 for why this can never be declared. The same run also invokes
  `detectAnomalies` per active program (out of scope here — §16).
- **`/api/cron/reconcile`** (daily) → `runReconcile`
  (`src/lib/track/cron/reconcile.ts:13-108`): promotes `PENDING` commissions older
  than 14 days (`COMMISSION_STABILITY_DAYS`) to `APPROVED` via `approveCommission`
  *only if* the last known raw order status is "stable" (`isStableOrderStatus`,
  `commission.ts:127-132` — `completed`/`processing`/`paid`), which drains the
  program's deposit (`applyDeposiDrain`, out of scope — §14). The deposit-refund
  half of this cron belongs to the payout/payments domain (§12/§18) and isn't
  detailed here.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Route | `src/app/(frontend)/(app)/dashboard/plugin/page.tsx` | Pairing UI (brand-only) |
| Component | `src/components/app/plugin/store-connect-panel.tsx`, `plugin-download-card.tsx` | Pairing form, ZIP download |
| Fetcher | `src/lib/plugin-connection.ts` (`getPluginConnections`, `cache()`) | Read paired stores for the current brand |
| Action | `src/lib/actions/plugin-actions.ts` (`connectStore`, `rotateStoreKey`, `disconnectStore`) | Writes `TrackedSite` |
| Form state | `src/lib/plugin-form.ts` | Shared client/server action state type |
| API (ingest) | `src/app/api/track/{click,order,order-status,digest}/route.ts` | Plugin → server webhooks, HMAC-authenticated |
| API (plugin) | `src/app/api/plugin/{heartbeat,deactivated}/route.ts` | Plugin health signals |
| API (cron) | `src/app/api/cron/{monitor,reconcile}/route.ts` | Vercel-cron/bearer-secret only |
| Engine | `src/lib/track/{auth,crypto,commission,ingest,drain,notify,http,schemas}.ts` | Pure + server-only ingestion/attribution/commission logic |
| Cron logic | `src/lib/track/cron/{monitor,reconcile,checkpoints,guard}.ts` | Cron bodies + `authorizeCron` guard |
| Fetcher (dashboard) | `src/lib/partner-dashboard.ts` (`getPartnerDashboard`, `cache()`) | Read-only shared brand/creator view over clicks/orders/checkpoints |
| Client plugin | `wp-plugin/bridgead-woo/includes/class-bridgead-{tracker,orders,api,queue,cron,settings}.php` | WooCommerce-side click/order capture, HMAC signing, retry queue |
| Dev-only | `src/app/(frontend)/dev/seed-partner-dashboard/route.ts` | Seeds `TrackedSite`/orders directly via Prisma, bypassing pairing |

## 5. Data model

Models: `TrackedSite`, `AffiliateClick`, `AttributedOrder`, `MaintenanceWindow`,
`PluginAlert` (`prisma/schema.prisma:1338-1480`). Enums:
`SitePlatform`, `SiteStatus`, `AttributionMode`, `AttributionMethod`,
`OrderCommissionStatus`, `PluginAlertType` (schema.prisma:312-366).

### `TrackedSite.status` (`SiteStatus`)
```
ACTIVE ──(no heartbeat 12h + clicks in last 24h, runMonitor)──► STALE
ACTIVE ──(no heartbeat 12h + zero clicks in last 24h)──► STALE   (same transition, different condition — see monitor.ts:62-77)
STALE  ──(still no heartbeat, has clicks)──► OFFLINE  (opens PluginAlert, 36h grace)
STALE / OFFLINE ──(heartbeat received, heartbeat/route.ts:28-31)──► ACTIVE
ACTIVE/STALE/OFFLINE ──(WP register_deactivation_hook)──► DEACTIVATED
DEACTIVATED ──(rotateStoreKey re-arms, plugin-actions.ts:103-106)──► ACTIVE
```
No transition exists back out of `DEACTIVATED` except `rotateStoreKey`/`connectStore`
re-pairing the same `(businessId, siteUrl)` row (upsert, plugin-actions.ts:62-73).
There is no delete path for `TrackedSite` in application code (only the dev-seed
route's cleanup, `dev/seed-partner-dashboard/route.ts:110`).

### `AttributedOrder.status` (`OrderCommissionStatus`)
```
(created)  ──ingestOrder──► PENDING
PENDING    ──runReconcile, 14d + stable raw status──► APPROVED   (drains deposit)
PENDING/ON_HOLD ──reverseCommission, full refund/cancel/fail──► REVERSED
PENDING/APPROVED ──reverseCommission, partial refund──► (same status, amounts pro-rated down)
APPROVED   ──(payout checkpoint runs — out of scope, §18)──► PAID
```
No code path was found that ever sets `ON_HOLD` (it's in the enum,
schema.prisma:349-353, and `partner-dashboard.ts` renders a label for it,
`ORDER_STATUS_LABEL.ON_HOLD`, `partner-dashboard.ts:397`, but nothing writes it) —
worth a look when speccing disputes (queue #10) since the enum comment says "the
brand paused a single commission for review" (schema.prisma:350), which sounds
like a dispute-side action that doesn't exist yet.

### `AffiliateClick` / `MaintenanceWindow`
`AffiliateClick` is append-only (no status, no update call site found anywhere in
`src/`). `MaintenanceWindow` rows are only ever *read* (`ingest.ts:56`,
`monitor.ts:42-50`) or *bulk-deleted* by the dev-seed cleanup
(`dev/seed-partner-dashboard/route.ts:108`) — see §10 finding 1.

## 6. API contracts

All `/api/track/*` and `/api/plugin/*` routes share the same auth: headers
`X-BridgeAd-Site` (a `TrackedSite.id`), `X-BridgeAd-Timestamp` (unix seconds),
`X-BridgeAd-Signature: sha256=<hex>` where the signed string is
`"{timestamp}.{raw_json_body}"` HMAC-SHA256'd with the site's decrypted API key
(`authenticateTrackRequest`, `src/lib/track/auth.ts:19-72`; schemas in
`src/lib/track/schemas.ts`). Timestamp skew tolerance is 300s
(`HMAC_SKEW_SECONDS`). An `Origin`/`Referer` header, if present, must match the
paired `siteUrl`'s host or the request is rejected with 409 (auth.ts:58-69).

| Endpoint | Method | Auth | Body schema | Response |
| --- | --- | --- | --- | --- |
| `/api/track/click` | POST | HMAC | `clickPayloadSchema` | 202 `{ok, counted, deduped}` |
| `/api/track/order` | POST | HMAC | `orderPayloadSchema` | 202/200 `{ok, attributed, created?, attributionMethod?, commissionAmount?, status?}` |
| `/api/track/order-status` | POST | HMAC | `orderStatusPayloadSchema` | 200 `{ok, commissionStatus, ...}` or 404 if order unknown |
| `/api/track/digest` | POST | HMAC | `digestPayloadSchema` | 200 `{ok, ingestedLate, corrected, mismatch}` |
| `/api/plugin/heartbeat` | POST | HMAC | `heartbeatPayloadSchema` | 200 `{ok, siteStatus, linksLive, serverTime, recoveredFrom}` |
| `/api/plugin/deactivated` | POST | HMAC | `deactivatedPayloadSchema` | 200 `{ok, graceEndsAt}` |
| `/api/cron/monitor` | GET | `authorizeCron` (Bearer `CRON_SECRET` or `x-vercel-cron` header) | — | 200 `{ok, markedStale, markedOffline, autoPaused, anomalies}` |
| `/api/cron/reconcile` | GET | `authorizeCron` | — | 200 `{ok, approved, depositRefunds, refundedILS}` |

In dev, `authorizeCron` allows unauthenticated GETs when `CRON_SECRET` is unset
(`src/lib/track/cron/guard.ts:11-16`); in production with no `CRON_SECRET` set it
hard-fails with 503, so both cron endpoints are silently dead until that env var
is configured.

## 7. Guards & permissions

- **Human-facing**: `/dashboard/plugin` requires `requireActiveUser()` +
  `roleKeys.includes("brand")` (page.tsx:19-20); `plugin-actions.ts`'s
  `brandBusiness()` helper (lines 27-35) re-derives the same check plus ownership
  (`BusinessProfile.userId === user.id`) for every write — no ownership check is
  shared/reused, consistent with the rest of the app (`rbac-guards.md` §3).
- **Machine-facing**: no user session at all; trust is entirely the per-site HMAC
  key (`authenticateTrackRequest`). A `DEACTIVATED` site is rejected outright
  (auth.ts:36-38).
- **Cron-facing**: `authorizeCron` (`cron/guard.ts`) — see §6 for the dev-open/
  prod-503-without-secret behavior.

## 8. Known edge cases

- Non-ILS orders are hard-rejected (422) with no conversion — a store billing in
  any other currency can never report attributed orders (`ingest.ts:112-114`).
- The plugin computes `isReferredProduct` by string-matching the click's stored
  landing URL against each line item's product slug/id/permalink
  (`class-bridgead-orders.php:157-172`); a customer who clicks a category/homepage
  link (not a single product page) will never get `isReferredProduct: true` for
  any line, so `PRODUCT_ONLY` scope programs would compute a $0 commissionable
  amount for those orders even though the order is correctly attributed.
  `WHOLE_CART` scope is unaffected.
- `recordClick`'s dedup window matches on `ipHash` alone within 30 seconds
  (`ingest.ts:44-53`) — two different visitors sharing a NAT/proxy IP who click
  within 30s of each other will have the second click silently dropped as a dup.
- Coupon attribution always wins over link/cookie attribution when both are
  present on the same order (`commission.ts:39-46`, loop order in
  `ingest.ts:140-158`), even if the visitor's actual last click was through a
  different creator's link — there is no timestamp-based "true last click"
  tie-break across creators sharing a store.
- A brand can pair the *same* `siteUrl` again (upsert) to rotate credentials, but
  changing the store's URL (e.g. domain migration) creates a **new** `TrackedSite`
  row rather than updating the existing one — historical clicks/orders stay on the
  old site id, and the plugin must be re-paired with a new token
  (`plugin-actions.ts:62-73`; no dedicated "update site URL" action exists).

## 9. Tech debt / TODOs in code

- `src/lib/partner-terms.ts:19-20` — platform fee percent is hard-coded to 10 with
  a comment `§12: TBD סופי` (final value still to be decided).
- `commission.ts` has no handling for `commissionType: FIXED` interacting with
  `commissionScope`/`commissionBasis` — a fixed-fee commission ignores both
  entirely (`computeCommission`, commission.ts:97-109), which is likely correct
  but is undocumented behavior, not an explicit design decision in code.
- `AttributedOrder.orderStatusRaw` accepts *any* string sent as `orderStatus`
  from the plugin (`orderPayloadSchema`, `schemas.ts:42`) with no enum validation
  server-side — `isStableOrderStatus` (`commission.ts:130-132`) only recognizes
  three lowercase values; any custom WooCommerce order status (common with
  subscription/booking plugins) can never be treated as "stable" and its PENDING
  commission never auto-approves via `runReconcile`.

## 10. Findings for the team lead

1. **The entire "maintenance window" safety valve is unreachable — `MaintenanceWindow` has zero write path anywhere in the app.** The read side is fully wired: `recordClick` marks a click `unverifiable` if it falls inside a declared window (`src/lib/track/ingest.ts:55-69`), and `runMonitor` skips the whole stale/offline alert cycle for a site with an open window (`src/lib/track/cron/monitor.ts:50`). But grepping `maintenanceWindow` across `src/` turns up exactly one `.create()`-shaped call site — there isn't one; the only write is the dev-seed route's `deleteMany` cleanup (`src/app/(frontend)/dev/seed-partner-dashboard/route.ts:108`). Worse, the customer-facing offline-alert email explicitly tells the business "if you declared a maintenance window, no action needed, the alert will close automatically" (`src/lib/track/notify.ts:123`) — a promise the product cannot keep today. On top of that, even if a window *could* be declared, the `AffiliateClick.unverifiable` flag it produces is written once (`ingest.ts:69`) and never read again anywhere in `src/` — not filtered out of `partner-dashboard.ts`'s click counts/conversion rate, not surfaced in any UI. Net effect: every real store maintenance window today gets a full `HEARTBEAT_ABSENT` alert → 36h grace → auto-pause of live partnerships, exactly the false-positive scenario this model was built to prevent.
2. **Self-purchase detection compares against the wrong site's data whenever a business has more than one connected store.** `runMonitor` computes the creator's "self-purchase" `customerHash` using the API key of *an arbitrary first* `TrackedSite` for the business (`prisma.trackedSite.findFirst({ where: { businessId }})`, `src/lib/track/cron/monitor.ts:160-167`), then feeds that single hash into `detectAnomalies` for every program on the business. But each `AttributedOrder.customerHash` is computed client-side by the plugin using *that specific site's own* `site_pepper()` (`hash('pepper:' . api_key)`, `wp-plugin/.../class-bridgead-api.php:47-50`, mirrored server-side in `src/lib/track/crypto.ts`/`sha256Hex`). Since `@@unique([businessId, siteUrl])` (`prisma/schema.prisma:1361`) explicitly allows a business to pair multiple stores, any order coming from a store other than whichever one `findFirst` happens to return will be checked against a pepper that doesn't match how its `customerHash` was derived — `SELF_PURCHASE` (schema.prisma:387) can silently never fire for those stores.
3. **`OrderCommissionStatus.ON_HOLD` has no writer anywhere in `src/`** despite being fully rendered in the dashboard (`ORDER_STATUS_LABEL.ON_HOLD`, `src/lib/partner-dashboard.ts:397`, `approveCommission`/`reverseCommission` both explicitly handle it as a valid starting state, `src/lib/track/ingest.ts:236,273`) and documented in the schema as "the brand paused a single commission for review — doesn't drain until resolved" (`prisma/schema.prisma:350`). This looks like the intended entry point for a per-order dispute action that queue item #10 (`disputes.md`) hasn't built yet — worth checking there rather than assuming it's dead like `ON_HOLD`'s siblings above.
4. Minor: `/api/cron/monitor` and `/api/cron/reconcile` silently no-op with 503 in production if `CRON_SECRET` is never set (`src/lib/track/cron/guard.ts:11-14`) — there's no startup check or alert for this, so the entire tracking-health/commission-approval pipeline could be dead in a production deploy with no signal beyond an ops team noticing 503s in cron logs.
