# Spec: Auth + sign-in (NextAuth)

> status: documented · updated: 2026-09-10 · owning agent: private-area

## 1. Business purpose

Lets a visitor prove ownership of an email address (or a Google identity) and get a
persistent session, without a password. This is the single entry point to the
protected area (`/dashboard/**`) for all four roles (brand / creator / ad-space owner /
admin). It does **not** decide what the user can do once signed in — role assignment,
onboarding completeness and status gating are a separate concern, handed off to
`requireActiveUser` (`src/lib/app-user.ts:33`, see `rbac-guards.md`) and to the
multi-step registration flow (see `registration.md`).

## 2. Roles involved

Auth itself is role-agnostic — every `UserRole` (`BRAND · CREATOR · AD_SPACE_OWNER ·
ADMIN`, `prisma/schema.prisma:27-32`) goes through the same sign-in page and the same
NextAuth config. A brand-new `User` row created by the Prisma adapter starts with
`roles: []`, `activeRole: null`, `status: PENDING_ONBOARDING`
(`prisma/schema.prisma:410-412`) — role selection happens later, in
`/register/roles` (out of scope here, see `registration.md`).

## 3. User flow

### 3.1 Sign in (existing or new user)

1. User opens `/sign-in` (`src/app/(frontend)/(auth)/sign-in/page.tsx:13`). If a
   session already exists, the page redirects straight to `callbackUrl` or
   `/dashboard` (`sign-in/page.tsx:16-17`) — it does **not** check onboarding status,
   so an unfinished registration lands on `/dashboard` and only then gets bounced
   further by `requireActiveUser`.
2. Two optional providers, gated by env presence (`hasGoogle` / `hasEmail`,
   `src/env.ts:65-67`):
   - **Google OAuth** — a `<form action>` server action calls
     `signIn("google", { redirectTo })` (`sign-in/page.tsx:49-54`).
   - **Email magic link (Resend)** — a form posts to a server action that calls
     `signIn("resend", { email, redirectTo })` (`sign-in/page.tsx:65-97`); on
     `AuthError` it redirects to `/sign-in?error=email` (`sign-in/page.tsx:74-78`).
   - If neither env is configured, the page shows a static Hebrew warning instead of
     any form (`sign-in/page.tsx:20`, `42-47`).
3. **Google path**: NextAuth's default OAuth code-exchange flow runs at
   `/api/auth/[...nextauth]` (`src/app/api/auth/[...nextauth]/route.ts`), the Prisma
   adapter creates/links the `User`+`Account` row
   (`allowDangerousEmailAccountLinking: true`, `src/auth.ts:16` — a returning Google
   user whose email already exists as an email-only account gets silently linked; this
   is intentional since Google verifies the email, but it does mean two different
   Google accounts can never collide into one BridgeAd account by email spoofing —
   only Google-verified emails).
4. **Email path**: NextAuth's Resend provider sends the magic-link email itself
   (using `AUTH_RESEND_KEY`/`EMAIL_FROM` directly against the Resend API — this is
   independent from the app's own `sendEmail()` transactional helper in
   `src/lib/email.ts:18`, which is used for in-app notifications, not for auth).
   No custom `sendVerificationRequest` is configured, so the email is Auth.js's
   built-in template — English-labelled, not localized for the Hebrew/RTL product.
5. Clicking the emailed link completes the sign-in and redirects to `redirectTo`.
   Auth.js's own "check your email" interstitial is centrally configured at
   `pages.verifyRequest: "/sign-in?check=email"` (`src/auth.ts:34-38`) — see §8 for
   the consequence on the register flow.
6. On success, a `Session` row is created (`session: { strategy: "database" }`,
   `src/auth.ts:32`) and the `session` callback copies `id`, `roles`, `activeRole`
   from the DB user onto `session.user` (`src/auth.ts:41-49`), typed via
   `src/types/next-auth.d.ts`.
