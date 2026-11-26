# Spec: Applications / pitches

> status: documented · updated: 2026-09-14 · owning agent: private-area

## 1. Business purpose

The matching layer between an open campaign brief and the creators / ad-space
owners who can fulfill it. A `CampaignApplication` row is the single record for
both directions of that match: a provider (creator or ad-space owner) pitching
themselves to an open brief, *and* a brand inviting a specific provider to one.
Accepting an application is the sole path into a `Contract` (`contracts.md`,
queue #7, not yet specced) — this is the hinge between "browsing/discovery"
(`campaigns.md`, `marketplace.md`) and "paid work" (`contracts.md`,
`payments.md`).

## 2. Roles involved

- **`BRAND`** (`brand` role key) — owns the campaign being pitched to. Reviews
  submitted applications (accept/reject), or brand-initiates a match by
  inviting a creator to an open brief, or by reserving an ad-space asset
  (which auto-creates a single-target campaign + invite in one step).
- **`CREATOR`** (`creator` role key) / **`AD_SPACE_OWNER`** (`space` role key)
  — collectively "provider" in the code (`viewer: "provider"` in
  `CampaignDetail`, `src/lib/applications.ts:87`). Submits pitches to open
  briefs, responds to invitations, withdraws pending pitches.
- A user can hold both `creator` and `space` roles; `TARGET_TYPES_FOR_ROLE`
  (`src/lib/pitch.ts:20-23`) determines which `CampaignTargetType`s
  (`CREATOR`/`AD_SPACE`/`BOTH`) each role can act as a provider for.

## 3. User flow

### 3.1 Provider-initiated: browse → pitch
1. `listDiscoverCampaigns` (`src/lib/applications.ts:409-452`) — open briefs
   (`status: "OPEN_FOR_PITCHES"`) matching the user's provider-capable
   `targetType`s, excluding the user's own brand campaigns and campaigns
   they've already applied to (`applications: { none: { applicantId: user.id } }`).
   Feeds `/dashboard/discover` (not itself part of this spec's file map —
   see `campaigns.md`).
2. Provider opens a campaign at `/dashboard/campaigns/[id]`
   (`src/app/(frontend)/(app)/dashboard/campaigns/[id]/page.tsx`) →
   `getCampaignDetail(id)` (`src/lib/applications.ts:214-342`) computes
   `viewer` (`"owner" | "provider" | "other"`) and `canApply`.
3. If `canApply`, `<ApplyForm>` (`src/components/app/pitch/apply-form.tsx`)
   renders — pre-populated with the provider's active `CreatorPricingPackage`s
   or `AdSpaceAsset`s as selectable "offers" (page-level query,
   `campaigns/[id]/page.tsx:32-56`), each auto-filling price/days on selection.
4. Submit → `submitApplication` server action (`src/lib/actions/
   application-actions.ts:27-132`) validates ownership of any referenced
   package/asset before creating a `CampaignApplication` (`status:
   "SUBMITTED"`, unique per `(campaignId, applicantId)`), then redirects to
   `/dashboard/applications?submitted=1`.

### 3.2 Brand-initiated: invite a creator to an open brief
1. From a creator card/profile (`/dashboard/marketplace` or
   `/dashboard/marketplace/[id]`) a brand opens `<InviteToCampaignDialog>`
   (`src/components/app/pitch/invite-to-campaign-dialog.tsx`), offered only
   the brand's own `OPEN_FOR_PITCHES` campaigns whose `targetType` is
   compatible with a creator (`listBrandOpenCampaigns("CREATOR")`,
   `src/lib/campaigns.ts:90-109`, filters `targetType IN (CREATOR, BOTH)`).
2. `inviteToCampaign` server action (`application-actions.ts:402-458`)
   creates a `CampaignApplication` with `status: "INVITED"`,
   `invitedByUserId` set, `proposedPriceILS`/`estimatedDeliveryDays`
   pre-filled from the creator's cheapest active pricing package (or `0`/`14`
   defaults if none). Unique constraint collision (already invited/applied)
   → friendly error, no throw.
3. Creator sees the invite under "הזמנות שקיבלת" on `/dashboard/applications`
   (`src/app/(frontend)/(app)/dashboard/applications/page.tsx:72-99`) and on
   the campaign page itself. They open `/dashboard/campaigns/[id]`; because
   `getCampaignDetail` treats an existing `INVITED` row for them as still
   "can apply" (`canApply: isProvider && isOpen && (!mine || mine.status ===
   "INVITED")`, `applications.ts:330`), `<ApplyForm>` renders again, this time
   pre-filled from `invitationPrefill` (`applications.ts:331-339`), with copy
   "השלמת ההזמנה — הגשת הצעה" (`apply-form.tsx:46`).
