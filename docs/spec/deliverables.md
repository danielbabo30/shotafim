# Spec: Deliverables + submissions + feedback

> status: documented · updated: 2026-09-16 · owning agent: private-area

## 1. Business purpose

Once a `Contract` is `ACTIVE` (escrow funded, see `contracts.md`), the provider (creator or ad-space owner) needs to hand over work and the brand needs to review it before money moves. This spec covers that middle loop: uploading a deliverable (file or external link), the brand leaving version- and timecode-anchored feedback, requesting a revision (bounded by a per-contract quota), and the final approval that both marks the submission `APPROVED` and (per `contracts.md`) releases escrow. It also covers `ProofOfPlay` — the model built for ad-space "broadcast happened" verification — which turns out to have no working implementation (see §10, finding 1).

This is a sub-feature of the contract room (`contracts.md`, PR #13) — this spec drills into `DeliverableSubmission`/`ContentFeedback`/`ProofOfPlay` specifically rather than re-describing the whole contract lifecycle (escrow funding, disputes, revenue-share) already covered there.

## 2. Roles involved

- **Provider** (`CREATOR` or `AD_SPACE_OWNER`, whichever role holds `Contract.providerId`) — uploads/re-uploads a `DeliverableSubmission`; can view but not create/resolve feedback.
- **Brand** (`BRAND`, via `Contract.businessId` → `BusinessProfile.userId`) — leaves `ContentFeedback` (optionally timestamped for video), toggles feedback resolved/unresolved, requests a revision round, and does the final approve-and-release.
- Both roles reach this through the same `/dashboard/contracts/[id]` room; there's no separate route per role.

## 3. User flow

**Provider submits (first time or a re-submission after revision request):**
1. On `/dashboard/contracts/[id]`, with `Contract.status === "ACTIVE"`, the provider sees `<SubmitDeliverableForm>` inside `DeliverableProofer` (`src/components/app/contract-room/deliverable-proofer.tsx:229-326`), gated by `canSubmit = viewerParty === "provider" && canSubmitDeliverable(status)` where `canSubmitDeliverable` is just `status === "ACTIVE"` (`src/lib/contract-room.ts:24`) — **not** conditioned on contract type (creator content vs. ad-space booking), see §10.
2. They pick **file** (video/image/PDF, ≤50MB, `MAX_UPLOAD_MB`/`MAX_UPLOAD_BYTES`, `src/lib/deliverable-upload.ts:6-7`) or **external URL** (must match `/^https?:\/\/.+/i`, `src/lib/actions/contract-actions.ts:53,130`), plus optional notes, and submits via the `submitDeliverable` server action (`contract-actions.ts:111-204`).
3. On a file upload: bytes are hashed (SHA-256), written to `storage.put()` under `deliverables/<attachmentId>` (`contract-actions.ts:146-166`), and a `MediaAttachment` row is created first with an empty `fileUrl`, then updated to `/api/contract-files/<id>` once the write succeeds (`contract-actions.ts:149-173`). If the storage write throws, the just-created `MediaAttachment` row is deleted and the error re-thrown (`contract-actions.ts:161-166`) — so a mid-write storage failure doesn't leave an orphaned attachment.
4. A `DeliverableSubmission` is created with `version = previousMax + 1` (`contract-actions.ts:176`, enforced unique via `@@unique([contractId, version])`, `schema.prisma:1029`) and `status: PENDING_REVIEW`; `Contract.status` flips to `SUBMITTED_FOR_REVIEW` in the same `$transaction` (`contract-actions.ts:178-193`).
5. If `Campaign.hasPhysicalProduct` and no `ContractShipping` exists yet, the success message appends a nudge to fill in shipping (`contract-actions.ts:196-199`) — see `contracts.md` for that sub-flow.

**Brand reviews:**
1. `DeliverableProofer` renders the active submission (defaulting to the latest, `deliverable-proofer.tsx:39,43-46`) — video with a scrubber, an inline `<img>`, or a download link for other file types, based on MIME (`mediaKindFromMime`, `src/lib/deliverable-upload.ts:26-31`).
2. A version-tab strip lets either party switch between all submitted versions (`deliverable-proofer.tsx:108-137`), each tagged with its `SUBMISSION_STATUS_META` badge (`src/lib/contract-room.ts:41-51`).
3. The brand (only — `canComment = !isProvider && !readOnly`, `deliverable-proofer.tsx:38`) can add `ContentFeedback` via `addFeedback` (`contract-actions.ts:322-348`); if viewing a video, the current playback time is captured into a hidden `timestampSeconds` field (`deliverable-proofer.tsx:159-166`). Clicking a timestamped comment seeks the `<video>` element back to that point (`deliverable-proofer.tsx:196-201,63-68`).
4. The brand can mark any feedback item resolved/unresolved via `<ResolveToggle>` → `toggleFeedbackResolved` (`contract-actions.ts:351-370`); the provider only sees a static "טופל ✓" badge, no toggle (`deliverable-proofer.tsx:210-213`).
5. **Approve:** `approveAndRelease` (`contract-actions.ts:210-274`) — only reachable when `status === "SUBMITTED_FOR_REVIEW"` and the latest submission is `PENDING_REVIEW`. Marks that submission `APPROVED`, the contract `APPROVED` (+`completedAt`), releases the `EscrowHold` if one exists, records `ESCROW_RELEASE`/`PLATFORM_FEE` transactions, and marks the parent `Campaign` `COMPLETED`. Full escrow/money detail is `contracts.md`'s territory; noted here only because it's the terminal state of a submission.
6. **Request revision:** `requestRevision` (`contract-actions.ts:277-317`) — same status precondition, plus `revisionRoundsUsed < revisionRoundsMax` (default max is 2, `schema.prisma:863`). Marks the submission `REVISION_REQUESTED`, the contract back to `ACTIVE`, increments `revisionRoundsUsed`, and — **only if the brand typed a note** — creates one `ContentFeedback` row carrying it (`contract-actions.ts:306-312`). See §8 for the empty-note case.

**Provider sees a revision request:** the room shows a red banner ("המפרסם ביקש תיקונים... עיין בהערות למטה", `deliverable-proofer.tsx:146-150`) on the `REVISION_REQUESTED` submission, and the upload form re-appears below it for the next version.

**Ad-space "proof of play":** no user-facing flow exists — see §10, finding 1.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Route | `src/app/(frontend)/(app)/dashboard/contracts/[id]/page.tsx` | Contract room; unconditionally renders `DeliverableProofer` for every contract (creator, ad-space, or revenue-share) |
| Component | `src/components/app/contract-room/deliverable-proofer.tsx` | Submission viewer (video/image/file), version tabs, feedback thread + composer, `SubmitDeliverableForm` |
| Fetcher | `src/lib/contracts.ts` (`getContractRoom`) | Loads `submissions` + nested `feedback` for the room view (`RoomSubmission`/`RoomFeedback` shapes); does **not** select `proofs` at all |
| Fetcher (read-only proof usage) | `src/lib/dashboard-space.ts:200-260` | Only place that reads `Contract.proofs` (`verifiedByBrand`) — for the ad-space owner's dashboard broadcast-status cards |
| Pure helpers (client+server safe) | `src/lib/contract-room.ts` | `canSubmitDeliverable`, `canApproveContract`, `canRequestRevision`, `SUBMISSION_STATUS_META`, `formatTimecode`/`parseTimecode` |
| Pure helpers | `src/lib/deliverable-upload.ts` | Upload limits/MIME allowlist, shared between the client form and the server action |
| Action | `src/lib/actions/contract-actions.ts` | `submitDeliverable`, `addFeedback`, `toggleFeedbackResolved`, `requestRevision`, `approveAndRelease` (also `fundEscrow`, `updateContractShipping`, `sendRoomMessage` — `contracts.md` territory) |
| API route | `src/app/api/contract-files/[attachmentId]/route.ts` | Authenticated file serving — checks the requester is the contract's provider or business owner before streaming from `storage` |
| Storage | `src/lib/storage.ts` | `StorageDriver` abstraction; only a local-disk driver is implemented (see §9) |

## 5. Data model

- `DeliverableSubmission` (`schema.prisma:1014-1031`): `contractId`, `version` (unique per contract), `fileUrl` (either `/api/contract-files/<mediaAttachmentId>` or a raw external URL), `mediaAttachmentId` (nullable — null means external link), `notes`, `status: SubmissionStatus`, `submittedAt`. Cascades on `Contract` delete.
- `ContentFeedback` (`schema.prisma:1034-1048`): `submissionId`, `authorId` (always the brand's `User.id` by convention — enforced by `loadOwnedContract` in the write path, not by a DB constraint), `timestampSeconds` (nullable — video-only), `feedbackText`, `isResolved`. Cascades on `DeliverableSubmission` delete.
- `ProofOfPlay` (`schema.prisma:1051-1063`): `contractId`, `proofType: ProofType`, `fileUrl`, `notes`, `verifiedByBrand: Boolean`. Cascades on `Contract` delete. **Zero write call sites anywhere in `src/`** — see §10.
- `MediaAttachment` (`schema.prisma:1231-1246`): generic uploaded-file row (`uploaderId`, `fileType: MediaFileType`, `mimeType`, `fileSizeBytes: BigInt`, `checksum`), one-to-one with `DeliverableSubmission` via the unique `mediaAttachmentId` FK.
- `ReviewPrompt` (`schema.prisma:914-925`) sits in the same model group but is a `reviews.md`-domain concern (nudges a user to leave a `Review` after a contract completes) — not detailed here.

**Enums:**
- `SubmissionStatus` (`schema.prisma:196-200`): `PENDING_REVIEW → APPROVED` or `PENDING_REVIEW → REVISION_REQUESTED → PENDING_REVIEW` (a new submission row, not a re-use of the old one — each version is its own row and its own terminal-or-not status). Triggered by `submitDeliverable` (creates `PENDING_REVIEW`), `approveAndRelease` (→ `APPROVED`), `requestRevision` (→ `REVISION_REQUESTED`).
- `ProofType` (`schema.prisma:202-206`): `PHOTO_PROOF · SYSTEM_LOG · ANALYTICS_EXPORT` — defined, never instantiated (§10).
- `DeliverableType` (`schema.prisma:85-91`) and `ProofRequirement` (`schema.prisma:109-114`) exist on `CampaignPartnerTerms`/asset-level config (per `code-map.md`'s enum list) to describe *what kind* of deliverable/proof a campaign expects, but neither `submitDeliverable` nor any other write path validates an uploaded submission against them — any file/URL is accepted regardless of the campaign's declared `DeliverableType`.

## 6. API contracts

| Endpoint | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/api/contract-files/[attachmentId]` | GET | `auth()` session + explicit ownership check (`providerId` or `business.userId` match) | Streams the file from `storage.get()`; 401 if no session, 404 if attachment/contract/object missing, 403 if the session user isn't a party to that submission's contract (`route.ts:16-49`) |

All mutations (`submitDeliverable`, `addFeedback`, `toggleFeedbackResolved`, `requestRevision`, `approveAndRelease`) are Next.js Server Actions, not REST endpoints — invoked directly from the form/button `action={...}` props in `deliverable-proofer.tsx`.

## 7. Guards & permissions

- Every action funnels through `loadContractParty`/`loadOwnedContract` (`contract-actions.ts:25-44`), which calls `requireActiveUser()` then re-queries `prisma.contract` scoped to `OR: [{ business: { userId } }, { providerId: user.id }]` — a party check baked into the query itself (IDOR-safe: a non-party `contractId` simply returns no row, not a 403 after the fact).
- `loadOwnedContract` narrows further to `party === "brand"` — used by `fundEscrow`, `approveAndRelease`, `requestRevision`, `addFeedback`, `toggleFeedbackResolved`, `updateContractShipping` (the last one is actually provider-only inside its own body, see `contract-actions.ts:387-390` — it calls `loadContractParty` directly, not `loadOwnedContract`, despite the similar name).
- `submitDeliverable` uses `loadContractParty` (both parties can load) then manually checks `loaded.party !== "provider"` (`contract-actions.ts:121-124`) — functionally equivalent to a `loadOwnedProviderContract` but not factored out that way; the asymmetry between "load then check party inline" (submit) vs. "a party-narrowing loader" (`loadOwnedContract` = brand) is a naming/consistency wrinkle, not a bug.
- `addFeedback` and `toggleFeedbackResolved` are plain `async function(formData)` server actions (not `useActionState`-shaped, no return value) — failures return silently (`if (!owned) return;`, `contract-actions.ts:335,357`) rather than surfacing an error to the UI, unlike every other action here which returns `ContractActionState`.

## 8. Known edge cases

- **Silent no-op revision request.** If the brand clicks "בקש תיקונים" without typing a note, `requestRevision` still flips the submission to `REVISION_REQUESTED` and burns a revision round, but creates zero `ContentFeedback` rows (`contract-actions.ts:306-312`, conditional on truthy `note`). The provider then sees only the generic "המפרסם ביקש תיקונים" banner with an empty feedback list and no indication of what to change.
- **Version numbering never resets or skips.** `nextVersion = (contract.submissions[0]?.version ?? 0) + 1` (`contract-actions.ts:176`, using the single most-recent submission from `contractInclude`'s `take: 1` — `contract-actions.ts:15`) — if two submissions were ever created concurrently, both would compute the same `nextVersion` and the second `prisma.deliverableSubmission.create` would fail on the `@@unique([contractId, version])` constraint (no explicit retry/lock). Low likelihood given the UI only shows one submit form to one provider at a time, but there's no application-level guard against it either.
- **External-link submissions bypass every file safeguard.** The `fileUrl` text-input path only validates `/^https?:\/\/.+/i` (`contract-actions.ts:53,130-132`) — no MIME/size check, no `MediaAttachment`/checksum, and the brand's browser fetches that URL directly (not proxied through `/api/contract-files/*`), unlike uploaded files.
- **`readOnly` freezes feedback UI on `APPROVED`, not on `DISPUTED`/`REFUNDED`.** `readOnly = room.status === "APPROVED"` (`page.tsx:101`) — a `DISPUTED` or `REFUNDED` contract (see `contracts.md`) still shows an active feedback composer to the brand, since neither of those statuses is `SUBMITTED_FOR_REVIEW` the composer wouldn't functionally do anything blocked by `canApproveContract`, but nothing in `deliverable-proofer.tsx` itself hides the "add feedback" input once a dispute is open.

## 9. Tech debt / TODOs in code

- **`ProofOfPlay`/`ProofType` are fully unused schema** — see §10, finding 1, the headline item for this spec.
- **Production file storage is unimplemented.** `src/lib/storage.ts:89-95`: `STORAGE_DRIVER=blob` rejects every `put`/`get`/`remove` call with `"STORAGE_DRIVER=blob טרם מומש"` (not implemented yet); only the local-disk driver (`.storage/`, explicitly commented "dev only", `storage.ts:11`) actually works. Deploying with real deliverable uploads today would require either implementing the blob driver or shipping with local disk (which won't survive across serverless instances/deploys).
- `DeliverableType` (per-campaign expected format) and `ProofRequirement` (per-asset expected proof) enums exist and are presumably set elsewhere (campaign/asset creation, `campaigns.md`/`marketplace.md` territory) but `submitDeliverable` never reads or validates against either — any file type is accepted for any campaign.
- `addFeedback`/`toggleFeedbackResolved` returning `void` instead of `ContractActionState` (§7) means a permission failure or a not-found submission fails completely silently client-side — no error toast, just nothing happens. Minor UX inconsistency with the rest of the action set.

## 10. Findings for the team lead

1. **`ProofOfPlay` — the ad-space "proof the ad actually ran" feature — has no implementation at all (product gap, likely high-impact).** The schema has a full model for it (`ProofOfPlay`, `ProofType`, `verifiedByBrand`, `schema.prisma:1051-1063`) and `src/lib/dashboard-space.ts:216,253-254` already computes `proofUploaded`/`proofVerified` flags from it for the ad-space owner's broadcast-status dashboard cards — but there is no server action, form, or route anywhere in `src/` that creates a `ProofOfPlay` row (confirmed: zero matches for `proofOfPlay.create` across the codebase). The contract room (`page.tsx:96-102`) renders the exact same `DeliverableProofer` (built for creator content: video/image/PDF submissions with timecode feedback) for ad-space contracts too, with no ad-space-specific "mark as broadcasted" UI. Net effect: `proofUploaded`/`proofVerified` are permanently `false` for every ad-space contract in production, and an ad-space owner currently has no product-supported way to prove a booking ran before the brand approves and escrow releases — approval today rests entirely on the brand's own trust, not on any evidence the platform collects. Recommend either building the missing upload/verify flow or explicitly deciding ad-space proof isn't needed yet and removing the dead dashboard computation so it doesn't look like a working feature.
2. **Revision requests can be sent with zero explanation** (§8) — worth a required-note validation if that's not intentional; today a provider can be sent back to work with no visible reason.
3. **External-link submissions skip every safeguard applied to uploads** (§8) — no size/MIME check, no checksum, direct (non-proxied) fetch by the brand's browser. If deliverable integrity/audit matters (and `MediaAttachment.checksum` suggests it does for uploads), this is an inconsistent bypass, not a deliberate lighter-weight path.
4. Minor: `updateContractShipping`'s Hebrew doc-comment ("רק היוצר... יכול לעדכן") matches its `loadContractParty`-based provider check, but its name reads like it could be brand-facing too (parallel to `loadOwnedContract`'s brand-only convention used by every neighboring action in the same file) — a naming nit, not a bug, flagged in case it causes a future mistaken copy-paste into a brand-side caller.
