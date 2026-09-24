# Spec: Reviews

> status: documented · updated: 2026-09-24 · owning agent: private-area

## 1. Business purpose

Two-sided, post-contract rating and feedback: once a `Contract` is finished, both parties (the
business and the provider — creator or ad-space owner) may leave one star rating (1–5) with free
text and three optional sub-ratings (punctuality, communication, payment fairness) about each
other. Public reviews feed the average rating / review count shown on creator marketplace cards,
a creator's public profile, and a business's public profile — the platform's only reputation
signal that is actually visible to other users (the separate `reliabilityScore` field is not
review-derived, see §10).

## 2. Roles involved

- **Business** (`BusinessProfile`, via its owning `User`) — reviews the provider on a contract
  where it is the business side; is reviewed by the provider.
- **Creator** / **Ad-space owner** (`Contract.providerId`, a `User`) — reviews the business; is
  reviewed by the business. Both provider types share the same `Review.targetId`/`authorId`
  (plain `User`) shape, but only creators get a public aggregate surface (§8).
- **Admin** — no direct review action, but `resolveDispute` (admin-only, `requireAdmin` in
  `src/lib/admin-guard.ts:9`) sets the `completedAt` that unlocks the review flow for disputed
  contracts (§8).

No route-level role restriction beyond "must be an authenticated party to the contract" — enforced
per-query, not by a guard helper (§7).

## 3. User flow

1. A contract reaches a terminal state with `completedAt` set — either the brand approves the
   final deliverable (`approveAndRelease`, `src/lib/actions/contract-actions.ts:210-237`, sets
   `status: "APPROVED"`) or an admin resolves a dispute (`resolveDispute`,
   `src/lib/actions/dispute-actions.ts:96-169`, sets `status: "APPROVED"` or `"REFUNDED"` — both
   branches stamp `completedAt`, line 144-147).
2. **Global nudge**: on every page load of the protected area, `AppLayout`
   (`src/app/(frontend)/(app)/layout.tsx:13-17`) calls `getPendingReviewPrompt()`
   (`src/lib/reviews.ts:56-83`) and passes the result into `AppShell`
   (`src/components/app/app-shell.tsx:15,20,25`), which auto-opens
   `<ReviewPromptDialog mode="auto">` (`src/components/app/review/review-prompt-dialog.tsx:19-34`)
   as a `<dialog>` modal via `showModal()` on mount. It picks the single oldest eligible contract
   for the signed-in user (§5 for the eligibility query).
3. **Inline entry point**: inside the contract room (`/dashboard/contracts/[id]`), if
   `room.status === "APPROVED"` the page calls `getContractReviewContext(id)`
   (`src/lib/reviews.ts:89-111`, no 30-day cap, no dismiss cooldown) and — if the viewer hasn't
   reviewed yet — renders a banner with `<ReviewPromptDialog mode="trigger">`
   (`src/app/(frontend)/(app)/dashboard/contracts/[id]/page.tsx:33,86-92`), which renders as an
   inline "Leave a review" button instead of auto-opening.
4. The dialog form: overall star rating (required, disables submit at 0), free-text feedback
   (required, ≥3 chars enforced server-side), a collapsible "detailed rating" section with three
   optional 1–5 selects, and a "show on public profile" checkbox (defaults checked) — all in
   `review-prompt-dialog.tsx:60-179`.
5. Submit → `submitReview` server action (`src/lib/actions/review-actions.ts:30-75`) revalidates
   `/` (layout) and the contract room, then the `useEffect` on `state.ok` closes the dialog
   (`review-prompt-dialog.tsx:36-38`).
6. **Skip** (auto mode only): a second submit button with `formAction={dismissReviewPrompt}` and
   `formNoValidate` (`review-prompt-dialog.tsx:166-173`) calls
   `src/lib/actions/review-actions.ts:78-98`, which upserts a `ReviewPrompt` row
   (`dismissedAt: now`, `dismissCount` incremented). The modal reappears 3 days later, up to 3
   dismissals total (enforced in the `getPendingReviewPrompt` query, §5) — the comment on the
   `ReviewPrompt` model (`prisma/schema.prisma:912-913`) notes a review can still be left from the
   contract room after the cap silences the auto-modal, which matches the code (the trigger button
   has no dismiss cap of its own).
