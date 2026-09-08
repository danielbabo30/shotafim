# Spec: Auth + sign-in (NextAuth)

> status: documented · updated: 2026-09-08 · owning agent: private-area

## 1. Business purpose

Lets a person prove who they are so the app can look up their `User` row and decide what to
show them. Two sign-in methods only: Google OAuth and a passwordless email magic link (Resend).
No username/password. Session state lives in the database (not JWT), so a session can be revoked
server-side by deleting its `Session` row. This is the front door to everything else — the
private area (`requireActiveUser`, feature #3 rbac-guards), registration/onboarding (feature #2),
and every admin-only action all sit on top of the primitives documented here.

## 2. Roles involved

Auth itself is role-agnostic — anyone can sign in, regardless of `roles`/`status`. The `User`
record has an optional `roles: UserRole[]` (`BRAND · CREATOR · AD_SPACE_OWNER · ADMIN`,
`prisma/schema.prisma:27-32`) and `activeRole: UserRole | null` (`prisma/schema.prisma:411`), but
these are populated by registration, not by sign-in. A freshly created user (first Google/email
sign-in) has `roles: []`, `activeRole: null`, `status: PENDING_ONBOARDING` — see §3.

## 3. User flow

**Sign-in page** (`src/app/(frontend)/(auth)/sign-in/page.tsx`):
1. Server Component. Calls `auth()` (`src/auth.ts:30`) up front; if a session already exists,
   redirects to `callbackUrl` or `/dashboard` (`sign-in/page.tsx:16-17`).
2. Renders whichever providers are configured, decided at import time by `hasGoogle` /
   `hasEmail` in `src/env.ts:67-70` (both derived from presence of the relevant env vars — no UI
   for "provider not configured", it's just hidden; if neither is set, an amber notice is shown
   instead, `sign-in/page.tsx:42-47`).
3. **Google button** → a `<form>` whose server action calls
   `signIn("google", { redirectTo })` (`sign-in/page.tsx:50-63`). NextAuth handles the OAuth
   redirect dance; `PrismaAdapter` creates/finds the `User` + `Account` row on callback.
4. **Email form** → a `<form>` whose server action calls
   `signIn("resend", { email, redirectTo })` (`sign-in/page.tsx:65-97`). On success NextAuth
   redirects to `pages.verifyRequest` = `/sign-in?check=email` (`src/auth.ts:36`), which renders a
   "check your inbox" banner (`sign-in/page.tsx:31-35`). On `AuthError` (e.g. malformed email,
   Resend send failure) the action catches it and redirects to `/sign-in?error=email`
   (`sign-in/page.tsx:74-78`); any other thrown error propagates (crashes the request).
5. Clicking the emailed magic link hits NextAuth's own verify-token route (part of `handlers`,
   `src/app/api/auth/[...nextauth]/route.ts`), which validates the `VerificationToken`, creates
   the `Session` row, sets the session cookie, and redirects to `redirectTo`.
6. **First-ever sign-in for that email** (either provider): `PrismaAdapter` creates a `User` row
   with schema defaults — `status: PENDING_ONBOARDING`, `roles: []`, `activeRole: null`
   (`prisma/schema.prisma:410-412`). The user is NOT redirected into onboarding by auth itself;
   the *next* protected page they hit calls `requireActiveUser()` (`src/lib/app-user.ts:33`),
   which sees `roles.length === 0` and sends them to `/register/roles` (`app-user.ts:63-68`) —
   that whole flow is feature #2 (`registration.md`, not yet documented).
7. **Returning user, account in good standing** → `requireActiveUser()` resolves an `AppUser`
   (id/name/email/image/status/roleKeys/activeRole) and the private-area layout renders normally.
