# Spec: Campaigns (create, wizard, brief)

> status: documented · updated: 2026-09-12 · owning agent: private-area

## 1. Business purpose
Lets a **brand** (`BRAND` role, i.e. a `BusinessProfile`) publish a campaign brief — what they
want (creator content, ad-space placement, or both), what they'll pay (a fixed fee via escrow,
or a revenue-share commission), and what they need delivered — so creators and ad-space owners
can discover it and pitch. This spec covers brief authoring (the wizard), the campaign list, and
the read side of the brief detail page. The pitching/acceptance side of the same detail page
(`CampaignApplication`, offers, invitations) is `applications.md` (queue #6, not yet
documented); this spec only goes as deep into it as needed to explain how a campaign's `status`
changes after creation.

## 2. Roles involved
- **BRAND** — the only role that can create a campaign (`user.roleKeys.includes("brand")`,
  enforced in both the page and the server action). Must additionally have a `BusinessProfile`
  row (created during registration/business onboarding, out of scope here) before the wizard
  will render.
- **CREATOR** / **AD_SPACE_OWNER** — read the published brief and submit
  `CampaignApplication`s against it (see `applications.md`); this spec documents only that the
  brief becomes visible to them once `status = OPEN_FOR_PITCHES`.
- **ADMIN** — no campaign-specific admin surface found in this area (see `admin-dashboard.md`,
  not yet documented, for whatever admin tooling exists elsewhere).

## 3. User flow

