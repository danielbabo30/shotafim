# Data Model — overview

> updated: 2026-09-04 · source of truth: `prisma/schema.prisma` · manual mirror in `src/payload-types.ts`.
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
_(systems-analyst fills this in per-enum while speccing the relevant feature)_

- `SubmissionStatus` (on `DeliverableSubmission`): `PENDING_REVIEW` (created by `submitDeliverable`) → `APPROVED` (via `approveAndRelease`, terminal for that version) or → `REVISION_REQUESTED` (via `requestRevision`; the *next* submission version starts fresh at `PENDING_REVIEW`, this row doesn't get reused). See `deliverables.md`.

## Known-unimplemented models
- `ProofOfPlay` (`prisma/schema.prisma:1051-1063`) — has zero `.create()`/`.update()` call sites in `src/`; only ever read (`src/lib/dashboard-space.ts:216`) or written by dev-seed fixtures. The ad-space "proof of broadcast" feature this model was built for does not exist in the app today. See `deliverables.md` §10.