4. Submitting re-runs `submitApplication`, but takes the **update** branch
   (`application-actions.ts:93-106`) instead of `create` — same row,
   `status: "INVITED" → "SUBMITTED"`.

### 3.3 Brand-initiated: reserve an ad-space asset
A shortcut that skips writing a campaign brief by hand: from an ad-space
asset card/detail page, `<ReserveAdSpaceDialog>`
(`src/components/app/pitch/reserve-ad-space-dialog.tsx`) collects a date
window + optional note. `reserveAdSpace` (`application-actions.ts:470-543`)
transactionally creates **both** a new single-purpose `Campaign`
(`targetType: "AD_SPACE"`, title `"שריון — <asset title>"`) **and** its
`CampaignApplication` (`status: "INVITED"`, `adSpaceAssetId` set,
`requestedStartDate`/`requestedEndDate` = the chosen window,
`proposedPriceILS` = the asset's base price,
`estimatedDeliveryDays = ceil((end − now) / day)` — see §8, this is not the
booking length). The owner completes it the same way as §3.2 step 3-4.

### 3.4 Brand reviewing pitches
- **Inbox view**: `listBrandApplications` (`applications.ts:345-374`) — all
  `SUBMITTED` applications across the brand's campaigns, rendered by
  `<ApplicationReviewItem>` on `/dashboard/applications`
  (`applications/page.tsx:22-55`).
- **Per-campaign view**: `getCampaignDetail` also returns the full
  `applications` array when `viewer === "owner"` (all statuses, not just
  `SUBMITTED`), rendered inline on `/dashboard/campaigns/[id]`
  (`campaigns/[id]/page.tsx:73-90`).
- **Accept** (`acceptApplication`, `application-actions.ts:176-343`): only
  from `SUBMITTED`. Checks ad-space date-window overlap against existing
  `AdSpaceBooking`s first (`RESERVED/CONFIRMED/BROADCASTING`), then in one
  `$transaction`: application → `ACCEPTED`, creates the `Contract`
  (`AWAITING_ESCROW`), and — only for `REVENUE_SHARE` campaigns — a
  `PartnerProgram` + `PayoutCheckpoint` rows + `LegalConsent` rows for both
  parties (this branch belongs to `partner-programs.md`, queue #14, not yet
  specced). Also creates an `AdSpaceBooking` (`RESERVED`) when the
  application carried a date window, and flips the campaign to
  `IN_PROGRESS`. Redirects to `/dashboard/contracts/[id]`.
- **Reject** (`rejectApplication`, `application-actions.ts:345-358`): only
  from `SUBMITTED` → `REJECTED`. Silently no-ops otherwise (no error surfaced
  to the caller).
- **Withdraw** (`withdrawApplication`, `application-actions.ts:360-377`,
  provider-side): only from `SUBMITTED` → `WITHDRAWN`, scoped by
  `applicantId: user.id`. Also silently no-ops if not `SUBMITTED`.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Route | `src/app/(frontend)/(app)/dashboard/applications/page.tsx` | Brand inbox / provider pitches+invites list |
| Route | `src/app/(frontend)/(app)/dashboard/campaigns/[id]/page.tsx` | Single-brief view — apply form, invited-provider banner, owner's applications list |
| Component | `src/components/app/pitch/apply-form.tsx` | Pitch/complete-invite form (client) |
| Component | `src/components/app/pitch/application-review-item.tsx` | Brand-side application row — accept/reject |
| Component | `src/components/app/pitch/campaign-brief-view.tsx` | Read-only brief rendering (shared owner/provider) |
| Component | `src/components/app/pitch/invite-to-campaign-dialog.tsx` | Brand → creator invite dialog (used from `marketplace/creator-card.tsx`) |
| Component | `src/components/app/pitch/reserve-ad-space-dialog.tsx` | Brand → ad-space owner reservation dialog (used from `ad-spaces/ad-space-card.tsx`, `dashboard/ad-spaces/[id]/page.tsx`) |
| Fetcher | `src/lib/applications.ts` | `getCampaignDetail`, `listBrandApplications`, `listProviderApplications`, `listDiscoverCampaigns` — all `cache()`-wrapped, all gate through `requireActiveUser` |
| Pure/shared | `src/lib/pitch.ts` | `APPLICATION_STATUS_META`, `TARGET_TYPES_FOR_ROLE`, `applicationFormSchema` (zod), `PLATFORM_FEE_RATE` — no `server-only`, shared by client form + server action |
| Action | `src/lib/actions/application-actions.ts` | `submitApplication`, `acceptApplication`, `rejectApplication`, `withdrawApplication`, `inviteToCampaign`, `reserveAdSpace` |
| Related fetcher | `src/lib/campaigns.ts` (`listBrandOpenCampaigns`) | Feeds the invite dialog's campaign picker |
| Dev seed | `src/app/(frontend)/dev/seed-pitches/route.ts` | Local test data for this feature |

