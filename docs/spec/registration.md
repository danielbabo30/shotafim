# Spec: Multi-step registration + role selection

> status: documented · updated: 2026-09-17 · owning agent: private-area

## 1. Business purpose

Turns a freshly-authenticated `User` row (created by NextAuth on first
sign-in, `status: PENDING_ONBOARDING`, `roles: []` — see `auth.md`) into an
onboarded platform participant: it lets them pick one or more of the three
selectable roles (advertiser/brand, creator, ad-space owner), fill in the
role-specific profile data needed to operate (business/creator/media-owner
identity, tax status, first location/channel/asset), records legal consent,
and flips the account to `ACTIVE`. This is the only place in the codebase
that creates `BusinessProfile`/`CreatorProfile`/`AdSpaceOwnerProfile` rows
for a brand-new user.

## 2. Roles involved

- **BRAND, CREATOR, AD_SPACE_OWNER** — the three selectable roles
  (`src/lib/registration.ts:8`, `REGISTRATION_ROLE_KEYS`). A user may select
  any non-empty subset (multi-select, not exclusive).
- **ADMIN** — explicitly excluded from self-registration; only ever
  assigned out-of-band (not by any code path documented here).

## 3. User flow

Three steps, each gated by its own guard, entered only after a session
already exists (see `auth.md` §3 for how the session got there):