**List (`/dashboard/campaigns`):** `CampaignsPage`
(`src/app/(frontend)/(app)/dashboard/campaigns/page.tsx:19-31`) requires an active user with the
`brand` role key (redirects to `/dashboard` otherwise, `:24-25`) and loads `getBrandContext()` +
`listBrandCampaigns()` in parallel. Three states:
- No `BusinessProfile` yet → static "you need a business profile first" card (`:57-63`).
- Empty list → empty-state card with a "create first brief" CTA (`:64-78`).
- Otherwise → one card per campaign with title, target-type label, deliverable chips, budget,
  end date, application count, and a link into the detail page (`:80-144`). A `?created=`
  query param (set by the create action's redirect) shows a one-time "saved successfully"
  banner (`:51-55`) — the banner is unconditional on the param merely being *present*; its value
  (the new campaign id) is never read or used (`:22,51`).

**Create (`/dashboard/campaigns/new` → `CampaignWizard`):**
1. Same `brand`-role + `BusinessProfile` guard as the list page
   (`new/page.tsx:11-14,25-33`); no profile → same static message, no wizard rendered.
2. `CampaignWizard` (`src/components/app/campaign-wizard.tsx`, client component, 882 lines) is a
   3-step form driven by local `useState` + one `useActionState(createCampaign, …)`
   (`:77`):
   - **Step 1 — basics:** target type (`CampaignTargetType`: `CREATOR` / `AD_SPACE` / `BOTH`,
     from `CAMPAIGN_TARGET_TYPES`), compensation model (`FIXED_FEE` or `REVENUE_SHARE` — the
     schema's third value `HYBRID` is marked `available: false` in
     `COMPENSATION_MODEL_OPTIONS` (`src/lib/partner-terms.ts:25-30ff`) and not offered in the
     UI), title, business location (optional, from the brand's `BusinessLocation`s), free-text
     description, optional brief-assets URL.
   - **Step 2 — deliverables (+ budget unless revenue-share):** multi-select
     `DeliverableType` chips (`DELIVERABLE_OPTIONS`) and, only when `compensationModel !==
     "REVENUE_SHARE"`, a total-budget field and an optional end date.
   - **Step 3 — either:**
     - `FIXED_FEE` → a purely informational panel: no payment is taken here; the budget will be
       escrowed only once a specific creator/space offer is accepted, and released only on
       final-deliverable approval (`campaign-wizard.tsx:802-816`).
     - `REVENUE_SHARE` → the revenue-share partnership terms form (commission type/value/basis/
       scope, estimated purchases, assumed AOV, attribution mode, destination URL, optional
       coupon discount %, optional interim payout checkpoint date — the final checkpoint is
       always end-date+14 days, computed by `normalizeCheckpoints`,
       `campaign-wizard.tsx:770-786`, `src/lib/partner-terms.ts`). See `partner-programs.md`
       (queue #14, not yet documented) for the full revenue-share domain.
   - Two submit buttons are present **on every step, not just the last one**
     (`campaign-wizard.tsx:825-859`): "שמירה כטיוטה" (`intent=draft`) always available, and
     "המשך"/"פרסום בריף לקבלת הצעות" (`intent=publish`) only reachable from step 3. So a brand
     can save a draft from step 1 with only a title typed in.
3. `createCampaign` server action (`src/lib/actions/campaign-actions.ts:20-156`):
   re-checks `brand` role and `BusinessProfile` existence (`:26-39`), parses the form against
   `campaignFormSchema` (`src/lib/campaign-brief.ts:71-125` — one schema for both intents;
   `publish` additionally requires ≥20-char description, ≥1 deliverable, and (for non-rev-share)
   a positive budget, via `superRefine`, `:101-124`), and for `REVENUE_SHARE` additionally
   validates `partnerTermsSchema` (`src/lib/partner-terms.ts`). Verifies any chosen
   `locationId` actually belongs to this business (`:100-107`, prevents cross-tenant location
   IDs). Creates one `Campaign` row (+ nested `CampaignPartnerTerms` create when rev-share,
   `:124-149`) with `status: intent === "publish" ? "OPEN_FOR_PITCHES" : "DRAFT"`. Revalidates
   and redirects to `/dashboard/campaigns?created=<id>` (`:154-155`).

**Detail (`/dashboard/campaigns/[id]`):** `getCampaignDetail(id)` (`src/lib/applications.ts`,
documented fully in `applications.md`) resolves the viewer as `"owner"` (brand that owns it),
`"provider"` (creator/space whose role matches `targetType` and who isn't the owner), or
`"other"`. A `DRAFT` or `CANCELLED` campaign is invisible (404 via `notFound()`) to anyone but
its owner (`applications.ts:267-271`). The page (`campaigns/[id]/page.tsx`) renders
`CampaignBriefView` (read-only brief display, shared between owner/provider) plus, depending on
viewer role: the applications list + review UI for the owner, an apply form for an eligible
provider, or a neutral "not relevant to your account" message for `"other"`. **There is no edit
or publish-from-draft UI anywhere on this page** — see §10.

## 4. File map
| Layer | Path | Role |
| --- | --- | --- |
| Route | `src/app/(frontend)/(app)/dashboard/campaigns/page.tsx` | Brand's campaign list |
| Route | `src/app/(frontend)/(app)/dashboard/campaigns/new/page.tsx` | Renders `CampaignWizard` (guarded) |
| Route | `src/app/(frontend)/(app)/dashboard/campaigns/[id]/page.tsx` | Brief detail — owner/provider/other views |
| Component | `src/components/app/campaign-wizard.tsx` | 3-step client form (`"use client"`) |
| Component | `src/components/app/campaign-status-badge.tsx` | `CampaignStatus` → tinted chip |
| Component | `src/components/app/pitch/campaign-brief-view.tsx` | Read-only brief card, shared owner/provider |
| Component | `src/components/app/pitch/application-review-item.tsx` | Owner-side application row (see `applications.md`) |
| Component | `src/components/app/pitch/apply-form.tsx` | Provider-side offer form (see `applications.md`) |
| Fetcher | `src/lib/campaigns.ts` (`getBrandContext`, `listBrandCampaigns`, `listBrandOpenCampaigns`) | `cache()`-wrapped reads scoped to the caller's `BusinessProfile` |
| Fetcher | `src/lib/applications.ts` (`getCampaignDetail`) | Brief + applications, viewer-role resolution (see `applications.md`) |
| Schema/constants (isomorphic, no `server-only`) | `src/lib/campaign-brief.ts` | `campaignFormSchema` (zod), target-type/deliverable option lists + labels, `CAMPAIGN_STATUS_META` |
| Schema/constants | `src/lib/partner-terms.ts` | `partnerTermsSchema`, `normalizeCheckpoints`, compensation-model/commission label maps |
| Action | `src/lib/actions/campaign-actions.ts` (`createCampaign`) | The only write path for `Campaign` rows — see §10, no update/cancel action exists |
| Action (status transition, elsewhere) | `src/lib/actions/application-actions.ts:331-334` | `OPEN_FOR_PITCHES → IN_PROGRESS` when an application is accepted |
| Action (status transition, elsewhere) | `src/lib/actions/contract-actions.ts:266-268` | `→ COMPLETED` when a contract completes |

## 5. Data model
`prisma/schema.prisma`:
- `Campaign` (`:789-818`) — `businessId` (owner), `locationId?`, `title`, `description`,
  `targetType: CampaignTargetType`, `targetPlatforms: String[]` (derived from `deliverables` via
  `platformsFromDeliverables`, `campaign-brief.ts:47-57`, not independently editable),
  `deliverables: DeliverableType[]`, `briefAssetsUrl?`, `hasPhysicalProduct: Boolean`,
  `compensationModel: CompensationModel` (default `FIXED_FEE`), `totalBudgetILS: Decimal(12,2)`,
  `startDate?`/`endDate?` (only `endDate` is ever set by the app — `startDate` is defined but
  unused for `Campaign` itself; the revenue-share path has its own `startDate`/`endDate` on
  `CampaignPartnerTerms`), `status: CampaignStatus` (default `DRAFT`).
- Relations: `business` (owner, cascade-deletes campaigns), `location?`, `applications`
  (`CampaignApplication[]`), `contracts`, `categories` (`CampaignCategory[]` — relation exists in
  schema but nothing in the campaign-creation path writes to it; no category picker in the
  wizard, see §9), `conversations`, `partnerTerms?` (`CampaignPartnerTerms`, one-to-one, only
  present when `compensationModel = REVENUE_SHARE`).
- `enum CampaignStatus` (`:122-128`): `DRAFT → OPEN_FOR_PITCHES → IN_PROGRESS → COMPLETED`, plus
  `CANCELLED`. Transitions found in code:
  - `— → DRAFT`: `createCampaign` with `intent=draft` (`campaign-actions.ts:123`).
  - `— → OPEN_FOR_PITCHES`: `createCampaign` with `intent=publish` (same line). **No path
    exists from `DRAFT → OPEN_FOR_PITCHES`** — see §10.
  - `OPEN_FOR_PITCHES → IN_PROGRESS`: accepting a `CampaignApplication`
    (`application-actions.ts:331-334`, inside a transaction, guarded by
    `application.campaign.status === "OPEN_FOR_PITCHES"`).
  - `→ COMPLETED`: contract completion (`contract-actions.ts:266-268`).
  - `→ CANCELLED`: **no code path found anywhere** (`grep CANCELLED` across `src/lib/actions/`
    is empty) — the status exists in the enum, has a label/color in `CAMPAIGN_STATUS_META`
    (`campaign-brief.ts:64`), and is defended against in read paths
    (`applications.ts:269`), but nothing ever sets it. See §10.
- `enum CampaignTargetType` (`:116-120`): `CREATOR | AD_SPACE | BOTH`.
- `enum DeliverableType` (`:85-91`): `IG_REEL | IG_STORY | TIKTOK_VIDEO | YOUTUBE_INTEGRATION |
  EVENT_ATTENDANCE`.
- `enum CompensationModel` (`:289-293`): `FIXED_FEE | REVENUE_SHARE | HYBRID` (`HYBRID` is
  "v2", not user-selectable — `available: false` in `COMPENSATION_MODEL_OPTIONS`).
- `CampaignPartnerTerms` (`prisma/schema.prisma:1273-1289`, see `partner-programs.md`) — one row
  per rev-share campaign, created atomically with the `Campaign` in the same `create` call
  (nested write, `campaign-actions.ts:124-149`), never updated afterward from this flow.

## 6. API contracts
None — campaign creation is a Next.js server action (`createCampaign`), not a REST/JSON
endpoint. No `src/app/api/**` route touches `Campaign` rows directly.

## 7. Guards & permissions
- **Role gate:** both `/dashboard/campaigns` and `/dashboard/campaigns/new` call
  `requireActiveUser()` then manually check `user.roleKeys.includes("brand")`, redirecting to
  `/dashboard` on failure (`page.tsx:24-25`, `new/page.tsx:11-12`). `createCampaign` repeats the
  same check server-side (`campaign-actions.ts:26-28`) — necessary since a page-level redirect
  doesn't protect the server action itself if called directly.
- **Tenant isolation:** every read/write is scoped through the caller's own `BusinessProfile`
  (`getBrandContext()` looks up `businessProfile.findUnique({ where: { userId } })`); a chosen
  `locationId` is re-validated to belong to that same business before use
  (`campaign-actions.ts:100-107`), preventing a brand from attaching another business's location
  to their campaign.
- **Visibility gate on the detail page:** `DRAFT`/`CANCELLED` campaigns 404 for anyone except
  the owner (`applications.ts:267-271`) — this is the only thing standing between a draft brief
  and public visibility (there's no separate "unlisted" flag).
- No campaign-specific admin/moderation guard was found in this area.

## 8. Known edge cases
- Saving a draft from step 1 requires only `title` (≥2 chars) and `targetType` — everything
  else (description, deliverables, budget) can be empty; the stricter `publish`-only validation
  in `campaignFormSchema.superRefine` never runs for a draft save.
- A brand with `compensationModel = REVENUE_SHARE` and `totalBudgetILS = 0` can still publish —
  the budget-must-be-positive check is explicitly skipped for that model
  (`campaign-brief.ts:116-123`), since the real financial commitment lives in
  `CampaignPartnerTerms`, not `Campaign.totalBudgetILS`.
- `?created=` on the list page renders the success banner for *any* truthy value, not just a
  value matching a real campaign id.
- A provider (creator/space) whose role doesn't match `targetType` sees `viewer: "other"` and a
  neutral message rather than a 404/redirect — the brief itself is still fully visible to them
  once `OPEN_FOR_PITCHES`, just not actionable.

## 9. Tech debt / TODOs in code
- `Campaign.categories` (`CampaignCategory[]`, `prisma/schema.prisma:812`) has no writer
  anywhere in the campaign-creation code path — the wizard has no category picker. Either
  planned for a later iteration or leftover schema scaffolding; worth confirming with whoever
  owns the marketplace/discovery filtering work, since categories likely matter there.
- `Campaign.startDate` (`prisma/schema.prisma:802`) is defined but never set by
  `createCampaign` — only `endDate` is collected in the wizard. Not necessarily a bug (a
  campaign's "start" may just be whenever the contract begins), but worth confirming it's
  intentional rather than a dropped field.

## 10. Findings for the team lead
- **Draft campaigns are a dead end — no edit or publish-later path exists.** `createCampaign`
  (`src/lib/actions/campaign-actions.ts`) is the *only* write to `prisma.campaign` outside of
  the two status-transition call sites already covered in §5 (accept-application →
  `IN_PROGRESS`, contract-complete → `COMPLETED`) and one dev-seed `deleteMany`
  (`src/app/(frontend)/dev/seed-partner-dashboard/route.ts:98`) — confirmed by grepping every
  `prisma.campaign.update`/`.delete` call site in `src/`. The wizard's own copy promises
  otherwise: "שמירה כטיוטה שומרת את הבריף **לעריכה**" ("saving as a draft saves the brief **for
  editing**", `campaign-wizard.tsx:811`) and the empty-brand-context message on `/new` says a
  brand can "return here later" once onboarding is done — but there is no route, action, or
  button anywhere that lets a brand re-open, edit, or publish a `DRAFT` campaign once created.
  The detail page for a `DRAFT` brief (visible only to its owner) just renders the read-only
  `CampaignBriefView` with no edit affordance. Net effect: any brand who uses "save as draft"
  today has permanently orphaned that brief. This looks like a real product gap rather than a
  deliberate restriction, given the UI copy actively promises editability.
- **`CampaignStatus.CANCELLED` is unreachable.** No code anywhere sets a campaign to
  `CANCELLED` (confirmed by grep across `src/lib/actions/**` and `src/app/api/**`), yet it's
  defended against in the read path (`applications.ts:269`) and has UI treatment
  (`CAMPAIGN_STATUS_META.CANCELLED`, `campaign-brief.ts:64`) — so the intent to support
  cancellation exists, but there's no way for a brand (or admin) to actually cancel a published
  campaign today, e.g. if they no longer want to receive pitches. Combined with the draft
  dead-end above, a brand currently has zero ways to retract a campaign once it leaves the
  wizard's initial submit.
