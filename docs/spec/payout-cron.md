# Spec: Payout checkpoints + reconcile + monitor

> status: documented · updated: 2026-10-01 · owning agent: payments-escrow

## 1. Business purpose

This is the automated back office of the revenue-share ("תשלום פר רכישה") partnership engine (`partner-programs.md`/`tracking-engine.md` territory for the creation/attribution side). Once a `PartnerProgram` is live, three unattended cron jobs keep it correct over time, with no human triggering any of them per-run:

- **`reconcile`** (daily, `03:15`) — matures `AttributedOrder`s from `PENDING` to `APPROVED` once their 14-day return window has passed, and closes out programs whose grace period has expired by refunding the advertiser's unused deposit.
- **`checkpoints`** (daily, `03:30`) — pays out, at each program's pre-declared payout dates, 100% of the commissions approved since the previous checkpoint to the creator/ad-space owner, with no retention.
- **`monitor`** (hourly, `0 * * * *`) — watches the WooCommerce tracking plugin's heartbeat per site, auto-pauses partnerships whose tracking has gone dark past a grace window, and runs anomaly detection over active programs.

Together they implement §5–§7 of the "תשלום פר רכישה" design doc referenced in the code comments (WP-2). This spec documents the cron layer itself — the money-movement bookkeeping (`Transaction`, `EscrowHold`) is shared with `payments.md`; order ingestion/attribution and anomaly scoring are `tracking-engine.md`/`anomaly-enforcement.md` territory and are only described here to the depth needed to understand what the cron jobs read and write.

## 2. Roles involved

No role interacts with these routes directly — they are invoked only by Vercel Cron (or manually with the right secret). Their *effects* are visible to:

- **Provider** (`CREATOR`/`AD_SPACE_OWNER`, `Contract.providerId`) — receives `COMMISSION_PAYOUT` transactions and sees checkpoint history (`PartnerCheckpoints`, read-only) in the contract room.
- **Brand** (`BRAND`, `Contract.businessId`) — pays `PLATFORM_FEE`, receives `DEPOSIT_REFUND`, and is notified when tracking goes offline or a partnership auto-pauses.
- **Admin** (`User.roles` has `ADMIN`) — is the intended audience for `TRACKING_OFFLINE` admin notifications (`notifyPartnership(..., "admin")`, `monitor.ts:103`), but see §10 finding 4.

## 3. User flow

There is no interactive user flow; this section describes the three jobs' control flow end to end.

**`reconcile` (`src/lib/track/cron/reconcile.ts:13-108`):**
1. Finds every `AttributedOrder` with `status: "PENDING"` and `orderPlacedAt` older than `COMMISSION_STABILITY_DAYS` (14 days, `partner-constants.ts:7`) (`reconcile.ts:21-24`).
2. For each, re-checks `isStableOrderStatus(orderStatusRaw)` (`src/lib/track/commission.ts:130`) — only orders whose last-known WooCommerce status is a "won't flip back" status are matured; others are silently left `PENDING` for the next day's run (`reconcile.ts:28`).
3. Calls `approveCommission(order.id)` (`src/lib/track/ingest.ts:233-263`) for each matured order: flips it to `APPROVED`, marks its `COMMISSION_ACCRUAL` transaction `SUCCESS`, and drains the program's deposit (`applyDeposiDrain`) — which may open the 80% gate or trigger an auto-pause at 100% and fire the corresponding notifications.
4. Separately, finds every `PartnerProgram` in `ACTIVE`/`GATE_80`/`PAUSED` whose `endDate` is past `DEPOSIT_REFUND_GRACE_DAYS` (14 days) **and** has no remaining `SCHEDULED` checkpoints (`reconcile.ts:35-54`) — i.e. every payout checkpoint has already run. For each, refunds whatever is left of the `EscrowHold` (`amountILS - drainedILS`) to the advertiser as a `DEPOSIT_REFUND` transaction, marks the hold `REFUNDED_TO_BRAND`, the program `CLOSED`, and the parent `Contract` `APPROVED`/`completedAt` (`reconcile.ts:64-101`).

