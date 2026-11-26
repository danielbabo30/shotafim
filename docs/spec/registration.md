# Spec: Multi-step registration + role selection

> status: documented · updated: 2026-09-09 · owning agent: private-area

## 1. Business purpose

Turns a freshly-authenticated user (see [`auth.md`](auth.md) — `PENDING_ONBOARDING` status, no
`UserRole`s) into an onboarded, `ACTIVE` account with one or more role-specific profiles
(`BusinessProfile` for brands, `CreatorProfile` for creators, `AdSpaceOwnerProfile` for ad-space
owners). A user can hold multiple roles simultaneously (a "shared account") and switch between
them post-registration via `setActiveRole` (see `auth.md` §4). This is the only place role-
specific profiles are created — nothing else in the app creates a `BusinessProfile` /
`CreatorProfile` / `AdSpaceOwnerProfile` row.

## 2. Roles involved

- Selectable at registration: `BRAND`, `CREATOR`, `AD_SPACE_OWNER` (exposed as `RegistrationRoleKey`
  = `"brand" | "creator" | "space"`, `src/lib/registration.ts:9-10`). `ADMIN` is deliberately
  excluded — comment: "ADMIN לא נבחר עצמאית" (`registration.ts:8`) — admin is presumably granted
  out-of-band (feature #19, not yet built/documented).
- A user may pick 1–3 of the selectable roles in step 2 and fills one profile sub-form per
  selected role in step 3.

## 3. User flow

**Step 0 — `/register`** (`src/app/(frontend)/(auth)/register/page.tsx`)
Pre-account entry point. If already signed in, redirects straight to `/register/roles`
(`register/page.tsx:22-23`). Same two providers as `/sign-in` (Google / Resend magic-link,
gated by `hasGoogle`/`hasEmail`), but:
- The **email form requires an explicit consent checkbox** ("אני מסכים/ה לתנאי השימוש...",
  `register/page.tsx:117-136`) before calling `signIn("resend", ...)`; missing consent →
  `redirect("/register?error=consent")` (`register/page.tsx:85-87`).
- The **Google button has no consent checkbox at all** (`register/page.tsx:56-71`) — see §10.
- On success (email), Auth.js's `verifyRequest` page kicks in exactly as in sign-in
  (`check=email` banner, `auth.ts:36`), redirecting eventually to `/register/roles`
  (`REDIRECT_TO`, `register/page.tsx:15`).

**Step 1 gate — every subsequent `/register/*` page**
Calls `requireRegistrationUser()` (`src/lib/registration.ts:34-52`) — session required (else
`/sign-in?callbackUrl=/register/roles`), account must not be deleted/suspended/banned (else
`/sign-in?error=account`). Unlike `requireActiveUser`, this does **not** require
`status === "ACTIVE"` — `PENDING_ONBOARDING` is the expected/normal status here. Also gated at
the proxy layer as an optimistic cookie check (`src/proxy.ts:11-17`, `auth.md` §3/§7).

**Step 2 — `/register/roles`** (`register/roles/page.tsx`)
- If `user.status === "ACTIVE"` already → `redirect("/dashboard")` (re-registration guard,
  `roles/page.tsx:18`).
- Renders `<RoleSelection>` (`src/components/auth/role-selection.tsx`, client component) seeded
  with `user.roleKeys` (roles already saved from a previous partial attempt) and CMS copy from
  `getRegisterRolesData()` (`src/lib/register-roles.ts` — Payload global `register-roles`,
  falls back to `DEFAULT_REGISTER_ROLES` on empty/unavailable CMS, per CLAUDE.md §6 pattern).
- Submit → `useActionState(saveRoles, null)` (`role-selection.tsx:49`) → server action
  `saveRoles` (`src/lib/actions/registration-actions.ts:23-41`): re-derives the registration
  user server-side, validates at least one role was checked (else inline form error), writes
  `User.roles` via `{ set: [...] }` (full replace, not append — re-visiting this step and
  unchecking a role removes it), redirects to `/register/profile`.

**Step 3 — `/register/profile`** (`register/profile/page.tsx`)
- Same `status === "ACTIVE"` guard; additionally `redirect("/register/roles")` if
  `roleKeys.length === 0` (skipped step 2, `register/profile/page.tsx:16`).
- Loads `getCities()` and `getPartnerCategoriesForScope("BRAND"|"CREATOR")`
  (categories are CMS-managed, not Prisma — see `prisma/schema.prisma:740-742` comment) and
  renders `<ProfileSetupForm>` (`src/components/auth/profile-setup-form.tsx`) — one tab per
  selected role, all tabs in a single form.
- Submit (last tab) → `useActionState(completeRegistration, null)`
  (`profile-setup-form.tsx:124`) → server action `completeRegistration`
  (`registration-actions.ts:61-226`):
  1. Re-derives registration user; re-guards `roleKeys.length === 0` →
     `/register/roles` (`registration-actions.ts:66-68`).
  2. `parseRegistration(formData, roleKeys)` (`src/lib/registration-schema.ts:136-247`) —
     per-role Zod validation (see §6); on failure, returns per-tab field errors without
     touching the DB.
  3. Single `prisma.$transaction`: updates `User` (`name`, optional `phone`, `status: "ACTIVE"`,
     `activeRole` = first role by priority order, `termsAcceptedAt: new Date()`); conditionally
     creates `BusinessProfile`+`BusinessLocation[]`+`BusinessCategory`,
     `CreatorProfile`+`CreatorChannel[]`+`CreatorCategory[]`, and/or
     `AdSpaceOwnerProfile`+`AdSpaceAsset` depending on which roles were selected; always creates
     two `LegalConsent` rows (`TERMS_OF_SERVICE`, `PRIVACY_POLICY` — `LEGAL_VERSION = "v1.0"`,
     `src/lib/legal-consent.ts:8-14`) stamped with the request's `x-forwarded-for` IP
     (`registration-actions.ts:87`).
  4. On a unique-constraint violation (`P2002` — duplicate `companyId`/`idNumber`/`phone`/
     `email`), returns a friendly Hebrew message instead of throwing
     (`registration-actions.ts:208-220`).
  5. On success: `revalidatePath("/", "layout")` (refreshes the nav/shell, which reads
     `roleKeys`/`activeRole`) and `redirect("/register/complete")`.

**Step 4 — `/register/complete`** (`register/complete/page.tsx`)
This page calls `requireActiveUser()` (the *real* dashboard gate, not `requireRegistrationUser`)
— by this point `status` is already `ACTIVE`, so it passes. Shows a success screen: which
profile(s) were created, a role-switcher preview if >1 role, and — if `"creator"` is among the
roles — a `<SocialConnectGrid>` prompting the OAuth channel-connect flow (out of scope here;
see `src/lib/social-connections.ts`, `src/app/api/connect/{youtube,facebook}/**`). CTA links to
`/dashboard`.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Route (step 0) | `src/app/(frontend)/(auth)/register/page.tsx` | Google/email sign-up entry, consent checkbox (email only) |
| Route (step 2) | `src/app/(frontend)/(auth)/register/roles/page.tsx` | Role selection |
| Route (step 3) | `src/app/(frontend)/(auth)/register/profile/page.tsx` | Per-role profile forms |
| Route (step 4) | `src/app/(frontend)/(auth)/register/complete/page.tsx` | Success screen, uses `requireActiveUser` |
| Component | `src/components/auth/role-selection.tsx` | `"use client"`; `useActionState(saveRoles)` |
| Component | `src/components/auth/profile-setup-form.tsx` | `"use client"`; tabbed form, `useActionState(completeRegistration)` |
| Component | `src/components/auth/auth-split-screen.tsx`, `auth-progress.tsx`, `social-networks.tsx`, `form-styles.ts` | Shared auth-flow chrome |
| Guard | `src/lib/registration.ts` (`requireRegistrationUser`) | Session + not-blocked check; deliberately skips onboarding-complete check |
| Fetcher | `src/lib/register-roles.ts` (`getRegisterRolesData`, `cache()`) | Step-2 CMS copy, Payload global `register-roles`, fallback `register-roles-defaults.ts` |
| Fetcher | `src/lib/cities.ts` (`getCities`) | City list for location/asset pickers |
| Fetcher | `src/lib/partner-categories-query.ts` (`getPartnerCategoriesForScope`) | Brand/creator category options (CMS-managed slugs) |
| Validation | `src/lib/registration-schema.ts` (`parseRegistration`) | Zod schemas per role, `FormData` → typed input |
| Action | `src/lib/actions/registration-actions.ts` (`saveRoles`, `completeRegistration`) | Writes `User.roles`, then the full onboarding transaction |
| Consent constants | `src/lib/legal-consent.ts` (`LEGAL_VERSION`, `REGISTRATION_CONSENT_DOCUMENTS`) | Hard-coded document/version list written to `LegalConsent` |
| Shared schema | `src/lib/ad-space-asset-form.ts` (`adSpaceAssetObjectSchema`) | Reused by both registration's `space.asset` and the standalone "add ad-space asset" form |

## 5. Data model

New rows created only by `completeRegistration`'s transaction (`prisma/schema.prisma`):

- **`User`** (`schema.prisma:401-454`) — updated, not created (already exists from auth):
  `status → ACTIVE`, `activeRole` set, `termsAcceptedAt` stamped, `name`/`phone` backfilled from
  the first matching role's contact fields.
- **`BusinessProfile`** (`schema.prisma:501-534`) — 1:1 with `User` (`userId @unique`), plus
  `BusinessLocation[]` (`schema.prisma:537-554`, first location gets `isPrimary: true`) and one
  `BusinessCategory` row (`schema.prisma:754-761`, loose FK to a Payload-managed category slug,
  not a real foreign key). Enums: `LegalEntityType` (`LTD|LICENSED_DEALER|EXEMPT_DEALER|
  PARTNERSHIP`, `schema.prisma:56-61`), `BusinessModel` (`PHYSICAL|ONLINE|HYBRID`,
  `schema.prisma:63-67`).
- **`CreatorProfile`** (`schema.prisma:560-590`) — 1:1 with `User`, plus `CreatorChannel[]`
  (`schema.prisma:611-635` — optional at registration, see comment `registration-schema.ts:68-69`:
  channels are normally connected via OAuth post-registration, not filled in this form) and
  `CreatorCategory[]` (`schema.prisma:744-752`). Enum: `CreatorTaxStatus`
  (`EXEMPT_DEALER|LICENSED_DEALER|COMPANY|INDIVIDUAL_WITHHOLDING`, `schema.prisma:70-75`).
  `idNumber` is globally `@unique` (`schema.prisma:565`) — a real collision source, see §6 P2002
  handling.
- **`AdSpaceOwnerProfile`** (`schema.prisma:661-685`) — 1:1 with `User`, plus exactly one
  `AdSpaceAsset` (`schema.prisma:688-718`) created inline (further assets are added later via
  the dedicated ad-spaces flow, out of scope here). Enums: `AdSpaceType`
  (`DIGITAL_BILLBOARD|STATIC_BILLBOARD|TRANSIT|NEWSLETTER|PODCAST_SPONSORSHIP`,
  `schema.prisma:93-99`), `AdPricingModel` (`DAILY|WEEKLY|MONTHLY|PER_CPM|PER_BROADCAST`,
  `schema.prisma:101-107`), `ProofRequirement` (`PHOTO_CONFIRMATION|ANALYTICS_REPORT|
  SYSTEM_LOG`, `schema.prisma:110-114`).
- **`LegalConsent`** (`schema.prisma:1217-1228`) — two rows per completed registration
  (`TERMS_OF_SERVICE`, `PRIVACY_POLICY` from `ConsentDocumentType`, `schema.prisma:246-251`;
  the enum also has `ESCROW_AGREEMENT` and `PARTNERSHIP_AGREEMENT`, unused here — written
  elsewhere per feature). No `@@unique([userId, documentType])` constraint — see §8.

### Status transitions
`User.status`: `PENDING_ONBOARDING → ACTIVE`, triggered exclusively by
`completeRegistration`'s transaction commit (`registration-actions.ts:96`). This is the *only*
code path in `src/` that sets `status: "ACTIVE"` outside of dev/seed routes.

## 6. API contracts

No REST/route-handler API — both mutations are Next.js Server Actions bound via
`useActionState`, not fetch-able endpoints:

- **`saveRoles(prevState, formData)`** — input: `formData.getAll("role")` (checkbox values
  `"brand"|"creator"|"space"`, filtered by `isRegistrationRoleKey`). Output:
  `{ error?: string } | null`; on success, `redirect()` (no return value observed by caller).
- **`completeRegistration(prevState, formData)`** — input: flat `FormData` with `brand.*` /
  `creator.*` / `space.*` prefixed fields (see `registration-schema.ts` field lists) plus indexed
  array fields (`brand.locationCityId[]` etc., zipped positionally by `zipRows`,
  `registration-schema.ts:126-132`). Output: `CompleteRegistrationState` = `{ status: "idle" |
  "error", formError?, fieldErrors?: Record<string,string>, errorTab?: "brand"|"creator"|
  "space" } | null`.

Validation schemas: `brandSchema` / `creatorSchema` / `spaceSchema` in
`src/lib/registration-schema.ts:32-97` (Israeli company/ID number regex `^\d{8,9}$`, `space`
reuses `adSpaceAssetObjectSchema` from `src/lib/ad-space-asset-form.ts`).

## 7. Guards & permissions

| Guard | Where | On failure |
| --- | --- | --- |
| `requireRegistrationUser` | Every `/register/{roles,profile}` page + both server actions | No session → `/sign-in?callbackUrl=/register/roles`; deleted/suspended/banned → `/sign-in?error=account` |
| `status === "ACTIVE"` re-check | `roles/page.tsx:18`, `profile/page.tsx:15` | `redirect("/dashboard")` — prevents re-running registration after completion |
| `roleKeys.length === 0` re-check | `profile/page.tsx:16`, `completeRegistration` (`registration-actions.ts:66-68`) | `redirect("/register/roles")` — prevents reaching/submitting step 3 without step 2 |
| `requireActiveUser` | `register/complete/page.tsx:29` | Standard dashboard gate (see `auth.md` §7) — reachable here only because status is already `ACTIVE` by this point |
| Proxy (optimistic) | `src/proxy.ts` — `/register/roles`, `/register/profile`, `/register/complete` (not bare `/register`) | Cookie-presence redirect to `/sign-in`, see `auth.md` §7 |

`setActiveRole` ownership check (used post-registration, not during it — see `auth.md` §7) is
the only other place role membership is re-validated server-side.

## 8. Known edge cases

- **Re-submitting step 2 removes roles, not just adds them** — `saveRoles` does
  `roles: { set: keys... } }` (full replace). If a user already completed a `BusinessProfile` in
  a previous session (can't normally happen post-`ACTIVE` due to the guard above, but *can*
  happen mid-flow before completion) and then unchecks "brand" and resubmits, `User.roles` no
  longer includes `BRAND` — `completeRegistration` would then not touch `BusinessProfile` at all,
  leaving no orphaned data, but the intent to unregister a role mid-flow silently drops any
  profile-form input already typed for that tab (client-side state only, not persisted).
- **`idNumber` (creator) and `companyId` (brand/space) are globally unique across the whole
  table**, not per-user — two different `User`s can never register with the same ID/company
  number, by design (real-world uniqueness), surfaced via the `P2002` friendly-message mapping
  (`registration-actions.ts:50-55`). But a *single* user holding both `creator` and, say,
  `space` roles who accidentally reuses the same national ID in both tabs isn't blocked at the
  Zod layer — it would only fail at the DB level if that exact `idNumber` happens to collide
  with another table's unique column of a different name (it wouldn't, since `companyId` and
  `idNumber` are separate unique columns) — no actual collision in that specific case.
