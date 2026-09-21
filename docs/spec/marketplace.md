# Spec: Marketplace + creator/space profiles

> status: documented · updated: 2026-09-13 · owning agent: private-area

## 1. Business purpose
The two-sided discovery layer that lets a `BRAND` find and vet supply — creators (influencers) and physical/digital ad spaces — outside the campaign-application flow, then act on it directly: invite a creator to a brief, or reserve an ad space's calendar on the spot. The "profile" half is the mirror image: what a `CREATOR` or `AD_SPACE_OWNER` maintains about themselves (channels, pricing, assets) so they show up correctly on the brand-facing side. Both marketplaces are read-only browsing/CTA surfaces — the actual pitch/contract/payment lifecycle they hand off into belongs to later specs (`applications.md`, `contracts.md`, `ad-space-bookings.md`).

## 2. Roles involved
- **BRAND** — browses both marketplaces, views creator/ad-space profile detail pages, triggers "invite to brief" or "reserve" CTAs.
- **CREATOR** — maintains their own `CreatorProfile` (bio, channels, pricing packages, images) via Settings; is the subject shown on `/dashboard/marketplace`.
- **AD_SPACE_OWNER** — maintains their own `AdSpaceOwnerProfile` + `AdSpaceAsset` listings (create/update/toggle/delete, `src/lib/actions/ad-space-actions.ts`); is the subject shown on `/dashboard/ad-spaces`.
- **ADMIN** — no dedicated surface in this feature; verification of profiles (`VerificationStatus`) is written elsewhere (not traced here — likely `admin-dashboard.md`, queue #19).

## 3. User flow

### Creator marketplace (brand → creator)
1. `BRAND` opens `/dashboard/marketplace` (`src/app/(frontend)/(app)/dashboard/marketplace/page.tsx`). Guard is soft: if `activeRole !== "brand"` the page still renders (no redirect) but shows an inline "switch to brand mode" message instead of the browser (lines 13-24).
2. Server loads `getMarketplaceCreators()` (all `ACTIVE`, non-deleted `CreatorProfile`s of `ACTIVE`, non-deleted users — `src/lib/marketplace-query.ts:41-47`), CREATOR-scope partner categories, and the brand's own open campaigns (for the invite dialog's target list).
3. `MarketplaceBrowser` (`src/components/app/marketplace/marketplace-browser.tsx`) does **client-side** filtering over the full creator list via `filterCreators()` (`src/lib/marketplace.ts:93-108`) — search text, category, region, platform, follower range, price range. No pagination/server-side filtering; the whole active-creator table loads on every page hit.
4. Clicking a `CreatorCard` navigates to `/dashboard/marketplace/[id]` (creator's `CreatorProfile.id`). This detail page re-guards with a hard redirect: `if (!user.roleKeys.includes("brand")) redirect("/dashboard")` (`marketplace/[id]/page.tsx:32`) — note this checks `roleKeys` (any role the user holds) rather than `activeRole` (see §10).
5. Detail page (`getCreatorProfile(id)`, `src/lib/creator-profile.ts`) shows bio, all channels (ordered by followers desc), active pricing packages (ordered by price asc), and public reviews (`Review.isPublic`) addressed to the creator, plus a reliability score.
6. `InviteToCampaignDialog` (`src/components/app/pitch/invite-to-campaign-dialog.tsx`) lets the brand pick one of their open campaigns and invite this creator — this write path belongs to `applications.md` (queue #6), not traced further here.

### Ad-space marketplace (brand → ad-space owner)
1. `/dashboard/ad-spaces` (`src/app/(frontend)/(app)/dashboard/ad-spaces/page.tsx`) has **no role gate at all** beyond `requireActiveUser()` — any authenticated, onboarded user of any role can view it (contrast with the creator marketplace and with this page's own detail route — see §10, finding 1).
2. `getAdSpacesData(user.id)` (`src/lib/ad-spaces.ts:176-262`) loads all `isActive`, non-deleted `AdSpaceAsset`s whose owner is `ACTIVE`/non-deleted, **excluding the caller's own listings** if they happen to also be an ad-space owner (`userId: { not: brandUserId }`, line 189 comment) — this exclusion is about not showing your own space to yourself, not a role/security boundary.
3. `AdSpaceExplorer` (`src/components/app/ad-spaces/ad-space-explorer.tsx`) renders a list + a map view (`ad-space-map.tsx`) with facet filters (media type, city, category) computed server-side from the loaded set (`facet()` helper, `ad-spaces.ts:246-262`) and a synthetic map position per asset (`DISTRICT_MAP_POS` + a per-id jitter — not real geocoding).
4. Clicking a listing goes to `/dashboard/ad-spaces/[id]`, which **does** hard-gate: `if (!user.roleKeys.includes("brand")) redirect("/dashboard")` (`ad-spaces/[id]/page.tsx:30`).
5. Detail page (`getAdSpaceDetail(id)`, `ad-spaces.ts:316+`) shows specs, current booking/live status, and a CTA that's either "שריון ביומן" (reserve on calendar) or "הצעת חסות" (sponsorship pitch) depending on `mediaType` (podcast/newsletter vs. everything else) — wired to `ReserveAdSpaceDialog` (`src/components/app/pitch/reserve-ad-space-dialog.tsx`).
6. The dialog submits to `reserveAdSpace()` (`src/lib/actions/application-actions.ts:470+`) — properly gated independently via `requireBrandBusiness()` (line 474), so the missing list-page role check in step 1 doesn't translate into an authorization gap on the actual write path; it's a UI-consistency issue, not a security one. `reserveAdSpace` also blocks self-booking (`asset.owner.userId === ctx.userId` check, line 505-507) and creates a `Campaign` + downstream records in a transaction — full lifecycle belongs to `applications.md`/`ad-space-bookings.md`.

### Business directory (creator/space → brand) — adjacent surface
`/dashboard/businesses` (`src/app/(frontend)/(app)/dashboard/businesses/page.tsx`) is the mirror-image directory letting `CREATOR`/`AD_SPACE_OWNER` search `BusinessProfile`s (gate: `roleKeys.includes("creator") || roleKeys.includes("space")`, line 24-26, hard redirect). It isn't in this queue item's title and has no dedicated "profile edit" counterpart in this spec's scope (a `BusinessProfile` is edited via Settings → `brand-form.tsx` / `updateBrandSettings`, queue-adjacent), so it's noted here for cross-reference only — full flow left to whichever spec ends up owning brand-side settings.

### Profile self-management (creator/space owner → their own listing)
Both sides manage their own marketplace presence from `/dashboard/settings` (page not traced line-by-line here; forms below are its tabs):
- **Creator**: `CreatorProfileForm` (bio/basics) → `updateCreatorSettings`; `CreatorChannels` (per-platform handle/URL, one row per `SocialPlatform`, unique per creator) → `upsertCreatorChannel`/`deleteCreatorChannel`; `CreatorPricing` (packages per `DeliverableType`) → `upsertCreatorPricingPackage`/`toggleCreatorPricingPackage`/`deleteCreatorPricingPackage`; `CreatorImages` (avatar/cover) → `uploadCreatorImage`/`removeCreatorImage`. All in `src/lib/actions/settings-actions.ts`, all role-gated (`roleKeys.includes("creator")`) and all channel/package mutations re-verify the row's `creatorId` belongs to the caller before writing (e.g. `upsertCreatorChannel`, lines 466-472; `deleteCreatorChannel`, lines 507-511) — no IDOR found here.
- **Ad-space owner**: `SpaceOwnerForm` (company/contact/billing basics) → `updateAdSpaceOwnerSettings` (`settings-actions.ts:707+`, gated on `roleKeys.includes("space")`); asset-level CRUD (`createAdSpaceAsset`/`updateAdSpaceAsset`/`toggleAdSpaceActive`/`deleteAdSpaceAsset`) lives in `src/lib/actions/ad-space-actions.ts`, also gated on `roleKeys.includes("space")` (line 28) — this owner-side asset management is surfaced at `/dashboard/assets` (per `src/lib/app-nav.ts:103`, not independently traced here) and reads back through `getMyAdSpaces()` (`src/lib/my-ad-spaces.ts:90+`).

## 4. File map
| Layer | Path | Role |
| --- | --- | --- |
| Route | `src/app/(frontend)/(app)/dashboard/marketplace/page.tsx` | creator marketplace browse (brand) |
| Route | `src/app/(frontend)/(app)/dashboard/marketplace/[id]/page.tsx` | creator profile detail (brand-facing) |
| Route | `src/app/(frontend)/(app)/dashboard/ad-spaces/page.tsx` | ad-space marketplace browse (no role gate) |
| Route | `src/app/(frontend)/(app)/dashboard/ad-spaces/[id]/page.tsx` | ad-space detail + reserve/pitch CTA (brand-facing) |
| Route | `src/app/(frontend)/(app)/dashboard/businesses/page.tsx` + `[businessId]/page.tsx` | adjacent business directory (creator/space-facing) |
| Component | `src/components/app/marketplace/{marketplace-browser,creator-card}.tsx` | creator list UI + client-side filter state |
| Component | `src/components/app/ad-spaces/{ad-space-explorer,ad-space-card,ad-space-map}.tsx` | ad-space list/map UI |
| Component | `src/components/app/pitch/{invite-to-campaign-dialog,reserve-ad-space-dialog}.tsx` | CTA dialogs (write paths owned by `applications.md`) |
| Component | `src/components/app/settings/{creator-profile-form,creator-channels,creator-pricing,creator-images,space-owner-form}.tsx` | profile self-management forms |
| Fetcher | `src/lib/marketplace.ts` | types + pure client-side filter logic (`filterCreators`, no `server-only`) |
| Fetcher | `src/lib/marketplace-query.ts` | `getMarketplaceCreators()` — DB read for the creator list |
| Fetcher | `src/lib/creator-profile.ts` | `getCreatorProfile(id)` — creator detail read |
| Fetcher | `src/lib/ad-spaces.ts` | `getAdSpacesData(brandUserId)` + `getAdSpaceDetail(id)` — ad-space list/detail reads |
| Fetcher | `src/lib/my-ad-spaces.ts` | `getMyAdSpaces()` — owner's own listings (for `/dashboard/assets`) |
| Fetcher | `src/lib/ad-space-asset-form.ts`, `ad-space-schedule.ts` | asset-form option data + booking calendar read, backing the owner-side asset editor (not traced line-by-line) |
| Action | `src/lib/actions/settings-actions.ts` | all creator/space-owner profile writes (782 lines total; profile, channels, pricing, images) |
| Action | `src/lib/actions/ad-space-actions.ts` | ad-space asset CRUD (`createAdSpaceAsset`/`updateAdSpaceAsset`/`toggleAdSpaceActive`/`deleteAdSpaceAsset`) |
| Action | `src/lib/actions/application-actions.ts:470` | `reserveAdSpace()` — the actual booking write triggered from the ad-space detail CTA |
| Fetcher (cross-cutting) | `src/lib/partner-categories-query.ts` | category slugs/labels shared by both marketplaces (`getPartnerCategoriesForScope`, `getPartnerCategoryLabels`) |
| Fetcher (cross-cutting) | `src/lib/cities.ts` | city list used by the business directory and (indirectly, via `City.district`) the creator region filter |

## 5. Data model
`prisma/schema.prisma`:
- `CreatorProfile` (line 560-590): 1:1 with `User`, `status: ProfileStatus` (default `ACTIVE`), `verificationStatus: VerificationStatus` (default `PENDING`), `reliabilityScore: Float` (0-100), `primaryCityId` optional. Relations: `channels`, `pricingPackages`, `categories` (`CreatorCategory`), `socialConsents`.
- `CreatorChannel` (line 611-635): 1:N under `CreatorProfile`, `@@unique([creatorId, platform])` — one row per `SocialPlatform` enum value (`INSTAGRAM · TIKTOK · YOUTUBE · FACEBOOK · LINKEDIN`, line 77-83) per creator. Carries the OAuth-connect columns (`oauthRefreshTokenEnc` etc., encrypted via `src/lib/oauth-crypto.ts`) — connecting a real channel is a separate feature (`/api/connect/{youtube,facebook}`, not traced here).
- `CreatorPricingPackage` (line 638-655): 1:N, one `DeliverableType` (`IG_REEL · IG_STORY · TIKTOK_VIDEO · YOUTUBE_INTEGRATION · EVENT_ATTENDANCE`, line 85-91) per package, `isActive` flag (soft toggle, not delete) — only `isActive` packages surface in either marketplace read.
- `AdSpaceOwnerProfile` (line 661-685): 1:1 with `User`, same `status`/`verificationStatus` shape as `CreatorProfile`. Relation: `assets`.
- `AdSpaceAsset` (line 688-718): 1:N under `AdSpaceOwnerProfile`, `type: AdSpaceType` (`DIGITAL_BILLBOARD · STATIC_BILLBOARD · TRANSIT · NEWSLETTER · PODCAST_SPONSORSHIP`, line 93-99), `pricingModel: AdPricingModel` (`DAILY · WEEKLY · MONTHLY · PER_CPM · PER_BROADCAST`, line 101-107), `proofRequirement: ProofRequirement` (drives escrow release evidence, not used by this feature), `isActive` soft-toggle, `cityId` optional (required for physical types, blank for digital — enforced in the create/update action, not the schema). `@@index([type, isActive])` backs the marketplace list query's filter.
- No status transitions belong to this feature — `ProfileStatus`/`VerificationStatus` are read-only here; who flips `PENDING → VERIFIED` or `ACTIVE → SUSPENDED` is out of scope (likely admin-dashboard.md).

## 6. API contracts
No REST/RPC endpoints — everything is Server Component reads (fetchers above) plus Server Action writes (`settings-actions.ts`, `ad-space-actions.ts`, `application-actions.ts`). No `zod` schema module shared with `track/schemas.ts`-style validation; each action does its own inline `formData.get()` parsing (some via local `zod` schemas, e.g. `channelSchema` in `settings-actions.ts`, others via manual field checks, e.g. `reserveAdSpace`'s date parsing).

## 7. Guards & permissions
| Surface | Guard | On failure |
| --- | --- | --- |
| `/dashboard/marketplace` | `requireActiveUser()` only; `activeRole !== "brand"` → inline message, page still renders | no redirect (soft) |
| `/dashboard/marketplace/[id]` | `requireActiveUser()` + `roleKeys.includes("brand")` | `redirect("/dashboard")` |
| `/dashboard/ad-spaces` | `requireActiveUser()` only | none — all roles see the full list |
| `/dashboard/ad-spaces/[id]` | `requireActiveUser()` + `roleKeys.includes("brand")` | `redirect("/dashboard")` |
| `/dashboard/businesses` | `requireActiveUser()` + (`roleKeys.includes("creator")` or `.includes("space")`) | `redirect("/dashboard")` |
| `settings-actions.ts` profile/channel/pricing/image mutations | `requireActiveUser()` + `roleKeys.includes("creator")`, plus row-level `creatorId` ownership check on update/delete | early return with an error `SettingsFormState`, or silent no-op for the `void`-returning actions (`deleteCreatorChannel`, `removeCreatorImage`) |
| `ad-space-actions.ts` asset mutations | `requireActiveUser()` + `roleKeys.includes("space")` | `null`/no-op return |
| `application-actions.ts` `reserveAdSpace` | `requireBrandBusiness()` (requires a completed `BusinessProfile`, not just the `brand` role) | form-level error message, no throw |

Three different patterns exist for "wrong role browsing a marketplace meant for another role" (soft message / hard redirect / no gate at all) — see §10.

## 8. Known edge cases
- A creator with zero active `CreatorChannel`s or zero active `CreatorPricingPackage`s still appears in the marketplace list (`followers: 0`, `startingPriceILS: 0`, empty `priceUnitLabel`) — the detail page handles this with an explicit "no channels connected yet" message (`marketplace/[id]/page.tsx:118-122`) but the list card/sort (sorted by `followers` desc, `marketplace-query.ts:95`) has no visual distinction for an effectively-empty profile.
- `CreatorProfile.primaryCityId` is nullable; if unset, `regionValue`/`regionLabel` are both `""` (`marketplace-query.ts:74,81`) — such a creator never matches any region filter except `"all"` and is silently excluded from every specific-region search.
- `AdSpaceAsset.cityId` is nullable (intentionally, for non-physical types) — `getAdSpacesData`'s map placement falls back to a `NON_GEO_POS` constant with per-id jitter rather than a real location; this is a display placeholder, not a real geocode, and isn't labeled as such in the UI.
- The client-side follower/price range filters (`inRange()`, `marketplace.ts:89-90`) treat the slider's max as "or above" (`hi >= hardMax` passes everything above), so a max-value slider position silently becomes "no upper bound" rather than an exact ceiling — intentional per the `formatFollowersShort`/`formatPriceShort` "300K+"/"₪15K+" labels, but worth knowing if a QA scenario expects a hard ceiling.
- `getCreatorProfile()` itself only calls `requireActiveUser()` (no role check) before returning full profile data (`creator-profile.ts:64`) — the page-level `roleKeys.includes("brand")` gate is what actually restricts it; calling the fetcher directly from a differently-gated context would leak creator detail to any active user. Not currently exploitable (no such alternate caller exists in the repo) but worth flagging if a future route reuses this fetcher.

## 9. Tech debt / TODOs in code
- `docs/spec/code-map.md`'s "Server actions" line was missing `settings-actions` — corrected as part of this pass (see code-map.md update).
- `/dashboard/ad-spaces` has no role gate while every comparable marketplace surface in this feature does (see §10, finding 1) — likely an oversight rather than intentional "all roles may browse."
- `getAdSpacesData`'s `map` coordinates (`DISTRICT_MAP_POS` + `jitter()`, `ad-spaces.ts`) are a deterministic-but-fake per-asset scatter, not real geocoding — fine for a demo/MVP map but will need real lat/lng before this could be trusted for anything beyond decoration.
- No pagination anywhere in this feature — both marketplace list fetchers load every active row unconditionally. Fine at current data volumes; will need a `take`/`cursor` pattern (or move filtering server-side) before the creator/ad-space catalogs grow large.

## 10. Findings for the team lead
1. **Inconsistent role gating across the two marketplace "list" pages.** `/dashboard/marketplace` (creator marketplace) shows a friendly "switch to brand mode" message for non-brand roles; `/dashboard/ad-spaces` (ad-space marketplace) has **no role check at all** — a `CREATOR` or `AD_SPACE_OWNER` can freely browse the full ad-space catalog with map and pricing, then hit a hard `redirect("/dashboard")` only if they click into a specific listing (`ad-spaces/[id]/page.tsx:30`). Both detail pages, by contrast, hard-redirect. Not a data-sensitivity issue (ad-space listings aren't private data, and the write path is independently gated via `requireBrandBusiness()` in `reserveAdSpace`), but it's a confusing, inconsistent product experience and worth picking one pattern.
2. **`roleKeys` vs. `activeRole` inconsistency in detail-page guards.** `/dashboard/marketplace/[id]:32` and `/dashboard/ad-spaces/[id]:30` both gate on `roleKeys.includes("brand")` — i.e., a user who *holds* the brand role but is currently in "creator" or "space" active mode can still open these brand-facing detail pages and see the invite/reserve CTA, whereas the *list* pages gate (or don't) differently. Worth deciding whether detail pages should instead require `activeRole === "brand"` to match the list page's intent, especially since a multi-role user's UI chrome (nav, dashboard) would still be showing their creator/space mode while they're on a page meant for their brand hat.
3. **`getCreatorProfile()` has no role check of its own** (`src/lib/creator-profile.ts:64`) — it relies entirely on its one current caller's page-level guard. Low risk today (single caller), but flagging so a future consumer doesn't assume the fetcher itself is safe to call from an ungated context.
4. **Empty/thin creator profiles aren't flagged in the marketplace list.** A creator who's completed registration but connected no channels and published no pricing shows up in the browse list looking like a real listing (zeros/blanks) rather than being filtered out or visually marked "profile incomplete" — worth a product decision before this reaches real users, since it could make the marketplace look broken.