7. Once a party has reviewed a given contract, `Review` has a `@@unique([contractId, authorId])`
   constraint (`prisma/schema.prisma:1194`); a second attempt is caught as Prisma error `P2002` and
   surfaced as a Hebrew error string (`review-actions.ts:65-68`), not re-attempted anywhere in the
   UI (both entry points already exclude reviewed contracts from their queries, so this is a
   defense-in-depth path, e.g. a stale open tab).

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Layout (data fetch) | `src/app/(frontend)/(app)/layout.tsx:13-17` | fetches the global pending-review prompt on every protected page |
| Layout (render) | `src/components/app/app-shell.tsx:15,20,25` | mounts `ReviewPromptDialog mode="auto"` when a prompt exists |
| Route (inline CTA) | `src/app/(frontend)/(app)/dashboard/contracts/[id]/page.tsx:33,86-92` | fetches per-contract review context, gated on `room.status === "APPROVED"`; renders `mode="trigger"` |
| Component | `src/components/app/review/review-prompt-dialog.tsx` | the review form / dialog, both modes |
| Fetcher | `src/lib/reviews.ts` | `getPendingReviewPrompt` (capped, global), `getContractReviewContext` (uncapped, per-contract) |
| Fetcher (pure) | `src/lib/review-form.ts` | `sentimentFromRating`, `REVIEW_SUB_CRITERIA`, shared `ReviewFormState` type (client + server safe, no `server-only`) |
| Action | `src/lib/actions/review-actions.ts` | `submitReview`, `dismissReviewPrompt` |
| Fetcher (consumer) | `src/lib/creator-profile.ts:63-170` | `getCreatorProfile` — full review list + `ratingAvg`/`reviewCount` for a creator's public profile |
| Fetcher (consumer) | `src/lib/marketplace-query.ts:41-96` | `getMarketplaceCreators` — `rating`/`reviewCount` aggregate per creator card |
| Fetcher (consumer) | `src/lib/business-directory.ts:128-188` | `getBusinessDetail` — last 5 public reviews for a business's public page |
| Route (consumer) | `src/app/(frontend)/(app)/dashboard/marketplace/[id]/page.tsx:74-78,199-` | renders creator's review list + count |
| Route (consumer) | `src/app/(frontend)/(app)/dashboard/businesses/[businessId]/page.tsx:193-215` | renders business's review list |
| Component (consumer) | `src/components/app/marketplace/creator-card.tsx:73-74` | rating badge on marketplace grid |

No API route exists for reviews — reads go through cached server fetchers, writes through server
actions. Only `dev/seed-*` routes touch `Review` outside this feature.

## 5. Data model

`Review` (`prisma/schema.prisma:1176-1196`):

| Field | Notes |
| --- | --- |
| `contractId`, `authorId`, `targetId` | `@@unique([contractId, authorId])` — at most one review per author per contract; `@@index([targetId])` for the "reviews received" lookups |
| `sentiment` | `ReviewSentiment` enum (`POSITIVE`/`NEUTRAL`/`NEGATIVE`), derived purely from `rating` via `sentimentFromRating` (`review-form.ts:9-13`) — not independently settable |
| `rating` | plain `Int`, 1-5, validated in `submitReview` (`review-actions.ts:40-42`); no DB-level `CHECK` constraint |
| `punctualityRating` / `communicationRating` / `paymentRating` | optional `Int?`, validated by `subRating()` (`review-actions.ts:24-27`) — invalid/omitted values silently become `null`, never rejected |
| `isPublic` | `Boolean @default(true)`; only public reviews are read by the marketplace/profile aggregates (`marketplace-query.ts:63`, `creator-profile.ts:106`, `business-directory.ts:153`) — a private review still blocks re-reviewing and still exists, but never surfaces anywhere in the UI (no "my private reviews" view) |
| `createdAt` | no `updatedAt` — reviews are immutable once created; there is no edit or delete action anywhere in the codebase |

