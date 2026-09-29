# Spec: Anomaly detection + enforcement

> status: documented · updated: 2026-09-29 · owning agent: partnerships-tracking (detection) / private-area (enforcement UI+action)

## 1. Business purpose

Two linked but independent mechanisms that protect the revenue-share ("payment per purchase")
partnership model and give admins a lever against bad actors platform-wide:

- **Anomaly detection** (`AnomalyFlag`) — an unattended, hourly cron heuristic that scans each
  active `PartnerProgram`'s attributed-order history for patterns suggesting fraud or tracking
  breakage (self-purchases, return-rate spikes, suspicious velocity changes, a collapsed
  click→order ratio). It is deliberately conservative: it only ever *flags for human review*,
  never blocks a payout or pauses a program by itself.
- **Enforcement** (`EnforcementAction`) — a manual, admin-only action that records a sanction
  (warning / fine / suspension / ban) against a specific user, optionally tied to a dispute, and
  applies its side effects (`User.status` transition, `reliabilityScore` penalty).

The two are presented together in the admin UI (dispute detail page, admin dashboard) as the
platform's two-tier "trust & safety" toolkit — automatic detection feeds evidence, an admin
converts that evidence into a sanction — but there is no structural DB link between a specific
`AnomalyFlag` and the `EnforcementAction` an admin later issues because of it (see §9/§10).

## 2. Roles involved

- **System (cron)** — `runMonitor()` / `detectAnomalies()` run unauthenticated-by-secret, on a
  schedule, with no `UserRole` acting. They only *create* `AnomalyFlag` rows.
- **`ADMIN`** (`UserRole.ADMIN`, `RoleKey "admin"`) — the only role that can view unresolved
  anomaly flags, mark them resolved, or issue an `EnforcementAction`. See §7 for the caveat that
  this role has no production grant path today (cross-ref `rbac-guards.md` §10).
- **Everyone else** — never sees `AnomalyFlag`/`EnforcementAction` data directly; the only
  visible side effect is that their own `User.status` may flip to `SUSPENDED`/`BANNED` (blocks
  next `requireActiveUser()` call, see `auth.md` §5/§8) and their `CreatorProfile`/
  `AdSpaceOwnerProfile.reliabilityScore` may drop (surfaced read-only on their own creator
  dashboard KPI and on their public marketplace listing).

## 3. User flow

**Detection (no human in the loop):**
1. Vercel Cron hits `GET /api/cron/monitor` hourly (`vercel.json:3`), guarded by
   `authorizeCron()` (`src/lib/track/cron/guard.ts:9-21`) — requires `Authorization: Bearer
   <CRON_SECRET>` or the `x-vercel-cron` header in production; open in dev when `CRON_SECRET`
   is unset.
2. `runMonitor()` (`src/lib/track/cron/monitor.ts:21-180`) first handles heartbeat/stale/offline
   state and auto-pause for `TrackedSite`/`PluginAlert` (tracking-engine domain, see
   `tracking-engine.md` — not re-detailed here), then for every `PartnerProgram` with status
   `ACTIVE`/`GATE_80`/`PAUSED` (lines 140-153) calls `detectAnomalies(programId,
   creatorCustomerHashes)` (line 176).
3. `detectAnomalies()` (`src/lib/track/anomaly.ts:49-158`) loads that program's
   `AttributedOrder` rows and runs five independent checks in sequence (see §5 for exact
   thresholds), each calling `raise()` (lines 23-47), which:
   - skips if an *unresolved* flag of the same `(programId, type)` was already raised in the
     last 24h (`alreadyFlagged`, lines 15-21);
   - otherwise `prisma.anomalyFlag.create(...)` (line 32), swallowing a `P2002` unique-constraint
     race on `@@unique([programId, type, detectedAt])` (line 44) as a harmless no-op.
4. Flags accumulate silently — nothing is emailed or pushed; discovery is pull-only (admin opens
   a screen).

**Review + resolution (admin):**
5. An admin sees open flags in two places, both driven by the *same* underlying rows and the
   *same* `resolveAnomalyFlag` action:
   - **Admin dashboard** (`/dashboard`, rendered only when `activeRole === "admin"`) — top-8
     unresolved flags across *all* programs, oldest-severity-first
     (`src/lib/admin-dashboard.ts:124-129`), each with a bare "mark resolved" button
     (`ResolveAnomalyButton` with no `disputeId`).
   - **Dispute detail page** (`/dashboard/disputes/[id]`, `requireAdmin()`-gated) — flags scoped
     to *that dispute's* `PartnerProgram` only (`src/lib/disputes.ts:346-352`), shown in the
     evidence panel alongside site/tracking health, each button pre-filled with `disputeId`.
