# Data Model — overview

> updated: 2026-09-10 · source of truth: `prisma/schema.prisma` · manual mirror in `src/payload-types.ts`.
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

### `UserStatus` (see `auth.md`, `registration.md`)
- `PENDING_ONBOARDING` — default on row creation by the Prisma adapter
  (`prisma/schema.prisma:412`), on first sign-in via any provider. Auth itself never
  changes this; the registration flow (`registration.md`, not yet documented) drives
  `PENDING_ONBOARDING → ACTIVE`.
- `ACTIVE` — required (along with `roles.length > 0` and `termsAcceptedAt != null`)
  for `requireActiveUser` to admit the user into `/dashboard/**`
  (`src/lib/app-user.ts:63-68`).
- `SUSPENDED` / `BANNED` — both treated identically by every auth-adjacent guard
  (`requireActiveUser`, `requireRegistrationUser`): redirect to
  `/sign-in?error=account` (`src/lib/app-user.ts:58-60`, `src/lib/registration.ts:43-45`).
  No code path found in `src/lib/actions/**` that sets a user to `SUSPENDED`/`BANNED`
  yet — likely lands with the admin-dashboard spec (#19).
