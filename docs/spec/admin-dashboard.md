# Spec: Admin dashboard

> status: documented · updated: 2026-10-02 · owning agent: private-area

## 1. Business purpose

Gives the `ADMIN` role a single landing surface to (a) monitor system health — WooCommerce
plugin/site tracking status, webhook-digest reconciliation gaps, stuck pending orders
(`src/lib/admin-dashboard.ts`); (b) arbitrate disputes between contract parties
(`src/lib/disputes.ts` + `resolveDispute`); (c) issue moderation/enforcement actions
(warn/fine/suspend/ban) against a user (`issueEnforcement`); and (d) triage anomaly flags raised
by the partnership-tracking engine (`resolveAnomalyFlag`). There is **no dedicated
`/dashboard/admin/**` route** — admin capability today is "the same `/dashboard` and
`/dashboard/disputes/**` URLs regular users see, with different content and gating for the admin
role," not a separate admin app section.

Out of scope for this spec (different auth model / different admin concept entirely):
- Payload CMS admin panel at `/admin` (`src/app/(payload)/**`) — content editors, not platform
  `ADMIN` users.
- The WooCommerce plugin's own WordPress admin settings screen
  (`wp-plugin/bridgead-woo/includes/class-bridgead-settings.php:16`, registered via WordPress's
  `admin_menu` hook) — this is the *merchant's* own WordPress admin, unrelated to this app's
  `UserRole.ADMIN`. `src/lib/track/notify.ts:103`'s `emailSiteAdminTrackingOffline` and its email
  copy ("לוח הבקרה של WordPress → תוספים → BridgeAd") refer to this, not to the surface documented
  here — easy to misread on a function-name skim.

## 2. Roles involved

Only `ADMIN` (`UserRole` enum, `prisma/schema.prisma:27-32`). **No production code path grants
`ADMIN` to a real user** — `registration.md` excludes it from self-selection, and no
admin-invite/promote action exists anywhere in `src/lib/actions`. The only way to obtain an admin
session today is `src/app/(frontend)/dev/login/route.ts` (dev-only, 404s outside
`NODE_ENV=development`, lines 29/68-84: `?role=admin` sets
`roles: ["BRAND","CREATOR","AD_SPACE_OWNER","ADMIN"]` on the seeded dev user) or direct DB
manipulation. This was already flagged in `rbac-guards.md` §10 finding 1; still true as of this
pass — see §10.

## 3. User flow

**Entry point — `/dashboard` itself, not a separate URL.**
`src/app/(frontend)/(app)/dashboard/page.tsx:10-26` calls `requireActiveUser()`, then branches
purely on `user.activeRole`: `"brand"` → `BrandDashboard`, `"space"` → `SpaceDashboard`,
`"creator"` → `CreatorDashboard`, and the **unconditional `else` branch (line 25)** → `AdminDashboard`.
There is no explicit `requireAdmin()`/`roleKeys.includes("admin")` check on this page — it relies
on `activeRole: RoleKey` (`src/lib/app-user.ts:25`) being one of exactly four string literals
(`src/lib/app-nav.ts:9`), so the `else` is only reachable with `"admin"` today, but the gate is
implicit (by elimination) rather than the explicit pattern every other admin surface uses. See §8.

From the admin landing page (`AdminDashboard`, `src/components/app/dashboard/admin/admin-dashboard.tsx`):
1. **KPI row** — open disputes, sites with a monitoring issue, open plugin alerts, open anomaly
   flags (lines 40-74).
2. **Site health panel** — up to 12 most-recently-updated non-`ACTIVE` `TrackedSite` rows, with
   status badge and open-alert count (lines 77-111).
3. **Dispute queue preview** — up to 6 open disputes, links to `/dashboard/disputes` (lines
   113-150).
4. **Webhook-digest mismatch list** — sites where the nightly reconciliation found orders in the
   merchant's digest that never arrived via webhook (lines 152-175).
