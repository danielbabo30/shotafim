# Spec: Escrow + Transactions + Invoices

> status: documented · updated: 2026-09-25 · owning agent: payments-escrow

## 1. Business purpose

The money layer that sits behind every fixed-fee contract (and, at the funding step, every
revenue-share partnership too): it locks a brand's budget in a simulated escrow the moment a
contract starts, releases it to the provider (creator or ad-space owner) when the brand approves
the delivered work, and is supposed to leave an auditable ledger (`Transaction`) and tax
documents (`Invoice`) behind. There is **no real payment service provider (PSP) integration** —
every balance in the product is a number written straight to Postgres by a Server Action, not
money that has actually moved. `prisma/schema.prisma:946-947` labels the whole section "כספים —
שכבה פיקטיבית בשלב זה" (money — fictional layer at this stage) and every fetcher in this domain
repeats the same caveat in its file header (e.g. `src/lib/reports.ts:11-13`,
`src/lib/earnings.ts:11-12`, `src/lib/dashboard-brand.ts:10-11`).

This spec covers the shared core: `EscrowHold`, `Transaction`, `Invoice`. It does **not** cover
the revenue-share-specific payout machinery (`PayoutCheckpoint`, the `reconcile`/`checkpoints`
crons, commission accrual) — that is queue item #18 (`payout-cron.md`, not yet written) — or the
partnership setup flow itself (queue item #14, `partner-programs.md`). Those subsystems write
into the same `Transaction` table and are cross-referenced here as consumers, not documented in
depth.

## 2. Roles involved

- **Brand (`business`)** — funds the escrow (`fundEscrow`), approves work and triggers release
  (`approveAndRelease`), views the money in `/dashboard/reports`.
- **Creator / ad-space owner (`provider`)** — the counterparty whose contract's escrow gets
  released; views their own money in `/dashboard/earnings` (creator-only page).
- **Admin** — resolves disputes (`resolveDispute` in `src/lib/actions/dispute-actions.ts`), which
  is the only other code path that changes `EscrowHold.status`.

No `UserRole` enum value gates `EscrowHold`/`Transaction`/`Invoice` directly; access is scoped by
contract/business ownership (see §7).

## 3. User flow

1. **Contract created** (`docs/spec/contracts.md`) with `status = AWAITING_ESCROW` and no
   `EscrowHold` row yet.
2. **Brand funds escrow** — `fundEscrow` (`src/lib/actions/contract-actions.ts:60-100`), called
   from the "הפקדת התקציב" button in `EscrowPanel`
   (`src/components/app/contract-room/escrow-panel.tsx:46,58-60` wires the `useActionState`).
   In one `prisma.$transaction`:
   - creates `EscrowHold{status: HELD, amountILS: agreedPriceILS + platformFeeILS, fundedAt: now}`
   - creates `Transaction{type: ESCROW_DEPOSIT, amountILS: total, status: SUCCESS, userId: <brand>}`
   - flips `Contract.status → ACTIVE`.
   Guard: only the brand party, only when `status === AWAITING_ESCROW` and no `escrowHold` exists
   yet (`contract-actions.ts:69-71`).
3. **Provider delivers, brand reviews** (`docs/spec/deliverables.md`) — no money movement.
4. **Brand approves** — `approveAndRelease` (`contract-actions.ts:210-274`), gated on
   `Contract.status === SUBMITTED_FOR_REVIEW` and the latest submission being `PENDING_REVIEW`. In
   one `prisma.$transaction`:
   - submission → `APPROVED`, `Contract.status → APPROVED`, `Contract.completedAt = now`
   - if an `EscrowHold` exists: `status → RELEASED_TO_PROVIDER`, `releasedAt = now`
   - creates `Transaction{type: ESCROW_RELEASE, amountILS: agreedPriceILS}` **and**
     `Transaction{type: PLATFORM_FEE, amountILS: platformFeeILS}` — both with
     `userId: <the calling brand's id>` (see §10 — this is almost certainly meant to be the
     provider's id for the release transaction)
   - `Campaign.status → COMPLETED`.
5. **Alternative: dispute** (`docs/spec/disputes.md`, not detailed here) — `resolveDispute`
   (`src/lib/actions/dispute-actions.ts:96-169`) sets `Contract.status` to `REFUNDED` or
   `APPROVED` and `EscrowHold.status` to `REFUNDED_TO_BRAND` / `RELEASED_TO_PROVIDER` /
   `SPLIT_DISPUTE` depending on the admin's resolution choice — **without creating any
   `Transaction` row** (see §9).
6. **Revenue-share variant** — for `CompensationModel.REVENUE_SHARE` contracts, `fundPartnerDeposit`
   (`src/lib/actions/partner-actions.ts:30-93`) creates the same `EscrowHold` + a
   `Transaction{type: PARTNERSHIP_DEPOSIT}` instead of `ESCROW_DEPOSIT`, and `topUpPartnerDeposit`
   (`partner-actions.ts:125-...`) increments the same hold with more `PARTNERSHIP_DEPOSIT`
   transactions. From there, commission accrual/payout/reversal is driven by the tracking cron
   (`src/lib/track/ingest.ts`, `src/lib/track/cron/{reconcile,checkpoints}.ts`) — out of scope
   here, see §10 cross-reference.
7. **Brand views money** — `/dashboard/reports` (`src/app/(frontend)/(app)/dashboard/reports/page.tsx`)
   shows escrow KPIs, an escrow-hold ledger and an invoice list, all read-only.
8. **Provider views money** — `/dashboard/earnings` (creator-only,
   `src/app/(frontend)/(app)/dashboard/earnings/page.tsx:36`) shows the same three sections scoped
   to the provider's own contracts/userId.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Action | `src/lib/actions/contract-actions.ts` (`fundEscrow`, `approveAndRelease`) | writes `EscrowHold`/`Transaction`, drives `Contract.status` |
| Action | `src/lib/actions/dispute-actions.ts` (`resolveDispute`) | alternate `EscrowHold` status writer (no `Transaction`) |
| Action | `src/lib/actions/partner-actions.ts` (`fundPartnerDeposit`, `topUpPartnerDeposit`) | revenue-share funding, same `EscrowHold`/`Transaction` tables |
| Component | `src/components/app/contract-room/escrow-panel.tsx` | brand/provider UI for fund/approve/revision, calls the three contract actions |
| Component | `src/components/app/contract-room/partner-program-panel.tsx` | UI for `fundPartnerDeposit`/`topUpPartnerDeposit` |
| Fetcher | `src/lib/reports.ts` (`getReportsData`) | brand's `/dashboard/reports` data: escrow KPIs, escrow-hold ledger, invoice list — all scoped by `BusinessProfile.userId` |
| Fetcher | `src/lib/earnings.ts` (`getCreatorEarnings`) | provider's `/dashboard/earnings` data: same three sections scoped by `providerId`/`Transaction.userId` |
| Fetcher | `src/lib/dashboard-brand.ts` (`getBrandDashboardData`) | brand dashboard KPI card + 6-row recent ledger (`escrow`, `transactions` subset) |
| Fetcher | `src/lib/dashboard-creator.ts`, `src/lib/dashboard-space.ts` | dashboard KPI cards for provider roles (`escrowHold`/`Transaction` aggregates) |
| Fetcher | `src/lib/contracts.ts` (`getContractRoomData`) | per-contract escrow amount/status for the contract room |
| Fetcher | `src/lib/my-ad-spaces.ts`, `src/lib/ad-space-schedule.ts`, `src/lib/messages.ts`, `src/lib/partner-program.ts` | read `EscrowHold.status`/`amountILS` incidentally for their own domains |
| Route | `src/app/(frontend)/(app)/dashboard/reports/page.tsx` | brand reports page — **no role guard** (see §7) |
| Route | `src/app/(frontend)/(app)/dashboard/earnings/page.tsx` | provider earnings page — gated `roleKeys.includes("creator")` (`page.tsx:36`) |
| Component | `src/components/app/reports-tabs.tsx` | ledger + invoices tables; "ייצוא CSV" and "PDF" buttons are static, unwired (see §8) |
| Seed | `src/app/(frontend)/dev/seed-{contract,creator-dashboard,space-dashboard,partner-dashboard}/route.ts` | only code paths that create `EscrowHold` rows for dev/demo data; **none create `Invoice` rows** |

No dedicated API route exists for this domain — everything is Server Actions + fetchers.

## 5. Data model

All in `prisma/schema.prisma`.

**`EscrowHold`** (`:950-963`) — 1:1 with `Contract` (`contractId @unique`).
`amountILS`, `status: EscrowStatus`, `fundedAt`, `releasedAt`.

`EscrowStatus` (`:155-160`): `HELD → RELEASED_TO_PROVIDER` (happy path, `approveAndRelease`) `|
REFUNDED_TO_BRAND | SPLIT_DISPUTE` (both only from `resolveDispute`). No transition back to
`HELD`; no field records a *partial* amount for `SPLIT_DISPUTE` — the status name implies a split
but the model has no split-percentage or split-amount column (see §8).

**`Transaction`** (`:966-984`) — append-only ledger row. `userId`, optional `contractId`, `type:
TransactionType`, `amountILS`, `feeAmountILS` (default 0, unused by any writer — see §9),
`status: TransactionStatus` (`PENDING|SUCCESS|FAILED`; every writer in the codebase creates rows
already `SUCCESS` — nothing ever writes `PENDING` or `FAILED`), `referenceId` (external PSP
reference — never populated, no PSP exists).

`TransactionType` (`:162-175`), with writer/reader status:
| Type | Writer | Notes |
| --- | --- | --- |
| `ESCROW_DEPOSIT` | `contract-actions.ts:85-94` | fixed-fee funding |
| `ESCROW_RELEASE` | `contract-actions.ts:246-255` | see §10 userId bug |
| `WITHDRAWAL` | **none** | referenced only in read aggregates (`earnings.ts:93`, `dashboard-creator.ts:195`, `dashboard-space.ts:230`) and labels; always sums to 0 |
| `PLATFORM_FEE` | `contract-actions.ts:256-265` | |
| `REFUND` | **none** | has a UI label (`dashboard-brand.ts:66`, counted as "in" direction `dashboard-brand.ts:78`) but no writer anywhere — `resolveDispute`'s `REFUNDED_TO_BRAND` path never creates one |
| `PARTNERSHIP_DEPOSIT` | `partner-actions.ts:71-80,156-165` | revenue-share funding + top-up |
| `COMMISSION_ACCRUAL` | `src/lib/track/ingest.ts:211` | out of scope (tracking domain) |
| `COMMISSION_PAYOUT` | `src/lib/track/cron/checkpoints.ts:67` | out of scope (payout-cron domain) |
| `COMMISSION_REVERSAL` | `src/lib/track/ingest.ts:319` | out of scope |
| `DEPOSIT_REFUND` | `src/lib/track/cron/reconcile.ts:83` | out of scope |
| `PLATFORM_ABSORPTION` | **none** | has UI labels (`dashboard-brand.ts:73`, `earnings.ts:201`) and a constant `PLATFORM_ABSORPTION_CEILING_PCT` (`src/lib/partner-constants.ts:34`) but zero writer anywhere in the codebase |

**`Invoice`** (`:987-1007`) — optional `transactionId`, `recipientUserId`, `documentType:
InvoiceDocumentType` (`TAX_INVOICE|RECEIPT|CREDIT_INVOICE`), amounts, `customerName`/`customerTaxId`
(free text, no FK to `BusinessProfile`/`legalEntity` data), `pdfUrl` (nullable), `externalProvider:
InvoiceProvider` (default `LOCAL_MOCK`; `GREEN_INVOICE`/`MORNING` exist in the enum but no
integration code references them anywhere). **Zero write path exists anywhere in the repository,
including the dev seed routes** — grep for `invoice.create` / `prisma.invoice.create` across `src/`
and `prisma/seed/` returns nothing. The table is permanently empty in every environment; both
`getReportsData` and `getCreatorEarnings` query it and will always render an empty invoices tab.

## 6. API contracts

None — no `src/app/api/**` route for escrow/transactions/invoices. All writes go through the
three Server Actions in §4; all reads are RSC-only fetchers wrapped in `cache()`.

## 7. Guards & permissions

- `fundEscrow`/`approveAndRelease`/`requestRevision` call `loadOwnedContract` →
  `loadContractParty` (`contract-actions.ts:25-44`), which requires `requireActiveUser()` and
  restricts to `party === "brand"` (i.e. `contract.business.userId === user.id`). Ownership is
  re-verified on every call — no caching of the party check across requests.
- `fundPartnerDeposit`/`topUpPartnerDeposit` use their own `loadProgram`
  (`partner-actions.ts:100-119`) with the same `business.userId` ownership check.
- `resolveDispute` requires `requireAdmin()` (`dispute-actions.ts:100`) — see
  `docs/spec/rbac-guards.md` for how thin that admin path is in production.
- `/dashboard/earnings` gates on `roleKeys.includes("creator")`
  (`src/app/(frontend)/(app)/dashboard/earnings/page.tsx:36`).
- **`/dashboard/reports` has no role check at all** — any `requireActiveUser()`-passing user can
  open it. It degrades gracefully for non-brands (`getReportsData` returns the `EMPTY` constant
  when `BusinessProfile` lookup misses, `src/lib/reports.ts:92-94`), so this is a UX gap rather
  than a data leak, but it's the same "browse page with no role check" pattern flagged in
  `docs/spec/marketplace.md` §10 and `docs/spec/rbac-guards.md` §10.
- All fetchers scope every Prisma query by `businessId`/`providerId`/`userId` derived from the
  authenticated session — no fetcher accepts a caller-supplied id.

## 8. Known edge cases

- **"ייצוא CSV" and "PDF" buttons in `reports-tabs.tsx` do nothing.** Neither has an `onClick`,
  `href`, or form action (`src/components/app/reports-tabs.tsx:120-126,244-251`) — they render as
  functional-looking buttons but are pure decoration.
- **`SPLIT_DISPUTE` never actually splits.** `resolveDispute` sets the whole `EscrowHold` to one
  status with no partial amount recorded — an admin choosing "split" produces exactly the same
  data shape as "release" or "refund", just a different enum value with no financial meaning.
- **Re-running `approveAndRelease` twice is not guarded by escrow state**, only by
  `Contract.status`/submission `status` (`contract-actions.ts:221`) — since both are flipped
  inside the same transaction as the escrow release, this is safe in practice, but there is no
  defensive check like `escrowHold.status !== 'HELD'` the way `fundEscrow` checks
  `!contract.escrowHold` (`:69`).
- **`Invoice.customerTaxId`/`customerName` are free-text** with no source of truth — since nothing
  ever creates an `Invoice`, this is currently moot, but any future writer needs to decide where
  this comes from (`BusinessProfile`/`LegalEntity`, not modeled today per `docs/spec/data-model.md`
  if that section exists — verify against `BusinessProfile`/`LegalEntityType` fields directly).
- **`Transaction.feeAmountILS` is always `0`.** Every writer passes `new Prisma.Decimal(0)`
  explicitly (`contract-actions.ts:91,252,262`, `partner-actions.ts:77,162`) even for the
  `PLATFORM_FEE` transaction itself, which puts the fee in `amountILS` instead. The column exists
  in the schema but carries no information anywhere.
- **`Decimal` → `Number()` conversion everywhere** (e.g. `reports.ts:169,178,184`,
  `earnings.ts:73`) loses Prisma's arbitrary-precision guarantees; at ₪12-decimal scale this is
  unlikely to matter in practice but is worth knowing if amounts ever need to reconcile exactly
  against a real PSP.

## 9. Tech debt / TODOs in code

- `prisma/schema.prisma:946` — section comment literally says "שכבה פיקטיבית בשלב זה" (fictional
  layer at this stage); no PSP integration exists.
- `src/lib/reports.ts:11-13`, `src/lib/earnings.ts:11-12`, `src/lib/dashboard-brand.ts:10-11`,
  `src/lib/dashboard-creator.ts:15`, `src/lib/dashboard-space.ts:13` — every fetcher repeats the
  same "manual/admin status transitions until a PSP is wired" caveat; this should eventually
  collapse into one shared doc comment / constant rather than five copies that could drift.
  `getReportsData` also hard-codes `availableBalance: 0` (`reports.ts:186` — "אין עדיין
  ארנק/יתרה") as a stub for the same reason.
- `src/lib/partner-constants.ts:34` (`PLATFORM_ABSORPTION_CEILING_PCT`) and the schema comment at
  `prisma/schema.prisma:174` ("עד תקרה") describe a platform-absorption mechanism referenced in a
  "§6" of some (not-yet-written) revenue-share spec — the constant exists but nothing reads it.

## 10. Findings for the team lead

- **`approveAndRelease` records the money-release `Transaction` rows under the brand's `userId`,
  not the provider's** (`src/lib/actions/contract-actions.ts:246-255` — `userId: user.id` where
  `user` comes from `loadOwnedContract`, which only succeeds for `party === "brand"`). The
  `ESCROW_RELEASE` and `PLATFORM_FEE` transactions that represent money paid *to the provider*
  are attributed to the brand's account instead. Concretely: `getCreatorEarnings`
  (`src/lib/earnings.ts:116-130`) queries `Transaction` by `where: { userId }` for the logged-in
  creator/space-owner — since the release transaction was never written under their id, **a
  provider's own "Transactions" history on `/dashboard/earnings` never shows the payment they were
  released**, even though the KPI total (`totalReleased`, computed from `EscrowHold` aggregates,
  not `Transaction`) is correct. The brand's dashboard happens to look right by accident, because
  the brand's own ledger view wants to show money leaving their account anyway.
- **`Invoice` has zero write path anywhere in the codebase, including all four dev seed routes** —
  the reports/earnings "invoices" tabs are permanently empty in every environment, dev or
  production. If invoicing is meant to be part of the current milestone rather than a fully future
  PSP-integration item, this is a bigger gap than the "PDF button is unwired" issue in §8.
  `InvoiceProvider.GREEN_INVOICE`/`MORNING` enum values also suggest a specific integration was
  planned but never started.
  - **`resolveDispute` (`src/lib/actions/dispute-actions.ts:96-169`) changes `EscrowHold.status`
  (refund/release/split) but creates no `Transaction` row at all**, unlike `approveAndRelease`
  which always pairs an escrow-status change with `ESCROW_RELEASE`/`PLATFORM_FEE` transactions.
  Any disputed contract's ledger has a silent gap: the escrow disappears/moves but no transaction
  explains why. This also means the `REFUND` transaction type (§5 table) is dead code — the one
  place a refund actually happens doesn't use it.
  - **`WITHDRAWAL` has no writer anywhere** — the "available to withdraw" KPIs on the creator and
  ad-space-owner dashboards (`dashboard-creator.ts:253`, `dashboard-space.ts:246-247`) subtract a
  `withdrawnAgg` that can only ever be 0, and there is no "withdraw to bank" action or button
  anywhere in the UI (confirmed by grepping `withdraw`/`Withdraw` across `src/`). The number shown
  to creators/space-owners as "available balance" is really just "total released, ever" — which is
  fine as a stub but is worth knowing it isn't tracking real payouts at all.
  - `/dashboard/reports` has no role guard (any authenticated user can open it; degrades to an
  empty state for non-brands) — consistent with the pattern already flagged in
  `docs/spec/rbac-guards.md` §10 and `docs/spec/marketplace.md` §10, noted here for completeness
  rather than as a new issue.
