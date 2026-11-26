# Spec: Auth + sign-in (NextAuth)

> status: documented · updated: 2026-09-07 · owning agent: private-area

## 1. Business purpose

Lets a returning user authenticate into the protected area (`/dashboard/**`) without a
password: Google OAuth or a magic link emailed via Resend. Auth.js (NextAuth v5) owns
credential verification and session issuance; the app layer (`requireActiveUser`) owns
the business rule that a session alone isn't enough — the user must also have finished
onboarding (role + terms) before the app shell renders. New-account creation is a
related but separate flow, spec'd in `registration.md` (`/register/**`); this spec
covers the sign-in surface, the NextAuth config, session shape, and the guards that
consume it.

## 2. Roles involved

Sign-in itself is role-agnostic — every `UserRole` (`BRAND`, `CREATOR`,
`AD_SPACE_OWNER`, `ADMIN`) goes through the same `/sign-in` page and the same NextAuth
providers. Role only matters after authentication, when `requireActiveUser`
(`src/lib/app-user.ts:33`) resolves which "hat" (`RoleKey`: `brand`/`creator`/`space`/
`admin`) drives the dashboard shell, and when `requireAdmin`
(`src/lib/admin-guard.ts:9`) gates admin-only pages.

## 3. User flow

**Happy path — Google:**
1. User opens `/sign-in` (or is bounced there by `proxy.ts` / `requireActiveUser` with
   a `callbackUrl`). `src/app/(frontend)/(auth)/sign-in/page.tsx:16` calls `auth()`
   first — if a session already exists, redirects straight to `callbackUrl` or
   `/dashboard` (`sign-in/page.tsx:17`).
2. User clicks "כניסה עם Google" → server action calls
   `signIn("google", { redirectTo })` (`sign-in/page.tsx:53`).
3. Auth.js redirects to Google, then back to `/api/auth/callback/google`, handled by
   `handlers` exported from `src/auth.ts:30` via the catch-all route
   `src/app/api/auth/[...nextauth]/route.ts`.
4. `PrismaAdapter` upserts `User`/`Account` rows, creates a `Session` row (database
   strategy, `src/auth.ts:32`), sets the `authjs.session-token` cookie, and redirects
   to `redirectTo`.
5. Downstream, `(app)/layout.tsx:14` calls `requireActiveUser()`. If the user has no
   role yet / hasn't accepted terms, it redirects to `/register/roles` instead of
   rendering the dashboard (`src/lib/app-user.ts:66`) — this is the seam into
   `registration.md`.

**Happy path — email link:**
1. User submits the email form → `signIn("resend", { email, redirectTo })`
   (`sign-in/page.tsx:70`).
2. Auth.js emails a magic link, redirects to `/sign-in?check=email`, which renders a
   confirmation banner (`sign-in/page.tsx:31`).
3. Clicking the emailed link hits the same catch-all route, verifies the
   `VerificationToken`, creates the `Session`, redirects to `redirectTo`.

**Error / alternate states:**
- No provider configured in `.env` → `noProviders` banner instead of any form
  (`sign-in/page.tsx:20,42`); same banner also on `/register` (`register/page.tsx:25`).
