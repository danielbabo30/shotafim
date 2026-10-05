# Data Model — overview

> updated: 2026-09-21 · source of truth: `prisma/schema.prisma` · manual mirror in `src/payload-types.ts`.
> systems-analyst expands this; data-cms updates it on every schema change.

## Model groups

| Group | Models | Main enums |
| --- | --- | --- |
| Users + auth | `User · Account · Session · VerificationToken` | `UserRole · UserStatus` |
| Profiles | `BusinessProfile · BusinessLocation · CreatorProfile · CreatorChannel · CreatorPricingPackage · AdSpaceOwnerProfile · AdSpaceAsset` | `ProfileStatus · VerificationStatus · LegalEntityType · BusinessModel · CreatorTaxStatus · SocialPlatform · AdSpaceType · AdPricingModel` |
| Categories + cities | `City · CreatorCategory · BusinessCategory · CampaignCategory · AdSpaceAssetCategory` | `IsraelDistrict` |
| Campaigns | `Campaign · CampaignApplication · CampaignPartnerTerms` | `CampaignTargetType · CampaignStatus · ApplicationStatus · CompensationModel` |
| Contracts + delivery | `Contract · ContractShipping · DeliverableSubmission · ContentFeedback · ProofOfPlay · ReviewPrompt` | `ContractStatus · DeliverableType · SubmissionStatus · ProofType · ProofRequirement` |
| Money | `EscrowHold · Transaction · Invoice · AdSpaceBooking · PayoutCheckpoint` | `EscrowStatus · TransactionType · TransactionStatus · InvoiceDocumentType · InvoiceProvider · BookingStatus · CheckpointStatus` |
| Communication | `Conversation · ConversationParticipant · Message · Notification` | `NotificationType` |
| Disputes + reviews | `Dispute · DisputeMessage · Review · UserBlockReport` | `DisputeReason · DisputeStatus · ReviewSentiment · BlockReportReason · BlockReportStatus` |
| Partnerships + tracking | `PartnerProgram · TrackedSite · AffiliateClick · AttributedOrder · MaintenanceWindow · PluginAlert · PartnerGateEvent · AnomalyFlag · EnforcementAction` | `CommissionType · CommissionBasis · CommissionScope · AttributionMode · AttributionMethod · TopUpMode · ProgramStatus · SitePlatform · SiteStatus · OrderCommissionStatus · PluginAlertType · EnforcementType · GateChoice · AnomalyType · AnomalySeverity` |
| Infra | `AuditLog · LegalConsent · MediaAttachment` | `ConsentDocumentType · MediaFileType` |

## Status transitions