**`checkpoints` (`src/lib/track/cron/checkpoints.ts:14-140`):**
1. `runDueCheckpoints` finds every `PayoutCheckpoint` with `status: "SCHEDULED"` and `scheduledFor <= now`, oldest first, and processes them one at a time, sequentially (`checkpoints.ts:124-140`).
2. `processCheckpoint` (one DB transaction per checkpoint, `checkpoints.ts:20-121`): sums `commissionAmount`/`platformFeeAmount` over every `AttributedOrder` with `status: "APPROVED"` and `payoutCheckpointId: null` for that program (i.e. everything approved since the previous checkpoint ran) — this is the checkpoint's `gross`.
3. `net = gross - carryInILS` (debt carried forward from a prior shortfall or a post-payout clawback, see §8). If `net < 0` the checkpoint is a **shortfall**.
4. Every matched order is stamped `PAID`/`paidAt`/`payoutCheckpointId = this checkpoint` regardless of whether `net` ends up positive (`checkpoints.ts:55-60`) — the orders are "spent" against this checkpoint even if the net payout after carry-in is zero or negative.
5. If `net > 0`: one `COMMISSION_PAYOUT` transaction to the provider for `net`, and (if `platformFee > 0`) one `PLATFORM_FEE` transaction charged to the business, both `status: SUCCESS` immediately (no settlement delay modeled) (`checkpoints.ts:62-87`).
6. If shortfall: the absolute value of the negative `net` is added to the **next** `SCHEDULED` checkpoint's `carryInILS` (`checkpoints.ts:90-101`) — see §8 for what happens when there is no next checkpoint.
7. The checkpoint itself is updated: `status` → `PAID` or `SHORTFALL`, `grossCommissionILS`, `paidILS = max(0, net)`, `processedAt`, `paidAt` (only if `net > 0`) (`checkpoints.ts:103-112`).

**`monitor` (`src/lib/track/cron/monitor.ts:21-180`), three independent passes every hour:**
1. **Heartbeat state machine** — for every `TrackedSite` in `ACTIVE`/`STALE` with no open `MaintenanceWindow` covering `now`: if `lastHeartbeatAt` is older than `HEARTBEAT_STALE_HOURS` (12h), check whether there were any `AffiliateClick`s for that business in the last `MONITOR_CLICK_LOOKBACK_HOURS` (24h). No recent clicks while `ACTIVE` → mark `STALE` and stop (not worth alarming over a quiet site). Recent clicks exist: `ACTIVE`→`STALE` the first time it's caught overdue; `STALE`→`OFFLINE` the next hour it's still overdue — which creates a `PluginAlert(type: HEARTBEAT_ABSENT, graceEndsAt: now + MONITOR_GRACE_HOURS)`, notifies the program's provider+brand ("both") and admins, and emails the business's billing contact (`monitor.ts:49-107`).
2. **Grace-period expiry → auto-pause** — every unresolved, not-yet-auto-paused `PluginAlert` (`HEARTBEAT_ABSENT` or `DEACTIVATED`) whose `graceEndsAt` has passed: every `ACTIVE`/`GATE_80` program for that business is force-`PAUSED` (`pauseReason: "tracking_offline"`), the alert is stamped `autoPausedAt`, and both parties are notified (`monitor.ts:111-137`).
3. **Anomaly scan** — for every `ACTIVE`/`GATE_80`/`PAUSED` program, builds the creator's own customer-hash (to catch self-purchases) and calls `detectAnomalies(programId, creatorCustomerHashes)` (`src/lib/track/anomaly.ts`, full detail is `anomaly-enforcement.md` territory) (`monitor.ts:140-177`).

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| API route | `src/app/api/cron/reconcile/route.ts` | `GET`, guarded by `authorizeCron`, calls `runReconcile()` |
| API route | `src/app/api/cron/checkpoints/route.ts` | `GET`, guarded by `authorizeCron`, calls `runDueCheckpoints()` |
| API route | `src/app/api/cron/monitor/route.ts` | `GET`, guarded by `authorizeCron`, calls `runMonitor()` |
| Guard | `src/lib/track/cron/guard.ts` | `authorizeCron` — `CRON_SECRET` bearer token or `x-vercel-cron` header; open in dev when `CRON_SECRET` unset |
| Job logic | `src/lib/track/cron/reconcile.ts` | `runReconcile` |
| Job logic | `src/lib/track/cron/checkpoints.ts` | `processCheckpoint`, `runDueCheckpoints` |
| Job logic | `src/lib/track/cron/monitor.ts` | `runMonitor` |
| Shared helpers | `src/lib/track/ingest.ts` | `approveCommission`, `reverseCommission`, `applyDeposiDrain` (gate/auto-pause side effects), `isStableOrderStatus` re-export |
| Shared helpers | `src/lib/track/commission.ts` | `isStableOrderStatus`, `proRateCommission` |
| Shared helpers | `src/lib/track/anomaly.ts` | `detectAnomalies` — `anomaly-enforcement.md` territory |
| Notifications | `src/lib/track/notify.ts` | `notifyPartnership` (in-app `Notification` rows, audience-scoped), `emailSiteAdminTrackingOffline` |
| Constants | `src/lib/partner-constants.ts` | `COMMISSION_STABILITY_DAYS`, `DEPOSIT_REFUND_GRACE_DAYS`, `HEARTBEAT_STALE_HOURS`, `MONITOR_GRACE_HOURS`, `MONITOR_CLICK_LOOKBACK_HOURS`, `PLATFORM_ABSORPTION_CEILING_PCT` (declared, unused — §9) |
| Constants | `src/lib/partner-terms.ts` | `FINAL_CHECKPOINT_GRACE_DAYS` (14d), `normalizeCheckpoints` (brief-time checkpoint-date normalization) |
| Schedule config | `vercel.json` | cron schedules: `monitor` hourly, `reconcile` `03:15`, `checkpoints` `03:30` (daily) |
| Checkpoint creation | `src/lib/actions/application-actions.ts:296-303` | `payoutCheckpoint.createMany` when a revenue-share application is accepted (one row per normalized date) |
| Checkpoint reschedule | `src/lib/actions/partner-actions.ts:140-186` (`topUpDeposit`) | pushes the `isFinal` checkpoint's `scheduledFor` out when the brand extends `endDate` during a gate-80 top-up |
| Read model | `src/lib/partner-dashboard.ts:270-279,404-408` | `PartnerCheckpointRow`, `nextCheckpoint`, `CHECKPOINT_STATUS_LABEL` — feeds the UI below |
| Component | `src/components/app/contract-room/partner-checkpoints.tsx` | Read-only checkpoint timeline in the contract room (next date + history) |
| Component (manual order decisions) | `src/lib/actions/partner-actions.ts:241-280` (`decideAttributedOrder`) | Brand's manual APPROVE/HOLD/REVERSE on a single `AttributedOrder`, independent of `reconcile` |