7. Caller is redirected to `redirectTo` (defaults to `/dashboard`,
   `sign-in/page.tsx:19`). If the user is not yet onboarded, `requireActiveUser`
   bounces them to `/register/roles` from there (`src/lib/app-user.ts:66-68`) —
   outside this spec's scope.

### 3.2 Sign out

A `<form action={signOutAction}>` in the app sidebar/user-menu
(`src/components/app/sidebar-content.tsx:62`, `src/components/app/user-menu.tsx:63`)
calls the server action `signOutAction` (`src/lib/actions/app-actions.ts:37-39`), which
calls NextAuth's `signOut({ redirectTo: "/" })` — this deletes the `Session` row
(database strategy) and clears the cookie.

### 3.3 Error states

- Blocked/deleted account trying to establish a protected-area session:
  `requireActiveUser` redirects to `/sign-in?error=account`
  (`src/lib/app-user.ts:55,59`) for `deletedAt != null` or
  `status IN (SUSPENDED, BANNED)`. The sign-in page itself does not branch on the
  specific error code — any truthy `error` search param renders the same generic
  "הכניסה נכשלה" message (`sign-in/page.tsx:36-40`).
- Email send failure (Resend `AuthError`) → `/sign-in?error=email` handled locally
  in the page's own server action (`sign-in/page.tsx:74-78`).
- No provider configured → static warning, no auth attempt possible
  (`sign-in/page.tsx:42-47`).

### 3.4 Client-side "am I logged in" check (marketing header)

`HeaderAuthActions` (`src/components/marketing/header-auth-actions.tsx`) is a client
island that fetches NextAuth's built-in `/api/auth/session` endpoint on mount to
decide whether to render "כניסה/הרשמה" vs. "האזור האישי" — done client-side
deliberately so marketing pages stay statically renderable for SEO
(`header-auth-actions.tsx:10-12`).

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Config | `src/auth.ts` | NextAuth instance: providers, adapter, session strategy, pages, `session` callback |
| API | `src/app/api/auth/[...nextauth]/route.ts` | Exposes NextAuth's `GET`/`POST` handlers (OAuth callback, CSRF, session, signout endpoints, etc.) |
| Route | `src/app/(frontend)/(auth)/sign-in/page.tsx` | Sign-in UI + both provider server actions |
| Route (boundary) | `src/app/(frontend)/(auth)/register/page.tsx` | Same provider mechanics, registration-flavored copy — see §8 for the shared-`verifyRequest` interaction |
| Action | `src/lib/actions/app-actions.ts:37` (`signOutAction`) | Sign-out |
| Action | `src/lib/actions/app-actions.ts:14` (`setActiveRole`) | Role-switch (post-auth; belongs to `rbac-guards.md`) |
| Guard/fetcher | `src/lib/app-user.ts` (`requireActiveUser`) | Session → DB user → onboarding/status gate → normalized `AppUser` |
| Guard/fetcher | `src/lib/auth-helpers.ts` (`requireUser`, `requireRole`) | Lighter-weight guards; `requireUser` does **not** check `status`/`deletedAt` (see §8) |
| Guard/fetcher | `src/lib/registration.ts` (`requireRegistrationUser`) | Session gate for the `/register/*` steps |
| Types | `src/types/next-auth.d.ts` | Extends `Session`/`User`/`AdapterUser` with `roles`, `activeRole` |
| Env | `src/env.ts` | `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST`, `AUTH_GOOGLE_ID/SECRET`, `AUTH_RESEND_KEY`, `EMAIL_FROM`; `hasGoogle`/`hasEmail` flags |
| Client island | `src/components/marketing/header-auth-actions.tsx` | Reads `/api/auth/session` to toggle header CTAs |
| Dev-only | `src/app/(frontend)/dev/login/route.ts` | `NODE_ENV==="development"`-gated bypass that mints a `Session` row directly, skipping any provider (see §8) |
| Unrelated (same name pattern) | `src/lib/oauth-crypto.ts` | AES-256-GCM for creator-channel OAuth refresh tokens (YouTube/Facebook connect) — a **different** OAuth flow, not sign-in. Out of scope. |

