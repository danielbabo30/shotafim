# Spec: Disputes

> status: documented · updated: 2026-09-23 · owning agent: private-area

## 1. Business purpose

When a contract between a business and a provider (creator or ad-space owner) breaks down —
missed deadline, low-quality work, suspected fraudulent orders on a revenue-share deal, etc. —
either party can escalate it out of the normal contract-room flow into an admin-arbitrated
dispute. An admin reviews the contract's evidence trail (audit log, partner-program metrics,
tracked-site health, open anomaly flags) in one screen and issues a binding resolution that
releases or refunds the contract's escrow. The same admin screen doubles as the entry point for
platform enforcement (warning/fine/suspension/ban) against a user, whether or not it's tied to a
specific dispute, and for manually clearing automatically detected anomaly flags.

## 2. Roles involved

- **Business / Provider** (whichever `UserRole` is a party on the `Contract`, via `business.userId`
  or `providerId`): can open exactly one dispute per contract while it is `ACTIVE` or
  `SUBMITTED_FOR_REVIEW`, using a reason relevant to the contract's `compensationModel`. Cannot see
  the admin queue, evidence bundle, or resolution notes anywhere in the product — only a static
  "dispute opened, being handled by the system team" banner in the contract room, and the
  contract's own status badge once it resolves.
- **Admin** (`roleKeys.includes("admin")`, gated by `requireAdmin()` — `src/lib/admin-guard.ts:9`):
  the only role that can see the dispute queue/detail, resolve a dispute, issue an enforcement
  action, or clear an anomaly flag. Per `docs/spec/rbac-guards.md` §10, no production sign-up path
  grants the `ADMIN` role today, so this whole surface is reachable only via the dev-only
  `/dev/login?role=admin` bypass.

## 3. User flow

### 3a. Opening a dispute (business/provider)
1. In the contract room (`/dashboard/contracts/[id]`), if `getContractDisputeContext()` says
   `canOpen` (no existing dispute + contract status `ACTIVE`/`SUBMITTED_FOR_REVIEW`), a
   **"פתח מחלוקת / פנייה לבוררות המערכת"** button appears (`DisputeButton`,
   `src/components/app/dispute/dispute-button.tsx:37-48`).
2. Clicking it expands an inline form: a reason `<select>` scoped to the contract's compensation
   model (delivery reasons for `FLAT_FEE`, revenue reasons for `REVENUE_SHARE` — see §5) and a
   free-text description (min 10 chars).
3. `openDispute` (`src/lib/actions/dispute-actions.ts:36-92`) re-validates ownership (party on the
   contract), reason validity, reason-vs-compensation-model match, contract status, and that no
   dispute already exists for the contract, then in one transaction: creates the `Dispute`
   (`status: OPEN`), flips `Contract.status` to `DISPUTED`, writes an `AuditLog` row, and redirects
   back to the contract room.
4. From then on `DisputeButton` renders the static "מחלוקת נפתחה — בטיפול צוות המערכת" banner
   (`dispute-button.tsx:23-32`) for as long as `context.existing` is non-null — this does not change
   when the dispute later resolves (see §10 finding 3).

### 3b. Admin queue and resolution
1. `/dashboard/disputes` (admin-only) lists every `Dispute` via `getDisputeQueue()`
   (`src/lib/disputes.ts:138-176`), open ones first, each row showing reason, campaign/parties,
   compensation model, age, status, and a live `messageCount`/`anomalyCount` teaser.
2. `/dashboard/disputes/[id]` (`getDisputeDetail()`, `src/lib/disputes.ts:235-423`) is the full case
   file: description, an **evidence bundle** assembled fresh on every load —
   - up to 40 most-recent `AuditLog` rows for the contract and (if revenue-share) its
     `PartnerProgram`,
   - the partner program's order funnel (pending/approved/reversed/paid), gross commission,
     reversals, click count, and checkpoint schedule,
   - the business's `TrackedSite`s with connection status and open plugin alerts,
   - the program's unresolved `AnomalyFlag`s, each with a "סמן כטופל" action
     (`ResolveAnomalyButton` → `resolveAnomalyFlag`),
   - the dispute's `DisputeMessage` thread (always empty in practice — see §10 finding 2),
   - any prior `EnforcementAction`s tied to this dispute.
3. While the dispute is open (`status` is `OPEN` or `UNDER_ARBITRATION`), the admin picks one of
   three resolutions in `ResolveDisputeForm` and writes a mandatory note (min 5 chars):
   **RESOLVED_PAYOUT** (escrow → provider), **RESOLVED_REFUND** (escrow → business), or **SPLIT**
   (no automatic money movement — see §8).