5. **Open anomaly-flag list** — up to 8, each with an inline "mark resolved" button
   (`ResolveAnomalyButton`, lines 177-210).

From **`/dashboard/disputes`** (`src/app/(frontend)/(app)/dashboard/disputes/page.tsx:16`,
`requireAdmin()`-gated): a table of all disputes, open first, linking into:

**`/dashboard/disputes/[id]`** (`.../disputes/[id]/page.tsx:23`, `requireAdmin()`-gated): full
case file — description, evidence (partner-program stats + checkpoints if revenue-share,
connected-site health, open anomaly flags, audit-log event feed), dispute message protocol, and
two action forms in the sidebar:
- **`ResolveDisputeForm`** (open disputes only) → `resolveDispute` action → sets
  `Dispute.status`, closes the linked `Contract` (`APPROVED`/`REFUNDED`), releases/refunds the
  `EscrowHold`.
- **`EnforcementForm`** (always available) → `issueEnforcement` action → records an
  `EnforcementAction` against one of the dispute's two parties (warning/fine/suspend/ban),
  penalizes their `reliabilityScore`, and for `SUSPENSION`/`BAN` writes `User.status`.

Anomaly flags also surface inline on the dispute detail page with the same
`ResolveAnomalyButton` used on the landing page.

**Not reachable from any page:** `triggerPayoutCheckpoint`
(`src/lib/actions/partner-actions.ts:283-304`) — an admin-only manual trigger for a revenue-share
payout checkpoint (normally cron-driven, `src/app/api/cron/checkpoints/route.ts`). The action
exists and is correctly gated (see §7), but no component anywhere calls it — confirmed by
repo-wide search of `src/components` and `src/app` for its name. It is dead code from the UI's
perspective today.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Route (landing, implicit gate) | `src/app/(frontend)/(app)/dashboard/page.tsx:10-26` | Renders `AdminDashboard` on the `else` branch of the `activeRole` if-chain — no explicit admin check on this file |
| Route (dispute queue) | `src/app/(frontend)/(app)/dashboard/disputes/page.tsx:16` | `requireAdmin()` |
| Route (dispute detail) | `src/app/(frontend)/(app)/dashboard/disputes/[id]/page.tsx:23` | `requireAdmin()` |
| Component | `src/components/app/dashboard/admin/admin-dashboard.tsx` | `AdminDashboard({ user })` — landing page body |
| Component | `src/components/app/dispute/resolve-dispute-form.tsx` | Dispute resolution radio form |
| Component | `src/components/app/dispute/enforcement-form.tsx` | Warn/fine/suspend/ban form |
| Component | `src/components/app/dispute/resolve-anomaly-button.tsx` | One-click anomaly resolve |
| Component (not admin) | `src/components/app/dispute/dispute-button.tsx` | Non-admin "open dispute" entry point, included for the lifecycle picture |
| Shared components (reused, not admin-exclusive) | `src/components/app/dashboard/kpi-card.tsx`, `src/components/app/dashboard/dashboard-header.tsx` | |
| Fetcher | `src/lib/admin-dashboard.ts` (`getAdminDashboardData`, `cache()`-wrapped, line 69) | Site health, alerts, stuck orders, dispute/anomaly summaries |
| Fetcher | `src/lib/disputes.ts` (`getDisputeQueue` line 138 `cache()`-wrapped · `getDisputeDetail(id)` line 235, not cached — per-id param) | Dispute queue + full case evidence |
| Action | `src/lib/actions/dispute-actions.ts` (`resolveDispute` line 96, `issueEnforcement` line 173, `resolveAnomalyFlag` line 261) | All `requireAdmin()`-gated writes |
| Action (orphaned) | `src/lib/actions/partner-actions.ts` (`triggerPayoutCheckpoint` lines 283-304) | Admin-gated but hand-rolled check, no UI caller |
| Guard | `src/lib/admin-guard.ts:9-15` (`requireAdmin`) | Wraps `requireActiveUser()` + `roleKeys.includes("admin")`, `redirect("/dashboard")` on failure |
| Nav metadata | `src/lib/app-nav.ts:111-123` (`ROLE_META.admin`) | Admin sidebar — see §8 for two broken/misleading entries |

