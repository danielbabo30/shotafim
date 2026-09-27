# Spec: Revenue-share partnerships (PartnerProgram)

> status: documented · updated: 2026-09-27 · owning agent: partnerships-tracking

## 1. Business purpose

The "תשלום פר רכישה" (pay-per-purchase) model: instead of a fixed fee, a brand
pays a creator/ad-space owner a commission on every purchase attributed to
them, up to a pre-funded deposit held in trust. `PartnerProgram` is the
per-contract runtime state machine for one such deal — commission terms,
deposit balance, attribution codes (link + coupon), and payout schedule. It
only exists for contracts whose `Campaign.compensationModel` is
`REVENUE_SHARE` (`prisma/schema.prisma:1298-1335`), and it is the hinge
between the brief-time *declaration* of terms (`CampaignPartnerTerms`, set in
the campaign wizard — `campaigns.md`, already specced) and the *tracking
engine* that measures actual purchases (clicks/orders/attribution —
`tracking-engine.md`, queue #15, not yet specced) and the *anomaly/enforcement*
layer that polices it (`anomaly-enforcement.md`, queue #16). This spec covers
the `PartnerProgram` entity itself: its lifecycle, the deposit/gate/payout
mechanics, and the contract-room UI — not the click/order ingestion protocol
or the WooCommerce plugin, which belong to queues #15/#17.

## 2. Roles involved

- **`BRAND`** — declares partner terms at brief time (`campaigns.md`), funds
  the deposit (`fundPartnerDeposit`), tops it up at the 80% gate or after an
  auto-pause (`topUpPartnerDeposit`), and decides per-order commission holds
  (`decideAttributedOrder`). Referred to as `viewerParty: "brand"`
  throughout this code (`src/lib/partner-program.ts:53`).
- **`CREATOR`** / **`AD_SPACE_OWNER`** — the contract's `providerId`; earns
  the commission. Referred to as `viewerParty: "provider"`. Gets the same
  read-only dashboard as the brand (`getPartnerDashboard`,
  `src/lib/partner-dashboard.ts:12-19` doc comment: "שני הצדדים רואים את אותם
  מספרים").
- **Both parties** vote at the 80%-utilization gate
  (`submitGateChoice`, `src/lib/actions/partner-actions.ts:196-238`).
- **`ADMIN`** — the only role that can manually trigger a payout checkpoint
  (`triggerPayoutCheckpoint`, `partner-actions.ts:283-304`); in practice a
  cron does this (§3.4).

## 3. User flow

### 3.1 Terms declared, program created (upstream of this spec)
A brand declares partner terms in the campaign wizard when
`compensationModel === "REVENUE_SHARE"` — validated by `partnerTermsSchema`
(`src/lib/partner-terms.ts:89-153`) and persisted as `CampaignPartnerTerms`
(`src/lib/actions/campaign-actions.ts:70-145`, nested create on
`Campaign`). This step belongs to `campaigns.md` (already specced) and is
only summarized here as the source of the terms `PartnerProgram` copies.

When a brand accepts a `SUBMITTED` application on a `REVENUE_SHARE` campaign
(`acceptApplication`, `src/lib/actions/application-actions.ts:210-317` — see
`applications.md` §3.4, already specced), inside the same transaction that
creates the `Contract`:
1. `computeRequiredDepositILS` (`src/lib/partner-deposit.ts:32-36`) turns the
   declared terms into a required deposit: `costPerPurchase × estimatedPurchases
   × (1 + platformFeePct/100)`, where `costPerPurchase` is either the flat
   `commissionValue` (`FIXED`) or `commissionValue% × assumedAovILS`
   (`PERCENT`) (`partner-deposit.ts:27-30`).
2. `PartnerProgram` is created with `status: "PENDING_DEPOSIT"`
   (`application-actions.ts:260-282`), copying the terms verbatim, plus a
   freshly generated `refCode` (`generateRefCode`, `src/lib/partner-codes.ts:18-20`,
   format `BG` + 6 random unambiguous chars) and, if the attribution mode
   includes a coupon, a `couponCode` (`generateCouponCode`,
   `partner-codes.ts:26-33`, derived from the creator's name). Both are
   `@unique`; a `P2002` collision retries up to 5 times
   (`application-actions.ts:257-293`) — see §9 for what happens if all 5 fail.
3. `PayoutCheckpoint` rows are created from the terms' normalized checkpoint
   dates (`normalizeCheckpoints`, `partner-terms.ts:161-176`, which always
   appends a final checkpoint at `endDate + 14 days` — `FINAL_CHECKPOINT_GRACE_DAYS`,
   `partner-terms.ts:23`), one per date, `sequence` 1..N, last one
   `isFinal: true` (`application-actions.ts:296-307`).
4. A `LegalConsent` row (`documentType: "PARTNERSHIP_AGREEMENT"`) is written
   for **both** the brand's `userId` and the provider's `applicantId`
   (`application-actions.ts:310-316`) — unconditionally, not gated on step 2
   having actually produced a `program` (see §9/§10).

The link/coupon do not go live yet — `status: "PENDING_DEPOSIT"`.

### 3.2 Brand funds the deposit
On `/dashboard/contracts/[id]`, `PartnerProgramPanel` renders "הפקד ₪X
לנאמנות" for the brand while `status === "PENDING_DEPOSIT"`
(`src/components/app/contract-room/partner-program-panel.tsx:187-201`); the
provider instead sees "הלינק והקופון יופעלו לאחר שהמפרסם יפקיד..."
(`partner-program-panel.tsx:203-207`). Submitting calls `fundPartnerDeposit`
(`src/lib/actions/partner-actions.ts:30-93`), which — reusing the existing
escrow machinery rather than a partnership-specific table — creates an
`EscrowHold(HELD)` for `requiredDepositILS`, a `Transaction(PARTNERSHIP_DEPOSIT,
SUCCESS)`, flips `PartnerProgram.status → ACTIVE` with `depositHoldId` set,
and flips `Contract.status → ACTIVE`. Only from this point is the link/coupon
"live" (`LIVE_STATUSES = ["ACTIVE", "GATE_80"]`, `src/lib/track/ingest.ts:23`).

### 3.3 Program runs — clicks, orders, commission accrual (mechanics in tracking-engine.md)
While `ACTIVE`/`GATE_80`, clicks and attributed orders come in through the
WooCommerce plugin's webhook/digest endpoints (`recordClick`/`ingestOrder`,
`src/lib/track/ingest.ts:28-228` — full protocol is queue #15's scope). What
matters for `PartnerProgram`'s own state:
- Every order creates an `AttributedOrder(status: PENDING)` plus a
  `Transaction(COMMISSION_ACCRUAL, PENDING)` — no deposit effect yet.
- `PENDING → APPROVED` happens either by brand action
  (`decideAttributedOrder(decision="APPROVE")`,
  `partner-actions.ts:241-280`) or automatically by the `reconcile` cron once
  the order is 14 days old (`COMMISSION_STABILITY_DAYS`,
  `partner-constants.ts:7`) and its raw Woo status is "stable"
  (`runReconcile`, `src/lib/track/cron/reconcile.ts:21-31`).
- **Approval is the only thing that drains the deposit** —
  `approveCommission` (`ingest.ts:233-263`) calls `applyDeposiDrain`
  (`src/lib/track/drain.ts:31-110`) with `commissionAmount + platformFeeAmount`.
  `applyDeposiDrain` tracks `drainedILS` against the funded `EscrowHold`
  amount and:
  - crossing **80%** (upward, from `ACTIVE`) → `status: GATE_80` + opens a
    `PartnerGateEvent` (`drain.ts:87-98`) — see §3.5.
  - crossing **100%** (upward, from anything but `PAUSED`/`CLOSED`) →
    `status: PAUSED`, `pauseReason: "deposit_exhausted"`, closes any open
    gate event as `AUTO_PAUSED_100`, and — if the drain overshoots the
    deposit — increments `BusinessProfile.partnershipDebtILS` by the overage
    (`drain.ts:69-86`). See §10 finding 1: this debt is never repaid or
    enforced anywhere.
- A brand can instead `HOLD` a `PENDING` order (freezes it, no deposit
  effect, `decideAttributedOrder`) or `REVERSE` it at any point
  (`reverseCommission`, `ingest.ts:266-346`) — a full reversal zeroes the
  commission and, if it had been `APPROVED`, un-drains the deposit
  (negative delta, never re-opens a gate); if it had already been `PAID`
  (§3.4), the clawback is carried into the *next* scheduled checkpoint's
  `carryInILS` instead (`ingest.ts:330-341`).

### 3.4 Payout checkpoints
Each `PayoutCheckpoint` pays out, on its `scheduledFor` date, 100% of the
`APPROVED` orders accrued since the previous checkpoint (no retention) minus
any carried-in reversal debt (`processCheckpoint`,
`src/lib/track/cron/checkpoints.ts:14-121`): marks those orders `PAID`, creates
a `Transaction(COMMISSION_PAYOUT)` to the provider and a
`Transaction(PLATFORM_FEE)` to the brand's own user id (**not a fee taken
from the deposit — a separate bookkeeping entry**, see §10 finding 2), and
sets the checkpoint `status: PAID` (or `SHORTFALL` if the carried-in debt
exceeds this period's gross commission — the negative remainder rolls into
the *next* scheduled checkpoint's `carryInILS`, `checkpoints.ts:89-101`).
`runDueCheckpoints` (`checkpoints.ts:124-140`) is the cron entry point
(`src/app/api/cron/checkpoints/route.ts`); `triggerPayoutCheckpoint`
(§2) is the admin manual-trigger fallback.

### 3.5 The 80% gate — "decide together"
Once `GATE_80` opens, `PartnerProgramPanel` tells both parties "יש להחליט
יחד — להטעין ולהמשיך, או לעצור" (`partner-program-panel.tsx:209-247`) and
lets each submit `CONTINUE`/`STOP` once (`submitGateChoice`,
`partner-actions.ts:196-238`). See §10 finding 3 for what these choices
actually do — notably, the program keeps running and accruing commissions
at `GATE_80` regardless of either choice; only crossing 100% or the brand
topping up changes anything. `topUpPartnerDeposit`
(`partner-actions.ts:125-193`, brand-only) increases the `EscrowHold` amount
and `PartnerProgram.requiredDepositILS`, can extend `estimatedPurchases`/
`endDate` (re-scheduling the final checkpoint), sets `status` back to
`ACTIVE`, and resolves the open gate as `TOPPED_UP`.

### 3.6 Closure and deposit refund
The `reconcile` cron (`runReconcile`, `src/lib/track/cron/reconcile.ts:13-108`,
same cron as commission auto-approval, §3.3) also closes finished programs:
any `ACTIVE`/`GATE_80`/`PAUSED` program whose `endDate` is more than
`DEPOSIT_REFUND_GRACE_DAYS` (14) in the past, has a funded, still-`HELD`
deposit, and has **no remaining `SCHEDULED` checkpoints**, gets its
`EscrowHold → REFUNDED_TO_BRAND`, `PartnerProgram.status → CLOSED`, a
`Transaction(DEPOSIT_REFUND)` for any undrained remainder, and —
notably — its `Contract.status → APPROVED` (`reconcile.ts:64-101`). This is
the **only** place a `REVENUE_SHARE` contract's status ever changes after
`ACTIVE`; it never goes through `SUBMITTED_FOR_REVIEW`/`APPROVED` via the
normal deliverable flow (`contracts.md` §10 finding 1, already documented,
applies directly here).

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Route (embedded) | `src/app/(frontend)/(app)/dashboard/contracts/[id]/page.tsx` | Mounts `PartnerProgramPanel`/`PartnerDashboard` when `getPartnerProgramForContract` returns non-null |
| Component | `src/components/app/contract-room/partner-program-panel.tsx` | Status, deposit/utilization bar, live link+coupon, deposit/gate/top-up actions |
| Component | `src/components/app/contract-room/partner-dashboard.tsx` (+ `partner-metrics/checkpoints/orders-list/clicks-chart/event-journal/connected-sites.tsx`) | Read-only metrics dashboard, same data both parties |
| Fetcher | `src/lib/partner-program.ts` (`getPartnerProgramForContract`) | Contract-scoped program view for the panel |
| Fetcher | `src/lib/partner-dashboard.ts` (`getPartnerDashboard`) | Aggregated clicks/orders/checkpoints/sites for the dashboard |
| Pure/shared | `src/lib/partner-terms.ts` | Terms zod schema, labels, `normalizeCheckpoints`, `PARTNERSHIP_PLATFORM_FEE_PCT`, `FINAL_CHECKPOINT_GRACE_DAYS` — shared by campaign wizard + `acceptApplication` |
| Pure | `src/lib/partner-deposit.ts` | `computeRequiredDepositILS` |
| Pure | `src/lib/partner-codes.ts` | `generateRefCode`, `generateCouponCode` |
| Pure | `src/lib/partner-constants.ts` | Every tunable threshold/window for WP-2 (gate %, stability/grace days, heartbeat windows) |
| Action | `src/lib/actions/partner-actions.ts` | `fundPartnerDeposit`, `topUpPartnerDeposit`, `submitGateChoice`, `decideAttributedOrder`, `triggerPayoutCheckpoint` |
| Action (creation) | `src/lib/actions/application-actions.ts:210-317` (`acceptApplication`) | Creates `PartnerProgram` + `PayoutCheckpoint`s + `LegalConsent` on accept |
| Domain logic | `src/lib/track/drain.ts` (`applyDeposiDrain`) | Deposit drain + 80%/100% gate transitions |
| Domain logic | `src/lib/track/ingest.ts` | `approveCommission`/`reverseCommission` (drives drain); `recordClick`/`ingestOrder`/`processDigest` belong to `tracking-engine.md` |
| Cron | `src/lib/track/cron/checkpoints.ts` (`processCheckpoint`, `runDueCheckpoints`) → `src/app/api/cron/checkpoints/route.ts` | Payout processing |
| Cron | `src/lib/track/cron/reconcile.ts` (`runReconcile`) → `src/app/api/cron/reconcile/route.ts` | Commission auto-approval + program closure/deposit refund |
| Cron (out of scope) | `src/lib/track/cron/monitor.ts`, `guard.ts` → `src/app/api/cron/monitor/route.ts` | Heartbeat/anomaly monitoring — `anomaly-enforcement.md`, queue #16 |
| Notifications | `src/lib/track/notify.ts` (`notifyPartnership`) | In-app `Notification` rows (+ optional email) for gate/pause/accrual events |
| Dev seed | `src/app/(frontend)/dev/seed-partner-dashboard/route.ts` | Local test data |

No dedicated API route for the actions above — all are Next.js Server
Actions. The `/api/track/*` and `/api/plugin/*` routes that feed
`AffiliateClick`/`AttributedOrder` are `tracking-engine.md`'s file map, not
repeated here.

## 5. Data model

`PartnerProgram` (`prisma/schema.prisma:1298-1335`) — one row per
`REVENUE_SHARE` contract (`contractId @unique`):

| Field | Notes |
| --- | --- |
| `commissionType/Value/Basis/Scope`, `estimatedPurchases`, `assumedAovILS`, `attributionMode`, `destinationUrl`, `couponDiscountPct`, `startDate/endDate`, `payoutCheckpoints[]` | Copied verbatim from `CampaignPartnerTerms` at creation — immutable brief-time declaration (no counter-offer, `campaigns.md`) |
| `requiredDepositILS` | Computed once at creation (`computeRequiredDepositILS`); **increased** by `topUpPartnerDeposit`, never recomputed from terms afterward |
| `drainedILS` | Running total drained by approved (net of reversed) commissions; only mutated by `applyDeposiDrain` |
| `depositHoldId` | `EscrowHold.id` — reuses the fixed-fee escrow model rather than a dedicated deposit table |
| `refCode` (`@unique`) / `couponCode` (`@unique`?) | Attribution identifiers; generated once, never regenerated |
| `platformFeePct` | Snapshotted from `PARTNERSHIP_PLATFORM_FEE_PCT` (currently a hardcoded `10`, `partner-terms.ts:20`, marked "§12: TBD סופי" in its own comment) at creation time — so a future change to the constant does not affect in-flight programs |
| `topUpMode` | `MANUAL` default; `AUTO` exists in the enum but no code path ever sets or reads it as `AUTO` — see §8 |
| `status: ProgramStatus @default(PENDING_DEPOSIT)` | See transitions below |
| `pausedAt/pauseReason` | Set only by the 100%-drain auto-pause path; `topUpPartnerDeposit` clears both on resuming |

Relations: `contract` (1:1, `onDelete: Cascade`), `clicks: AffiliateClick[]`,
`orders: AttributedOrder[]`, `checkpoints: PayoutCheckpoint[]`,
`alerts: PluginAlert[]`, `gateEvents: PartnerGateEvent[]`,
`anomalyFlags: AnomalyFlag[]` (the last three are populated by
tracking/anomaly code outside this spec's scope, but live on this model).

`PayoutCheckpoint` (`schema.prisma:1422-1443`): `sequence`, `isFinal`,
`scheduledFor`, `status`, `grossCommissionILS`, `reversalsILS` (declared but
never written anywhere — see §9), `carryInILS`, `paidILS`.

`PartnerGateEvent` (`schema.prisma:1484-1500`): one row per gate opening
(re-openable after a top-up); `brandChoice`/`providerChoice`
(`GateChoice?`), `resolution` (free-text `"TOPPED_UP" | "STOPPED" |
"AUTO_PAUSED_100"`, not an enum despite having exactly 3 values).

### `ProgramStatus` transitions

```
—            ──(acceptApplication, REVENUE_SHARE)───────────► PENDING_DEPOSIT
PENDING_DEPOSIT ──(fundPartnerDeposit, brand)─────────────────► ACTIVE
ACTIVE       ──(applyDeposiDrain, drainedILS crosses 80%)─────► GATE_80
GATE_80      ──(topUpPartnerDeposit, brand)───────────────────► ACTIVE
ACTIVE/GATE_80 ──(applyDeposiDrain, drainedILS crosses 100%)──► PAUSED (+ BusinessProfile.partnershipDebtILS += overage)
PAUSED       ──(topUpPartnerDeposit, brand)───────────────────► ACTIVE
ACTIVE/GATE_80/PAUSED ──(runReconcile, endDate+14d passed, no SCHEDULED checkpoints left)──► CLOSED
```

`submitGateChoice`'s `STOP` choice never changes `PartnerProgram.status` by
itself — it only resolves the `PartnerGateEvent` (`resolution: "STOPPED"`);
the program stays `GATE_80` (still "live" per `LIVE_STATUSES`,
`ingest.ts:23`) until an actual 100% drain or a top-up. See §10 finding 3.

## 6. API contracts

None owned by this spec — all mutations are Next.js Server Actions
(`"use server"`), all reads are `cache()`-wrapped server-only fetchers. The
webhook/digest API contracts that feed `AttributedOrder`/`AffiliateClick`
(`/api/track/*`, HMAC-signed) belong to `tracking-engine.md`.

## 7. Guards & permissions

| Action/fetcher | Gate | Ownership check |
| --- | --- | --- |
| `getPartnerProgramForContract` | `requireActiveUser()` | `contract` query filters `business.userId === user.id OR providerId === user.id` (`partner-program.ts:60-64`) — returns `null` (not an error) for a non-party, indistinguishable from "no program" |
| `getPartnerDashboard` | `requireActiveUser()` | Same dual-party pattern (per doc comment, not independently re-verified in this pass) |
| `fundPartnerDeposit` / `topUpPartnerDeposit` / `decideAttributedOrder` | `requireActiveUser()` | Brand-only — query scoped to `business: { userId: user.id }` (`partner-actions.ts:37-38`, via `loadProgram(..., "brand")`, and inline in `decideAttributedOrder:250-251`) |
| `submitGateChoice` | `requireActiveUser()` | Either party — `loadProgram(..., "either")` (`partner-actions.ts:100-119`); which field (`brandChoice`/`providerChoice`) gets written is derived from `viewerParty`, not from the submitted form data, so a party cannot spoof the other's vote |
| `triggerPayoutCheckpoint` | `requireActiveUser()` + `user.roleKeys.includes("admin")` | No ownership scoping beyond the role check — any admin can trigger any checkpoint by id |

Same pattern as every other action-based feature in this codebase (see
`rbac-guards.md`): no shared `requireRole`/ownership helper, each action
hand-rolls its own `findFirst`-scoped query.

## 8. Known edge cases

- **`topUpMode: AUTO` is unreachable.** The enum has `MANUAL`/`AUTO`
  (`schema.prisma:324-327`), the field defaults to `MANUAL`, and no code
  anywhere sets it to `AUTO` or branches on its value — auto top-up (e.g.
  from a payment method on file) does not exist despite the schema modeling
  for it.
- **A brand can walk away from `PENDING_DEPOSIT` indefinitely.** There is no
  timeout/expiry on an unfunded `PartnerProgram` — the accepted application
  and its `Contract`/`PartnerProgram` sit in limbo (contract `AWAITING_ESCROW`
  the whole time, since only `fundPartnerDeposit` flips it to `ACTIVE`) with
  no reminder cadence beyond whatever generic contract-room UI exists.
- **`PayoutCheckpoint.reversalsILS` is declared but never written.** Reversal
  clawbacks against an already-`PAID` order go into the *next* checkpoint's
  `carryInILS` (`ingest.ts:330-341`) or, if the order was `APPROVED`
  but not yet paid, straight into `applyDeposiDrain`'s negative delta — the
  dedicated `reversalsILS` column that `processCheckpoint` even destructures
  space for in its return type comment is dead.
- **`decideAttributedOrder`'s `HOLD`→re-`HOLD` and other same-state
  transitions are guarded**, but there's no way for the brand to *undo* a
  `HOLD` back to a clean `PENDING` without also being able to `APPROVE`
  it directly — functionally fine (approve is the only exit anyway), just
  worth noting there's no explicit "release hold" action, only
  approve/reverse from the held state.

## 9. Tech debt / TODOs in code

- **`acceptApplication`'s `LegalConsent.createMany` is not guarded by the
  `PartnerProgram` creation actually succeeding**
  (`src/lib/actions/application-actions.ts:296-316`): if all 5 `refCode`/
  `couponCode` collision retries fail (astronomically unlikely with 32^6
  combinations, but not impossible), `program` stays `null`, the
  `if (program)` block skips creating `PayoutCheckpoint`s, but the very next
  statement — outside that guard — still writes two
  `LegalConsent(PARTNERSHIP_AGREEMENT)` rows and the outer transaction
  commits a `REVENUE_SHARE` `Contract` with **no** `PartnerProgram` at all.
  `getPartnerProgramForContract` would then return `null` for that contract
  (indistinguishable from "not revenue-share"), and `fundPartnerDeposit`
  would reject with "לחוזה זה אין תוכנית שותפות" — the contract is
  permanently stuck `AWAITING_ESCROW` with no recovery path and a legal
  consent record on file for an agreement that was never created.
- **`LegalConsent(PARTNERSHIP_AGREEMENT)` is written for both parties with no
  UI ever presenting the agreement or collecting an explicit action from
  either of them** (`application-actions.ts:310-316`) — the only accepting
  action either party takes is the brand's `acceptApplication` click; the
  provider never clicks anything at this step (their application was
  already `SUBMITTED` earlier). Same shape of issue already flagged for
  registration consent in `registration.md` §10 ("Google sign-up has no
  consent checkbox but `completeRegistration` records consent for every
  provider anyway").
- **`PARTNERSHIP_PLATFORM_FEE_PCT` is a hardcoded module constant
  (`partner-terms.ts:20`)**, explicitly commented "§12: TBD סופי; ברירת מחדל
  10" (TBD final value, default 10) — there is no admin/config surface to
  change it; changing the constant in code only affects newly-created
  programs (existing ones keep their snapshotted `platformFeePct`).

## 10. Findings for the team lead

1. **`BusinessProfile.partnershipDebtILS` is incremented but never enforced
   or repaid anywhere** (`src/lib/track/drain.ts:69-86` is the only writer
   in `src/`). The schema's own comment
   (`prisma/schema.prisma:520`: "חוב חריגת פיקדון פתוח — > 0 חוסם פתיחת
   קמפיינים חדשים", i.e. "> 0 blocks opening new campaigns") describes a
   product rule that does not exist in `campaign-actions.ts` or anywhere
   else — a brand whose partnership overshoots its deposit at auto-pause
   accrues real debt with zero consequence and zero way to pay it down.
   This is the same class of gap as the already-documented
   `CampaignStatus.CANCELLED` (no writer) and `ProofOfPlay` (no writer)
   findings — a modeled business rule with no code behind it, but here it's
   specifically a **financial exposure**, not just a UX dead end.
2. **The platform fee on a payout checkpoint is booked as a separate
   `Transaction(PLATFORM_FEE)` to the brand's own account, not deducted from
   the deposit or the payout** (`src/lib/track/cron/checkpoints.ts:74-86`).
   The deposit itself (via `requiredDepositILS`/`computeRequiredDepositILS`)
   was sized to *include* the platform fee pool
   (`partner-deposit.ts:32-36`: `commissionPool × (1 + feePct/100)`), and
   `applyDeposiDrain` drains `commissionAmount + platformFeeAmount` together
   per approved order (`ingest.ts:246-250`) — so the fee *is* drained from
   the deposit at approval time. But at payout, `processCheckpoint` computes
   `net = gross − carryIn` (gross = commission only) and pays that to the
   provider, while separately recording the fee total as a same-side
   `Transaction` to the brand with no actual money movement tied to it
   (it's already inside the deposit that was funded and drained). Worth
   confirming with whoever owns the ledger semantics whether this
   double-bookkeeping (`PLATFORM_FEE` transaction with no corresponding
   transfer) is intentional reporting or a real gap in how the platform
   actually collects its cut.
3. **The 80% gate's "עצור" (Stop) choice does not stop anything**
   (`src/lib/actions/partner-actions.ts:196-238`,
   `src/lib/track/drain.ts:87-98`). The UI tells both parties "יש להחליט
   יחד — להטעין ולהמשיך, או לעצור" (decide together — top up and continue,
   or stop), but: (a) the program keeps accruing commissions at `GATE_80`
   regardless of either party's choice — only reaching 100% drain (auto-pause)
   or a brand top-up changes `status`; (b) **one** party choosing `STOP`
   unilaterally resolves the gate event as `"STOPPED"` even if the other
   party chose `CONTINUE` (`brandChoice === "STOP" || providerChoice ===
   "STOP"`, `partner-actions.ts:223-228`) — there's no actual mutual-consent
   requirement despite the copy, and resolving the gate as `STOPPED` has no
   further effect on the program (no pause, no notification distinct from
   the generic `DEPOSIT_LOW` one already sent). A user who clicks "עצור"
   expecting the partnership to halt is not told that it keeps running.
   Worth a product decision either way — right now this is a no-op button
   with misleading copy.