6. Clicking "סמן כטופל" (mark resolved) submits `resolveAnomalyFlag` (`src/lib/actions/
   dispute-actions.ts:261-293`): requires admin, sets `AnomalyFlag.resolvedAt = now`, writes one
   `AuditLog` row (`action: "anomaly.resolved"`), revalidates `/dashboard` and
   `/dashboard/disputes[/id]`. There is **no** way to record *why* it was resolved (false
   positive vs. investigated-and-handled) beyond the free-text `disputeId` link, which is
   optional and not required even from the dispute-scoped button.

**Enforcement (admin, independent action):**
7. From a dispute's detail page, the admin fills `EnforcementForm`
   (`src/components/app/dispute/enforcement-form.tsx`): picks a target from a 2-item dropdown
   (`parties` = that dispute's business user + provider user, built at
   `dashboard/disputes/[id]/page.tsx:30-33`), a type (`WARNING`/`FINE`/`SUSPENSION`/`BAN`), an
   amount (only for `FINE`), and a free-text reason (min length enforced client-side by
   `required`, server-side by length check).
8. `issueEnforcement` (`src/lib/actions/dispute-actions.ts:173-257`) validates type/reason/amount
   (lines 184-193), loads the target `User` with both possible profiles (lines 195-203), then in
   one transaction (lines 208-251): creates the `EnforcementAction` row; flips `User.status` to
   `SUSPENDED` (only if currently `ACTIVE`) or `BANNED` for those two types; deducts a fixed
   `RELIABILITY_PENALTY[type]` (line 27-32: `WARNING: 5, FINE: 10, SUSPENSION: 25, BAN: 50`) from
   whichever of `CreatorProfile.reliabilityScore` / `AdSpaceOwnerProfile.reliabilityScore` the
   target has (floored at 0); writes one `AuditLog` row (`action: "enforcement.issued"`).
9. `EnforcementForm` can also be reached with `disputeId` undefined (component accepts it as
   optional), but its only call site is the dispute detail page — there is no standalone
   "issue enforcement against any user" screen outside a dispute context today.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Cron route | `src/app/api/cron/monitor/route.ts` | hourly entry point, calls `runMonitor()` |
| Cron guard | `src/lib/track/cron/guard.ts:9-21` | `Authorization: Bearer <CRON_SECRET>` / `x-vercel-cron` check |
| Detection orchestrator | `src/lib/track/cron/monitor.ts:139-179` | iterates active `PartnerProgram`s, derives creator self-purchase hash, calls `detectAnomalies` |
| Detection heuristics | `src/lib/track/anomaly.ts:49-158` | 5 checks, `raise()`/`alreadyFlagged()` dedup |
| Fetcher (admin dashboard) | `src/lib/admin-dashboard.ts:119-129,144-149,178-186` | unresolved-flag groupBy + top-8, wrapped in `cache()` |
| Fetcher (dispute evidence) | `src/lib/disputes.ts:346-352` | flags scoped to one program |
| Fetcher (labels) | `src/lib/disputes.ts:12-26` | `ANOMALY_TYPE_META`, `ANOMALY_SEVERITY_META` (Hebrew labels + badge classes) |
| Action | `src/lib/actions/dispute-actions.ts:261-293` | `resolveAnomalyFlag` |
| Action | `src/lib/actions/dispute-actions.ts:173-257` | `issueEnforcement` |
| Component | `src/components/app/dispute/resolve-anomaly-button.tsx` | resolve button, works with or without `disputeId` |
| Component | `src/components/app/dispute/enforcement-form.tsx` | sanction form, dropdown scoped to `parties` prop |
| Component | `src/components/app/dashboard/admin/admin-dashboard.tsx:178-208` | admin dashboard anomaly panel |
| Route (admin dashboard) | `src/app/(frontend)/(app)/dashboard/page.tsx:25` | fallback branch → `<AdminDashboard>`, **no explicit guard call** (see §7) |
| Route (dispute detail) | `src/app/(frontend)/(app)/dashboard/disputes/[id]/page.tsx:23` | `requireAdmin()` then renders `EnforcementForm` + anomaly evidence |
| Guard | `src/lib/admin-guard.ts:9-15` | `requireAdmin()` — the shared, reusable admin check |

## 5. Data model

`prisma/schema.prisma`.