**Disambiguation, not an admin surface:** `src/components/app/contract-room/partner-dashboard.tsx`
and its siblings (`partner-metrics.tsx`, `partner-checkpoints.tsx`, `partner-orders-list.tsx`,
`partner-connected-sites.tsx`, `partner-clicks-chart.tsx`, `partner-event-journal.tsx`,
`order-decision-buttons.tsx`) are the per-contract revenue-share metrics view shown to the
business/provider themselves inside their own contract room
(`dashboard/contracts/[id]/page.tsx:109`), gated by contract-room ownership — not `requireAdmin()`.
`docs/spec/code-map.md:21` lists its fetcher (`partner-dashboard`) right next to `admin-dashboard`
in the "Dashboards" bullet, which invites confusing the two; they are unrelated screens.

## 5. Data model

No new models beyond what `rbac-guards.md` §5 and `data-model.md` already list. Fields/enums this
feature actually writes or reads:

- `User.status: UserStatus` (`PENDING_ONBOARDING · ACTIVE · SUSPENDED · BANNED`,
  `prisma/schema.prisma:34-39,412`) — `issueEnforcement` writes `SUSPENDED`
  (`dispute-actions.ts:221`) and `BANNED` (`dispute-actions.ts:224`). **This closes a gap
  `data-model.md:27-29` flagged as "no writer found anywhere in `src/`"** — the writer exists, it
  just lives in the enforcement action rather than a standalone "suspend user" screen. See §10 for
  the cross-spec update this implies.
- `Dispute.status: DisputeStatus` (`OPEN · UNDER_ARBITRATION · RESOLVED_REFUND · RESOLVED_PAYOUT ·
  SPLIT`, `prisma/schema.prisma:232-238`) — `resolveDispute` transitions `OPEN`/`UNDER_ARBITRATION`
  → one of the three `RESOLVED_*`/`SPLIT` terminal states (`dispute-actions.ts:96-168`), also
  writes `Dispute.arbitratorId`, `resolutionNotes`, `resolvedAt`, and cascades to
  `Contract.status` (`APPROVED` or `REFUNDED`) and `EscrowHold.status`.
- `EnforcementAction` (`prisma/schema.prisma:1521-1538`): `targetUserId`, `type: EnforcementType`
  (`WARNING · FINE · SUSPENSION · BAN`), `reason`, optional `disputeId`/`amountILS`,
  `issuedByAdminId`, and an `expiresAt: DateTime?` field that **is defined in the schema but never
  set by `issueEnforcement` and never read anywhere in `src/`** — see §8.
- `AnomalyFlag.resolvedAt` (`prisma/schema.prisma:1503-1518`) — set by `resolveAnomalyFlag`
  (`dispute-actions.ts:261-279`); otherwise only ever created by the tracking engine
  (`anomaly-enforcement.md` territory), never auto-resolved.
- `CreatorProfile.reliabilityScore` / `AdSpaceOwnerProfile.reliabilityScore` — decremented by
  `RELIABILITY_PENALTY[type]` (`dispute-actions.ts:~26-31`: `WARNING: 5, FINE: 10, SUSPENSION: 25,
  BAN: 50`) inside `issueEnforcement`, floored at 0.
- `AuditLog` rows written by all three admin actions (`dispute.resolved`, `enforcement.issued`,
  `anomaly.resolved`) — read back by `getDisputeDetail`'s event-log aggregation.