8. **Returning user, blocked account** → `status` is `SUSPENDED` or `BANNED`, or `deletedAt` is
   set → `requireActiveUser()` redirects to `/sign-in?error=account` (`app-user.ts:54-60`); the
   sign-in page shows the same generic "הכניסה נכשלה" banner as any other `error` value
   (`sign-in/page.tsx:36-40` — it doesn't branch on the error code, see §8).
9. **Sign out** → `signOutAction()` server action (`src/lib/actions/app-actions.ts:37-39`) calls
   `signOut({ redirectTo: "/" })`, invoked from `src/components/app/user-menu.tsx` and
   `src/components/app/sidebar-content.tsx`. NextAuth deletes the `Session` row and clears the
   cookie.
10. **Dev-only bypass** — `GET /dev/login` (`src/app/(frontend)/dev/login/route.ts`) mints a
    `User`/`Session` row and sets the session cookie directly, skipping both providers. Hard-gated
    behind `process.env.NODE_ENV !== "development"` → 404 (`dev/login/route.ts:31-33`). Supports
    `?role=`, `?next=`, `?pending=1` (creates a clean `PENDING_ONBOARDING` user to test the
    onboarding redirect), `?email=` (log in as an existing seeded user). See §9.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Route | `src/app/(frontend)/(auth)/sign-in/page.tsx` | Sign-in UI + inline server actions for both providers |
| Route | `src/app/api/auth/[...nextauth]/route.ts` | Re-exports NextAuth's `GET`/`POST` handlers (OAuth callback, magic-link verify, session endpoints) |
| Route (dev-only) | `src/app/(frontend)/dev/login/route.ts` | Bypass login for local testing; 404s outside `NODE_ENV=development` |
| Core config | `src/auth.ts` | `NextAuth(...)` call: providers, `PrismaAdapter`, `session.strategy: "database"`, custom pages, `session` callback |
| Env gating | `src/env.ts` (`hasGoogle`, `hasEmail`, lines 67-70) | Decides which providers are registered/rendered, from env var presence |
| Types | `src/types/next-auth.d.ts` | Module augmentation: adds `id`, `roles`, `activeRole` to `Session.user` / `User` / `AdapterUser` |
| Fetcher/guard | `src/lib/auth-helpers.ts` | `requireUser()` (any session), `requireRole(role)` (session + specific `UserRole`) |
| Fetcher/guard | `src/lib/app-user.ts` (`requireActiveUser`, cached per-request) | Session + DB re-check (status/deletedAt) + onboarding gate → returns normalized `AppUser` |
| Action | `src/lib/actions/app-actions.ts` (`signOutAction`) | Signs the user out |
| Action (related) | `src/lib/actions/app-actions.ts` (`setActiveRole`) | Switches `activeRole`; owned by rbac-guards (#3), listed here because it reads the same session |
| Component (related) | `src/components/app/user-menu.tsx`, `src/components/app/sidebar-content.tsx` | Call `signOutAction()` |

Note: `src/components/auth/*` (`auth-progress.tsx`, `auth-split-screen.tsx`, `role-selection.tsx`,
`profile-setup-form.tsx`, `social-networks.tsx`, `form-styles.ts`) are **not** part of sign-in —
they're used exclusively by `/register/*` (verified: no import from `sign-in/page.tsx`). They
belong to feature #2 (`registration.md`).

## 5. Data model

`prisma/schema.prisma`:

- **`User`** (`:401-441`) — the adapter's user table, extended with app fields:
  - `roles UserRole[] @default([])`, `activeRole UserRole?` — see feature #2/#3 for how these get
    populated/changed; auth only reads them (`session` callback, `src/auth.ts:42-49`).
  - `status UserStatus @default(PENDING_ONBOARDING)` — checked by `requireActiveUser` (§3.8).
  - `deletedAt DateTime?` — soft-delete flag, checked by `requireActiveUser` (`app-user.ts:54`)
    and `src/lib/registration.ts:46`. **No code path currently sets it** (grepped for
    `deletedAt:` writes on `User` — none found; the only `deletedAt` write in the codebase is on
    `AdSpaceAsset`, `src/lib/actions/ad-space-actions.ts:262`). See §9.
  - `lastLoginAt DateTime?`, `twoFactorEnabled Boolean @default(false)`,
    `passwordHash String?` — present in schema but not read/written by any real (non-seed) auth
    code path. See §9.
  - `termsAcceptedAt DateTime?` — set during registration, read by the onboarding gate
    (`app-user.ts:64`).
- **`Account`** (`:456-475`) — adapter's OAuth account table (`provider` + `providerAccountId` as
  PK). One row per linked provider per user.
- **`Session`** (`:477-487`) — adapter's session table (`session.strategy: "database"` means the
  cookie is opaque, just `sessionToken`; the row is the source of truth, not a signed JWT).