### `UserStatus` (see [`auth.md`](auth.md) §5/§8, [`registration.md`](registration.md) §5/§7)
`PENDING_ONBOARDING` (Prisma default on row creation, set by the Auth.js `PrismaAdapter` on
first sign-in) `→ ACTIVE`, triggered exclusively by `completeRegistration`'s transaction commit
(`src/lib/actions/registration-actions.ts:96`) — the only code path (outside dev/seed routes)
that sets `status: "ACTIVE"`. `→ SUSPENDED | BANNED` — admin action; **no writer found anywhere
in `src/`** as of this pass (see `rbac-guards.md` §10 — there's no production path to admin
capability either, so this is presumably deferred to `admin-dashboard.md`, queue #19). No code
path transitions `ACTIVE` back to `PENDING_ONBOARDING`. `SUSPENDED`/`BANNED` are hard-blocked at
`requireActiveUser()` (`src/lib/app-user.ts:58-60`), but the underlying Auth.js `Session` row is
**not** revoked when status changes — enforcement happens only on the next `(app)` page load,
not immediately.

### `ApplicationStatus` (see [`applications.md`](applications.md) §5)
```
INVITED  ──(provider completes, submitApplication update branch)──► SUBMITTED
(none)   ──(provider applies fresh, submitApplication create branch)──► SUBMITTED
SUBMITTED ──(brand accepts, acceptApplication)───► ACCEPTED   (+ Contract created)
SUBMITTED ──(brand rejects, rejectApplication)───► REJECTED
SUBMITTED ──(provider withdraws, withdrawApplication)──► WITHDRAWN
```
`INVITED` created by `inviteToCampaign`/`reserveAdSpace` (brand-initiated); `SUBMITTED` (fresh)
created by `submitApplication` (provider-initiated). No action transitions out of
`ACCEPTED`/`REJECTED`/`WITHDRAWN`, and there is no "decline invitation" action out of `INVITED`
— see `applications.md` §8.

### `CampaignStatus` (see [`campaigns.md`](campaigns.md) §5/§10)
- `— → DRAFT`: `createCampaign` with `intent=draft`. **No path exists from `DRAFT →
  OPEN_FOR_PITCHES`** — a saved draft is a dead end today (see `campaigns.md` §10).
- `— → OPEN_FOR_PITCHES`: `createCampaign` with `intent=publish`.
- `OPEN_FOR_PITCHES → IN_PROGRESS`: accepting a `CampaignApplication`
  (`src/lib/actions/application-actions.ts`, inside a transaction, guarded by
  `status === "OPEN_FOR_PITCHES"`).
- `→ COMPLETED`: contract completion (`src/lib/actions/contract-actions.ts`).
- `→ CANCELLED`: **no code path found anywhere** — the status exists in the enum and has UI
  treatment, but nothing ever sets it (see `campaigns.md` §10).

### `ContractStatus` (see [`contracts.md`](contracts.md) §5)
| From | To | Trigger | Where |
| --- | --- | --- | --- |
| *(created)* | `AWAITING_ESCROW` | brand accepts an application | `src/lib/actions/application-actions.ts:224-244` |
| `AWAITING_ESCROW` | `ACTIVE` | escrow funded (fixed fee) or partnership deposit funded (revenue share) | `src/lib/actions/contract-actions.ts:95` · `src/lib/actions/partner-actions.ts:85-88` |
| `ACTIVE` | `SUBMITTED_FOR_REVIEW` | provider submits a deliverable | `contract-actions.ts:189-192` |
| `SUBMITTED_FOR_REVIEW` | `ACTIVE` | brand requests revision | `contract-actions.ts:301-305` |
| `SUBMITTED_FOR_REVIEW` | `APPROVED` | brand approves & releases payment | `contract-actions.ts:234-236` |
| `ACTIVE`/`SUBMITTED_FOR_REVIEW` | `DISPUTED` | either party opens a dispute | `src/lib/actions/dispute-actions.ts:76` |
| `DISPUTED` | `APPROVED`/`REFUNDED` | admin resolves the dispute | `dispute-actions.ts:126` |

**Finding:** the approval actions (`approveAndRelease`, `requestRevision`, `submitDeliverable`)
do not check `compensationModel` — a revenue-share contract could have its partnership deposit
released as if it were a flat-fee payment. Flagged in `contracts.md` §10 finding 1.

### `SubmissionStatus` (on `DeliverableSubmission`, see [`deliverables.md`](deliverables.md))
`PENDING_REVIEW` (created by `submitDeliverable`) → `APPROVED` (via `approveAndRelease`,
terminal for that version) or → `REVISION_REQUESTED` (via `requestRevision`; the *next*
submission version starts fresh at `PENDING_REVIEW` — this row is never reused/mutated after
reaching a terminal-ish state).

### `ProfileStatus` / `VerificationStatus` (`CreatorProfile`, `AdSpaceOwnerProfile`,
`BusinessProfile` — see [`marketplace.md`](marketplace.md) §2/§5)
`ProfileStatus` defaults to `ACTIVE` on profile creation; `SUSPENDED`/`INACTIVE` transitions not
traced yet (likely admin-triggered). Both marketplace fetchers (`marketplace-query.ts`,
`ad-spaces.ts`) only surface `status: "ACTIVE"` rows, so a suspended profile silently disappears
from both marketplaces with no user-facing explanation. `VerificationStatus` defaults to
`PENDING → VERIFIED`/`REJECTED`; read-only in the marketplace feature (drives the "verified"
badge) — who writes the transition isn't traced yet (likely `admin-dashboard.md`).

## Known-unimplemented models
- **`ProofOfPlay`** (`prisma/schema.prisma:1051-1063`) — has zero `.create()`/`.update()` call
  sites in `src/`; only ever read (`src/lib/dashboard-space.ts:216,253-254`) or written by
  dev-seed fixtures. The ad-space "proof of broadcast" feature this model was built for does not
  exist in the app today — the flags computed from it are permanently `false`. See
  [`deliverables.md`](deliverables.md) §10 finding 1.
- **`BusinessProfile` has no public read path.** `getBusinessDirectory`/`getBusinessDetail`
  (`src/lib/business-directory.ts`) already query it safely (non-PII field selection, `status:
  "ACTIVE", deletedAt: null`) but only power the gated `/dashboard/businesses` route. The public
  `/explore` ("public index") route that queue item #22 names has no model/fetcher reference at
  all — it's a static placeholder, not merely missing a public variant of an existing query. See
  [`public-index.md`](public-index.md).

_(remaining enums: systems-analyst fills this in per-enum while speccing the relevant feature)_