**`AnomalyFlag`** (lines 1503-1518):
| Field | Notes |
| --- | --- |
| `programId` | FK → `PartnerProgram`, cascade delete |
| `type` | `AnomalyType` enum |
| `severity` | `AnomalySeverity` enum |
| `detail` | free-text, Hebrew, generated by the heuristic (e.g. `"שיעור החזרות 42% (5/12)"`) |
| `metricValue` | `Decimal?` — the raw number behind `detail` (count, rate, or ratio depending on type) |
| `detectedAt` / `resolvedAt` | `resolvedAt: null` = open |
| `@@unique([programId, type, detectedAt])` | dedup safety net for a same-millisecond double-write, not the primary dedup (that's the 24h `alreadyFlagged` window check) |

`AnomalyType` (schema lines 382-389) → `detail`/threshold produced by `anomaly.ts`:
| Type | Trigger (in `detectAnomalies`) | Severity |
| --- | --- | --- |
| `SELF_PURCHASE` | any `AttributedOrder.customerHash` matches the program's provider's own email hash | `HIGH` (fixed) |
| `RETURN_RATE_SPIKE` | ≥8 orders total and reversed-rate > 25% | `MEDIUM` (>25%) or `HIGH` (>50%) |
| `POST_CHECKPOINT_RETURN` | any order has both `payoutCheckpointId` set and `reversedAt` set (paid, then reversed) | `MEDIUM` (fixed) |
| `VELOCITY_SPIKE` | baseline (day 4-17) ≥7 orders and last-3-day rate > 3× baseline rate | `MEDIUM` (fixed) |
| `VELOCITY_DROP` | baseline ≥7 orders, last-3-day rate < 20% of baseline **and** literally 0 orders in last 3 days | `LOW` (fixed) |
| `CLICK_ORDER_RATIO_DROP` | ≥50 clicks total and order count < 0.5% of click count | `LOW` (fixed) |

No status-transition model — `AnomalyFlag` only ever moves `unresolved → resolved`
(`resolvedAt` set), never reopened, never re-flagged for 24h regardless of resolution.

**`EnforcementAction`** (lines 1521-1538):
| Field | Notes |
| --- | --- |
| `targetUserId` | FK → `User`, relation name `EnforcementTarget` |
| `type` | `EnforcementType`: `WARNING \| FINE \| SUSPENSION \| BAN` |
| `reason` | free text, required (min 5 chars, enforced in the action) |
| `disputeId` | optional FK → `Dispute` |
| `amountILS` | `Decimal?`, only populated for `FINE` |
| `issuedByAdminId` | FK → `User`, relation name `EnforcementIssuer` |
| `expiresAt` | column exists but **never written** — grep found no assignment anywhere in `src/`; a `SUSPENSION` has no automatic un-suspend, `expiresAt` is decorative today (see §9) |

No `anomalyFlagId` column — an `EnforcementAction` issued "because of" an `AnomalyFlag` has no
structured link back to it (see §10).

Side effects applied by `issueEnforcement` (not modeled as enum transitions, just conditional
writes in the same transaction):
```
type=SUSPENSION, User.status==ACTIVE  → User.status = SUSPENDED
type=BAN                              → User.status = BANNED   (no ACTIVE precondition)
any type                              → target's CreatorProfile/AdSpaceOwnerProfile
                                          .reliabilityScore -= RELIABILITY_PENALTY[type], floor 0
```
Note the asymmetry: `SUSPENSION` only fires if the user is currently `ACTIVE` (so it's a no-op
on an already-`SUSPENDED`/`BANNED` user), but `BAN` has no such guard and will happily overwrite
even a currently-`SUSPENDED` user straight to `BANNED`.

## 6. API contracts

No public API route. `/api/cron/monitor` (`GET`, no body) is the only HTTP entry point, and it's
infrastructure-internal (see §4/§7 for its auth). Both mutations (`resolveAnomalyFlag`,
`issueEnforcement`) are Next.js server actions invoked via `<form action={...}>` +
`useActionState`, not REST endpoints — no request/response schema beyond `FormData` field names
read with `formData.get(...)` and the shared `DisputeActionState = { status: "idle" | "success" |
"error"; message: string }` return shape (defined alongside `openDispute` in
`dispute-actions.ts`).

## 7. Guards & permissions

- **Cron route**: `authorizeCron()` — Bearer `CRON_SECRET` or Vercel's own cron header; fails
  closed (503) in production if `CRON_SECRET` isn't configured, open in dev. No `UserRole`
  involved.
- **`resolveAnomalyFlag` / `issueEnforcement`**: both start with `await requireAdmin()`
  (`src/lib/admin-guard.ts:9-15`) — redirects to `/dashboard` if `!roleKeys.includes("admin")`.
  This is correct and is the one shared admin guard in the codebase (cross-ref
  `rbac-guards.md` §5 Layer 2).
- **Dispute detail page** (where `EnforcementForm` and the dispute-scoped anomaly panel render):
  explicit `await requireAdmin()` at the top of the page component
  (`dashboard/disputes/[id]/page.tsx:23`) — defense in depth beyond the action-level check.
- **Admin dashboard route** (where the platform-wide anomaly panel and `enforcementLast30d`
  count are computed): **no independent guard at all.** `dashboard/page.tsx:10-26` is an
  `if/else if` chain on `user.activeRole` (itself just `RoleKey`, derived in
  `requireActiveUser()`) that falls through to `<AdminDashboard>` for anything that isn't
  `"brand" | "space" | "creator"` — and `AdminDashboard` itself (`admin-dashboard.tsx`) never
  imports or calls `requireAdmin()`. Today this is provably safe only because `resolveActiveRole`
  (`src/lib/app-nav.ts:154-164`) can only return `"admin"` when the user's `roleKeys` already
  contains `"admin"`, and per `rbac-guards.md` §10 there is **no production code path that ever
  grants `UserRole.ADMIN`** (only the dev-only `/dev/login?role=admin` bypass). So the gap is
  currently dormant, but it is a single point of failure that every *other* admin surface
  (disputes list, disputes detail, both dispute-actions) protects independently via
  `requireAdmin()` — this one page relies solely on the Layer-1/2 role derivation being correct,
  with no second check. If admin-role granting ever ships (queue #19,
  `admin-dashboard.md`, still `missing`) without also adding a `requireAdmin()` call to this
  page, cross-tenant aggregate data (open dispute count/details, anomaly flags with
  `detail` text naming real order counts, site health) becomes reachable by role-derivation bugs
  alone.
- **`issueEnforcement` target validation**: none, beyond "does this user id exist". The action
  never checks that `targetUserId` is actually a party to `disputeId` (or to any dispute at all)
  — the UI only ever offers the two real parties in its `<select>`, but the server has no
  matching server-side check, so a crafted `FormData` post could link an `EnforcementAction` (and
  its `disputeId`) to an unrelated user. Low practical risk while `ADMIN` is ungranted in
  production, but there's no code-level guarantee even for a legitimate admin acting on the real
  form (a bug in `parties` construction elsewhere would silently mislink records).

## 8. Known edge cases

- **Per-program scope, not per-user/global.** `detectAnomalies` only ever looks at one
  `PartnerProgram`'s own `AttributedOrder`s. A provider who spreads self-purchases or return
  abuse across several concurrent partner programs (multiple brand contracts) never accumulates
  enough volume in any single program to cross `total >= 8` / `clickCount >= 50`, and would never
  trip `SELF_PURCHASE` unless the *same* program's provider email is reused — there is no
  cross-program aggregation by provider/user.
- **Revenue-share only.** All five heuristics read `AttributedOrder`/`AffiliateClick`, which only
  exist for `CompensationModel.REVENUE_SHARE` (and future `HYBRID`) contracts with a linked
  `TrackedSite`. `FIXED_FEE` contracts (the majority path per `contracts.md`) have zero automated
  anomaly detection — abuse there is caught only via manually-opened disputes.
- **24h dedup can hide a worsening pattern.** Once a `RETURN_RATE_SPIKE` (say) is raised, no new
  flag of that type fires for 24h even if the return rate keeps climbing from 30% to 90% in that
  window — the admin only ever sees the first, possibly much milder, detail string until they
  resolve it (or 24h passes).
- **`VELOCITY_DROP` requires literally zero orders**, not just "much lower than baseline" — a
  program that drops from 5/day to 1/day never raises this flag despite an 80% falloff.
- **Resolving a flag is a dead end with no memory.** `resolvedAt` is the only state captured;
  there's no field for "false positive" vs. "confirmed, enforcement issued" vs. "confirmed, no
  action needed" — an admin reviewing history later (or a future admin) can't tell which.
- **`SUSPENSION`/`BAN` don't revoke the live session** (same underlying gap as `auth.md` §8 /
  `rbac-guards.md` §8): the Auth.js `Session` row for the target user isn't touched; enforcement
  only takes effect on their next `requireActiveUser()` call.