No dedicated API route — all mutations are Next.js server actions, all reads
are server-side fetchers; nothing here is called from outside `(app)/dashboard`.

## 5. Data model

`CampaignApplication` (`prisma/schema.prisma:820-847`):

| Field | Notes |
| --- | --- |
| `id, campaignId, applicantId` | `applicantId` = `User.id` of pitcher/invitee |
| `pricingPackageId?` / `adSpaceAssetId?` | Which of the provider's offers this pitch is based on (mutually exclusive by convention, not DB-enforced) |
| `proposedPriceILS: Decimal(12,2)`, `coverLetter?`, `estimatedDeliveryDays: Int` | Pitch terms |
| `status: ApplicationStatus @default(SUBMITTED)` | See transitions below — the default is overridden explicitly at every call site (`inviteToCampaign`/`reserveAdSpace` always pass `INVITED`, `submitApplication` always passes `SUBMITTED`) |
| `invitedByUserId?` | Set only for brand-initiated rows (`User.id` of the brand); `null` for provider-initiated pitches |
| `requestedStartDate? / requestedEndDate?` | Ad-space booking window; only meaningful when `adSpaceAssetId` is set |
| `@@unique([campaignId, applicantId])` | One application per provider per campaign — enforces "can't double-apply"; also what makes the INVITED→SUBMITTED transition an `update` instead of a `create` |

Relations: `campaign → Campaign` (`onDelete: Cascade`), `applicant/invitedBy →
User`, `pricingPackage → CreatorPricingPackage?`, `adSpaceAsset →
AdSpaceAsset?`, `contract → Contract?` (1:1, created on accept).

### `ApplicationStatus` enum (`schema.prisma:130-136`) and transitions

```
INVITED ──(provider submits/completes, submitApplication update branch)──► SUBMITTED
(no row) ─(provider applies fresh, submitApplication create branch)──────► SUBMITTED
SUBMITTED ──(brand accepts, acceptApplication)───────────────────────────► ACCEPTED   (+ Contract created)
SUBMITTED ──(brand rejects, rejectApplication)───────────────────────────► REJECTED
SUBMITTED ──(provider withdraws, withdrawApplication)────────────────────► WITHDRAWN
```

`INVITED` and `ACCEPTED`/`REJECTED`/`WITHDRAWN` are terminal in the sense that
no action in this codebase transitions *out* of them except the one edge
above (`INVITED → SUBMITTED`) — there is no "decline invitation" action (see
§8) and no un-reject/un-withdraw.

## 6. API contracts

None — no REST/API-route surface. All I/O is Next.js Server Actions
(`"use server"` functions imported directly into client components /
`<form action={...}>`) plus server-only cached fetchers. Client-side input
validation for the pitch form is the shared `applicationFormSchema` (zod) in
`src/lib/pitch.ts:25-39`; the invite (`inviteToCampaign`) and reserve
(`reserveAdSpace`) actions validate their `FormData` by hand (no zod schema)
inline in `application-actions.ts`.

## 7. Guards & permissions

| Action/fetcher | Gate | Ownership check |
| --- | --- | --- |
| All fetchers in `applications.ts` | `requireActiveUser()` | `getCampaignDetail` computes `viewer` from `campaign.business.userId === user.id`; `listBrandApplications`/`listDiscoverCampaigns` filter by `user.roleKeys` |
| `submitApplication` | `requireActiveUser()` | Rejects own-campaign self-application (`business.userId === user.id`); validates `campaign.targetType` against the caller's `roleKeys` via `TARGET_TYPES_FOR_ROLE`; validates package/asset ownership by `userId` before use |
| `acceptApplication` / `rejectApplication` | `requireActiveUser()` via `loadOwnedApplication` | Requires `roleKeys.includes("brand")`, then scopes the application lookup to `campaign.businessId === (caller's) BusinessProfile.id` — a brand can only see/act on applications to campaigns they own |
| `withdrawApplication` | `requireActiveUser()` | Scoped by `applicantId: user.id` directly in the query |
| `inviteToCampaign` / `reserveAdSpace` | `requireActiveUser()` via `requireBrandBusiness()` | Requires `roleKeys.includes("brand")` + an existing `BusinessProfile`; `inviteToCampaign` additionally re-checks `campaign.businessId === ctx.businessId` and `campaign.status === "OPEN_FOR_PITCHES"` |

No role/ownership check is duplicated in the UI layer beyond what the server
actions enforce — components trust the fetcher-computed `viewer`/`canApply`
flags, but a direct POST to a server action re-validates independently (this
is Next.js server-action semantics, not a bespoke guard).

## 8. Known edge cases