## 5. Data model

Models: `User`, `Account`, `Session`, `VerificationToken` — standard Prisma-adapter
shape (`prisma/schema.prisma:401-495`).

- `User.roles: UserRole[]` (`@default([])`) + `User.activeRole: UserRole?` — populated
  during registration, not during auth.
- `User.status: UserStatus` (`@default(PENDING_ONBOARDING)`) — enum
  `PENDING_ONBOARDING · ACTIVE · SUSPENDED · BANNED` (`prisma/schema.prisma:34-39`).
  Auth itself never transitions this; `requireActiveUser` only *reads* it.
- `User.lastLoginAt: DateTime?` exists but is **never written** by the real sign-in
  path (`src/auth.ts` has no `events.signIn` handler) — only by dev/seed routes
  (`src/app/(frontend)/dev/{login,seed-users,seed-creator-dashboard,seed-space-dashboard}/route.ts`).
  See §9.
- `Account` — one row per linked provider (`@@id([provider, providerAccountId])`),
  stores OAuth tokens for Google; empty/unused for the Resend (email) provider.
- `Session` — database-strategy sessions; `sessionToken` is the cookie value
  directly (`prisma/schema.prisma:477-487`).
- `VerificationToken` — Resend magic-link tokens, keyed by `(identifier, token)`.

No custom status transitions happen in this feature; `PENDING_ONBOARDING → ACTIVE`
is driven by the registration flow (`registration.md`), not auth.

## 6. API contracts

- `GET|POST /api/auth/*` — the full NextAuth/Auth.js surface (`signin`, `callback`,
  `session`, `csrf`, `signout`, `providers`), delegated wholesale to
  `handlers` from `src/auth.ts` (`src/app/api/auth/[...nextauth]/route.ts:1-3`). No
  app-specific request/response schema — this is library-owned.
- No app-defined `/api` auth endpoints exist outside that catch-all.

## 7. Guards & permissions

- `requireUser()` (`src/lib/auth-helpers.ts:9-15`) — session-only check, redirects to
  `/sign-in` if absent. **Does not** re-check the DB (`status`, `deletedAt`), unlike
  `requireActiveUser`/`requireRegistrationUser`. Grep shows it is not currently
  called anywhere in `src/` outside its own definition and `requireRole` — effectively
  dead/unused in favor of the DB-backed guards, but still exported as public API.
- `requireRole(role)` (`src/lib/auth-helpers.ts:18-24`) — wraps `requireUser`,
  redirects to `/dashboard` if the role is missing. Same staleness caveat.
- `requireActiveUser()` (`src/lib/app-user.ts:33-84`) — the guard actually used by
  every `/dashboard/**` page (49 call sites, see `code-map.md`). Full detail belongs
  to `rbac-guards.md`; documented here only insofar as it is auth's direct
  downstream consumer.
- `requireRegistrationUser()` (`src/lib/registration.ts:31-49`) — same DB checks
  (`deletedAt`, `SUSPENDED`/`BANNED`) but permits `PENDING_ONBOARDING`, since that is
  the expected state on `/register/*`.

## 8. Known edge cases

- **Google + Resend account linking**: `allowDangerousEmailAccountLinking: true`
  auto-links a Google sign-in to an existing email/password-less account sharing the
  same email, without an extra confirmation step. Standard/accepted since Google
  emails are pre-verified, but worth knowing it's opt-in-by-default here.
- **`/sign-in` doesn't gate on onboarding** — a signed-in-but-not-onboarded user
  hitting `/sign-in` is redirected straight to `/dashboard` (or `callbackUrl`)
  rather than `/register/roles`; the actual bounce to registration happens one hop
  later inside `requireActiveUser`. Harmless (extra redirect), but means `/sign-in`
  and `requireActiveUser` encode two different definitions of "logged in enough."