**No status transition exists for either of these, despite the schema supporting it:**
- `User.status`: `SUSPENDED`/`BANNED` → `ACTIVE` — **no reinstatement path anywhere in `src/`**.
  Once `issueEnforcement` suspends or bans a user, nothing ever reverses it; the unused
  `EnforcementAction.expiresAt` field strongly implies a "temporary suspension" feature was
  intended but never built (see §8).
- `ProfileStatus` (`ACTIVE/SUSPENDED/INACTIVE`, `prisma/schema.prisma:42-46`) and
  `VerificationStatus` (`PENDING/VERIFIED/REJECTED`, `prisma/schema.prisma:49-53`) on
  `BusinessProfile`/`CreatorProfile`/`AdSpaceOwnerProfile` — **zero writers anywhere in `src/`**
  outside dev-seed fixtures (only reads: `src/lib/marketplace-query.ts:82`,
  `src/lib/creator-profile.ts:134`, `src/lib/ad-spaces.ts:364`, `src/lib/applications.ts:141,146`).
  `campaigns.md` and `marketplace.md` both already noted "no admin surface found... likely
  `admin-dashboard.md`" for this; this pass confirms the admin dashboard still doesn't implement it
  — see §8/§10.
- `UserBlockReport` (`prisma/schema.prisma:1249-1265`, `BlockReportReason`/`BlockReportStatus`
  enums) — a user-reports-another-user model with **zero read or write call sites anywhere in
  `src/`**. Completely unimplemented, same shape as `ProofOfPlay` in `deliverables.md` §10.

## 6. API contracts

Not applicable — every admin action in this feature is a Server Action, not a route handler. No
route under `src/app/api/**` checks `requireAdmin()` or any `ADMIN`-role condition (confirmed by
reviewing every route). The data this feature displays is partly fed by infra cron endpoints that
are *not* user-admin-gated: `src/app/api/cron/{monitor,reconcile,checkpoints}/route.ts`, gated
instead by `authorizeCron()` (`src/lib/track/cron/guard.ts:9-18`, bearer `CRON_SECRET` or Vercel's
`x-vercel-cron` header) — a different, infra-level authorization boundary.

## 7. Guards & permissions