**Step 1 — `/register`** (out of this spec's scope; see `auth.md`) — sign in
via Google/email with a required consent checkbox
(`src/app/(frontend)/(auth)/register/page.tsx:88-91`); on success NextAuth
redirects to `/register/roles`.

**Step 2 — `/register/roles`** (`src/app/(frontend)/(auth)/register/roles/page.tsx`)
1. `requireRegistrationUser()` (`src/lib/registration.ts:29-49`) loads the
   session-backed `User`; if `status === "ACTIVE"` already, redirect to
   `/dashboard` (`roles/page.tsx:18`) — this step is a one-time gate, see §8.
2. `RoleSelection` (`src/components/auth/role-selection.tsx`) renders three
   toggle cards (brand/creator/space) whose copy comes from the
   `register-roles` CMS global (`src/lib/register-roles.ts:23-43`, defaults
   in `register-roles-defaults.ts`); `initialSelected` pre-checks whatever
   roles are already saved (`roles/page.tsx:57`), so this step can be
   revisited to change the selection before step 3 is completed.
3. Submitting posts hidden `role` inputs (one per selected key,
   `role-selection.tsx:64-66`) to the `saveRoles` server action
   (`src/lib/actions/registration-actions.ts:23-41`), which requires at
   least one role (`:30-32`), writes `User.roles` (`:34-37`, full
   replace via `{ set: ... }`, so unchecking a role here removes it), and
   redirects to `/register/profile`.

**Step 3 — `/register/profile`** (`src/app/(frontend)/(auth)/register/profile/page.tsx`)
1. `requireRegistrationUser()` again; redirects to `/dashboard` if already
   `ACTIVE`, or back to `/register/roles` if no roles saved yet (`:15-16`).
2. Fetches `cities` (`src/lib/cities.ts`) and category options scoped to
   `BRAND`/`CREATOR` (`src/lib/partner-categories-query.ts`) for the form's
   selects.
3. `ProfileSetupForm` (`src/components/auth/profile-setup-form.tsx`) renders
   one tab per selected role (`roles` prop, defaulting to `["brand"]` if
   somehow empty — `:122`); **all tabs are always mounted**, just
   CSS-hidden when inactive (`cn(activeKey !== "brand" && "hidden")` etc.,
   `:193,198,203`), so every selected role's fields are present in the
   `FormData` regardless of which tab is currently visible. Per-role field
   sets:
   - **brand**: name, legal name, company ID (ח.פ/עוסק), entity type,
     description, business model, one or more locations (city + address),
     category, contact name/phone, billing email/address, website,
     Instagram handle.
   - **creator**: display name, legal full name, ID number, tax status,
     bio, content categories, billing address; **social channels are
     intentionally not collected here** — connected via OAuth later (see
     `registration-schema.ts:68-69` comment, and `/register/complete`
     below).
   - **space**: company name/legal name/company ID/entity type, contact
     name/phone, billing email/address, and one ad-space asset (title,
     type, description, city/address, dimensions, spot length, estimated
     reach, pricing model, base price, proof requirement — shared schema
     with the standalone "add asset" form,
     `src/lib/ad-space-asset-form.ts`).
4. Client-side, only the *last* tab's button is a real `type="submit"`
   (`profile-setup-form.tsx:210-218`); earlier tabs' "next" buttons are
   `type="button"` that just call `setActive(i + 1)` locally
   (`:219-227`) — no data is sent to the server between tabs, despite the
   button label "שמור ועבור ל..." ("**Save** and go to...") implying
   otherwise (see §10). The form uses a manual `onSubmit` handler instead
   of the `action` prop specifically to stop React 19 from clearing fields
   after a failed validation round-trip (`:135-136`).
5. On submit, `completeRegistration` (`src/lib/actions/registration-actions.ts:61-226`):
   - Re-validates everything server-side via `parseRegistration`
     (`src/lib/registration-schema.ts:136-247`), scoped to only the roles
     the user actually has; on failure returns per-field errors plus which
     tab they belong to (`errorTab`) without redirecting.
   - In one `prisma.$transaction`: updates `User` (`name`, `phone`,
     `status: "ACTIVE"`, `activeRole` = first role by priority order,
     `termsAcceptedAt: now`), creates the relevant profile row(s) —
     `BusinessProfile` + `BusinessLocation[]` + `BusinessCategory`,
     `CreatorProfile` + optional `CreatorChannel[]` + `CreatorCategory[]`,
     `AdSpaceOwnerProfile` + one `AdSpaceAsset` — and two `LegalConsent`
     rows (`TERMS_OF_SERVICE`, `PRIVACY_POLICY`, versioned via
     `LEGAL_VERSION`, `src/lib/legal-consent.ts:8,11`) with the requester's
     IP (`:87`, from `x-forwarded-for`).
   - A Postgres unique-constraint violation (`P2002` — duplicate company
     ID / national ID / phone / email) is caught and turned into a
     Hebrew field-specific message (`:208-220`) rather than a generic
     error.
   - On success: redirects to `/register/complete`.

**Step 3.5 — `/register/complete`** (`src/app/(frontend)/(auth)/register/complete/page.tsx`)
- Uses `requireActiveUser()` (not `requireRegistrationUser`), so it's only
  reachable once step 3 actually flipped the account to `ACTIVE` with a
  resolved `activeRole` (see `auth.md` §7).
- Congratulates the user, shows a role-switcher preview if they picked more
  than one role, and — only for creators — a `SocialConnectGrid`
  (`src/components/app/social-connect-grid.tsx`) prompting the *actual*
  OAuth channel connection that step 3's form deliberately deferred.
- Links to `/dashboard` and `/how-it-works`.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Route | `src/app/(frontend)/(auth)/register/roles/page.tsx` | Step 2 — role selection |
| Route | `src/app/(frontend)/(auth)/register/profile/page.tsx` | Step 3 — profile form |
| Route | `src/app/(frontend)/(auth)/register/complete/page.tsx` | Post-completion screen |
| Component | `src/components/auth/role-selection.tsx` | Step 2 UI, posts to `saveRoles` |
| Component | `src/components/auth/profile-setup-form.tsx` (887 lines) | Step 3 UI — tabbed brand/creator/space forms, posts to `completeRegistration` |
| Component | `src/components/auth/auth-progress.tsx`, `auth-split-screen.tsx`, `form-styles.ts` | Shared chrome (progress bar, split layout, input styling) across `/register*` |
| Guard | `src/lib/registration.ts` | `requireRegistrationUser`, `REGISTRATION_ROLE_KEYS`, role-key↔`UserRole` conversions |
| Validation | `src/lib/registration-schema.ts` | `parseRegistration` — per-role Zod schemas, `FormData` extraction (incl. `zipRows` for repeatable location/channel rows) |
| Action | `src/lib/actions/registration-actions.ts` | `saveRoles` (step 2), `completeRegistration` (step 3) |
| Fetcher | `src/lib/register-roles.ts` (+ `register-roles-defaults.ts`) | CMS copy for the 3 role cards |
| Fetcher | `src/lib/cities.ts` | City options for location/asset city selects |
| Fetcher | `src/lib/partner-categories-query.ts` | Category options scoped by role |
| Shared schema | `src/lib/ad-space-asset-form.ts` | `adSpaceAssetObjectSchema` — reused by both registration's space tab and the standalone "add asset" flow (`marketplace.md`) |
| Constants | `src/lib/legal-consent.ts` | `LEGAL_VERSION`, `REGISTRATION_CONSENT_DOCUMENTS` |
| CMS global | `src/globals/RegisterRoles.ts` (Payload collection backing `register-roles.ts`) | Editorial copy for step 2 cards |
| Post-completion | `src/components/app/social-connect-grid.tsx`, `src/lib/social-connections.ts` | Out of scope here — see creator channel OAuth in `marketplace.md`/future spec |

## 5. Data model

Transitions and writes all happen inside `completeRegistration`'s single
`prisma.$transaction` (`src/lib/actions/registration-actions.ts:90-207`)
except `saveRoles`' earlier, separate `User.roles` write (`:34-37`).

- **`User`** (`prisma/schema.prisma:401-441`) — `roles: UserRole[]` set in
  step 2; `status`, `activeRole`, `name`, `phone`, `termsAcceptedAt` set in
  step 3.
- **`BusinessProfile`** (`:501-...`) + **`BusinessLocation`** (one row per
  submitted location, first one flagged `isPrimary`) + **`BusinessCategory`**
  (single category per business, despite the model name being plural-shaped)
  — created only if `brand` role selected.
- **`CreatorProfile`** + optional **`CreatorChannel[]`** (only if channels
  were somehow submitted — normally empty per §3) + **`CreatorCategory[]`**
  (one row per selected content category) — only if `creator` selected.
- **`AdSpaceOwnerProfile`** + one **`AdSpaceAsset`** — only if `space`
  selected. Note: registration only ever creates **one** asset per new
  space-owner; adding more is `marketplace.md`'s territory.
- **`LegalConsent`** (`ConsentDocumentType`: `TERMS_OF_SERVICE`,
  `PRIVACY_POLICY`) — always two rows, versioned by `LEGAL_VERSION`
  (`src/lib/legal-consent.ts:8`).

**Status transition:** `PENDING_ONBOARDING → ACTIVE`, triggered exclusively
by `completeRegistration` (`registration-actions.ts:96`) — see `auth.md` §5
for the full `UserStatus` transition table (this is the only forward edge
out of `PENDING_ONBOARDING`; §8/§10 below note there is no path back into
onboarding once `ACTIVE`).

## 6. API contracts

No REST endpoints — both steps are Next.js Server Actions invoked via
`useActionState` from client components (`role-selection.tsx:49`,
`profile-setup-form.tsx:124`), not `fetch`/API routes. Inputs are raw
`FormData`; there is no JSON schema boundary beyond the Zod schemas in
`registration-schema.ts`.

## 7. Guards & permissions

- **`requireRegistrationUser`** (`src/lib/registration.ts:29-49`) — the only
  guard used by steps 2 and 3. No session → `/sign-in?callbackUrl=/register/roles`;
  `deletedAt`/`SUSPENDED`/`BANNED` → `/sign-in?error=account`. Deliberately
  *allows* `PENDING_ONBOARDING` (that's the expected state throughout both
  steps).
- Both step pages additionally self-redirect once `status === "ACTIVE"`
  (`roles/page.tsx:18`, `profile/page.tsx:15`) — this is what makes the
  onboarding flow effectively one-shot (see §8).
- `/register/profile` also redirects to `/register/roles` if no roles are
  saved yet (`profile/page.tsx:16`), preventing a direct-URL skip of step 2.
- `/register/complete` uses the stronger `requireActiveUser()` from
  `auth.md` §7, not `requireRegistrationUser` — it is unreachable until
  step 3 has actually succeeded.
- `src/proxy.ts`'s optimistic cookie check additionally covers
  `/register/{roles,profile,complete}` (not bare `/register`, which stays
  public) — see `auth.md` §7.

## 8. Known edge cases

- **Step 2 is freely re-editable, step 3 is not, and neither is reachable
  again after completion.** A user can flip back and forth between
  `/register/roles` and `/register/profile` (re-submitting `saveRoles`
  overwrites the role set each time) right up until `completeRegistration`
  succeeds — at which point `status` becomes `ACTIVE` and both step pages
  permanently redirect away. There is no "resume/edit onboarding" path
  after that.
- **Duplicate identifiers** (company ID, national ID, phone, email) surface
  as a top-level Hebrew banner (`P2002_MESSAGES`,
  `registration-actions.ts:50-55`) but the transaction has already run
  every `create` up to the failing one inside the same `$transaction`, so
  Postgres rolls the whole thing back — no partial profiles are left
  behind. Good behavior, just noting it's transaction-safety, not
  pre-validation (the uniqueness isn't checked before attempting the write).
- **Consent checkbox vs. `LegalConsent` record**: ticking the consent
  checkbox on `/register` (step 1) is required to even call `signIn`, but
  no `LegalConsent` row and no `termsAcceptedAt` are written until step 3
  completes (`registration-actions.ts:98,199-206`). A user who signs in and
  abandons onboarding before finishing step 3 has *no* stored consent
  record at all, despite having "agreed" in the UI.
- **`entityType`/`taxStatus`/etc. selects have no server-enforced default**
  the way `useState("PHYSICAL")` etc. does client-side
  (`profile-setup-form.tsx:263`) — if JS fails to run, the raw `<select>`'s
  HTML default (if any) is what actually gets submitted; not verified here
  since it's a rendering detail of the ~250 lines per tab not fully read.

## 9. Tech debt / TODOs in code

- **`errorTab` is computed but never consumed.** `completeRegistration`
  returns `errorTab` (`registration-actions.ts:76`, sourced from
  `parseRegistration`'s `RegistrationParseResult`,
  `registration-schema.ts:109-116`) specifically so the UI can jump to the
  tab with the invalid fields — but `ProfileSetupForm` never reads
  `state.errorTab` anywhere (confirmed: no reference to it in
  `profile-setup-form.tsx`). It only lights a red dot on the *button* of
  the erroring tab via `errorPrefixes` (`:133,157,170-171`) without
  switching `active` to it. Since only the currently-active (and, by
  construction, last) tab is ever submitted from, a validation error on an
  *earlier* tab is easy to miss — the user sees no error at all on the tab
  they're looking at.
- **Misleading "Save and continue" label**: the inter-tab "next" buttons
  read "שמור ועבור ל..." (*Save* and go to...) but are `type="button"`
  handlers that only call `setActive(i + 1)` locally
  (`profile-setup-form.tsx:220-227`) — nothing is persisted until the
  final submit on the last tab. A user who fills the brand tab, moves on,
  then abandons before the last tab loses that data; the UI copy suggests
  otherwise.
- `creator.channels` in `registration-schema.ts:70-84` is validated and
  wired all the way through `completeRegistration`
  (`registration-actions.ts:147-157`) for a form field that
  `ProfileSetupForm` never actually renders (channels are collected via
  OAuth post-registration per the code's own comment,
  `registration-schema.ts:68-69`) — dead but harmless code path, `[]`
  every time in practice.

## 10. Findings for the team lead

- **No way to add a role after registration completes.** `saveRoles`
  (`src/lib/actions/registration-actions.ts:23-41`) is the only production
  code path that ever writes to `User.roles`, and it's only reachable
  through `/register/roles`, which self-redirects to `/dashboard` the
  moment `status === "ACTIVE"` (`roles/page.tsx:18`). So a brand-only user
  who later wants to also become a creator has no in-product way to do
  that — there's no "add a role" affordance anywhere under
  `/dashboard/settings` or elsewhere (grepped for any other write to
  `User.roles`; only registration and the `/dev/*` seed routes touch it).
  This seems like a real product gap given the multi-role "hat switching"
  UX (`role-switcher.tsx`, `/register/complete`'s own copy about switching
  between roles) implies the system was designed to support more than one
  role per user.
- **`errorTab` dead-letter bug** (§9): on a multi-role registration with
  several tabs, a validation failure on a non-active tab is nearly
  invisible to the user (small dot on an unselected tab button, no
  auto-navigation, no visible error text on the tab actually being
  viewed). Worth fixing — either wire `state.errorTab` into `setActive` on
  form-state change, or make the error banner itself link to the failing
  tab.
- No security-relevant issue was found in this feature: all writes are
  gated by `requireRegistrationUser`, the transaction is atomic, and
  duplicate-identifier collisions are handled without leaking which table
  the conflict came from beyond a friendly Hebrew label.

---

**Next in queue:** #3 Guards & roles (RBAC) (`rbac-guards.md`) — much of its
groundwork (the guard hierarchy, `RoleKey`/`ROLE_META`/`resolveActiveRole`)
was already surveyed while writing `auth.md` and this spec; that pass should
focus on where `roleKeys`/`activeRole` are actually *enforced* across
`/dashboard/**` and API routes, beyond the identity-and-onboarding guards
covered here.
