# Data Model — overview

> updated: 2026-09-17 · source of truth: `prisma/schema.prisma` · manual mirror in `src/payload-types.ts`.
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

### `UserStatus` (full detail in `docs/spec/registration.md` §5, `docs/spec/auth.md` when merged)
| From | To | Trigger |
| --- | --- | --- |
| *(new row)* | `PENDING_ONBOARDING` | Default on `User` create via `PrismaAdapter` on first sign-in |
| `PENDING_ONBOARDING` | `ACTIVE` | `completeRegistration` action, step 3 of registration (`src/lib/actions/registration-actions.ts:96`) — the only forward edge out of onboarding; no path back into `PENDING_ONBOARDING` once `ACTIVE` |
| `ACTIVE` | `SUSPENDED`/`BANNED` | Admin enforcement action on a dispute (`src/lib/actions/dispute-actions.ts:220-224`) — see future `disputes.md` |

`User.roles` (array) is written by exactly two production code paths, both
in `docs/spec/registration.md`'s scope: `saveRoles` (step 2, full replace)
and implicitly finalized by `completeRegistration` (step 3, no further
writes to the array itself). No code path adds a role to an already-`ACTIVE`
user — see `registration.md` §10.
