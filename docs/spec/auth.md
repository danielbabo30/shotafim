# Spec: Auth + sign-in (NextAuth)

> status: documented · updated: 2026-09-05 · owning agent: private-area

## 1. Business purpose

Lets a person prove who they are so the app can hand them a `Session` and, from there,
a `User` row to key every other feature off of. There is no separate "create account"
step: identity is created implicitly by the Auth.js Prisma adapter the first time
someone completes a provider flow (Google OAuth or an emailed magic link). Whether that
first sign-in is a genuine new signup or a returning user depends only on whether a
`User` with that email already exists — `/sign-in` and `/register` drive the exact same
NextAuth code path and differ only in which page they redirect back to
(`/dashboard` vs `/register/roles`, see §3). Turning a fresh identity into a usable
account (choosing roles, filling a profile, accepting terms) is the registration
feature (`registration.md`, next in the queue) — this spec stops at "the person has a
valid session and a `User` row."

## 2. Roles involved

Sign-in itself is role-agnostic — every `UserRole` (`BRAND`, `CREATOR`,
`AD_SPACE_OWNER`, `ADMIN`) authenticates through the same two providers and the same
`/sign-in` page. The session does carry role data (`session.user.roles`,
`session.user.activeRole`, populated in the `session` callback,
`src/auth.ts:42-49`) so downstream guards can branch on it, but this spec only covers
how that session comes to exist — role-based access rules are `rbac-guards.md`.

## 3. User flow

