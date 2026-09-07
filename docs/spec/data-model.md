# Data Model — overview

> updated: 2026-09-07 · source of truth: `prisma/schema.prisma` · manual mirror in `src/payload-types.ts`.
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

- **`UserStatus`** (`schema.prisma:34-39`, see `auth.md` §5,§8): `PENDING_ONBOARDING`
  (default on create) `→ ACTIVE` (set by the registration flow once role + profile +
  terms are complete — see `registration.md`) `→ SUSPENDED | BANNED` (admin action,
  writer not yet located — see `rbac-guards.md`/`admin-dashboard.md`). No code path
  currently transitions `ACTIVE` back to `PENDING_ONBOARDING`. `SUSPENDED`/`BANNED` are
  hard-blocked at `requireActiveUser` (`src/lib/app-user.ts:58-60`); the underlying
  NextAuth `Session` row is not revoked when status changes — enforcement happens only
  on the next `(app)` page load, not immediately.

_(remaining enums: systems-analyst fills this in per-enum while speccing the relevant
feature)_