- **No "decline invitation" action.** An `INVITED` application has no path to
  `REJECTED`/`WITHDRAWN` from the invitee's side — only completing it
  (`INVITED → SUBMITTED`) or, from the brand's side, none at all (brand also
  cannot cancel an invite it sent). An unwanted invite sits in the invitee's
  "הזמנות שקיבלת" list indefinitely.
- **No invitation expiry/TTL.** Nothing times out an `INVITED` row; an open
  brief can accumulate invitations that are never answered.
- **`reserveAdSpace`'s `estimatedDeliveryDays` is computed from "now", not
  from the booking's own start date** (`application-actions.ts:510`:
  `Math.ceil((end!.getTime() - Date.now()) / 864e5)`) — for a booking window
  that starts well in the future, the displayed "days" overstates the actual
  reservation length. Cosmetic only for `REVENUE_SHARE`/ad-space accepts
  (§5's transition diagram: `Contract.deadline` there is taken from
  `bookingWindow.end`, not from `estimatedDeliveryDays`), but the number is
  still shown to the ad-space owner as if it were the booking duration.
- **Rejecting a non-`SUBMITTED` application, or withdrawing a non-`SUBMITTED`
  one, silently no-ops** (`rejectApplication`/`withdrawApplication` both
  `return` with no error) rather than surfacing "already handled" — a
  double-click or a stale page reference just does nothing, with no user
  feedback either way.
- A user with both `creator` and `space` roles applying to a `BOTH`-target
  campaign only ever gets **one** `CampaignApplication` row (unique on
  `(campaignId, applicantId)`) — the UI can't distinguish "applying as
  creator" vs. "applying as ad-space owner" for the same brief; whichever
  `pricingPackageId`/`adSpaceAssetId` they pick in the one form is the only
  offer recorded.

## 9. Tech debt / TODOs in code

- **`submitApplication`'s update branch never updates `adSpaceAssetId`**
  (`application-actions.ts:93-106`) — when completing an `INVITED`
  reservation (from `reserveAdSpace`, §3.3), `<ApplyForm>` still renders an
  editable "שטח פרסום" dropdown listing *all* of the owner's active
  `AdSpaceAsset`s (populated unconditionally in
  `campaigns/[id]/page.tsx:43-56` whenever the caller has the `space` role
  and the campaign's `targetType` allows it — not scoped to the one asset
  that was actually reserved). If the owner picks a different asset than the
  one `reserveAdSpace` originally set, the selection is silently discarded:
  the create branch of `submitApplication` does read `data.adSpaceAssetId`,
  but the update branch only conditionally carries over `pricingPackageId`
  (line 103) — there is no equivalent line for `adSpaceAssetId`. The
  application keeps pointing at the originally-reserved asset regardless of
  what the form shows selected. Worth either hiding the asset picker when
  completing an invite that already has one, or wiring the update branch to
  honor a changed selection.
- `inviteToCampaign` does not independently validate that the campaign's
  `targetType` is one the invited creator is eligible for (`submitApplication`
  does this check via `TARGET_TYPES_FOR_ROLE`, `inviteToCampaign` does not).
  In practice the only UI path into `inviteToCampaign`
  (`listBrandOpenCampaigns("CREATOR")`, `src/lib/campaigns.ts:90-109`)
  already pre-filters to compatible campaigns, so this isn't reachable
  through normal use — but the server action itself has no defense-in-depth
  check, unlike its sibling. A mismatched invite (if ever created) would be
  permanently stuck: `getCampaignDetail`'s `canApply`/`isProvider` logic
  (`applications.ts:311-330`) requires the campaign's `targetType` to be in
  the invitee's `allowedTargets`, so the invitee could never see/complete it,
  and there is no cancel path either (see §8).

## 10. Findings for the team lead

1. **Stuck ad-space asset selection on invite completion**
   (`application-actions.ts:93-106`, `campaigns/[id]/page.tsx:43-56`) — see
   §9. Low severity (cosmetic confusion, not data corruption — the asset that
   was actually reserved is what stays booked), but worth a UX fix: either
   don't offer the asset dropdown at all when completing a `reserveAdSpace`
   invite (it was already chosen by the brand), or make the update branch
   respect a changed choice.
2. **No way to decline an invitation or cancel one you sent** (§8). Not a
   bug, but a real product gap: recipients of unwanted brand invites (and
   brands who invited by mistake) have no action to take beyond ignoring it.
   Worth confirming whether this is intentionally deferred or should be
   scoped into `contracts.md`/a follow-up.
3. Everything else found (silent no-ops on reject/withdraw of an
   already-settled application, the ad-space "days" cosmetic miscalculation,
   the `inviteToCampaign` defense-in-depth gap) is minor/cosmetic — listed in
   §8–9 for reference, not flagged as urgent.