**Happy path — OAuth (Google):**
1. Visitor hits a page under `/dashboard` (or `/register/roles|profile|complete`) with
   no session cookie. `src/proxy.ts` (Next.js 16's renamed `middleware.ts`) intercepts
   at the edge, sees no `authjs.session-token` / `__Secure-authjs.session-token`
   cookie, and redirects to `/sign-in?callbackUrl=<original path>`
   (`src/proxy.ts:22-36`).
2. On `/sign-in` (`src/app/(frontend)/(auth)/sign-in/page.tsx`), the person clicks
   "כניסה עם Google" → a server action calls `signIn("google", { redirectTo })`
   (`sign-in/page.tsx:50-63`).
3. Google OAuth redirect/callback is handled entirely by the NextAuth catch-all route
   (`src/app/api/auth/[...nextauth]/route.ts`, exporting `handlers` from
   `src/auth.ts`). `PrismaAdapter` creates (or reuses, see §8 email-linking edge case)
   the `User`/`Account` rows and a database `Session` row.
4. NextAuth redirects to `redirectTo` (the original `callbackUrl`, defaulting to
   `/dashboard`).
5. `src/app/(frontend)/(app)/layout.tsx` (the layout for everything under
   `/dashboard`) calls `requireActiveUser()` (`src/lib/app-user.ts:33`), which does the
   real DB-backed check `proxy.ts` only approximated: loads the `User`, checks
   `status`/`deletedAt`, and — if onboarding isn't finished
   (`status !== "ACTIVE"`, no roles yet, or no `termsAcceptedAt`) — redirects to
   `/register/roles` instead of rendering the dashboard (`app-user.ts:63-73`). A brand
   new Google sign-in always lands here, since the adapter creates the user with
   `status: PENDING_ONBOARDING` and no roles.

**Happy path — email magic link (Resend):** same as above except step 2 submits an
email address to a server action that calls
`signIn("resend", { email, redirectTo })` (`sign-in/page.tsx:65-80`); NextAuth emails a
link, the person opens it, the callback route verifies the `VerificationToken` and
creates the session. `verifyRequest` is configured to `/sign-in?check=email`
(`src/auth.ts:36`), which renders a "check your inbox" banner (`sign-in/page.tsx:31-35`).

**Returning user:** identical flow, except the `User` row already exists and
(assuming onboarding was completed previously) `requireActiveUser()` lets them through
to the dashboard directly.

**Sign-out:** `signOutAction()` (`src/lib/actions/app-actions.ts:37-39`) calls
`signOut({ redirectTo: "/" })`; wired from `src/components/app/user-menu.tsx`.

**Error / edge states:**
- No provider configured (`AUTH_GOOGLE_ID`/`SECRET` and `AUTH_RESEND_KEY` all unset) →
  `/sign-in` shows an amber "no sign-in provider configured yet" notice instead of any
  button (`sign-in/page.tsx:20,42-47`).
- Resend `signIn` throws `AuthError` → redirected to `/sign-in?error=email`
  (`sign-in/page.tsx:74-79`); any provider error routed through NextAuth's own `error`
  page config lands back on `/sign-in?error=...` and shows a generic "sign-in failed"
  message (`sign-in/page.tsx:36-40`, `src/auth.ts:37`).
- Already-signed-in visitor opens `/sign-in` or `/register` → immediately redirected to
  `callbackUrl` / `/register/roles` (`sign-in/page.tsx:16-17`, `register/page.tsx:22-23`).
- Suspended/banned/soft-deleted user with a still-valid session cookie → passes the
  `proxy.ts` cookie check, but `requireActiveUser()` redirects to
  `/sign-in?error=account` (`app-user.ts:54-60`). The optimistic edge check cannot see
  this; only the DB-backed guard in the layout catches it (documented intentionally in
  `app-user.ts:8-9` and `proxy.ts:6-8`).

**Dev-only bypass:** `GET /dev/login` (`src/app/(frontend)/dev/login/route.ts`) skips
providers entirely — it upserts (or looks up by email) a `User`, hand-creates a
`Session` row, and sets the session cookie directly. Gated by
`NODE_ENV !== "development"` → 404 (`dev/login/route.ts:31-33`). Query params pick the
starting `activeRole`, an existing demo user by email, or a `pending=1` mode that
creates a fresh `PENDING_ONBOARDING` user to test the registration redirect.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Edge guard | `src/proxy.ts` | Optimistic cookie-presence check for `/dashboard`, `/register/{roles,profile,complete}`; Next.js 16's `middleware.ts` replacement |
| Route (API) | `src/app/api/auth/[...nextauth]/route.ts` | NextAuth catch-all — `GET`/`POST` for signin/callback/signout/session/csrf |
| Config | `src/auth.ts` | `NextAuth()` setup: `PrismaAdapter`, providers, `session`/`pages` config, `session` callback |
| Config | `src/env.ts` | Validates `AUTH_*` env vars at boot; exposes `hasGoogle`/`hasEmail` |
| Types | `src/types/next-auth.d.ts` | Augments `Session.user` / `User` / `AdapterUser` with `id`, `roles`, `activeRole` |
| Route (page) | `src/app/(frontend)/(auth)/sign-in/page.tsx` | Sign-in UI, provider server actions |
| Route (page) | `src/app/(frontend)/(auth)/register/page.tsx` | Same providers, redirects to `/register/roles` instead of `/dashboard` — step 1 of registration |
| Guard (DB) | `src/lib/app-user.ts` (`requireActiveUser`) | Real post-session gate: status/deleted checks + onboarding-complete redirect; used by `(app)/layout.tsx` and every admin/dashboard entry point |
| Guard (session-only) | `src/lib/auth-helpers.ts` (`requireUser`, `requireRole`) | Lighter-weight guards used outside the `(app)` tree |
| Action | `src/lib/actions/app-actions.ts` (`signOutAction`, `setActiveRole`) | Sign-out; switching the active role "hat" post-login |
| Layout | `src/app/(frontend)/(app)/layout.tsx` | Invokes `requireActiveUser()` for the whole protected tree |
| Dev tool | `src/app/(frontend)/dev/login/route.ts` | Dev-only session bypass (see §3, §10) |

## 5. Data model

`prisma/schema.prisma`:
- `User` (`schema.prisma:401-436`) — the adapter's user table, extended with app fields:
  `roles UserRole[]` (multi-select, default `[]`), `activeRole UserRole?` (nullable —
  which "hat" the UI currently shows), `status UserStatus` (default
  `PENDING_ONBOARDING`), `termsAcceptedAt`, `deletedAt` (soft delete),
  `twoFactorEnabled Boolean` and `passwordHash String?` (both currently unused, see
  §9), `lastLoginAt DateTime?` (also currently unused, see §9), `phone`/`phoneVerified`
  (unused by any sign-in flow today).
- `Account` (`schema.prisma:456-475`) — standard Auth.js OAuth account table, one row
  per `(provider, providerAccountId)`, cascades on `User` delete.
- `Session` (`schema.prisma:477-487`) — database session strategy (`src/auth.ts:32`):
  one row per active session, keyed by `sessionToken`, cascades on `User` delete. No
  explicit `maxAge` is configured, so NextAuth's default (30 days) applies.
- `VerificationToken` (`schema.prisma:489-495`) — one-time tokens backing the Resend
  magic-link flow, composite key `(identifier, token)`.

**Enums:**
- `UserRole` (`schema.prisma:27-32`): `BRAND · CREATOR · AD_SPACE_OWNER · ADMIN`.
- `UserStatus` (`schema.prisma:34-39`): `PENDING_ONBOARDING → ACTIVE`, with
  `SUSPENDED`/`BANNED` as terminal-ish blocked states. Every new adapter-created user
  starts at `PENDING_ONBOARDING`; the transition to `ACTIVE` happens in the
  registration flow (`registration.md`), not in this spec. `SUSPENDED`/`BANNED` are set
  by admin action (out of scope here) and are checked by `requireActiveUser`
  (`app-user.ts:58-60`) but not by `proxy.ts` or by `auth()` itself.

## 6. API contracts

No custom auth endpoints exist. `src/app/api/auth/[...nextauth]/route.ts` re-exports
the full Auth.js v5 handler set (`GET`/`POST` for `/api/auth/signin`,
`/api/auth/callback/:provider`, `/api/auth/signout`, `/api/auth/session`,
`/api/auth/csrf`, `/api/auth/providers`) — behavior is entirely library-defined by the
`NextAuth()` config in `src/auth.ts`, not hand-rolled route logic.

## 7. Guards & permissions

Three layers, each with a distinct job — conflating them is the most common mistake
when touching this area:
1. **`src/proxy.ts`** — edge-only, cookie-presence check, no DB access. Redirects to
   `/sign-in` if the session cookie is simply absent. Cannot detect an expired,
   revoked, or suspended-account session (comment explicitly documents this,
   `proxy.ts:6-8`). Matcher excludes `/api`, `/admin` (Payload panel), and static
   assets (`proxy.ts:38-43`).
2. **`requireUser()` / `requireRole(role)`** (`src/lib/auth-helpers.ts`) — call
   `auth()`, redirect to `/sign-in` if no session; `requireRole` additionally checks
   `session.user.roles.includes(role)` and redirects to `/dashboard` on failure. Note
   this reads `roles` straight off the **session** object (populated once, at sign-in
   time by the `session` callback merging in the adapter user — Auth.js v5's database
   strategy re-reads the adapter user per request via `getSessionAndUser`, so this
   stays reasonably fresh, but it is a lighter check than `requireActiveUser` below —
   no `status`/`deletedAt` check at all).
3. **`requireActiveUser()`** (`src/lib/app-user.ts:33`) — the real gate, queries
   `prisma.user` directly. Checks: session exists → user row exists and not
   soft-deleted → `status` isn't `SUSPENDED`/`BANNED` → onboarding is complete
   (`status === "ACTIVE" && roleKeys.length > 0 && termsAcceptedAt != null`) → an
   `activeRole` can be resolved (`resolveActiveRole`, `src/lib/app-nav.ts:152-162`).
   Wrapped in React `cache()` so it's one query per request even when called from
   multiple places in the same render tree. This is what every page under
   `(app)/layout.tsx` and `admin-guard.ts` (`src/lib/admin-guard.ts:10`) ultimately
   relies on — role-specific authorization built on top of it is `rbac-guards.md`.

## 8. Known edge cases

- **Same-email account linking is intentionally permissive.** The Google provider is
  configured with `allowDangerousEmailAccountLinking: true` (`src/auth.ts:16`): if a
  `User` with a given email already exists (e.g. created via the Resend flow) and
  someone then signs in with Google using an OAuth account reporting that same email,
  Auth.js links the new `Account` to the existing `User` without any confirmation step
  on the existing account. See §10 — this is a known security trade-off, not an
  oversight, but worth flagging since it's easy to forget it's on.
- Optimistic vs. real guard mismatch (§3, §7): a suspended/banned/deleted account with
  a live session cookie passes `proxy.ts` and only gets stopped once it hits a layout
  that calls `requireActiveUser()`. Any future route added under a protected prefix
  that reads `auth()`/`requireUser()` directly without also going through
  `requireActiveUser()` (or `(app)/layout.tsx`) would let a banned user through.
- `noProviders` state (`sign-in/page.tsx:20`): if env vars for both providers are
  unset, the sign-in page renders with no way to sign in at all — a deliberate
  "not configured yet" state for early environments, not an error page.
- Magic-link emails have no visible expiry surfaced to the user on `/sign-in` (the
  `/register` copy says "open within an hour", `register/page.tsx:35`; `/sign-in`'s
  equivalent banner doesn't state a TTL) — minor copy inconsistency between the two
  entry points into the same flow.

## 9. Tech debt / TODOs in code

- `User.lastLoginAt` (`schema.prisma:414`) is written only by dev/seed code
  (`src/app/(frontend)/dev/login/route.ts:78,85`,
  `src/app/(frontend)/dev/seed-users/route.ts:42`, and the other `dev/seed-*` routes)
  — the real NextAuth sign-in path (`src/auth.ts`) never updates it. There's no
  `events.signIn` callback. Any feature or admin view relying on "last seen" data would
  currently see stale/null values for real users.
- `User.passwordHash` and `User.twoFactorEnabled` (`schema.prisma:409,413`) are schema
  fields with zero code paths reading or writing them — no credentials provider, no
  2FA UI/flow anywhere in `src/`. Schema is ahead of the implementation (comment at
  `schema.prisma:409` confirms this is intentional/future: "ל-passwordless עכשיו").
- `env.ts:20-23` parses `AUTH_TRUST_HOST` from the environment, but nothing in the
  codebase reads `env.AUTH_TRUST_HOST` — `src/auth.ts:33` hardcodes `trustHost: true`
  unconditionally instead. The env var is validated for no reason; either wire it in
  or drop it from the schema.
- No rate limiting on the Resend magic-link `signIn` call (`sign-in/page.tsx:65-80`,
  `register/page.tsx`) — a form submit directly triggers an email send with only
  client-side `required` on the input. Repeated submissions could be used to spam an
  address or exhaust the Resend quota.
- `sign-in/page.tsx` styles with raw Tailwind (`text-black/60 dark:text-white/60`,
  hardcoded `border-black/15`) instead of the design tokens
  (`text-on-surface-variant`, `border-outline-variant`, etc.) that `register/page.tsx`
  and the rest of the app use consistently. Looks like an older/starter version of the
  page that predates the current design-token pass.

## 10. Findings for the team lead

1. **Security trade-off worth a second look:** `allowDangerousEmailAccountLinking: true`
   on the Google provider (`src/auth.ts:16`) auto-links a Google account to any
   existing `User` sharing its email, with no re-verification step and no
   notification to the existing account owner. This is a documented, named-"dangerous"
   Auth.js flag — standard mitigation is that Google itself verifies the email before
   OAuth issues it, but it's still worth an explicit sign-off that this is intended
   given the accounts here front real money (escrow/payouts). Not a code bug, just
   flagging it's live.
2. **Guard layering is correct but fragile by convention, not enforcement.** Nothing
   prevents a new route under `/dashboard` from importing `auth()` directly (or using
   `requireUser`) instead of going through `(app)/layout.tsx` → `requireActiveUser()`,
   which would silently skip the suspended/banned/soft-delete checks. Worth a lint
   rule or at least a code-review checklist item once `rbac-guards.md` is written.
3. **Dead env var:** `AUTH_TRUST_HOST` (`env.ts:20-23`) is validated but never
   consumed; `trustHost: true` is hardcoded instead (`auth.ts:33`). Low-risk but
   confusing — either wire it up or delete it.
4. **`dev/login` and `dev/seed-*` routes are a full auth bypass gated by a single
   `NODE_ENV` check.** That's a reasonable pattern and each file's own comment says to
   remove it before production, but they're still present. Worth confirming the
   production deploy config truly can't set `NODE_ENV=development` (or an equivalent
   misconfiguration) before this is unremarkable.
5. Baseline check: `npm run typecheck` and `npm run lint` are currently clean on
   `private-area-foundation` (after running `npm install` — `node_modules` was not
   present at session start). No pre-existing breakage to report.