- **`ADMIN` role can never be self-selected** (by design, §2) but nothing in the registration
  code path prevents a `PENDING_ONBOARDING` user whose `User.roles` was manually seeded with
  `ADMIN` (e.g. via `/dev/login?role=admin`, see `auth.md` §3) from also completing brand/
  creator/space registration normally — `sortRegistrationRoleKeys` just filters `ADMIN` out of
  what's *shown*, it doesn't strip it from the underlying `User.roles` array.
- **Location requirement ignores `businessModel`** — see §10 finding 2.
- **No CSRF-specific handling beyond Next.js Server Action defaults** — consistent with the
  rest of the app; not registration-specific.

## 9. Tech debt / TODOs in code

- `registration-schema.ts:68-69` comment flags that `creator.channels` is "kept optional for
  compatibility" even though channels are meant to be OAuth-connected post-registration — the
  field/validation path is effectively dead weight in the current UI (`ProfileSetupForm` would
  need to be checked for whether it still renders channel inputs; not confirmed either way in
  this pass).
- `LegalConsent` has no `@@unique([userId, documentType])` (`schema.prisma:1217-1228`) — a
  double-submit of `completeRegistration` (e.g. slow network, double-click before the button
  disables) is not prevented at the DB layer; the transaction would either fail earlier on the
  `User`/`BusinessProfile` unique constraints (most likely, since `companyId`/`idNumber` are
  unique) or, for a user with zero role-specific uniqueness collisions, could in principle
  produce duplicate consent rows. Low-severity — not currently reachable via the two-role
  P2002-guarded paths.