- `signIn("resend", …)` throws `AuthError` → redirect to `/sign-in?error=email`
  (`sign-in/page.tsx:74-78`) → generic "הכניסה נכשלה" banner (`sign-in/page.tsx:36-39`,
  note: the banner text doesn't distinguish `error=email` from any other `error` value).
- NextAuth's own `pages.error` also points at `/sign-in` (`src/auth.ts:37`), so an
  OAuth failure (e.g. `AccessDenied`) lands on the same generic banner via
  `?error=<NextAuth error code>`.
- Signed-in but not onboarded and hits `/dashboard/**` → `requireActiveUser` redirect
  to `/register/roles` (`app-user.ts:67`).
- Suspended/banned/soft-deleted user still holds a valid session cookie →
  `requireActiveUser` re-checks `status`/`deletedAt` against the DB on every call and
  bounces to `/sign-in?error=account` (`app-user.ts:54-60`) — the NextAuth session
  itself is not revoked, only entry into `(app)` is blocked.
- Unauthenticated request to any `/dashboard/**` or `/register/{roles,profile,complete}`
  path → `proxy.ts` does a cookie-presence check (no DB call) and redirects to
  `/sign-in?callbackUrl=<path>` before the route even renders (`src/proxy.ts:24-33`).
- Sign-out: `signOutAction` server action (`src/lib/actions/app-actions.ts:37-39`)
  calls `signOut({ redirectTo: "/" })`, invoked from the sidebar and user-menu forms.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Route | `src/app/(frontend)/(auth)/sign-in/page.tsx` | Sign-in page: Google button + email form, banners for `check`/`error` query params |
| Route (adjacent) | `src/app/(frontend)/(auth)/register/page.tsx` | Same two providers, styled via `AuthSplitScreen` + CMS panel — new-account entry point (registration.md) |
| Route | `src/app/(frontend)/dev/login/route.ts` | Dev-only (`NODE_ENV !== "development"` → 404) bypass: mints a `Session` row + cookie directly, no provider |
| Config | `src/auth.ts` | `NextAuth()` setup: `PrismaAdapter`, `Google`/`Resend` providers (conditionally registered), `session.strategy = "database"`, custom `pages`, `session` callback that copies `id`/`roles`/`activeRole` onto the client session |
| API | `src/app/api/auth/[...nextauth]/route.ts` | Re-exports `handlers.GET`/`POST` from `src/auth.ts` — the actual OAuth/callback/session endpoints |
| Edge check | `src/proxy.ts` | Next.js 16's replacement for `middleware.ts` (renamed, see file header comment); optimistic cookie-only gate on `PROTECTED_PREFIXES` |
| Guard | `src/lib/auth-helpers.ts` | `requireUser()` / `requireRole(role)` — session-only checks against `auth()`. **Not called from anywhere in `src/`** (see §9) |
| Guard | `src/lib/app-user.ts` | `requireActiveUser()` — the guard actually used by `(app)/layout.tsx`; re-verifies against the DB (status, `deletedAt`, `termsAcceptedAt`, roles) beyond what the session claims |
| Guard | `src/lib/admin-guard.ts` | `requireAdmin()` — wraps `requireActiveUser()`, additionally requires `"admin"` in `roleKeys` |
| Action | `src/lib/actions/app-actions.ts` | `signOutAction` (calls `signOut`), `setActiveRole` (switches the `activeRole` hat; re-validates DB ownership of the target role) |
| Types | `src/types/next-auth.d.ts` | Module augmentation adding `id`/`roles`/`activeRole` to `Session.user`, `User`, and `AdapterUser` |
| Env | `src/env.ts` | `hasGoogle`/`hasEmail` flags gating provider registration and page banners; `AUTH_SECRET`/`AUTH_URL`/`AUTH_TRUST_HOST` |
| Nav/role helpers | `src/lib/app-nav.ts` | `RoleKey`, `ROLE_META`, `roleKeyFromUserRole`, `sortRoleKeys`, `resolveActiveRole` — role model consumed by `app-user.ts` |
| CMS content (register only) | `src/lib/auth-panel.ts` + `auth-panel-defaults.ts` | `AuthPanel` global (Payload) rendered by `AuthSplitScreen`; **not used by `/sign-in`** (see §10) |

## 5. Data model

From `prisma/schema.prisma`:

- **`User`** (`schema.prisma:401-434`): `email` (unique, nullable), `emailVerified`,
  `phone`/`phoneVerified` (unique, unused by any provider today), `passwordHash`
  (nullable, reserved — no password provider exists), `roles: UserRole[]`,
  `activeRole: UserRole?`, `status: UserStatus` (default `PENDING_ONBOARDING`),
  `twoFactorEnabled` (`Boolean`, default `false`, no 2FA flow implemented anywhere —
  see §9), `lastLoginAt: DateTime?` (see §9 — never written by the real auth flow),
  `termsAcceptedAt`, `deletedAt` (soft delete, checked by `requireActiveUser`).
- **`Account`** (`schema.prisma:456-475`): Auth.js adapter table, one row per linked
  OAuth provider (`provider` + `providerAccountId` composite PK), cascades on
  `User` delete.
- **`Session`** (`schema.prisma:477-487`): Auth.js adapter table for the `"database"`
  strategy — `sessionToken` (unique) is the literal cookie value, `expires`, cascades
  on `User` delete.
- **`VerificationToken`** (`schema.prisma:489-495`): Auth.js adapter table backing the
  Resend magic-link flow (`identifier` = email, `token`, `expires`).

**Enums:**
- `UserRole` (`schema.prisma:27-32`): `BRAND | CREATOR | AD_SPACE_OWNER | ADMIN`.
- `UserStatus` (`schema.prisma:34-39`): `PENDING_ONBOARDING → ACTIVE → SUSPENDED |
  BANNED`. `requireActiveUser` treats `SUSPENDED`/`BANNED` as hard-blocked
  (`app-user.ts:58-60`); `PENDING_ONBOARDING` is soft-blocked (redirected to
  `/register/roles`, not an error) until role + terms are set (`app-user.ts:63-67`).
  There is no code path that transitions `ACTIVE → PENDING_ONBOARDING`; the only writer
  of `status` for regular users is the registration flow (`registration.md`).

## 6. API contracts

- **`/api/auth/[...nextauth]/*`** (`GET`/`POST`) — the full Auth.js surface: provider
  sign-in redirects, OAuth callbacks, CSRF token, session JSON, sign-out. Not
  hand-rolled; behavior is whatever `NextAuth(config)` in `src/auth.ts` produces.
  No custom input/output schema — consumed entirely through the `signIn`/`signOut`/
  `auth()` helpers, never called directly by app code as a raw fetch.
- No other REST endpoint belongs to this feature; `setActiveRole`/`signOutAction` are
  server actions (form `action={}`), not routes.

## 7. Guards & permissions

| Guard | Where used | Failure behavior |
| --- | --- | --- |
| `proxy.ts` cookie check | Every request matching `PROTECTED_PREFIXES` (`/dashboard`, `/register/roles`, `/register/profile`, `/register/complete`) | Redirect to `/sign-in?callbackUrl=<path>`, **before** any DB/session validation — purely a cookie-presence heuristic |
| `requireActiveUser()` | `(app)/layout.tsx:14` — every page under `(app)` | No session → `/sign-in?callbackUrl=/dashboard`; missing/deleted DB user or `SUSPENDED`/`BANNED` → `/sign-in?error=account`; onboarding incomplete → `/register/roles` |
| `requireAdmin()` | Admin dashboard pages (per `admin-dashboard.md`, not yet spec'd) | Non-admin → redirect `/dashboard` |
| `requireUser()` / `requireRole()` | **Nowhere** — defined in `auth-helpers.ts` but no importer found in `src/` | N/A (dead code, see §9) |
| `setActiveRole` ownership check | `app-actions.ts:21-26` | Throws (uncaught → Next.js error boundary) if the requested role isn't in the user's `roles` — this is a raw `throw new Error`, not a redirect, unlike every other guard in this feature |

## 8. Known edge cases

- A session cookie can outlive an account's good standing: NextAuth's own session
  lifetime is independent of `User.status`; only the next `requireActiveUser()` call
  (i.e. the next `(app)` page load) notices a suspension/ban/soft-delete and evicts the
  user to `/sign-in?error=account` (`app-user.ts:54-60`). The session row itself is
  never deleted, so the user is bounced on every attempt until an admin (or the user)
  clears the condition.
- `proxy.ts` only protects `/register/roles|profile|complete`, not `/register` itself
  (`proxy.ts:16`, comment confirms this is intentional) — so a signed-in, fully
  onboarded user hitting bare `/register` is handled by that page's own
  `auth()`-then-redirect check (`register/page.tsx:22-23`), not by the proxy.
- `activeRole` can be `null` in the DB (never set) even though a user has roles; both
  `resolveActiveRole` (`app-nav.ts:154-164`) and `requireActiveUser` treat that as "use
  the highest-priority owned role," so `activeRole: null` is a valid, expected state,
  not an error.
- Provider availability is env-driven and independent per environment (`hasGoogle` /
  `hasEmail` in `env.ts:67-70`); a deployment with only one configured still renders the
  other's UI conditionally, and a deployment with neither shows only the warning banner
  (`sign-in/page.tsx:20,42`) with no way to sign in at all.

## 9. Tech debt / TODOs in code

- `src/lib/auth-helpers.ts:9-24` (`requireUser`, `requireRole`) has zero importers
  anywhere in `src/` (verified by repo-wide grep) — `requireActiveUser` /
  `requireAdmin` fully superseded it. Dead code; either delete or document why it's
  kept (e.g. for a future non-onboarding-gated route).
- `User.lastLoginAt` (`schema.prisma:414`) is only ever written by the dev-only
  bypass routes (`src/app/(frontend)/dev/login/route.ts:78,85` and the two seed
  routes) — the real Auth.js sign-in path (`src/auth.ts`) has no `events.signIn`
  handler, so in production this column is always `null`. Either add an
  `events.signIn` callback in `src/auth.ts` or drop the field.
- `User.twoFactorEnabled` (`schema.prisma:413`) has no reader or writer anywhere in
  `src/` — no 2FA provider, no settings UI toggling it. Modeled but entirely unbuilt.
- `User.passwordHash` (`schema.prisma:409`) likewise has no reader/writer — comment
  in-schema says "reserved for passwordless now; nullable for future," consistent with
  current passwordless-only design, not a bug.
- `src/app/(frontend)/dev/login/route.ts:9` carries its own comment: "פיתוח בלבד. יש
  להסיר את הקובץ לפני עלייה לפרודקשן" (dev-only, remove before shipping to
  production). It is `NODE_ENV`-gated (`route.ts:31-33`) so not currently exploitable,
  but it still exists in the tree.
- `sign-in/page.tsx:36-39` shows one generic "הכניסה נכשלה" message for *any* `error`
  query value (`error=email`, `error=account`, or any NextAuth OAuth error code) —
  no differentiation, unlike `register/page.tsx:38-47` which does distinguish
  `error=email` vs `error=consent`.

## 10. Findings for the team lead

1. **UI duplication + design-token violation, not just DRY.** `/sign-in`
   (`sign-in/page.tsx`) reimplements the same Google-button-plus-email-form flow as
   `/register` (`register/page.tsx`), but the two have diverged: `/sign-in` uses raw
   Tailwind color utilities (`bg-green-500/10`, `text-red-700`, `border-black/15`,
   `bg-foreground`/`text-background`) instead of the project's design tokens
   (`bg-primary`, `text-on-surface`, `border-outline-variant`, etc. — see
   `CLAUDE.md` §"Design tokens בלבד"), and it doesn't reuse `AuthSplitScreen` or the
   CMS-backed `auth-panel` content that `/register` uses. It reads as an older,
   un-refactored page that was never migrated onto the shared auth chrome built for
   registration. Recommend extracting the shared provider-buttons/email-form into one
   `src/components/auth/*` component and rebuilding `/sign-in` on `AuthSplitScreen` +
   design tokens, matching `/register`.
2. **`lastLoginAt` is effectively dead in production** (see §9) — if any feature
   downstream (admin dashboard "last active" column, anomaly detection, etc.) is
   planned to read it, it will always see `null` for real users. Worth deciding now,
   before other specs build on it.
3. **No re-authentication signal on suspension.** A `SUSPENDED`/`BANNED` user keeps a
   live NextAuth session (§8) and is only caught on the next `(app)` page load — there
   is no forced sign-out when an admin changes `status`. Low severity (the DB check
   does eventually block them), but worth confirming this is the intended behavior
   before `admin-dashboard.md`/`rbac-guards.md` assume otherwise.
4. **`requireUser`/`requireRole` are dead code** (§9) — flagging in case a security
   review assumed they were in use as a guard somewhere.