4. `resolveDispute` (`dispute-actions.ts:96-169`) transactionally: updates `Dispute.status` +
   `resolutionNotes` + `arbitratorId` + `resolvedAt`; sets `Contract.status` to `REFUNDED` (refund)
   or `APPROVED` (payout/split) with `completedAt`; if the contract has an `EscrowHold`, updates its
   status (`RELEASED_TO_PROVIDER` / `REFUNDED_TO_BRAND` / `SPLIT_DISPUTE`) — this covers
   revenue-share deposits too, since `fundPartnerDeposit` creates the deposit as a regular
   `EscrowHold` row linked via `Contract.escrowHold` (`src/lib/actions/partner-actions.ts:62-70`);
   writes an `AuditLog` row. It never touches `PartnerProgram` (see §10 finding 1).

### 3c. Enforcement (admin, independent of resolution)
1. `EnforcementForm` (rendered on the dispute detail page, target list = the two contract parties)
   lets the admin pick a target, a type (`WARNING`/`FINE`/`SUSPENSION`/`BAN`), and a reason; `FINE`
   additionally requires a positive `amountILS`.
2. `issueEnforcement` (`dispute-actions.ts:173-257`) creates an `EnforcementAction` row, optionally
   flips `User.status` to `SUSPENDED`/`BANNED`, and docks the target's `reliabilityScore` (on
   whichever of `creatorProfile`/`adSpaceOwnerProfile` exists) by a fixed penalty
   (`RELIABILITY_PENALTY`: WARNING 5 / FINE 10 / SUSPENSION 25 / BAN 50). `reliabilityScore` is a
   real, displayed number (creator dashboard KPI, marketplace profile card), so this has visible
   effect on the target.
3. Enforcement can be issued with or without a `disputeId` — the form is also usable standalone
   (though today it is only ever rendered from the dispute detail page, always with `disputeId`
   set).

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Route (queue) | `src/app/(frontend)/(app)/dashboard/disputes/page.tsx` | admin queue table |
| Route (detail) | `src/app/(frontend)/(app)/dashboard/disputes/[id]/page.tsx` | case file + evidence + resolution/enforcement panels |
| Component | `src/components/app/dispute/dispute-button.tsx` | open-dispute entry point, rendered in contract room |
| Component | `src/components/app/dispute/resolve-dispute-form.tsx` | admin resolution form |
| Component | `src/components/app/dispute/enforcement-form.tsx` | admin enforcement form |
| Component | `src/components/app/dispute/resolve-anomaly-button.tsx` | admin "mark anomaly resolved" action |
| Fetcher | `src/lib/disputes.ts` | `getContractDisputeContext`, `getDisputeQueue` (cached), `getDisputeDetail`, meta maps |
| Action | `src/lib/actions/dispute-actions.ts` | `openDispute`, `resolveDispute`, `issueEnforcement`, `resolveAnomalyFlag` |
| Guard | `src/lib/admin-guard.ts` | `requireAdmin()` |
| Consumer | `src/app/(frontend)/(app)/dashboard/contracts/[id]/page.tsx:36,148-150` | renders `DisputeButton` in the contract room |
| Consumer | `src/lib/admin-dashboard.ts:142` | admin dashboard KPI: open dispute count, reuses `getDisputeQueue()` |
| Adjacent (read-only here) | `src/lib/admin-dashboard.ts` (`SITE_STATUS_META`, `PLUGIN_ALERT_META`) | labels reused by the evidence bundle's tracked-sites section |

No dedicated API route — everything is a server action; no separate messaging endpoint exists for
disputes (see §10 finding 2).

## 5. Data model

- **`Dispute`** (`prisma/schema.prisma:1134-1154`) — `contractId` unique (one dispute per contract,
  enforced in DB and in `openDispute`), `initiatorId`, `reason: DisputeReason`, `description`,
  `status: DisputeStatus` (default `OPEN`), `arbitratorId?`, `resolutionNotes?`, `resolvedAt?`.
  Relations: `contract`, `initiator`/`arbitrator` (`User`), `messages` (`DisputeMessage[]`),
  `enforcementActions` (`EnforcementAction[]`).
- **`DisputeMessage`** (`prisma/schema.prisma:1157-1169`) — `disputeId`, `senderId`, `message`,
  `evidenceUrl?`. Schema and read path (`getDisputeDetail`) both exist; no writer exists anywhere
  in `src/` (§10 finding 2).