| Guard | Checks | On failure |
| --- | --- | --- |
| `requireAdmin()` (`src/lib/admin-guard.ts:9-15`) | `requireActiveUser()` + `roleKeys.includes("admin")` | `redirect("/dashboard")` |
| `/dashboard` landing page (`dashboard/page.tsx:10-26`) | **No explicit admin check** — reaches `AdminDashboard` via `else` after ruling out `"brand"/"space"/"creator"` | n/a — type-level only |
| `triggerPayoutCheckpoint` (`partner-actions.ts:287-290`) | Inline `requireActiveUser()` + `roleKeys.includes("admin")`, hand-rolled (not `requireAdmin()`) | Returns `{ status: "error" }`, no redirect — the only admin check in the codebase that doesn't reuse `requireAdmin()` |
| `resolveDispute` / `issueEnforcement` / `resolveAnomalyFlag` | `requireAdmin()` at top of each | `redirect("/dashboard")` |
| `resolveDispute` / `resolveAnomalyFlag` resource lookup | Plain `findUnique({ where: { id } })`, no ownership scoping — correct here since any admin may act on any case (per `rbac-guards.md` §3's documented convention) | `{ status: "error", message: "...לא נמצא/נמצאה" }` |
| `issueEnforcement` target selection | Not scoped at all beyond "is a party listed on this dispute" — the `EnforcementForm`'s `parties` prop is populated only from the current dispute's two contract parties (`disputes/[id]/page.tsx:30-33`) | n/a — see §8, this is a feature gap, not a broken check |

## 8. Known edge cases

- **The `/dashboard` admin branch has no explicit gate.** Every other admin surface calls
  `requireAdmin()`; the landing page instead falls through an `if (activeRole === ...)` chain and
  treats "none of brand/space/creator" as "show the admin view" (`dashboard/page.tsx:13-25`).
  `activeRole: RoleKey` is a 4-member string union so this is provably safe today, but it's a
  different, implicit pattern from the rest of the codebase's explicit-gate convention — a future
  5th role would silently start seeing the admin dashboard unless this file is updated too.
- **Two dead/misleading entries in the admin sidebar** (`src/lib/app-nav.ts:111-123`):
  - `/dashboard/verifications` ("אימות פרופילים" — profile verification) — **the route does not
    exist anywhere in `src/app`.** Clicking it 404s. This matches §5's finding that
    `VerificationStatus` has no writer or UI at all.
  - `/dashboard/reports` ("דוחות מערכת" — "system reports") — the route exists, but it's the
    generic per-user financial ledger page (`src/app/(frontend)/(app)/dashboard/reports/page.tsx:21-23`,
    `getReportsData(user.id)`, no role check per `rbac-guards.md` §3/§10 finding 2), not a
    system-wide report. An admin visiting it sees their own (likely empty) escrow/invoice history,
    not platform-wide stats — those actually live on `/dashboard` via `getAdminDashboardData()`.
    The nav label overpromises what the link delivers.
- **No general-purpose user moderation.** `issueEnforcement`'s only UI entry point
  (`EnforcementForm`) is on the dispute detail page, and its target-user dropdown is populated
  exclusively from that dispute's two parties (`disputes/[id]/page.tsx:30-33`). An admin cannot
  warn/fine/suspend/ban any user who isn't currently a party to an open dispute — there is no
  user-list/search screen anywhere (confirmed: no `prisma.user.findMany` call site in `src/`
  outside `src/lib/track/notify.ts:78` building the admin-notification recipient set).
- **No reinstatement path.** Once `issueEnforcement` sets `User.status` to `SUSPENDED` or
  `BANNED`, nothing in `src/` ever sets it back to `ACTIVE` (the only `ACTIVE` writer for `User`
  is `completeRegistration`, `registration-actions.ts:96`, which only runs once at signup).
  `EnforcementAction.expiresAt` exists in the schema specifically shaped for "this penalty lifts
  on its own," but is never populated by `issueEnforcement` and never read by anything — a
  temporary-suspension feature that was designed into the schema and never built.
- **Partial, inconsistent `PluginAlert` resolution.** Only `HEARTBEAT_ABSENT` alerts auto-resolve,
  and only when the site's heartbeat resumes (`src/app/api/plugin/heartbeat/route.ts:32-37`,
  `resolvedAt: now`). `WEBHOOK_MISMATCH` and `DEACTIVATED` alerts have **no resolution path at
  all** — not automatic, not admin-triggered — so a webhook-mismatch alert shown in the admin
  dashboard's "פערים בין digest להזמנות" panel (`admin-dashboard.tsx:152-175`) stays there forever,
  even after the underlying discrepancy is manually reconciled.
- **`triggerPayoutCheckpoint` is unreachable.** Correctly admin-gated, but no button/form anywhere
  calls it — a normally-cron-driven action that was apparently meant to have a manual override and
  never got wired to the UI.

## 9. Tech debt / TODOs in code

No `TODO`/`FIXME` comments found in any file this feature touches. Structural debt instead:
- `triggerPayoutCheckpoint`'s hand-rolled `roleKeys.includes("admin")` check
  (`partner-actions.ts:287-290`) duplicates `requireAdmin()` with a different failure mode (typed
  error vs. redirect) — should call `requireAdmin()` like every other admin action, both for
  consistency and because it would make the duplication impossible to miss.