- **`EnforcementAction.expiresAt` is write-once-never** — the column exists in the schema and is
  selectable, but no code path ever sets it; a `SUSPENSION` is effectively indefinite unless a
  future (unbuilt) admin action lifts it or issues a fresh `WARNING`-type action that doesn't
  touch `status` at all (there's no "un-suspend" action either — cross-ref `rbac-guards.md` §10
  "`SUSPENDED`/`BANNED` … no writer found anywhere" for the reverse transition).

## 9. Tech debt / TODOs in code

- `src/lib/admin-dashboard.ts:118` computes `enforcementLast30d` (30-day `EnforcementAction`
  count) and returns it from `getAdminDashboardData()` (line 189), but
  `admin-dashboard.tsx` (the only consumer) never reads or renders that field anywhere — a full
  DB aggregate query runs on every admin dashboard load for a number nobody sees.
- Detection thresholds in `src/lib/track/anomaly.ts` are inline magic numbers (`8`, `0.25`,
  `0.5`, `7`, `3`, `14`, `0.2`, `50`, `0.005`) with no named constants, unlike the
  heartbeat/grace-period thresholds for the adjacent tracking-engine feature which are extracted
  to `src/lib/partner-constants.ts` (`HEARTBEAT_STALE_HOURS`, `MONITOR_GRACE_HOURS`, etc.) —
  inconsistent convention, harder to tune or unit-test in isolation.