`ReviewPrompt` (`prisma/schema.prisma:912-925`, composite key `[contractId, userId]`) — purely a
"nudge state" row per (contract, viewer); not shown in any UI besides gating the auto-modal.

Eligibility query shared shape (`reviews.ts:60-74` for the capped global version,
`reviews.ts:93-101` for the uncapped contract-room version):
`Contract.completedAt IS NOT NULL AND user is a party (business.userId OR providerId) AND no
existing Review by this author for this contract`. The global version additionally requires
`completedAt` within the last 30 days and excludes contracts whose `ReviewPrompt` was either
dismissed ≥3 times or dismissed within the last 3 days.

Status transitions relevant to review eligibility — `Contract.status` (`ContractStatus` enum,
`prisma/schema.prisma:138-145`) does **not** gate `getContractReviewContext` or `submitReview`
directly; only `completedAt IS NOT NULL` does. `completedAt` is written in exactly two places:
- `approveAndRelease` (`contract-actions.ts:236`) → `status: "APPROVED"`.
- `resolveDispute` (`dispute-actions.ts:144-147`) → `status: "APPROVED"` (for `RESOLVED_PAYOUT`
  and `SPLIT`) **or** `status: "REFUNDED"` (for `RESOLVED_REFUND`) — both branches set
  `completedAt` unconditionally (see §10, finding 1).

## 6. API contracts

None — no REST/route-handler surface. All reads are `cache()`-wrapped Prisma queries in
`src/lib/reviews.ts`; all writes are Next.js Server Actions (`"use server"` in
`src/lib/actions/review-actions.ts`) invoked directly from `<form action={...}>`.

## 7. Guards & permissions

- Both fetchers and the action call `requireActiveUser()` (`src/lib/app-user.ts:33`) — redirects
  unauthenticated/inactive users; this is the only identity check.
- **No role check.** Any active user can call `submitReview`/`dismissReviewPrompt` with any
  `contractId`; authorization is entirely implicit in the Prisma `where` clause requiring
  `business.userId === user.id OR providerId === user.id` (`review-actions.ts:11-16`,
  `reviews.ts:63`, `reviews.ts:97`). A non-party submitting a foreign `contractId` gets the generic
  "contract not found or not yet completed" error (`review-actions.ts:48`), not a 403 — consistent
  with the rest of the contract-room actions, not review-specific.
- No admin/moderation path exists for reviews (no delete, no hide, no "report review" action)
  despite `feedbackText` being free text rendered on public profile pages.

## 8. Known edge cases

- A dispute resolved as `RESOLVED_REFUND` still sets `completedAt`, so the **global auto-modal**
  (`getPendingReviewPrompt`, status-agnostic) will still prompt both parties to review each other,
  while the **in-room trigger button** on the same contract stays hidden because it explicitly
  checks `room.status === "APPROVED"` (`contracts/[id]/page.tsx:33`) and a refunded contract's
  status is `"REFUNDED"`. Same underlying data, two different visibility rules — see §10.
- `submitReview` itself does not check `Contract.status` either (only `completedAt IS NOT NULL`,
  `review-actions.ts:11-16`), so a review submitted through the global modal on a refunded contract
  is accepted and stored exactly like a normal completed-contract review.
- A business with multiple locations/contracts only ever gets one `Review` row per contract per
  author — multiple contracts with the same counterparty produce multiple reviews, all counted
  independently in the aggregate (no de-duplication by relationship, only by contract).
- Ad-space owners (`AdSpaceOwnerProfile`) are valid `Review` targets like any other provider (same
  `User.receivedReviews` relation), but there is no public "space owner profile" page and
  `src/lib/ad-spaces.ts` never selects `receivedReviews` — reviews left for an ad-space owner are
  stored but never surfaced anywhere in the product (§10, finding 2).
- `getPendingReviewPrompt` orders by `completedAt: "asc"` and returns only the single oldest
  eligible contract (`reviews.ts:72-74`) — a user with several simultaneously-eligible contracts
  only ever gets nudged for the oldest one per page load; the others surface only via each
  contract's own room banner.

## 9. Tech debt / TODOs in code

