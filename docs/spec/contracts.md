# Spec: Contract room + contracts

> status: documented · updated: 2026-09-15 · owning agent: private-area

## 1. Business purpose

`Contract` is the operational and financial record created the moment a brand accepts a
provider's (creator's or ad-space owner's) application. It drives a shared "work room" UI
where the two parties fund an escrow-backed budget, exchange deliverables/feedback, agree on
shipping for physical products, chat, and ultimately release payment. It is the anchor entity
every downstream feature hangs off of: deliverables/submissions, messaging, disputes, reviews,
ad-space bookings, and revenue-share partner programs all have a `contractId` foreign key back
to it (`prisma/schema.prisma:876-886`).

## 2. Roles involved

Only two `UserRole`s participate in a given contract, distinguished at read-time as
`ContractParty` (`"brand" | "provider"`, `src/lib/contract-room.ts:17`):
- **`BRAND`** (via `BusinessProfile`) — funds the escrow, reviews submitted deliverables,
  approves & releases payment or requests a revision, can open a dispute.
- **`CREATOR` or `AD_SPACE_OWNER`** (`Contract.providerId`, either role can be the "provider" —
  the model doesn't distinguish which) — submits deliverables, updates physical-product
  shipping details, can open a dispute.
- `ADMIN` has no direct role in the contract room itself; it only touches a `Contract`
  indirectly through dispute resolution (`disputes.md`, feature #10, out of scope here).

## 3. User flow

1. **Creation.** A contract is created only as a side effect of `acceptApplication`
   (`src/lib/actions/application-actions.ts:176-343`, owned by feature #6 —
   `applications.md`), never directly. It copies `compensationModel` from the campaign
   (`application-actions.ts:232`), computes `agreedPriceILS`/`platformFeeILS` (0/0 for
   `REVENUE_SHARE`, real values × `PLATFORM_FEE_RATE` for `FIXED_FEE`,
   `application-actions.ts:233-234`), sets `deadline`, and always starts at
   `status: AWAITING_ESCROW` (`application-actions.ts:241`) regardless of compensation model.
   If the campaign targets an ad-space asset with a date window, an `AdSpaceBooking(RESERVED)`
   row is created in the same transaction after a clash check against existing bookings
   (`application-actions.ts:189-208,319-328`). Re-accepting an already-contracted application
   just redirects to the existing room (`application-actions.ts:182-184`) — idempotent by
   design, not an error path.
2. **Funding.** The brand must fund the escrow before any work happens:
   - **Fixed fee:** `fundEscrow` (`src/lib/actions/contract-actions.ts:60-100`) — only when
     `status === AWAITING_ESCROW` and no `EscrowHold` yet exists; creates
     `EscrowHold(HELD)` + `Transaction(ESCROW_DEPOSIT)` for `agreedPriceILS + platformFeeILS`,
     then flips the contract to `ACTIVE`. The code's own comment marks this a "fictitious
     layer" — a manual DB state change, no real payment provider
     (`contract-actions.ts:57-58`).
   - **Revenue share:** the equivalent step is `fundPartnerDeposit`
     (`src/lib/actions/partner-actions.ts:30-93`, owned by feature #14 —
     `partner-programs.md`) — funds the partnership deposit instead of the deal price, and
     flips the *same* `Contract.status` to `ACTIVE` (`partner-actions.ts:85-88`). See §10 for
     a gap this dual path creates.
3. **Work room.** `src/app/(frontend)/(app)/dashboard/contracts/[id]/page.tsx` renders one of
   two right-rail panels depending on whether a `PartnerProgram` exists for the contract
   (`page.tsx:106-131`): `EscrowPanel` (fixed-fee actions: fund/approve/revision) or
   `PartnerProgramPanel` + `PartnerDashboard` (revenue-share tracking, feature #14). Both
   share the same left-column `DeliverableProofer`, and both share `RoomChat`,
   `ShippingPanel` (only if `campaign.hasPhysicalProduct`), and `DisputeButton`.
4. **Submitting a deliverable (provider only, `status === ACTIVE`).** `submitDeliverable`
   (`contract-actions.ts:111-204`) accepts either an uploaded file (≤`MAX_UPLOAD_MB`,
   MIME-checked via `isAllowedUploadMime`, hashed with SHA-256, written through
   `src/lib/storage.ts`, wrapped in a `MediaAttachment` row) or a plain external URL. It
   creates a `DeliverableSubmission(PENDING_REVIEW)` with an incrementing `version`
   (unique per `[contractId, version]`, `schema.prisma:1029`) and flips the contract to
   `SUBMITTED_FOR_REVIEW`. If the campaign has a physical product and no shipping row exists
   yet, the success message nudges the provider to fill it in
   (`contract-actions.ts:196-199`).
5. **Reviewing (brand only, `status === SUBMITTED_FOR_REVIEW`, latest submission
   `PENDING_REVIEW`).** Two choices:
   - `approveAndRelease` (`contract-actions.ts:210-274`): marks the submission `APPROVED`,
     the contract `APPROVED` (+ `completedAt`), releases the `EscrowHold` to
     `RELEASED_TO_PROVIDER`, records `Transaction(ESCROW_RELEASE)` +
     `Transaction(PLATFORM_FEE)`, and marks the `Campaign` `COMPLETED`.
   - `requestRevision` (`contract-actions.ts:277-317`): only while
     `revisionRoundsUsed < revisionRoundsMax` (default cap 2,
     `schema.prisma:863-864`) — marks the submission `REVISION_REQUESTED`, increments
     `revisionRoundsUsed`, returns the contract to `ACTIVE`, and optionally attaches a
     `ContentFeedback` note.
6. **Feedback on a submission (brand).** `addFeedback`/`toggleFeedbackResolved`
   (`contract-actions.ts:322-370`) let the brand leave timestamped notes (optional video
   timecode) on any submission and toggle them resolved — independent of the
   approve/revision decision, usable at any status.
7. **Shipping (provider only, physical-product campaigns).** `updateContractShipping`
   (`contract-actions.ts:376-418`) is an upsert keyed on `contractId` — the provider can
   correct the address any time the campaign has a physical product, not gated by contract
   status beyond party ownership.
8. **Chat.** `sendRoomMessage` (`contract-actions.ts:421-452`) lazily creates the `Conversation`
   (with both parties as `ConversationParticipant`) on first message, tied 1:1 to the
   contract via `Conversation.contractId`.
9. **Disputing / reviewing / completion.** Once `APPROVED`, `getContractReviewContext`
   (feature #11 — `reviews.md`) surfaces a review prompt in the header
   (`[id]/page.tsx:33,86-93`). At any point either party can open a dispute via
   `DisputeButton`/`getContractDisputeContext` (feature #10 — `disputes.md`), which moves
   `status` to `DISPUTED` and later, on resolution, to `APPROVED` or `REFUNDED`
   (`src/lib/actions/dispute-actions.ts:76,126`) — both out of scope for this spec beyond
   noting the transition exists.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Route (list) | `src/app/(frontend)/(app)/dashboard/contracts/page.tsx` | All contracts the user is a party to, as brand or provider |
| Route (room) | `src/app/(frontend)/(app)/dashboard/contracts/[id]/page.tsx` | Composes the work-room UI; branches on `PartnerProgram` presence |
| Fetcher | `src/lib/contracts.ts` | `getContractRoom`, `listContracts` — both scope to `OR:[{business:{userId}},{providerId}]` |
| Shared client/server helpers | `src/lib/contract-room.ts` | Status labels, `can*` gate predicates, timecode parsing — no `server-only`, used by client components too |
| Action | `src/lib/actions/contract-actions.ts` | `fundEscrow, submitDeliverable, approveAndRelease, requestRevision, addFeedback, toggleFeedbackResolved, updateContractShipping, sendRoomMessage` |
| Action (cross-domain) | `src/lib/actions/application-actions.ts:176-343` | `acceptApplication` — where a `Contract` is actually created (feature #6) |
| Action (cross-domain) | `src/lib/actions/partner-actions.ts:30-93` | `fundPartnerDeposit` — the revenue-share equivalent of `fundEscrow` (feature #14) |
| API | `src/app/api/contract-files/[attachmentId]/route.ts` | Authenticated, party-scoped download of uploaded deliverable files |
| Component | `src/components/app/contract-room/deliverable-proofer.tsx` | Submission list/versions, upload form, feedback thread |
| Component | `src/components/app/contract-room/escrow-panel.tsx` | Fixed-fee milestones, fund/approve/revision buttons |
| Component | `src/components/app/contract-room/shipping-panel.tsx` | Shipping form (physical-product campaigns) |
| Component | `src/components/app/contract-room/room-chat.tsx` | Chat UI over `sendRoomMessage` + `ThreadEntry[]` from `src/lib/messages.ts` |
| Component | `src/components/app/dashboard/creator/contract-progress-card.tsx` | Dashboard summary card, read-only |
| Upload limits | `src/lib/deliverable-upload.ts` | `MAX_UPLOAD_BYTES`, `MAX_UPLOAD_MB`, `isAllowedUploadMime` |
| Storage | `src/lib/storage.ts` | Blob put/get used by `submitDeliverable` and the download route |

## 5. Data model

- **`Contract`** (`schema.prisma:850-892`): `id, campaignId, applicationId (unique), businessId,
  providerId, pricingPackageId?, adSpaceAssetId?, agreedPriceILS, platformFeeILS,
  compensationModel (copied from Campaign at creation), deadline, status, revisionRoundsMax
  (default 2), revisionRoundsUsed (default 0), completedAt?`. One-to-one/one-to-many out to
  `EscrowHold, ContractShipping, AdSpaceBooking[], DeliverableSubmission[], ProofOfPlay[],
  Transaction[], Dispute?, Review[], ReviewPrompt[], Conversation[], PartnerProgram?`.
- **`ContractShipping`** (`schema.prisma:895-910`): 1:1 with `Contract`, `recipientName, phone,
  address, cityId?, notes?`.
- **`DeliverableSubmission`** (`schema.prisma:1014-1031`): `contractId, version (unique per
  contract), fileUrl, mediaAttachmentId? (null = external link), notes?, status, submittedAt`.
- **`ContentFeedback`** (`schema.prisma:1034-...`): `submissionId, authorId, timestampSeconds?,
  feedbackText, isResolved`.

Enums: **`ContractStatus`** (`schema.prisma:138-145`) `AWAITING_ESCROW · ACTIVE ·
SUBMITTED_FOR_REVIEW · APPROVED · DISPUTED · REFUNDED`. **`SubmissionStatus`**
(`schema.prisma:196-200`) `PENDING_REVIEW · REVISION_REQUESTED · APPROVED`.
`CompensationModel` and `DeliverableType` are owned by `campaigns.md` (feature #4) —
`compensationModel` is only *copied onto* `Contract` here, never chosen here.

### `ContractStatus` transitions

| From | To | Trigger | Where |
| --- | --- | --- | --- |
| *(created)* | `AWAITING_ESCROW` | Brand accepts an application | `application-actions.ts:224-244` |
| `AWAITING_ESCROW` | `ACTIVE` | Brand funds escrow (fixed fee) | `contract-actions.ts:95` |
| `AWAITING_ESCROW` | `ACTIVE` | Brand funds partnership deposit (revenue share) | `partner-actions.ts:85-88` |
| `ACTIVE` | `SUBMITTED_FOR_REVIEW` | Provider submits a deliverable | `contract-actions.ts:189-192` |
| `SUBMITTED_FOR_REVIEW` | `ACTIVE` | Brand requests a revision (rounds remaining) | `contract-actions.ts:301-305` |
| `SUBMITTED_FOR_REVIEW` | `APPROVED` | Brand approves & releases payment | `contract-actions.ts:234-236` |
| `ACTIVE` / `SUBMITTED_FOR_REVIEW` | `DISPUTED` | Either party opens a dispute | `src/lib/actions/dispute-actions.ts:76` (feature #10) |
| `DISPUTED` | `APPROVED` / `REFUNDED` | Admin resolves the dispute | `dispute-actions.ts:126` (feature #10) |

`DeliverableSubmission.status` moves `PENDING_REVIEW → APPROVED` (approve) or
`PENDING_REVIEW → REVISION_REQUESTED` (revision); a new submission always starts a fresh
`PENDING_REVIEW` row (versions are append-only, never mutated after `APPROVED`/
`REVISION_REQUESTED`).

## 6. API contracts

| Endpoint | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/api/contract-files/[attachmentId]` | GET | `auth()` session + explicit check that the caller is `contract.providerId` or `contract.business.userId` (`route.ts:17-42`) | Streams the uploaded file from `storage`; external-link submissions never go through this route |

All contract mutations are Server Actions (`"use server"` in `contract-actions.ts`), not REST
endpoints — see §4/§7.

## 7. Guards & permissions

| Guard | Where | Checks | On failure |
| --- | --- | --- | --- |
| `requireActiveUser()` | Every fetcher/action in `src/lib/contracts.ts` and `contract-actions.ts` | Session + DB-verified active account (see `auth.md` §7) | Redirect per `requireActiveUser` semantics |
| Party scoping | `getContractRoom`/`listContracts` (`contracts.ts:75-79,265-266`), `loadContractParty` (`contract-actions.ts:25-37`) | `Contract.businessId → business.userId === user.id` OR `Contract.providerId === user.id` | Query returns nothing → `null`/empty list/thrown error |
| Brand-only actions | `loadOwnedContract` (`contract-actions.ts:40-44`) → `fundEscrow, approveAndRelease, requestRevision, addFeedback, toggleFeedbackResolved` | `party === "brand"` | Generic error message, no state change |
| Provider-only actions | Inline checks in `submitDeliverable` (`:122-124`) and `updateContractShipping` (`:388-390`) | `party === "provider"` | Generic error message |
| Download route | `src/app/api/contract-files/[attachmentId]/route.ts:17-42` | Session + explicit party check (own logic, not `requireActiveUser`) | 401 / 403 / 404 |

No status-specific guard exists beyond the ones described inline in §3 (each action re-checks
`contract.status` and, where relevant, `latest.status` itself — there is no shared
"can-transition" table beyond the boolean helpers in `contract-room.ts:20-24,54-68`).

## 8. Known edge cases

- **Idempotent re-accept.** Accepting an application that already has a contract just redirects
  to the existing room rather than erroring (`application-actions.ts:182-184`).
- **Ad-space booking clash.** Accepting an application for a date-bound ad-space asset checks
  for overlapping `RESERVED/CONFIRMED/BROADCASTING` bookings before creating the contract and
  throws if one exists (`application-actions.ts:195-208`) — this happens *before* the contract
  transaction starts, so a race between two simultaneous accepts on the same asset is only as
  safe as Postgres's read-committed isolation for the `findFirst` check (no explicit locking).
- **Silent no-op actions.** `addFeedback` and `toggleFeedbackResolved` return `void` (not
  `ContractActionState`) and silently do nothing on any failure — wrong contract, missing
  submission/feedback id, or unauthorized party (`contract-actions.ts:322-370`). The UI gets no
  error signal if, say, two browser tabs race and the feedback id changed.
- **Shipping not gated by contract status.** A provider can update shipping at any time (even
  after `APPROVED`) as long as the campaign has a physical product — there's no "locked after
  approval" cutoff.
- **Revenue-share contracts skip the fixed-fee panel entirely.** When a `PartnerProgram`
  exists, the room never renders `EscrowPanel`, so a brand has no UI path to `fundEscrow`,
  `approveAndRelease`, or `requestRevision` for that contract — see §10 for why this matters
  beyond a UI nicety.

## 9. Tech debt / TODOs in code

- Both funding paths are explicitly flagged in comments as placeholders for a real payment
  processor: `contract-actions.ts:57-58` ("⚠️ שכבה פיקטיבית... בלי PSP אמיתי") and
  `partner-actions.ts:26-28` (same wording for the partnership deposit).
- `submitDeliverable` accepts a bare external URL as an alternative to a real upload
  (`contract-actions.ts:130-134`) with only a regex format check (`isUrl`,
  `contract-actions.ts:53`) — no reachability/content-type validation of the link itself.

## 10. Findings for the team lead

1. **Fixed-fee approval actions have no `compensationModel` guard — they can misuse a
   revenue-share partnership deposit as a flat-fee release.** `submitDeliverable`,
   `requestRevision`, and `approveAndRelease` (`contract-actions.ts:111-204,210-274,277-317`)
   only check `Contract.status` (and, for the brand actions, that the caller is
   `loadOwnedContract`'s brand party) — none of them checks `compensationModel`. The room UI
   hides `EscrowPanel` (the only place these actions are wired to buttons) whenever a
   `PartnerProgram` exists (`[id]/page.tsx:106-131`), but Server Actions are reachable by a
   direct POST independent of which component renders their trigger — the same pattern
   flagged in `auth.md` §10 finding 1. Concretely: once a revenue-share contract reaches
   `SUBMITTED_FOR_REVIEW` (reachable via `submitDeliverable`, which also has no
   `compensationModel` check), calling `approveAndRelease` would release the *partnership
   deposit* `EscrowHold` in full to the provider via a `Transaction(ESCROW_RELEASE)` for
   `agreedPriceILS` (which is `0` for revenue-share contracts,
   `application-actions.ts:233`) — so the recorded transaction amount would be wrong (0,
   not the deposit) while the escrow itself is still marked `RELEASED_TO_PROVIDER`, the
   `Contract` is marked `APPROVED`, and the `Campaign` is marked `COMPLETED`. This would
   short-circuit the entire checkpoint-based commission payout mechanism (features #14/#18)
   that's supposed to govern how and when a revenue-share deposit is actually paid out.
   Recommend adding an explicit `compensationModel === "FIXED_FEE"` guard to all four actions
   (`fundEscrow` already implicitly requires it since `fundPartnerDeposit` is the only thing
   that funds a `PartnerProgram`'s deposit, but the *approval* side has no equivalent split).
2. **No row-level locking on the ad-space booking clash check.** The overlap query in
   `acceptApplication` (`application-actions.ts:195-208`) runs before the `$transaction` that
   creates the booking, so two concurrent accepts against the same asset/date-range are only
   as safe as Postgres's default isolation level — worth a follow-up look when
   `ad-space-bookings.md` (feature #13) is written, to confirm whether a `SELECT ... FOR
   UPDATE` or a unique constraint is warranted.

No code changes were made — `npm run typecheck` and `npm run lint` both pass cleanly on
`private-area-foundation` (verified as part of this same session, see `auth.md`'s closing
note).