- **`EnforcementAction`** (`prisma/schema.prisma:1521-1538`) — `targetUserId`, `type:
  EnforcementType`, `reason`, `disputeId?` (nullable — not all enforcement is dispute-driven),
  `amountILS?`, `issuedByAdminId`, `expiresAt?` (never set — §10 finding 4).
- **`AnomalyFlag`** (`prisma/schema.prisma:1503-1518`, owned by the tracking domain — see
  `docs/spec/_TEMPLATE.md` queue item 16) — read here as dispute evidence and resolved here
  (`resolvedAt`), but produced by the monitor cron outside this feature's scope.
- **Enums:**
  - `DisputeReason` (`schema.prisma:220-230`) — split into two groups by
    `reasonsForCompensationModel()` (`src/lib/disputes.ts:79-84`): `delivery`
    (`MISSED_DEADLINE`/`LOW_QUALITY`/`BRIEF_DEVIATION`/`NON_RESPONSIVE`, for `FLAT_FEE` contracts)
    vs. `revenue` (`UNDERREPORTED_SALES`/`FRAUDULENT_ORDERS`/`ATTRIBUTION_DISPUTE`/
    `PLUGIN_NOT_REPORTING`, for `REVENUE_SHARE` contracts).
  - `DisputeStatus` (`schema.prisma:232-238`) — `OPEN → {UNDER_ARBITRATION} → RESOLVED_REFUND |
    RESOLVED_PAYOUT | SPLIT`. `UNDER_ARBITRATION` is never written anywhere (§10 finding 5) — in
    practice the only transition is `OPEN → one of the three RESOLVED_*`.
  - `EnforcementType` (`schema.prisma:368-373`) — `WARNING | FINE | SUSPENSION | BAN`, each with a
    fixed `reliabilityScore` penalty (`RELIABILITY_PENALTY`, `dispute-actions.ts:27-32`); only
    `SUSPENSION`/`BAN` write `User.status`.
- **Status transitions triggered from this feature:**
  - `Contract.status`: `ACTIVE`/`SUBMITTED_FOR_REVIEW` → `DISPUTED` (`openDispute`) →
    `REFUNDED`/`APPROVED` (`resolveDispute`).
  - `EscrowHold.status` → `RELEASED_TO_PROVIDER` / `REFUNDED_TO_BRAND` / `SPLIT_DISPUTE`
    (`resolveDispute`), only if the contract has one.
  - `User.status`: `ACTIVE` → `SUSPENDED` / `BANNED` (`issueEnforcement`), one-way — nothing in the
    codebase ever writes `ACTIVE` back onto a suspended/banned user (§10 finding 4).
  - `AnomalyFlag.resolvedAt`: `null` → `now()` (`resolveAnomalyFlag`).

## 6. API contracts

None — all mutations are Next.js server actions (`"use server"`) invoked via `useActionState`
form bindings, not HTTP endpoints.

## 7. Guards & permissions

- **`openDispute`**: `requireActiveUser()` then a `prisma.contract.findFirst` scoped to
  `OR: [{ business: { userId } }, { providerId }]` — the standard hand-rolled ownership pattern
  documented in `docs/spec/rbac-guards.md` §3, not a shared helper.
- **`resolveDispute` / `issueEnforcement` / `resolveAnomalyFlag`** and both dispute
  routes/pages: `requireAdmin()` (`src/lib/admin-guard.ts:9`) → redirects to `/dashboard` if
  `!roleKeys.includes("admin")`. This is one of the two call sites of `requireAdmin()` in the
  whole app (the other being the sibling admin route group), per `docs/spec/code-map.md`'s "Notes
  from specced features".
- No row-level check that an `EnforcementAction`'s `disputeId` (if provided) actually belongs to a
  contract the target was party to — the target is looked up solely by the submitted
  `targetUserId`, trusted from the `<select>` populated server-side with the two real parties, so
  this isn't currently exploitable through the UI, but the action itself doesn't re-derive
  `targetUserId` from the dispute.

## 8. Known edge cases

- A contract can have at most one `Dispute` ever (`contractId @unique` + explicit check) — once
  resolved, the contract cannot be disputed again even if the underlying disagreement continues.
- `SPLIT` resolution records `Contract.status = APPROVED` and `EscrowHold.status =
  SPLIT_DISPUTE`, but moves no money and creates no `Transaction` rows — the admin's note is the
  only record of what was agreed; there's no follow-up UI to actually execute a partial
  payout/refund.
- `getContractDisputeContext` and `openDispute` each hard-code the openable statuses
  (`["ACTIVE", "SUBMITTED_FOR_REVIEW"]`) independently — see §9.