- No `anomalyFlagId` column on `EnforcementAction` (schema, §5) — the two models' only relation
  is through a human reading a screen and typing a reason, not a foreign key. Any future report
  ("how many enforcement actions actually originated from an automated flag?") requires
  cross-referencing free-text `reason` strings.
- `EnforcementAction.expiresAt` is dead schema (§8) — either wire up an expiry sweep (cron or
  on-read check) or drop the column.

## 10. Findings for the team lead

1. **Admin dashboard root page has no independent admin guard, unlike every other admin
   surface.** `dashboard/page.tsx`'s fallback branch renders `<AdminDashboard>` — which surfaces
   platform-wide open disputes, unresolved anomaly flags (with real order-count/return-rate
   detail strings), and site health — based purely on `activeRole === "admin"` derived by
   `requireActiveUser()`, with no `requireAdmin()` call in the page or in the `AdminDashboard`
   component itself. Every *other* admin-only screen and action (`disputes/page.tsx`,
   `disputes/[id]/page.tsx`, `resolveDispute`, `issueEnforcement`, `resolveAnomalyFlag`) does
   call the shared `requireAdmin()` guard as defense in depth. Today the gap is dormant only
   because `rbac-guards.md` already found there is no production path to grant `UserRole.ADMIN`
   — but that means this page is currently protected by a single, distant invariant rather than
   its own check, and would silently become the weakest link the moment role-granting ships
   (queue #19). Recommend adding `await requireAdmin()` at the top of `dashboard/page.tsx`'s
   admin branch (or inside `AdminDashboard` itself) now, while the cost of the fix is zero.
2. **No structural link between an `AnomalyFlag` and the `EnforcementAction` it may lead to.**
   An admin reviews a flag, then separately fills a free-text `reason` on a different form — the
   DB has no `anomalyFlagId` on `EnforcementAction` and `resolveAnomalyFlag` has no field to
   record disposition (false positive vs. escalated vs. handled outside enforcement). This makes
   after-the-fact auditing ("show me every ban that traces back to an automated flag") impossible
   without manually correlating free text, and offers no way to tell a reviewed-and-dismissed
   flag apart from an accidentally-resolved one.
3. **`issueEnforcement` never validates that `targetUserId` belongs to `disputeId`.** The form
   UI only offers the dispute's two real parties, but the server action trusts the posted
   `targetUserId` outright — any authenticated admin session (today: none in production) could
   link a sanction to an unrelated user under a dispute they weren't party to, and there's no
   guardrail if `parties` construction elsewhere ever regresses.
4. **Detection is silently no-op for `FIXED_FEE` contracts and for abuse spread across multiple
   `PartnerProgram`s by the same person.** Both are real gaps in coverage worth deciding whether
   to accept or backlog, since the current design reads as "detect fraud on revenue-share
   partnerships" but the umbrella term "anomaly detection" in the product/queue naming implies
   broader coverage.
5. Minor: `enforcementLast30d` is computed on every admin dashboard load and never displayed —
   either surface it or drop the query.