- **Generic error messaging**: `/sign-in?error=...` shows the same Hebrew message for
  every error code (account blocked, OAuth failure, etc.) — no differentiation for
  the user between "wrong provider," "account suspended," or "server error."
- **Dev bypass route** `src/app/(frontend)/dev/login/route.ts` mints a `Session` row
  directly, bypassing all providers; self-guarded by `NODE_ENV !== "development"` →
  404 (`route.ts:31-33`), so not reachable in a real production deployment as long as
  `NODE_ENV=production` is set there. Its own doc-comment says "remove before
  production" (`route.ts:9`) despite already being runtime-gated — mixed signal, but
  low risk given the guard.

## 9. Tech debt / TODOs in code

- `User.lastLoginAt` is defined and typed everywhere but never updated by a real
  sign-in (`src/auth.ts` has no `events: { signIn }` hook) — the field is currently
  populated only by dev/seed scripts, so any UI or report reading it
  (none found in `src/` outside the dev routes themselves) would show stale/empty
  data in production.
- `AUTH_TRUST_HOST` is parsed and exposed in `src/env.ts:20-23` but never read —
  `src/auth.ts:33` hardcodes `trustHost: true` unconditionally. Either the env var
  is dead config or the hardcoding should read it.
- No custom `sendVerificationRequest` for the Resend provider → the magic-link email
  uses Auth.js's default (English) template, inconsistent with the rest of the
  product's Hebrew/RTL copy.
- `requireUser`/`requireRole` in `src/lib/auth-helpers.ts` appear unused in favor of
  `requireActiveUser` — candidates for removal or for documenting why both guard
  layers are kept.

## 10. Findings for the team lead

1. **Dead `check=email` branch on `/register`** (medium — UX correctness). NextAuth's
   `pages.verifyRequest` is a single global setting: `"/sign-in?check=email"`
   (`src/auth.ts:34-38`). That applies to *every* call to `signIn("resend", …)`,
   including the one made from `/register`'s own server action
   (`src/app/(frontend)/(auth)/register/page.tsx:81-99`). So a user who requests a
   magic link while registering is sent to the generic `/sign-in?check=email` screen
   (`src/app/(frontend)/(auth)/sign-in/page.tsx:31-35`, "שלחנו לך קישור כניסה
   למייל") instead of staying on `/register` where a dedicated, more accurate
   message already exists and is currently unreachable dead code
   (`register/page.tsx:33-37`, "שלחנו לך קישור הרשמה למייל... הקישור פתוח לשעה").
   Net effect: register-flow users see sign-in copy and lose the "link valid for one
   hour" detail. Fix requires either a single shared `verifyRequest` page that
   branches on a query param/referrer, or moving off the static `pages.verifyRequest`
   config. Worth a quick manual confirmation in a running dev server, since this is
   inferred from Auth.js's documented behavior rather than an interactive repro (no
   `node_modules` installed in this analysis environment).
2. **Visual/design-system inconsistency between `/sign-in` and `/register`** (low —
   consistency, arguably violates `CLAUDE.md` §3 "design tokens only"). `/sign-in`
   (`sign-in/page.tsx`) is a bare, unstyled page using raw Tailwind color utilities
   (`text-black/60`, `dark:text-white/60`, `border-black/15`, `bg-foreground`) and no
   `AuthSplitScreen`/`AuthProgress` chrome, while `/register`
   (`register/page.tsx:7-8,28-29`) uses the full design-token system
   (`text-on-surface`, `bg-primary`, `bg-surface-low`, …) plus the split-screen layout
   and step indicator. They read as two different products. Likely `/sign-in` predates
   the design pass that `/register` got and was never revisited.
3. **`requireUser`/`requireRole` guard layer looks unused** (low — cleanup
   candidate). See §9; confirm with the team before deleting in case they're intended
   for near-future use (e.g. API routes that don't need the full `AppUser`
   normalization).