- `resolveAnomalyFlag` is idempotency-guarded (`if (flag.resolvedAt) return error`), but nothing
  stops an admin from resolving an anomaly flag that isn't linked to the dispute they're viewing
  (`disputeId` passed through is only used for `revalidatePath`/audit metadata, never validated
  against the flag's program).
- `issueEnforcement`'s target lookup selects both `creatorProfile` and `adSpaceOwnerProfile`; a
  user with both roles gets the penalty applied to both profiles' `reliabilityScore` in the same
  transaction.

## 9. Tech debt / TODOs in code

- `src/lib/disputes.ts:93` (`DISPUTE_OPENABLE`) and `src/lib/actions/dispute-actions.ts:24`
  (`DISPUTE_OPENABLE_STATUSES`) independently hard-code the same two-status array — no shared
  constant, so they can silently drift.
- `EnforcementAction.expiresAt` (`prisma/schema.prisma:1529`) — column exists, no code anywhere
  sets or reads it.
- `DisputeMessage.evidenceUrl` (`prisma/schema.prisma:1162`) — column exists, no code anywhere
  sets or reads it (and `DisputeMessage` itself has no writer at all — see §10).
- `DisputeStatus.UNDER_ARBITRATION` (`prisma/schema.prisma:234`) — handled defensively in both
  `getDisputeQueue`'s "open" split (`src/lib/disputes.ts:56-60`) and `resolveDispute`'s status
  guard (`dispute-actions.ts:122`), but nothing ever transitions a dispute into it.

## 10. Findings for the team lead

1. **Resolving a dispute never pauses the revenue-share `PartnerProgram` — money can keep moving
   after the case is closed.** `resolveDispute` (`src/lib/actions/dispute-actions.ts:96-169`)
   updates `Contract.status` and the contract's single `EscrowHold`, but never touches
   `PartnerProgram.status` or its `SCHEDULED` `PayoutCheckpoint`s. The daily checkpoint cron
   (`runDueCheckpoints`, `src/lib/track/cron/checkpoints.ts:129`) selects checkpoints purely by
   `status: "SCHEDULED"` + due date — it never checks the parent contract's status. So an admin can
   resolve a revenue-share dispute as `RESOLVED_REFUND` (sending the deposit back to the business)
   and the program's affiliate link/coupon keeps attributing new orders (`program.status` is left
   whatever it was, typically `ACTIVE`), with the next scheduled checkpoint still firing days later
   and paying commission out to the provider from a deposit that was just refunded.
2. **The dispute "protocol" thread is dead UI — `DisputeMessage` has no writer anywhere.** The
   admin detail page renders a "פרוטוקול המחלוקת" section from `Dispute.messages`
   (`src/app/(frontend)/(app)/dashboard/disputes/[id]/page.tsx:201-215`) and the queue even counts
   it (`messageCount`, `src/lib/disputes.ts:134,158,174`), but no server action, route, or form in
   the codebase creates a `DisputeMessage` row — not for the admin, not for either party. This
   section is permanently empty in production; `DisputeMessage.evidenceUrl` is doubly dead as a
   result.
3. **Resolution notes are promised to both parties but only the admin can ever read them.** The
   resolve form's own placeholder text says the note "יירשם בתיק וגלוי לשני הצדדים" — *"will be
   recorded in the file and visible to both parties"*
   (`src/components/app/dispute/resolve-dispute-form.tsx:45`) — but `resolutionNotes` is only
   rendered on the admin-only `/dashboard/disputes/[id]` route. The party's own view
   (`DisputeButton` in the contract room) shows a static "dispute opened — being handled by the
   system team" banner for as long as `context.existing` is truthy, regardless of dispute status,
   so a business or provider never sees the admin's stated rationale anywhere in the product —
   only the contract's status badge changing.
4. **`SUSPENSION` has no expiry or reactivation path — it's a de-facto permanent ban.**
   `EnforcementAction.expiresAt` exists in the schema (`prisma/schema.prisma:1529`) but
   `issueEnforcement` never sets it, and no code anywhere (grepped across `src/`) ever writes
   `User.status` back to `ACTIVE` after a `SUSPENDED`/`BANNED` enforcement. A "warning suspension"
   is therefore indistinguishable in effect from a `BAN` once issued.
5. **Minor / consistent with prior findings:** `DisputeStatus.UNDER_ARBITRATION` is unreachable
   (no writer), the same dead-enum-value pattern already flagged for `CampaignStatus.CANCELLED` in
   `docs/spec/campaigns.md`.
