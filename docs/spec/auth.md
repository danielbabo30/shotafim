# Spec: Auth + sign-in (NextAuth / Auth.js v5)

> status: documented · updated: 2026-09-05 · owning agent: private-area

## 1. Business purpose

Passwordless authentication for every logged-in area of the site (private dashboard,
onboarding/registration, admin). Users identify with either a Google OAuth account or
an email magic link (Resend) — there is no password login. Auth.js (`next-auth`
`5.0.0-beta.32`) owns session issuance; the app layer (`requireActiveUser` /
`requireAdmin`) owns the business gate on top of a valid session (onboarding complete,
account not suspended, role selected).

## 2. Roles involved

Auth itself is role-agnostic — any visitor can sign in/register. The `User.roles`
array (`UserRole[]`: `BRAND · CREATOR · AD_SPACE_OWNER · ADMIN`) is populated later
during registration (see `registration.md`, spec #2), not at the auth layer. A brand
new `User` row is created by the `PrismaAdapter` with `roles: []`,
`status: PENDING_ONBOARDING`, `activeRole: null` — auth only proves *who* signed in,
not what they're allowed to do.

## 3. User flow

1. Visitor hits `/sign-in` (`src/app/(frontend)/(auth)/sign-in/page.tsx`).
   - If already signed in (`auth()` returns a session), immediately
     `redirect(callbackUrl || "/dashboard")` (`sign-in/page.tsx:17`).
   - `callbackUrl` search param carries the page the user was trying to reach (set by
     `requireActiveUser`/`requireAdmin` redirects, e.g. `/sign-in?callbackUrl=/dashboard`
     — `src/lib/app-user.ts:36`).
2a. **Google branch** (`hasGoogle` true, i.e. both `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`
    set — `src/env.ts:52`): a form posts a server action that calls
    `signIn("google", { redirectTo })` (`sign-in/page.tsx:49-63`). Standard OAuth
    redirect dance handled entirely by Auth.js; on return, `PrismaAdapter` creates/finds
    the `User` + `Account` row.
2b. **Email branch** (`hasEmail` true, i.e. `AUTH_RESEND_KEY`+`EMAIL_FROM` set): a form
    posts the user's email to a server action calling
    `signIn("resend", { email, redirectTo })` (`sign-in/page.tsx:65-80`). Auth.js writes
    a `VerificationToken`, and Resend emails a magic link. On failure (`AuthError`) the
    action redirects to `/sign-in?error=email` (`sign-in/page.tsx:74-78`).
    On success, the page (still server-rendered, same request) would normally redirect
    to `verifyRequest` — configured as `/sign-in?check=email`
    (`src/auth.ts:19` `pages.verifyRequest`) — which renders the "check your inbox"
    banner (`sign-in/page.tsx:31-35`).
3. Clicking the magic link hits the NextAuth callback route (see §6), which verifies
   the `VerificationToken`, creates the `Session` row (database strategy), sets the
   session cookie, and redirects to `redirectTo` (originally `/dashboard`).
4. **Edge case — no providers configured:** if neither `hasGoogle` nor `hasEmail` is
   true, the page renders an amber warning telling the operator which `.env` vars are
   missing, with no functional sign-in form at all (`sign-in/page.tsx:20,42-47`).
5. Every protected server-rendered entry point re-validates the session against the DB
   on each request via `requireActiveUser()` (`src/lib/app-user.ts:33-84`, used by the
   `(app)` layout, `src/app/(frontend)/(app)/layout.tsx:14`) — there is no middleware;
   gating is 100% in React Server Component layouts. `requireActiveUser` additionally
   enforces the onboarding gate (redirects to `/register/roles` — spec #2/#3 own that
   flow) and blocks `SUSPENDED`/`BANNED`/soft-deleted accounts by redirecting to
   `/sign-in?error=account` (`app-user.ts:54-60`).
6. **Sign out:** `signOutAction` server action (`src/lib/actions/app-actions.ts:37-39`)
   calls `signOut({ redirectTo: "/" })`, wired from the dashboard sidebar and user menu
   (`src/components/app/sidebar-content.tsx:62`, `src/components/app/user-menu.tsx:63`).
7. **Marketing header state:** `HeaderAuthActions` (client component,
   `src/components/marketing/header-auth-actions.tsx`) fetches `/api/auth/session`
   (Auth.js's built-in session JSON endpoint) on mount to decide whether to show
   Login/Signup or "Personal area" buttons — a client-side island so the marketing
   pages stay static for SEO (comment at file top explains the tradeoff explicitly).

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Config | `src/auth.ts` | NextAuth instance: adapter, providers, session strategy, pages, callbacks |
| Env validation | `src/env.ts` | `hasGoogle` / `hasEmail` feature flags from required env vars |
| Route | `src/app/api/auth/[...nextauth]/route.ts` | Exposes Auth.js's `GET`/`POST` handlers (OAuth callback, CSRF, session JSON, signout, etc.) |
| Route (page) | `src/app/(frontend)/(auth)/sign-in/page.tsx` | Sign-in UI + inline server actions for both providers |
| Type augmentation | `src/types/next-auth.d.ts` | Adds `roles`/`activeRole` to `Session.user`, `next-auth` `User`, and `AdapterUser` |
| Guard (generic, session-only) | `src/lib/auth-helpers.ts` | `requireUser`, `requireRole` — **not used anywhere in the app** (see §9) |
| Guard (business gate, used everywhere) | `src/lib/app-user.ts` | `requireActiveUser` — session + DB re-check + onboarding gate + role resolution |
| Guard (admin) | `src/lib/admin-guard.ts` | `requireAdmin` — wraps `requireActiveUser`, checks `roleKeys.includes("admin")` |
| Action | `src/lib/actions/app-actions.ts` | `signOutAction`, `setActiveRole` (role-switch; belongs conceptually to RBAC, spec #3) |
| Client island | `src/components/marketing/header-auth-actions.tsx` | Reads `/api/auth/session` to toggle marketing header CTAs |
| Consumer | `src/app/(frontend)/(app)/layout.tsx` | Calls `requireActiveUser()` to gate the entire `(app)` route group |

## 5. Data model

Models in `prisma/schema.prisma` (Auth.js Prisma adapter shape, extended with app fields):

- **`User`** (`schema.prisma:401-435`): adapter fields `id, name, email (unique),
  emailVerified, image` plus app fields `phone (unique), phoneVerified, passwordHash
  (unused today — nullable, reserved), roles: UserRole[] (@default([])), activeRole:
  UserRole?, status: UserStatus (@default(PENDING_ONBOARDING)), twoFactorEnabled
  (@default(false), unused), lastLoginAt (unused — never written, see §9),
  termsAcceptedAt, deletedAt` (soft delete).
- **`Account`** (`schema.prisma:456-475`): standard Auth.js OAuth link table, composite
  `@@id([provider, providerAccountId])`. Google config sets
  `allowDangerousEmailAccountLinking: true` (`src/auth.ts:16`) — see §8 edge case.
- **`Session`** (`schema.prisma:477-487`): database session strategy
  (`session: { strategy: "database" }`, `src/auth.ts:14`) — one row per active session,
  `sessionToken` unique, `expires`.
- **`VerificationToken`** (`schema.prisma:489-495`): magic-link tokens for the Resend
  provider, composite `@@id([identifier, token])`.

Enums:
- **`UserRole`** (`schema.prisma:27-32`): `BRAND · CREATOR · AD_SPACE_OWNER · ADMIN`.
- **`UserStatus`** (`schema.prisma:34-39`): `PENDING_ONBOARDING → ACTIVE`; also
  `SUSPENDED`, `BANNED` (both hard-block sign-in via `requireActiveUser`, `app-user.ts:58-60`).
  No code path in this spec's scope transitions a user *out* of `SUSPENDED`/`BANNED`
  (admin tooling — future `admin-dashboard.md`, spec #19).

Status transition owned by this feature: `PENDING_ONBOARDING → ACTIVE` is **not** set
by anything in the auth layer — it's set during registration (spec #2). Auth only
creates the row at `PENDING_ONBOARDING` (adapter default) and reads `status` on every
request thereafter.

## 6. API contracts

No custom API routes — `src/app/api/auth/[...nextauth]/route.ts` re-exports Auth.js's
own `handlers.GET`/`handlers.POST` verbatim (`route.ts:1-3`). Auth.js internally exposes
(among others, all under `/api/auth/*`, unauthenticated except where noted):

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/auth/signin/google` | GET/POST | Kicks off Google OAuth redirect |
| `/api/auth/callback/google` | GET | OAuth callback, creates `Account`+`Session` |
| `/api/auth/signin/resend` | POST | Issues `VerificationToken`, sends email |
| `/api/auth/callback/resend` | GET | Verifies magic-link token, creates `Session` |
| `/api/auth/session` | GET | Returns current session JSON — consumed client-side by `HeaderAuthActions` |
| `/api/auth/signout` | POST | Auth.js's own signout (app uses the `signOutAction` server action instead, not this endpoint directly) |
| `/api/auth/csrf` | GET | CSRF token for the above |

`session()` callback (`src/auth.ts:32-39`) shapes what `/api/auth/session` and
`auth()` return: adds `id`, `roles`, `activeRole` onto `session.user` from the
adapter's `User` row (type-augmented in `next-auth.d.ts`).

## 7. Guards & permissions

- **`requireUser()` / `requireRole(role)`** (`src/lib/auth-helpers.ts:9-24`): checks
  only `auth()` session presence / `session.user.roles.includes(role)`. Redirects to
  `/sign-in` or `/dashboard`. **Dead code** — grep confirms zero call sites outside
  their own file (see §9, §10).
- **`requireActiveUser()`** (`src/lib/app-user.ts:33-84`): the guard actually used by
  every protected layout. On failure:
  - No session → `redirect("/sign-in?callbackUrl=/dashboard")`.
  - User row missing or `deletedAt` set → `redirect("/sign-in?error=account")`.
  - `status` is `SUSPENDED`/`BANNED` → `redirect("/sign-in?error=account")`.
  - Onboarding incomplete (`status !== "ACTIVE"` OR no roles OR `termsAcceptedAt` null)
    → `redirect("/register/roles")`.
  - `activeRole` unresolvable (shouldn't happen once `roleKeys.length > 0`, defensive)
    → `redirect("/register/roles")`.
  Wrapped in React's `cache()` — one DB round-trip per request even if called from
  multiple layouts/pages in the same render.
- **`requireAdmin()`** (`src/lib/admin-guard.ts`): `requireActiveUser()` +
  `roleKeys.includes("admin")`, else `redirect("/dashboard")`.
- `PENDING_ONBOARDING` users who somehow have a session but haven't finished
  registration are still let *past* `requireActiveUser`'s first two checks (session +
  row exist) and only stopped at the onboarding-gate check — meaning `/api/auth/session`
  (unauthenticated by design, just reflects the session) will report them as logged in
  even before onboarding completes. This is intentional (needed so `/register/*` can
  read `auth()` itself) but worth knowing when reasoning about "is this user real" —
  registration.md should treat `session.user` as *authenticated* only, never as
  *onboarded*.

## 8. Known edge cases

- **No providers configured** (`hasGoogle` and `hasEmail` both false): sign-in page
  shows only a config warning, no form — a valid state for local dev before `.env` is
  filled in (`sign-in/page.tsx:20,42-47`).
- **`allowDangerousEmailAccountLinking: true`** on Google (`src/auth.ts:16`): if a
  `User` already exists with a given email (e.g. via magic link) and later signs in
  with Google using the same email, Auth.js links the new `Account` to the existing
  `User` automatically, without ownership re-verification of the email beyond Google's
  own OAuth flow. Standard Auth.js tradeoff for a passwordless app; flagged in §10 since
  it does carry account-takeover risk if Google's email were somehow spoofable (it
  isn't, in practice) — mentioning per systems-analyst rules for any auth-relevant
  config.
- **`redirectTo` echoes user input**: `callbackUrl` from the query string flows straight
  into `signIn(..., { redirectTo })` and the `redirect()` fallback
  (`sign-in/page.tsx:19,53,73`) with no allow-list/relative-path check. Auth.js does
  validate `redirectTo` against its own trusted-origins logic internally, but the
  literal `redirect(callbackUrl || "/dashboard")` at `sign-in/page.tsx:17` (the
  "already signed in" branch) passes the raw query value straight to Next's
  `redirect()` with **no validation at all** — see §10.
- **Resend failure path only catches `AuthError`** (`sign-in/page.tsx:74-79`): any
  other thrown error (network, Resend API outage) propagates as an unhandled server
  action error rather than a friendly `/sign-in?error=...` redirect.
- **`twoFactorEnabled` and `passwordHash` fields exist but are entirely unused** by any
  code path found in this repo — schema is provisioned for a future password/2FA
  feature that isn't built yet.

## 9. Tech debt / TODOs in code

- `src/lib/auth-helpers.ts:1-24` (`requireUser`, `requireRole`) — dead code, superseded
  by `requireActiveUser`/`requireAdmin` which additionally check onboarding/suspension.
  No call sites found anywhere in `src/`.
- `User.lastLoginAt` (`schema.prisma:414`) — column exists, never written to by any
  code found (`auth.ts` has no `events.signIn` callback updating it). Always `null`.
- `User.twoFactorEnabled` (`schema.prisma:413`) and `User.passwordHash`
  (`schema.prisma:409`) — schema-only, no provider or UI implements password or 2FA
  login.
- No rate limiting on the Resend magic-link request form — a single POST to
  `/sign-in` (email branch) can be resubmitted freely; Auth.js does not add this by
  default.

## 10. Findings for the team lead

1. **Dead/misleading guard module** (`src/lib/auth-helpers.ts`): `requireUser`/
   `requireRole` are unused, but they *look* like the canonical guard (simpler names
   than `requireActiveUser`/`requireAdmin`) and a future contributor could easily reach
   for them instead. Unlike the guards actually in use, they do **not** check
   `status` (`SUSPENDED`/`BANNED`/soft-deleted) or onboarding completion — using them
   anywhere would silently let a suspended or half-registered user through. Recommend
   either deleting the module or re-pointing it to delegate to `requireActiveUser`.
2. **Unvalidated `callbackUrl`/`redirectTo` open redirect surface**
   (`src/app/(frontend)/(auth)/sign-in/page.tsx:14,17,19,53,73`): the `callbackUrl`
   query param is attacker-controlled (anyone can link `/sign-in?callbackUrl=...`) and
   is passed straight into `redirect()` for the "already signed in" branch with zero
   validation that it's a same-origin relative path. Low severity in practice (Next's
   `redirect()` won't fetch an external URL client-side the way a `<meta refresh>`
   would, but it does set it as the `Location` header, which some browsers/clients may
   still follow off-site) — worth an explicit same-origin check (e.g. `startsWith("/")`
   and not `"//..."`) before this ships past internal testing.
3. **`allowDangerousEmailAccountLinking: true`** (`src/auth.ts:16`) — intentional given
   passwordless design, but confirm this is a conscious product decision and not a
   copy-pasted Auth.js example default; document the reasoning somewhere durable
   (this spec now does) so it isn't "fixed" accidentally later.