- **`VerificationToken`** (`:489-495`) — adapter's magic-link token table (Resend provider).
- Enums: `UserRole` (`:27-32`), `UserStatus` (`:34-39`: `PENDING_ONBOARDING · ACTIVE · SUSPENDED ·
  BANNED`).

No status-transition table for `UserStatus` here — the transitions themselves (who moves a user
`PENDING_ONBOARDING → ACTIVE`, who suspends/bans) belong to registration (#2) and admin (#19),
not to auth. Auth only *reads* `status` to decide whether to let the session through.

## 6. API contracts

No custom API route — `src/app/api/auth/[...nextauth]/route.ts` is a thin re-export of NextAuth's
own `handlers` (`GET`/`POST`), which implements the whole Auth.js v5 wire protocol (OAuth
redirect/callback, CSRF, session, magic-link verify) internally. Not hand-rolled, so no schema to
document beyond what NextAuth itself defines.

`GET /dev/login` (dev-only, see §3.10) — query params `role`, `next`, `pending`, `email`; no auth
required (that's the point); 404 outside development.

## 7. Guards & permissions

- **`requireUser()`** (`auth-helpers.ts:9-15`) — session must exist, else `redirect("/sign-in")`.
  Does **not** re-check DB status/roles — trusts the session's `roles`/`activeRole` as of last
  session-callback evaluation (i.e., could be stale within the session's lifetime if the DB
  changes mid-session, since `strategy: "database"` re-reads the `User` row via the adapter on
  every `auth()` call — so in practice it *is* fresh per request, just not explicitly re-validated
  for `status`/`deletedAt`).
- **`requireRole(role)`** (`auth-helpers.ts:18-24`) — `requireUser()` + `roles.includes(role)`,
  else `redirect("/dashboard")` (not `/sign-in` — assumes they're logged in but lack the role).
- **`requireActiveUser()`** (`app-user.ts:33-84`) — the strict gate used by the private-area
  layout: session → DB re-fetch → `deletedAt`/`SUSPENDED`/`BANNED` → `/sign-in?error=account`;
  `status !== ACTIVE` or no roles or no `termsAcceptedAt` → `/register/roles`; no resolvable
  `activeRole` → `/register/roles`. `cache()`-wrapped so it's a single DB round-trip per request
  even if called from multiple layouts/pages.
- **No `middleware.ts`** exists anywhere in `src/` — there is no centralized, path-based
  enforcement layer. Every protected route/layout must remember to call `requireUser` /
  `requireActiveUser` / `requireRole` itself. See §8.
- `Google` provider is configured with `allowDangerousEmailAccountLinking: true`
  (`src/auth.ts:16`) — a Google sign-in auto-links to any existing `User` with the same email
  (e.g. one created via the Resend magic link), no confirmation step. This is the setting NextAuth
  itself names "dangerous" in its docs. See §10.

## 8. Known edge cases

- Sign-in page's `error` search param is treated as a boolean (any truthy value → generic
  "הכניסה נכשלה" banner, `sign-in/page.tsx:36-40`); it never inspects the actual NextAuth error
  code (e.g. `OAuthAccountNotLinked`, `AccessDenied`, `Verification`) or distinguishes them from
  the app's own `?error=account` / `?error=email`. A user blocked for being `BANNED` sees the same
  message as a bad magic-link.
- `AUTH_TRUST_HOST` is validated in `src/env.ts:20-23` and documented in `.env.example:18`, but
  `src/auth.ts:33` hardcodes `trustHost: true` unconditionally — the env var is parsed and then
  never read. Setting it to `"false"` has no effect.
- If neither Google nor Resend env vars are set, `providers` is an empty array and the page just
  shows an amber "no provider configured" notice (`sign-in/page.tsx:42-47`) — no crash, but no way
  to sign in either (dev-only `/dev/login` still works in that case).
- `requireUser()` vs `requireActiveUser()` diverge on a suspended/banned user: `requireUser()`
  would still let them through (it doesn't check `status`), while `requireActiveUser()` blocks
  them. Any route using the weaker `requireUser()`/`requireRole()` guard instead of
  `requireActiveUser()` does not enforce the suspension/ban check. (Grep shows `requireRole` is
  currently unused outside its own definition — worth confirming with rbac-guards, #3, whether
  anything is meant to call it.)

## 9. Tech debt / TODOs in code

- `src/app/(frontend)/dev/login/route.ts:9` — comment: "פיתוח בלבד. יש להסיר את הקובץ לפני עלייה
  לפרודקשן" (dev only, remove before shipping to prod). Currently self-gated by `NODE_ENV`
  (`route.ts:31-33`), so not directly exploitable in a correctly configured production deploy, but
  the file itself is still meant to be deleted eventually.
- `User.lastLoginAt` (`prisma/schema.prisma:414`) is only ever written by dev/seed routes
  (`src/app/(frontend)/dev/login/route.ts:78,85`, `dev/seed-*-dashboard/route.ts`,
  `dev/seed-users/route.ts:42`) — `src/auth.ts` has no `events.signIn` callback, so real
  Google/email sign-ins never update it. The field is effectively always `null` (or stale) outside
  local dev seeding.
- `User.twoFactorEnabled` and `User.passwordHash` (`prisma/schema.prisma:409,413`) have zero
  reads/writes anywhere in `src/` besides the schema declaration itself — vestigial fields for a
  password/2FA flow that doesn't exist yet.
- `User.deletedAt` is checked by two different guards (`app-user.ts:54`, `registration.ts:46`) but
  no action anywhere sets it on `User` — there is currently no way for a `User` row to actually
  reach that state through the app. Soft-delete-account is unbuilt.

## 10. Findings for the team lead

1. **Security-relevant, not necessarily a bug:** `allowDangerousEmailAccountLinking: true` on the
   Google provider (`src/auth.ts:16`) means signing in with Google auto-merges into any existing
   account with the same email — including one created purely via an unverified... actually Resend
   magic-link emails *are* verified by construction (you had to click the link), so the real risk
   is narrower: it matters only if some other path can create a `User` row with an
   attacker-chosen, unverified email (none found in this pass). Flagging for awareness since it's
   an explicit "dangerous" opt-in — worth a second look once more auth-adjacent code exists (e.g.
   phone auth, admin-created accounts).
2. **No centralized route protection.** There's no `middleware.ts`; every new protected
   page/layout must remember to call `requireActiveUser()` (or one of the other guards). A future
   route that forgets this call is silently unprotected — nothing fails loudly. Worth a lint rule,
   a layout-level enforcement, or at minimum a checklist item for new routes under `(app)/`.
   Follow-up in rbac-guards.md (#3), since it's really about the guard *system*, not sign-in
   itself.
3. **Generic error banner hides real failure reasons** (§8) — low severity, but worth a quick pass
   once `error=account` vs NextAuth's own error codes need different user-facing copy (e.g.
   "your account was suspended" vs "that link expired").
4. Everything else in this pass was either dead/unused (§9) or by-design simplicity (single
   generic error, no `Session` revocation UI) — no functional bugs found in the sign-in path
   itself. `npm run typecheck` and `npm run lint` both pass clean on `private-area-foundation` as
   of this run (after `npm install`; `node_modules` was not present at session start).
