# Spec: Auth + sign-in (NextAuth)

> status: documented · updated: 2026-09-06 · owning agent: private-area

## 1. Business purpose

Single authentication backend for the whole protected area (`/dashboard/**`, `/register/**`, admin). Lets a
person prove who they are (Google OAuth or a passwordless email magic link) without the product ever storing
a password. Authentication is deliberately decoupled from onboarding: signing in only creates/loads a `User`
row and a session — it does **not** by itself grant access to the dashboard. A second gate
(`requireActiveUser`, see §7) decides whether the person still needs to finish the registration wizard
(role selection → profile → terms) before the app shell renders.

## 2. Roles involved

Auth itself is role-agnostic — every `UserRole` (`BRAND`, `CREATOR`, `AD_SPACE_OWNER`, `ADMIN`) goes through
the same sign-in/sign-up code path. Role selection happens later, in registration (spec `registration.md`,
item 2 of the queue). The only role-aware piece inside the auth domain is `requireAdmin()`
(`src/lib/admin-guard.ts:9`), which layers an `ADMIN`-membership check on top of `requireActiveUser()`.

## 3. User flow

**Entry points** — `/sign-in` (`src/app/(frontend)/(auth)/sign-in/page.tsx`) and `/register`
(`src/app/(frontend)/(auth)/register/page.tsx`) render **the same two provider buttons** (Google / email
magic link) wired to the **same** `signIn()` calls from `src/auth.ts`. There is no separate "create account"
vs "log in" backend distinction — NextAuth + `PrismaAdapter` create the `User`/`Account` row transparently
on first sign-in via either page. The two pages differ only in copy, starting `redirectTo`
(`/dashboard` for sign-in, `/register/roles` for register — `src/app/(frontend)/(auth)/sign-in/page.tsx:19`,
`src/app/(frontend)/(auth)/register/page.tsx:15`), and in that `/register`'s email form requires a `consent`
checkbox to be ticked before calling `signIn("resend", …)` (`src/app/(frontend)/(auth)/register/page.tsx:85-87`).
Both pages redirect away immediately if `auth()` already returns a session
(`sign-in/page.tsx:16-17`, `register/page.tsx:22-23`).

**Google OAuth path:**
1. User submits the Google form → `signIn("google", { redirectTo })` (server action, no client JS).
2. Google redirects back to `/api/auth/callback/google`, handled by the NextAuth `handlers` exported from
   `src/auth.ts` and re-exported at `src/app/api/auth/[...nextauth]/route.ts:1-3`.
3. `PrismaAdapter` finds-or-creates the `User`/`Account` rows and a `Session` row (database session
   strategy — `src/auth.ts:32`), and a session cookie is set.
4. Redirect continues to `redirectTo`, which then hits `requireActiveUser()` and is bounced to
   `/register/roles` if onboarding isn't complete (see §7).

**Email (Resend) magic-link path:**
1. User enters an email (and, on `/register`, checks consent) → `signIn("resend", { email, redirectTo })`.
2. On success NextAuth redirects to `?check=email`; both pages render a "check your inbox" banner
   (`sign-in/page.tsx:31-35`, `register/page.tsx:33-37`).
3. On failure (`AuthError`, e.g. bad email/Resend error) the server action redirects to
   `?error=email` (`sign-in` throws it back to the generic banner; `register` has a dedicated
   "sending the link failed" message).
4. Clicking the emailed link hits `/api/auth/callback/resend`, verified against `VerificationToken`, which
   creates/loads the `User` + `Session` the same way as the OAuth path.

**Sign-out:** `signOutAction()` (`src/lib/actions/app-actions.ts:37-38`) calls `signOut({ redirectTo: "/" })`
— used from the app shell's user menu, not part of this file map in detail (belongs to the private-area shell).

