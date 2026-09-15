# Data Model — overview

> updated: 2026-09-15 · source of truth: `prisma/schema.prisma` · manual mirror in `src/payload-types.ts`.
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

### `ContractStatus` (see [`contracts.md`](contracts.md) §5 for full detail)
| From | To | Trigger | Where |
| --- | --- | --- | --- |
| *(created)* | `AWAITING_ESCROW` | brand accepts an application | `src/lib/actions/application-actions.ts:224-244` |
| `AWAITING_ESCROW` | `ACTIVE` | escrow funded (fixed fee) or partnership deposit funded (revenue share) | `src/lib/actions/contract-actions.ts:95` · `src/lib/actions/partner-actions.ts:85-88` |
| `ACTIVE` | `SUBMITTED_FOR_REVIEW` | provider submits a deliverable | `contract-actions.ts:189-192` |
| `SUBMITTED_FOR_REVIEW` | `ACTIVE` | brand requests revision | `contract-actions.ts:301-305` |
| `SUBMITTED_FOR_REVIEW` | `APPROVED` | brand approves & releases payment | `contract-actions.ts:234-236` |
| `ACTIVE`/`SUBMITTED_FOR_REVIEW` | `DISPUTED` | either party opens a dispute | `src/lib/actions/dispute-actions.ts:76` |
| `DISPUTED` | `APPROVED`/`REFUNDED` | admin resolves the dispute | `dispute-actions.ts:126` |

Note: the approval actions (`approveAndRelease`, `requestRevision`, `submitDeliverable`) do
not check `compensationModel` — flagged as a finding in `contracts.md` §10.