## 10. Findings for the team lead

1. **Google sign-up skips the explicit consent checkbox that email sign-up requires**
   (`register/page.tsx:56-71` vs. `117-136`) — yet `completeRegistration` unconditionally writes
   `LegalConsent` rows for `TERMS_OF_SERVICE`/`PRIVACY_POLICY` for *every* completed registration
   regardless of provider (`registration-actions.ts:199-206`). So a Google-signed-up user's
   consent is recorded at step 3 without ever having seen/ticked a consent checkbox at step 0 —
   the DB says they consented but the UI never asked them to via that flow. Worth a legal/product
   call on whether the Google button needs its own explicit consent gate, or whether consent
   should instead be captured once, at step 3, for everyone uniformly.
2. **`BusinessLocation` is documented as "only for physical or hybrid businesses"**
   (schema comment, `schema.prisma:536`: "רק לעסקים פיזיים או היברידיים") but
   `brandSchema.locations` in `registration-schema.ts:46-55` requires **at least one location
   unconditionally**, regardless of the selected `businessModel` (`ONLINE | PHYSICAL | HYBRID`).
   A pure-`ONLINE` brand is currently forced to enter a physical address/city to complete
   registration, contradicting the schema's own documented intent. Recommend making `locations`
   conditionally required only when `businessModel !== "ONLINE"`.
3. **Re-visiting step 2 fully replaces `User.roles`** (§8) rather than merging — low risk today
   (registration is single-session in practice, and the `ACTIVE` guard blocks re-entry once
   done), but worth a deliberate decision if a "resume registration later" flow is ever built,
   since it can silently drop a role a user thought they'd already picked.
4. Both `auth.md` findings about the underlying session/guard layer (open-redirect via
   `callbackUrl`, `allowDangerousEmailAccountLinking`) apply equally to `/register` since it
   reuses the exact same `signIn(...)` calls with the same `redirectTo` pattern
   (`register/page.tsx:60,91`) — not re-litigated here, see `auth.md` §10.
5. **Process note, not a code finding**: at the time of this spec, five separate open PRs
   (#1, #2, #4, #5, #6 on GitHub) already exist for `docs/spec/auth.md`, all unmerged, all
   targeting `private-area-foundation`, apparently from repeated nightly systems-analyst runs
   that each found `auth.md` still marked `missing` because none of the prior PRs had been
   merged yet. Flagging for the team lead to merge one and close the rest — see this run's PR
   description for the same note.