**Dev-only bypass:** `GET /dev/login` (`src/app/(frontend)/dev/login/route.ts`) manufactures a `User` +
`Session` row directly and sets the `authjs.session-token` cookie by hand, skipping both providers entirely.
Gated by `process.env.NODE_ENV !== "development"` → 404 (line 31-33). Supports `?email=`, `?role=`,
`?pending=1`, `?next=` query params for spinning up demo/test sessions in any onboarding state. This is the
only place in the codebase that touches the NextAuth session cookie directly instead of going through
`signIn()`/`signOut()`.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Auth config | `src/auth.ts` | NextAuth instance: providers (Google, Resend), Prisma adapter, database session strategy, custom pages, `session` callback that copies `id`/`roles`/`activeRole` onto the client-visible session |
| API route | `src/app/api/auth/[...nextauth]/route.ts` | Re-exports `handlers.GET/POST` — handles all `/api/auth/*` provider + callback traffic |
| Types | `src/types/next-auth.d.ts` | Module augmentation adding `id`/`roles`/`activeRole` to `Session.user`, `User`, and `AdapterUser` |
| Route | `src/app/(frontend)/(auth)/sign-in/page.tsx` | Sign-in UI + server actions calling `signIn()` |
| Route | `src/app/(frontend)/(auth)/register/page.tsx` | Registration entry UI (same providers) + consent checkbox for email path |
| Dev route | `src/app/(frontend)/dev/login/route.ts` | Dev-only session-cookie shortcut, 404s outside `NODE_ENV=development` |
| Guard (app) | `src/lib/app-user.ts` (`requireActiveUser`) | Server-side gate for the protected app shell: session → DB user → status/onboarding checks → normalized `AppUser` |
| Guard (admin) | `src/lib/admin-guard.ts` (`requireAdmin`) | `requireActiveUser()` + `ADMIN` role check |
| Guard (registration) | `src/lib/registration.ts` (`requireRegistrationUser`) | Lighter gate used by the `/register/roles|profile|complete` wizard steps — allows any non-blocked status |
| Guard (unused) | `src/lib/auth-helpers.ts` (`requireUser`, `requireRole`) | Session-only checks, no DB status/deleted checks — see §9 |
| Action | `src/lib/actions/app-actions.ts` (`signOutAction`) | Server action wrapping `signOut()` |
| Env validation | `src/env.ts` | Zod schema for `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_ID/SECRET`, `AUTH_RESEND_KEY`, `EMAIL_FROM`; `hasGoogle`/`hasEmail` feature flags used to conditionally render provider buttons |
| Role mapping | `src/lib/app-nav.ts` | `roleKeyFromUserRole` / `userRoleFromKey` / `sortRoleKeys` / `resolveActiveRole` — shared by `app-user.ts` and `registration.ts` |

## 5. Data model

From `prisma/schema.prisma`:

- **`User`** (`prisma/schema.prisma:401-441`) — the adapter-owned identity row plus product fields:
  `roles UserRole[]` (default `[]`), `activeRole UserRole?`, `status UserStatus` (default
  `PENDING_ONBOARDING`), `termsAcceptedAt DateTime?`, `lastLoginAt DateTime?`, `deletedAt DateTime?`,
  `passwordHash String?` (unused — passwordless only, kept "for the future" per its own comment, line 409),
  `twoFactorEnabled Boolean` (default `false`, no 2FA flow implemented anywhere in the codebase).
- **`Account`** (`:456-475`) — one row per linked OAuth provider identity (`@@id([provider, providerAccountId])`),
  standard Auth.js adapter shape, cascades on `User` delete.
- **`Session`** (`:477-487`) — database-strategy session row (`sessionToken`, `userId`, `expires`); this is
  what the dev-login route inserts directly.
- **`VerificationToken`** (`:489-495`) — one-time tokens backing the Resend magic-link flow.

**Enums:**
- `UserRole` (`:27-32`): `BRAND | CREATOR | AD_SPACE_OWNER | ADMIN`.
- `UserStatus` (`:34-39`): `PENDING_ONBOARDING | ACTIVE | SUSPENDED | BANNED`.

**Status transitions:**
- `PENDING_ONBOARDING → ACTIVE`: only inside `completeRegistration()`
  (`src/lib/actions/registration-actions.ts:96-99`), in the same transaction that also sets `activeRole`,
  `termsAcceptedAt`, and creates the role-specific profile(s). Not part of this feature's own file map, but
  it is the transition `requireActiveUser()` waits for.