- No explicit `TODO`/`FIXME` comments in the reviewed files. The Hebrew doc-comment on
  `ReviewPrompt` (`prisma/schema.prisma:912-913`) describes the dismiss-cap behavior precisely and
  matches the implementation.

## 10. Findings for the team lead

1. **Dispute-refund contracts can still trigger the global review prompt, inconsistently with the
   in-room CTA.** `resolveDispute` (`src/lib/actions/dispute-actions.ts:144-147`) stamps
   `completedAt` on `REFUNDED` contracts exactly like `APPROVED` ones, and
   `getPendingReviewPrompt`/`getContractReviewContext`/`submitReview` all gate purely on
   `completedAt IS NOT NULL` — never on `status`. Only the contract-room page's own
   `room.status === "APPROVED"` check (`dashboard/contracts/[id]/page.tsx:33`) happens to hide the
   inline button for refunds. Net effect: a brand who won a refund dispute against a provider (or
   vice versa) can still be auto-prompted platform-wide to leave — and have left about them — a
   public star rating, while the same UI flow is intentionally hidden inside the room they'd
   naturally look for it in. Worth deciding explicitly whether disputed/refunded contracts should
   be reviewable at all, and if not, filtering on `status: "APPROVED"` (not just `completedAt`) in
   `src/lib/reviews.ts` and `review-actions.ts`.
2. **Ad-space owners receive reviews that are never shown anywhere.** `Review.targetId` accepts any
   provider `User`, including ad-space owners, and the contract-room flow lets brands review them
   like creators. But `src/lib/ad-spaces.ts` (the ad-space marketplace/detail fetchers) never joins
   `receivedReviews`, and there is no public ad-space-owner profile page equivalent to
   `getCreatorProfile`/`getBusinessDetail`. Ad-space owners' `reliabilityScore` is shown
   (`dashboard-space.ts` doesn't reference it, but it's read in dispute enforcement,
   `dispute-actions.ts:201,233-238`), yet their actual review content and rating average are
   collected and then permanently invisible — a real reputation signal with no reader.
3. **`reliabilityScore` and `Review.rating` are two disconnected reputation systems, and the former
   only ever goes down.** Across the whole codebase (`src/lib/actions/dispute-actions.ts:230,237`
   is the only writer besides dev seed routes), `reliabilityScore` is decremented by admin
   enforcement actions and never incremented by anything — not by completing contracts, not by
   receiving positive reviews, not by any recovery/appeal path. A creator or space owner who
   receives one enforcement penalty has a permanently lower "ציון אמינות" than a peer who has never
   been enforced against, regardless of how many 5-star reviews follow. This may be intentional
   (a punitive-only signal) but is worth confirming, since the UI copy ("ציון אמינות והשלמה" /
   "reliability and completion score",
   `src/components/app/dashboard/creator/creator-dashboard.tsx:67-69`) reads as if it reflects
   ongoing performance, not just accumulated penalties.
4. **Review author names are inconsistently redacted between the two public profile surfaces.**
   `business-directory.ts` deliberately truncates the reviewer's name to first-name-only before
   returning it to the public business page (`firstNameOf()`, `business-directory.ts:115-119,184`,
   with a code comment explicitly warning "never email/phone"). `creator-profile.ts` has no such
   truncation — it returns `r.author?.name` verbatim (`creator-profile.ts:161`) to the public
   creator profile page, i.e. a business's full legal/display name is shown next to their review of
   a creator, while the equivalent surface for creators reviewing businesses redacts to a first
   name. Likely an oversight rather than a deliberate asymmetry.
5. **No moderation path for review content.** `feedbackText` is unmoderated free text rendered
   directly on public profile pages (`dashboard/marketplace/[id]/page.tsx`,
   `dashboard/businesses/[businessId]/page.tsx`) with no report/hide/delete action anywhere in the
   codebase (confirmed via repo-wide search — no route, action, or admin screen references
   `Review.id` for anything but creation). Combined with finding 1 (disputed contracts stay
   reviewable), a bad-faith actor mid-dispute has an unmoderated public channel against the other
   party with no recourse currently wired up.