## 5. Data model

- **`PayoutCheckpoint`** (`prisma/schema.prisma:1422-1443`): `programId`, `sequence`, `isFinal`, `scheduledFor`, `status: CheckpointStatus`, `grossCommissionILS`, `reversalsILS` (declared, never written — see §9), `carryInILS`, `paidILS`, `processedAt`, `paidAt`. One row per program per declared payout date; the final row is always forced to `endDate + FINAL_CHECKPOINT_GRACE_DAYS` (14d) by `normalizeCheckpoints` (`partner-terms.ts:155-172`) regardless of what the brand typed in the brief.
- **`CheckpointStatus`** (`schema.prisma:356-360`): `SCHEDULED → PAID` (net ≥ 0) or `SCHEDULED → SHORTFALL` (net < 0). Both are terminal — a checkpoint is processed exactly once (`processCheckpoint` early-returns if `status !== "SCHEDULED"`, `checkpoints.ts:39-41`); there is no `SHORTFALL → PAID` recovery transition — the unrecovered debt only ever moves forward via `carryInILS` on a *different* row.
- **`AttributedOrder.status: OrderCommissionStatus`** (`schema.prisma:348-354`): `PENDING → APPROVED → PAID`, with `ON_HOLD` as a manual detour off `PENDING` and `REVERSED` reachable from any non-`PAID`-committed state. Checkpoints only ever claim orders in `APPROVED` with `payoutCheckpointId: null`; `reconcile` only ever matures `PENDING` orders (not `ON_HOLD` — see §8).
- **`PartnerProgram.drainedILS`** (`schema.prisma:1308`) — running total of `commissionAmount + platformFeeAmount` across all `APPROVED` orders, used by `applyDeposiDrain` (`tracking-engine.md` territory) to compute gate-80/auto-pause-at-100% against `requiredDepositILS`. Not touched by the checkpoint/reconcile crons directly, only read indirectly through order status transitions that happen *before* a checkpoint runs.
- **`EscrowHold`** (`schema.prisma:950-963`) — one per `Contract`, reused for the revenue-share deposit (`depositHoldId` on `PartnerProgram`). `reconcile`'s deposit-refund pass is the only writer that moves a hold to `REFUNDED_TO_BRAND` in this feature's scope.
- **`Transaction.type`** values written by this feature: `COMMISSION_PAYOUT`, `PLATFORM_FEE` (checkpoints), `DEPOSIT_REFUND` (reconcile), `COMMISSION_REVERSAL` (via `reverseCommission`, called from reconcile's digest-correction path and manual brand actions, not from the cron files themselves). `PLATFORM_ABSORPTION` is declared in the enum (`schema.prisma:174`) and commented as the mechanism for writing off unrecoverable tail debt up to a ceiling (`PLATFORM_ABSORPTION_CEILING_PCT`, `partner-constants.ts:30-34`) but **has zero write call sites anywhere in `src/`** — see §9/§10.
- **`PluginAlert`** (`schema.prisma:1462-1480`) — `monitor` is the only writer (`type`, `graceEndsAt`, `resolvedAt`, `autoPausedAt`); nothing in `src/` ever sets `resolvedAt` (no "tracking came back" resolution path found — see §8).
- **`Invoice`** (`schema.prisma:987-1007`) — read-only everywhere in `src/` (`src/lib/earnings.ts:131`, `src/lib/reports.ts:142` only call `findMany`); no `Transaction` written by this feature (or found anywhere else in the codebase) ever produces a matching `Invoice` row. Full detail belongs to `payments.md`; noted here because every money-moving transaction this spec documents (`COMMISSION_PAYOUT`, `PLATFORM_FEE`, `DEPOSIT_REFUND`) is affected.

## 6. API contracts

| Endpoint | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/api/cron/reconcile` | GET | `authorizeCron` | Returns `{ ok, approved, depositRefunds, refundedILS }` |
| `/api/cron/checkpoints` | GET | `authorizeCron` | Returns `{ ok, processed, paidILS }` |
| `/api/cron/monitor` | GET | `authorizeCron` | Returns `{ ok, markedStale, markedOffline, autoPaused, anomalies }` |

`authorizeCron` (`guard.ts:10-21`): if `env.CRON_SECRET` is unset, the route is open in any non-`production` `NODE_ENV` and returns `503` in production (fails closed when misconfigured). If set, accepts either `Authorization: Bearer <CRON_SECRET>` or the presence of an `x-vercel-cron` header — the latter is not cryptographically verified by the app itself; it relies entirely on the hosting platform (Vercel) stripping/setting that header only for its own cron-triggered requests. See §10 finding 5.

## 7. Guards & permissions

No end-user guard applies — these are machine-to-machine routes. The only access control is `authorizeCron` (§6). None of the three job functions (`runReconcile`/`runDueCheckpoints`/`runMonitor`) take a caller identity; they operate over every program/order/site in the relevant state, globally, with no tenant scoping needed since each query is already scoped by status/date.

## 8. Known edge cases

- **Shortfall/clawback with no later checkpoint to carry to is silently dropped.** Both the in-checkpoint shortfall path (`checkpoints.ts:90-100`, `nextCp` lookup) and the post-payout clawback path in `reverseCommission` (`ingest.ts:330-341`, same lookup pattern) only apply `carryInILS` if a `SCHEDULED` checkpoint still exists for that program. If the debt arises on/after the program's final checkpoint (already `PAID`/`SHORTFALL`, none `SCHEDULED` remain), the `COMMISSION_REVERSAL` transaction is still created (so the ledger shows the clawback happened) but nothing ever collects it — the creator keeps the money already paid, and no `PLATFORM_ABSORPTION` write exists to formally write it off either. See §10 finding 1.
- **Manual approval bypasses the stability check `reconcile` enforces.** `decideAttributedOrder` (`partner-actions.ts:256-260`) lets the brand `APPROVE` a `PENDING`/`ON_HOLD` order immediately, with no check against `isStableOrderStatus(orderStatusRaw)` — the 14-day/stable-status gate in `reconcile.ts:28` only applies to the *automatic* path. Intentional (brand's own call) but asymmetric with the cron's caution.
- **`ON_HOLD` orders are invisible to `reconcile`.** The query is `status: "PENDING"` only (`reconcile.ts:22`); an order a brand put `ON_HOLD` for review has no automatic timeout or revisit — it stays `ON_HOLD` forever until someone manually `APPROVE`s or `REVERSE`s it via `decideAttributedOrder`.
- **`PluginAlert.resolvedAt` has no writer.** `monitor.ts`'s auto-pause pass only ever reads alerts with `resolvedAt: null` and sets `autoPausedAt`; grep across `src/` finds no call site that ever sets `resolvedAt` on a `PluginAlert`. A site whose heartbeat comes back before the grace period expires still has its alert sit open forever (cosmetically harmless, since the grace-expiry query also filters `autoPausedAt: null` and would still fire once `graceEndsAt` passes even though tracking recovered — i.e. a since-recovered site can still get auto-paused).
- **Cron batch loops have no per-item error isolation.** `runDueCheckpoints`'s `for (const cp of due)` (`checkpoints.ts:135-138`), `runReconcile`'s two `for` loops, and `runMonitor`'s per-site/per-program loops all call into DB-writing logic with no `try/catch` per iteration. One throwing item (e.g. a transaction serialization conflict, a `findUniqueOrThrow` miss from a just-deleted row) aborts the whole run; because each job is scheduled once a day/hour, a single bad row can delay every other due checkpoint/order in that batch until the next scheduled run picks up where `status` left off (idempotent-ish, but no same-run retry/skip).
- **Orders are stamped `PAID` even when the checkpoint nets to zero.** Step 4 in §3 (`checkpoints.ts:55-60`) marks every matched order `PAID`/`payoutCheckpointId` regardless of whether `net > 0`. If a shortfall consumes the entire `gross`, the orders that generated that gross are already `PAID` with `paidILS = 0` net to the provider for this checkpoint — correct in net-ledger terms, but means `AttributedOrder.status === "PAID"` does not imply the provider actually received money for that specific order; `PayoutCheckpoint.paidILS` is the only place the real amount lives.

## 9. Tech debt / TODOs in code

- **`PayoutCheckpoint.reversalsILS` is declared but never written.** (`schema.prisma:1430`) — no code anywhere sets it; clawbacks are visible only via `carryInILS` on a different row and via the `COMMISSION_REVERSAL` transaction log, not on the checkpoint that absorbed them.
- **`TransactionType.PLATFORM_ABSORPTION` and `PLATFORM_ABSORPTION_CEILING_PCT` are fully unused** — the doc comment on the constant (`partner-constants.ts:30-33`) describes exactly the shortfall/clawback-with-no-checkpoint-left scenario in §8, but no write path implements it. Same shape of gap as `ProofOfPlay` in `deliverables.md`.
- No admin-facing view of cron run health exists (no `admin-dashboard.ts` reference to `payoutCheckpoint`/cron outcomes) — the only observability is the JSON response of each route, presumably visible only in Vercel's own cron/function logs.

## 10. Findings for the team lead

1. **Clawback debt with no remaining scheduled checkpoint is silently lost — no write-off, no collection.** (§8, §9) Both `processCheckpoint`'s shortfall carry and `reverseCommission`'s post-payout clawback only apply `carryInILS` if a `SCHEDULED` checkpoint still exists. Once a program's final checkpoint has already run, any further shortfall or reversal creates a `COMMISSION_REVERSAL` ledger entry that debits no one and is collected from no one — the creator keeps money that was, per the business logic, meant to be clawed back. The schema and constants (`PLATFORM_ABSORPTION`, `PLATFORM_ABSORPTION_CEILING_PCT`) show this was a designed-for case (platform absorbs up to a ceiling, the advertiser owes the rest), but none of it is implemented. Recommend either implementing the write-off/debt-collection path or explicitly deciding this risk is accepted and documenting it as such.
2. **`decideAttributedOrder`'s manual APPROVE skips the stability check `reconcile` enforces** (§8) — a brand can lock in a commission as `APPROVED` (and drain the deposit) on an order whose WooCommerce status (`orderStatusRaw`) is not yet "stable" (e.g. still cancellable), bypassing the 14-day safety window the automatic path respects. If that's intentional (brand's own risk to take), it's undocumented anywhere in the UI copy checked during this pass.
3. **`notifyPartnership(..., "admin")` for `TRACKING_OFFLINE` (`monitor.ts:103`) is a no-op in production today**, same root cause already flagged in `rbac-guards.md`: no production path grants `ADMIN`, so `notify.ts:78-79`'s `roles: { has: "ADMIN" }, status: "ACTIVE"` query returns nothing to notify. Concretely: when a tracked site goes `OFFLINE`, admins are never actually alerted, only the provider/brand and the billing-email recipient via `emailSiteAdminTrackingOffline`.
4. **`authorizeCron`'s `x-vercel-cron` bypass has no in-app verification** (§6) — it trusts the hosting platform to strip that header from external requests. Correct on Vercel today, but a latent gap if the app is ever deployed behind a different proxy/platform, or if `CRON_SECRET` is left unset in a production-like environment that isn't `NODE_ENV=production` (e.g. a preview deploy with real data) — the guard would then be fully open.
5. Minor: cron batch loops (`runDueCheckpoints`, `runReconcile`, `runMonitor`) have no per-item try/catch (§8) — one failing row can stall an entire day's/hour's worth of otherwise-independent work until the next scheduled run.