- `ACTIVE → SUSPENDED/BANNED`: no code path found under `src/` — presumably an admin-only/manual DB
  operation still to be built (candidate for `admin-dashboard.md`).
- Terminal `deletedAt` (soft delete): set somewhere outside this domain; checked by every guard in §7 but no
  writer was found in `src/lib/`, `src/lib/actions/`, or `src/app/api/`.

## 6. API contracts

No custom REST endpoints — all traffic goes through the NextAuth catch-all:

- `GET/POST /api/auth/[...nextauth]` (`src/app/api/auth/[...nextauth]/route.ts`) — covers
  `/api/auth/signin/:provider`, `/api/auth/callback/:provider`, `/api/auth/session`, `/api/auth/csrf`, etc.,
  entirely per NextAuth v5 (`next-auth@5.0.0-beta.32`, `package.json:39`) conventions. No app code adds
  custom logic here beyond the `session` callback in `src/auth.ts:42-49`.
- `GET /dev/login` (`src/app/(frontend)/dev/login/route.ts`) — see §3/§8, dev-only.

## 7. Guards & permissions

Three different server-side guards exist, with different strictness — see §9 for the inconsistency this creates:

1. **`requireActiveUser()`** (`src/lib/app-user.ts:33-84`) — used by essentially every dashboard route/action
   (48 call sites, see file map). Order of checks:
   - no session → `redirect("/sign-in?callbackUrl=/dashboard")` (line 36)
   - no DB row or `deletedAt` set → `redirect("/sign-in?error=account")` (line 54-56)
   - `status` is `SUSPENDED` or `BANNED` → same redirect (line 58-60)
   - onboarding incomplete (`status !== ACTIVE`, or no roles, or `termsAcceptedAt == null`) →
     `redirect("/register/roles")` (line 63-68)
   - no resolvable `activeRole` (shouldn't happen once onboarding is done, defensive) →
     `redirect("/register/roles")` (line 70-73)
   - otherwise returns the normalized `AppUser` (id, name, email, image, status, `roleKeys`, `activeRole`).
2. **`requireAdmin()`** (`src/lib/admin-guard.ts:9-15`) — calls `requireActiveUser()` then redirects to
   `/dashboard` if `"admin"` isn't in `roleKeys`.
3. **`requireRegistrationUser()`** (`src/lib/registration.ts:34-52`) — used only by the registration wizard
   actions (`saveRoles`, `completeRegistration`, etc. — see `registration.md`). No session →
   `/sign-in?callbackUrl=/register/roles`; blocked/deleted account → `/sign-in?error=account`; otherwise
   returns the user **regardless of onboarding completeness**, since incomplete onboarding is the expected
   state here.

No edge/middleware-level auth exists (`middleware.ts` not present) — every protection is a server-component
or server-action call to one of the guards above, meaning any new server-rendered route under
`(app)/dashboard/**` must remember to call `requireActiveUser()` itself; nothing enforces it structurally
except the shared `(app)/layout.tsx` calling it once for the whole route group
(`src/app/(frontend)/(app)/layout.tsx`).

## 8. Known edge cases

- Session strategy is **database**-backed (`src/auth.ts:32`), so revoking access (ban/suspend) takes effect
  on the next request without needing to invalidate a JWT — the guard re-reads `status` from `User` on every
  call (cheap since `requireActiveUser` is wrapped in React `cache()`, i.e. once per request).
- `allowDangerousEmailAccountLinking: true` on the Google provider (`src/auth.ts:16`) means a Google login
  with an email that already exists (e.g. from a prior magic-link account) auto-links to that existing
  `User` instead of failing — intentional for a passwordless system, but it does mean anyone who can receive
  mail at that address and also owns/controls a Google account with the same address can merge into it.
- `/register`'s consent checkbox only gates the **email** provider button; the **Google** button
  (`src/app/(frontend)/(auth)/register/page.tsx:56-71`) has no consent gate at all before calling `signIn`.
  See §10 — actual consent persistence happens later regardless, in the registration wizard.
- No providers configured (`hasGoogle`/`hasEmail` both false) → both pages render a config-warning banner
  instead of broken buttons (`sign-in/page.tsx:20,42-47`; `register/page.tsx:25,49-54`).
- `/dev/login`'s manual cookie-naming logic (`src/app/(frontend)/dev/login/route.ts:95-99`) hardcodes the
  `__Secure-`/plain cookie-name switch based on request protocol since `src/auth.ts` sets no explicit
  `cookies` config — if that default ever changes in `src/auth.ts`, this dev route silently breaks (404
  test coverage would not catch a cookie-name mismatch, only a full manual dev-login check would).

## 9. Tech debt / TODOs in code

- `src/lib/auth-helpers.ts:9-24` (`requireUser`, `requireRole`) is **dead code** — zero call sites anywhere
  in `src` outside its own definition (verified via repo-wide grep). It also duplicates
  `requireActiveUser`/`requireAdmin` with materially weaker guarantees: it only checks `session.user`
  existence and `session.user.roles` from the session object, without checking DB `status`, `deletedAt`, or
  onboarding completeness. If ever wired up by a future route it would silently let suspended/banned/
  incomplete-onboarding users through. Candidate for deletion once confirmed unused, or for removal in the
  same change that introduces whatever it was meant for.
- `User.lastLoginAt` (`prisma/schema.prisma:414`) is never written by the real auth flow — no `events`
  callback in `src/auth.ts` updates it on sign-in. The only writers are dev/seed routes
  (`src/app/(frontend)/dev/login/route.ts:78,85` and various `dev/seed-*` routes). The field exists and is
  presumably meant to reflect real logins; today it always reads seed-time values or `null` for anyone who
  signed up through the real flow.
- `User.passwordHash` and `User.twoFactorEnabled` (`prisma/schema.prisma:409,413`) are schema-only —
  no provider, action, or UI reads or writes either field anywhere in `src/`. Pure forward-looking schema,
  not actively misleading, but worth knowing before building anything that assumes either is functional.
- No code path was found that ever sets `User.status` to `SUSPENDED`/`BANNED` or `User.deletedAt` — every
  guard defends against these states, but nothing in `src/` currently produces them (likely lives in an
  as-yet-unbuilt admin feature).

## 10. Findings for the team lead

1. **Consent checkbox is cosmetic, not enforcement.** `/register`'s email form blocks submission without
   the `consent` checkbox (`src/app/(frontend)/(auth)/register/page.tsx:85-87`, redirects to
   `?error=consent`), but ticking it writes nothing to the database — `termsAcceptedAt` is only ever set
   later, inside `completeRegistration()` (`src/lib/actions/registration-actions.ts:96-99`), which is the
   real point where consent is legally captured (also see `LEGAL_VERSION`/`REGISTRATION_CONSENT_DOCUMENTS`
   imported there from `src/lib/legal-consent.ts`, worth checking in `registration.md` whether an actual
   `LegalConsent` row is created at that point). Meanwhile the **Google** button on the very same `/register`
   page has no consent gate whatsoever before calling `signIn("google", …)`. Net effect: the checkbox creates
   an inconsistent (and functionally meaningless, since it persists nothing) user experience between the two
   providers, and doesn't actually satisfy consent-recording on its own for either path. Worth a decision:
   either remove the premature email-only gate (since the wizard enforces it properly later) or make it
   consistent and actually persist something at that stage.
2. **Dead, weaker duplicate guard.** `src/lib/auth-helpers.ts`'s `requireUser`/`requireRole` are unused today
   but are exactly the kind of helper a future PR might reach for by name over the correct
   `requireActiveUser`/`requireAdmin`, silently reintroducing a bypass of the status/onboarding/soft-delete
   checks. Recommend deleting it now rather than leaving it as an attractive nuisance.
3. **No enforcement path for suspend/ban/soft-delete.** All three guards carefully check
   `SUSPENDED`/`BANNED`/`deletedAt`, but no admin action anywhere in the current codebase sets them — this is
   presumably intentionally deferred to the admin-dashboard feature (item 19 in the queue), flagging so it
   isn't lost.