- The admin dashboard's data fetcher (`admin-dashboard.ts`) and the dispute fetcher
  (`disputes.ts`) cross-import each other's metadata maps (`SITE_STATUS_META`/`PLUGIN_ALERT_META`
  from the former, `ANOMALY_SEVERITY_META`/`ANOMALY_TYPE_META` from the latter) rather than a
  shared constants module — works today, but the split is arbitrary (both are "admin dashboard
  domain" concerns) and will fight anyone trying to find "where is this label defined."

## 10. Findings for the team lead

1. **No user-management or profile-verification screen exists, despite the nav already
   advertising one.** `/dashboard/verifications` is wired into the admin sidebar
   (`src/lib/app-nav.ts:119`) but the route doesn't exist — a 404 for every admin user who clicks
   it. `VerificationStatus` (`PENDING → VERIFIED/REJECTED`) has zero writers anywhere in `src/`.
   This is the single biggest gap in "admin dashboard" as a feature: today it covers dispute
   arbitration, enforcement, and plugin/anomaly monitoring, but has no way to verify a business/
   creator/ad-space-owner profile, browse/search users, or moderate a user who isn't already a
   party to an open dispute.
2. **Two specs now need a correction, not just a cross-reference.** `rbac-guards.md` §3/§10
   states "the only two admin-gated screens that exist... are the dispute queue" and frames
   `User.status → SUSPENDED/BANNED` as having "no writer found anywhere in `src/`"
   (`data-model.md:27-29`). Both are now stale: the admin-gated surface grew to include the full
   `/dashboard` landing page, and `issueEnforcement` (`dispute-actions.ts:173-259`) does write
   `SUSPENDED`/`BANNED`. Recommend a follow-up edit to both files' affected lines rather than
   leaving two specs that visibly disagree with this one. (This run updated `data-model.md`'s
   summary table and `code-map.md`'s fetcher index directly — see those files' diffs — but did not
   rewrite `rbac-guards.md`'s prose, since touching another feature's spec body is arguably out of
   this run's one-feature scope; flagging instead of unilaterally editing it.)
3. **`EnforcementAction.expiresAt` is a dead field implying an unbuilt feature.** The schema
   models temporary suspensions; the code only ever does permanent ones with no reinstatement
   path at all. Worth deciding explicitly: either build auto-expiry + a manual reinstatement
   action, or drop the field so the schema doesn't promise something the product doesn't do.
4. **`triggerPayoutCheckpoint` is dead code from the UI's perspective** — correctly gated, never
   called by anything. Either wire it into an admin screen (e.g. next to the payout-checkpoint
   list once `payout-cron.md`'s admin surface, if any, is built) or remove it.
5. **`WEBHOOK_MISMATCH`/`DEACTIVATED` `PluginAlert`s never resolve** — only `HEARTBEAT_ABSENT`
   auto-resolves on heartbeat recovery. The admin dashboard's "digest gap" panel will accumulate
   indefinitely with no way to clear an entry once it's been manually investigated and reconciled.
6. **`UserBlockReport` is entirely unimplemented** (no create path for a user to report another,
   no admin review screen) — same "schema exists, feature doesn't" pattern as `ProofOfPlay`
   (`deliverables.md` §10). Not currently advertised anywhere in the UI (unlike the verifications
   nav link), so lower urgency, but worth confirming whether it's planned or should be removed
   from the schema.
7. **Process note, not a code finding.** As of this run, 10 open, unmerged spec PRs (#17–#26,
   covering queue items #9–#18) already exist against `private-area-foundation`, none merged —
   same unmerged-backlog pattern `INDEX.md`'s 2026-09-21 cleanup note and `rbac-guards.md` §10
   finding 4 both already flagged for the first 8 queue items. This run checked GitHub before
   picking a feature (per that note's own instruction) and confirmed none of those 10 PRs
   duplicate each other or this one — the queue has been proceeding in order, one PR per night,
   it just hasn't been merged. This PR (#19, admin-dashboard) is the first one with **no prior
   open PR**, i.e. the actual frontier of undocumented work. Recommend merging the #17–#26 backlog
   (and this one) in priority order before the next nightly run, same as the earlier consolidation,
   so `INDEX.md` stops reading `missing` for already-done work.
