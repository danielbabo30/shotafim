# Spec: Guards & roles (RBAC)

> status: documented · updated: 2026-09-11 · owning agent: private-area

## 1. Business purpose

Enforces who can see and do what inside the private area, on top of the plain "is this a
real, active user" check documented in `auth.md` (queue #1, not yet merged as of this writing —
see note in `INDEX.md`). Three distinct concerns get bundled under "RBAC" in this codebase and
are documented together here because they share the same building blocks:
1. **Session/onboarding gate** — is there a valid, active, onboarded user at all.
2. **Role gate** — does the active user's role ("hat") permit seeing this page/feature
   (`BRAND` vs `CREATOR` vs `AD_SPACE_OWNER` vs `ADMIN`).
3. **Ownership gate** — even with the right role, does *this specific resource* (a campaign, a
   contract, a conversation) belong to *this* user, or could another user of the same role
   reach it by guessing/changing an ID (IDOR).

There is no single "RBAC system", library, or declarative policy table anywhere in this repo —
each concern is enforced by a small set of hand-written functions/conventions, reused by
copy-paste at each call site. This spec is the map of that convention.

## 2. Roles involved

`UserRole` enum: `BRAND · CREATOR · AD_SPACE_OWNER · ADMIN` (`prisma/schema.prisma:27-32`),
surfaced app-side as `RoleKey`: `"brand" | "creator" | "space" | "admin"`
(`src/lib/app-nav.ts:11`). A `User` can hold multiple roles at once (`User.roles: UserRole[]`)
and one is "active" at a time (`User.activeRole`) — see `auth.md` §5 for the data model and
`resolveActiveRole`/`sortRoleKeys` for how the active one is picked. `ADMIN` is never
self-selectable at registration (`registration.md` §2) — how a user actually becomes `ADMIN` in
production is **not implemented anywhere in `src/`** (only `src/app/(frontend)/dev/login/
route.ts:38` lets a dev-mode session pick it via `?role=admin`); this is a real gap, see §10.

## 3. User flow

This isn't a page-by-page flow (that's every other spec's job); it's the same four-layer check
re-run on (almost) every request into the private area:

**Layer 0 — Proxy (edge, optimistic, cookie-only).** `src/proxy.ts` is Next.js 16's renamed
`middleware.ts` (see `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md:15` —
"Starting with Next.js 16, Middleware is now called Proxy"; do not confuse this with an actual
reverse proxy). It runs before any page/layout code, for every path matching
`PROTECTED_PREFIXES` (`/dashboard`, `/register/roles`, `/register/profile`,
`/register/complete` — bare `/register` itself is deliberately excluded,
`src/proxy.ts:12-17`). It checks only whether an Auth.js session cookie is *present*
(`authjs.session-token` / `__Secure-authjs.session-token`, `src/proxy.ts:20`) — no DB read, no
role check, no cookie signature validation beyond what `request.cookies.has()` does. No cookie →
redirect to `/sign-in?callbackUrl=<path>`; cookie present → `NextResponse.next()`, i.e. "maybe
fine, layer 1 will actually check." The file's own comment calls this out explicitly: "בדיקה
אופטימית בלבד... האימות האמיתי מול ה-DB נעשה ב-(app)/layout.tsx" ("optimistic check only — the
real DB-backed check happens in the app layout", `src/proxy.ts:6-8`).

**Layer 1 — Session + onboarding gate (DB-authoritative).** `requireActiveUser()`
(`src/lib/app-user.ts:33-84`, full behavior in `auth.md` §7) is called once per request by
`(app)/layout.tsx:14` for every page under `/dashboard/**`, **and independently, again, at the
top of nearly every individual page and every server action** (see §4's file map — this is not
an oversight: Next.js Server Actions are invoked as their own RPC, they do not re-run through
the page/layout React tree, so a layout-level check alone would leave every action wide open).
`requireAdmin()` and `requireRegistrationUser()` (see below) both start by delegating to this
same layer.

**Layer 2 — Role gate.** Once Layer 1 confirms an active, onboarded user with a known
`roleKeys`/`activeRole`, individual pages and actions decide per-feature whether the *role* is
allowed in. There is no shared `requireRole(key)` helper actually in use (the one that exists,
`src/lib/auth-helpers.ts:18-24`, is dead code that trusts stale session data — see §9/§10). The
live convention instead is one of:
- **Redirect on role mismatch** — `if (!user.roleKeys.includes("brand")) redirect("/dashboard")`,
  repeated verbatim (with the relevant role) at the top of role-specific pages, e.g.
  `src/app/(frontend)/(app)/dashboard/campaigns/new/page.tsx:12`,
  `dashboard/campaigns/page.tsx:25`, `dashboard/plugin/page.tsx:20`,
  `dashboard/marketplace/[id]/page.tsx:32`, `dashboard/ad-spaces/[id]/page.tsx:30`,
  `dashboard/assets/{page,new/page,[id]/edit/page}.tsx` (all `"space"`),
  `dashboard/earnings/page.tsx:37` (`"creator"`),
  `dashboard/bookings/page.tsx:24` (`"space"`).
  Two-role variants use `||`: `dashboard/businesses/{page,[businessId]/page}.tsx`
  (`"creator" || "space"`, lines 24 / 60), `dashboard/discover/page.tsx:16` (same pair).
- **Inline branch, no redirect** — the page renders different content per role instead of
  bouncing away: `dashboard/marketplace/page.tsx:13-24` shows an explanatory "switch to brand
  mode" panel instead of redirecting when `activeRole !== "brand"`;
  `dashboard/page.tsx:13-24` and `dashboard/applications/page.tsx:18` switch which
  sub-component renders based on `activeRole`.
- **No role gate at all** — some pages under `/dashboard/**` run only Layer 1 and are reachable
  by any onboarded user regardless of role: `dashboard/ad-spaces/page.tsx` (browse listings —
  presumably intentional, a read-only catalog), `dashboard/messages/page.tsx`,
  `dashboard/reports/page.tsx`, `dashboard/settings/page.tsx`. Nothing in the code marks these
  as "intentionally open" vs. "role check forgotten" — see §10.
- **`requireAdmin()`** (`src/lib/admin-guard.ts:9-15`) — the one role check that *is* a shared,
  reusable function: wraps `requireActiveUser()`, then
  `if (!user.roleKeys.includes("admin")) redirect("/dashboard")`. Only two call sites exist
  today: `dashboard/disputes/page.tsx:16` and `dashboard/disputes/[id]/page.tsx`, plus
  `resolveDispute`/other admin actions in `src/lib/actions/dispute-actions.ts`. There is **no
  dedicated `/dashboard/admin/**` area** — admin capability today is entirely "the same dispute
  pages, gated to admins" (feature #19, admin dashboard, is still `missing` in the queue; this
  is the only admin-only surface that exists ahead of that spec).
- **Role switching itself is guarded**: `setActiveRole` (`src/lib/actions/app-actions.ts:14-34`)
  re-derives `roles` from the DB and rejects switching to a `RoleKey` the user doesn't actually
  own (`ownedKeys.includes(key)` check, line 26) — it does not trust a client-submitted role
  blindly.

**Layer 3 — Ownership gate (per-resource, inside server actions).** Passing Layers 1–2 proves
"an onboarded X can use this feature" — it says nothing about *which* campaign/contract/asset a
given request is allowed to touch, since resource IDs arrive from the client (hidden form
fields, route params) and are attacker-controlled. Every mutating action that takes a resource
ID re-derives ownership from `requireActiveUser()`'s `user.id`, not from the client, using one
of three shapes:
1. **Owned-lookup helper** (`load<Resource>Owned`/`load<Resource>Party` naming convention,
   private to the action file) — role-check + derive the caller's own profile id + `findFirst`
   scoped by that id in one place, reused by every action on that resource. Canonical example:
   `loadContractParty`/`loadOwnedContract` (`src/lib/actions/contract-actions.ts:23-40`) —
   `findFirst({ where: { id: contractId, OR: [{ business: { userId } }, { providerId: userId }] } })`
   returns `null` (→ caller treats as "not found", not "forbidden" — no distinction surfaced to
   the user) if the contract exists but belongs to someone else. Same pattern:
   `loadOwnedApplication` (`src/lib/actions/application-actions.ts:135-174`).
2. **Direct FK match, no helper needed** — for single-owner resources, the `findFirst`/`update`
   `where` clause just includes the owning FK inline: `withdrawApplication`
   (`src/lib/actions/application-actions.ts:364-367`, `applicantId: user.id`);
   `adSpaceAsset` mutations (`src/lib/actions/ad-space-actions.ts:169-176, 207-211, 235-249`,
   `owner: { userId: owner.userId }`).
3. **Compound-unique-key lookup** — for join/participant tables, the ownership check *is* the
   primary-key lookup: `sendMessage` (`src/lib/actions/message-actions.ts:29-35`) does
   `conversationParticipant.findUnique({ where: { conversationId_userId: { conversationId,
   userId } } })` — no row means "not a participant," rejected before any write.
- **`requireAdmin()`-gated actions skip per-resource ownership by design** — e.g.
  `resolveDispute` (`src/lib/actions/dispute-actions.ts:96-124`) does a plain
  `dispute.findUnique({ where: { id } })` with no owner scoping, because an admin is *supposed*
  to be able to act on any dispute; the authorization boundary there is entirely "is this user
  an admin," established once at the top via `requireAdmin()`.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Edge/optimistic | `src/proxy.ts` | Cookie-presence check for `/dashboard/**` + post-signup `/register/*`; Next.js 16's renamed `middleware.ts` |
| Session/onboarding gate | `src/lib/app-user.ts` (`requireActiveUser`) | The DB-authoritative gate everything else builds on — full spec in `auth.md` §7 |
| Registration-phase gate | `src/lib/registration.ts` (`requireRegistrationUser`) | Looser sibling of `requireActiveUser`, used only by `/register/*` — full spec in `registration.md` §7 |
| Admin role gate | `src/lib/admin-guard.ts` (`requireAdmin`) | Only reusable role-check function in the codebase; two call sites (disputes) |
| Dead role-check helpers | `src/lib/auth-helpers.ts` (`requireUser`, `requireRole`) | Unused — see §9 |
| Role metadata / mapping | `src/lib/app-nav.ts` (`ROLE_META`, `roleKeyFromUserRole`, `userRoleFromKey`, `sortRoleKeys`, `resolveActiveRole`) | `UserRole` ↔ `RoleKey`, priority order, nav items per role (nav is a UX affordance, not a security boundary — see §8) |
| Role-switch action | `src/lib/actions/app-actions.ts` (`setActiveRole`) | Ownership-checked role switch |
| Per-page role gates | Scattered — see the bullet list in §3, Layer 2 | No shared helper; each page repeats `roleKeys.includes(...)` |
| Per-resource ownership helpers | `src/lib/actions/contract-actions.ts` (`loadContractParty`, `loadOwnedContract`), `application-actions.ts` (`loadOwnedApplication`, `requireBrandBusiness`), `ad-space-actions.ts` (`resolveOwner`) | Private, file-scoped helpers — not shared across files even though the pattern is identical |
| Admin-only surface | `src/app/(frontend)/(app)/dashboard/disputes/{page,[id]/page}.tsx`, `src/lib/actions/dispute-actions.ts` | Only place `requireAdmin` is actually used today |

## 5. Data model

No new models beyond what `auth.md` §5 already covers (`User.roles`, `User.activeRole`,
`UserRole` enum). The ownership relationships that Layer 3 scopes against are the standard
domain FKs: `Campaign.businessId → BusinessProfile.userId`, `Contract.providerId` /
`Contract.businessId → BusinessProfile.userId`, `CampaignApplication.applicantId`,
`AdSpaceAsset.ownerId → AdSpaceOwnerProfile.userId`, `ConversationParticipant.userId` — each
documented in full by its owning feature spec (`campaigns.md`, `contracts.md`,
`applications.md`, `marketplace.md`, `messages.md` — all still `missing` in the queue).

No enum or status transition specific to RBAC itself — `UserRole` has no state machine, it's a
plain set membership (`roles: UserRole[]`, users can hold several simultaneously, none are ever
removed by any code path found in this pass — there's no "remove a role" action, only "add via
registration" and "switch which one is active").

## 6. API contracts

Not applicable — every guard in this spec is a plain async function/redirect called from Server
Components or Server Actions, not a REST/route-handler boundary. The two API routes under
`src/app/api/connect/{youtube,facebook}/**` that do exist call `requireActiveUser()` the same
way pages do (see `auth.md` §4) — no separate API-specific authorization layer.

## 7. Guards & permissions

Summary table of every guard function found, what it checks, and what happens on failure:

| Guard | Checks | On failure |
| --- | --- | --- |
| `proxy()` (`src/proxy.ts`) | Session cookie present | Redirect `/sign-in?callbackUrl=<path>` |
| `requireActiveUser()` | Session valid, DB row exists/not deleted, not suspended/banned, onboarding complete (`auth.md` §7) | Redirects, varies by which check fails |
| `requireRegistrationUser()` | Session valid, not suspended/banned/deleted (allows `PENDING_ONBOARDING`) | `/sign-in?...` variants |
| `requireAdmin()` | `requireActiveUser()` + `roleKeys.includes("admin")` | `redirect("/dashboard")` |
| Per-page `roleKeys.includes(role)` | Active role membership | `redirect("/dashboard")` **or** inline "wrong mode" UI, inconsistently (§3) |
| `setActiveRole` ownership check | Target role ∈ caller's `roles` | `throw new Error("Role not owned by user")` — uncaught, surfaces as a Next.js error boundary, not a friendly message (see §8) |
| `load<Resource>Owned`/`Party` helpers | Resource FK ties back to `user.id` | Returns `null`/`undefined` → caller shows a generic "not found" message, **never** a distinct "forbidden" — so a user probing another user's resource ID cannot tell the difference between "doesn't exist" and "not yours," which is the correct anti-enumeration behavior |

## 8. Known edge cases

- **The proxy's cookie check is not a security boundary, and the code says so itself**
  (`src/proxy.ts:6-8`). A request can present a stale, expired, or otherwise-invalid-but-present
  session cookie and sail past the proxy; `requireActiveUser()` in the layout/action is what
  actually rejects it. This is correct per Next.js's own guidance (`proxy.md:29`: "should not be
  used as a full session management or authorization solution") but worth remembering when
  reasoning about "is this route protected" — presence of a proxy redirect rule is necessary,
  never sufficient.
- **Sidebar navigation (`ROLE_META[key].nav`, `src/lib/app-nav.ts`) is a UX affordance, not an
  access boundary.** It determines what links a role's sidebar shows, not what URLs are
  reachable. Combined with the "no role gate at all" pages in §3 (Layer 2), this means e.g. a
  `creator`-only user who manually navigates to `/dashboard/ad-spaces` (a page with no role
  check) sees the ad-space browsing catalog even though nothing in their sidebar links there.
  Low-severity since it's a read-only catalog, but the general shape (nav hides, URL doesn't
  enforce) is worth knowing before assuming "not in the nav" means "not reachable."
- **`setActiveRole`'s unauthorized-role error is an uncaught `throw`**
  (`src/lib/actions/app-actions.ts:16,19,26`) — unlike every ownership-helper pattern in §3
  Layer 3 (which return `null`/a typed error state), this one throws raw `Error`s for "no
  session," "invalid role key," and "role not owned," all three surfacing identically to the
  user as Next.js's generic error UI rather than a handled redirect or form message. Functions,
  but inconsistent with the rest of the codebase's error-handling convention.
- **Admin's `findUnique`-without-ownership-scope pattern (§3, last bullet) is correct today**
  because the only two call sites are behind `requireAdmin()` — but it's a sharp edge: if anyone
  ever reuses `resolveDispute`'s query shape as a template for a *non-admin* action, they'd
  silently drop the ownership check that every other action in the codebase carefully includes.
  Nothing in the code flags this convention difference (no comment on `requireAdmin`-gated
  actions explaining why they're allowed to skip the pattern §3's other examples follow).

## 9. Tech debt / TODOs in code

- `src/lib/auth-helpers.ts` (`requireUser`, `requireRole`) — dead code, already flagged in
  `auth.md` §9; restated here because it specifically duplicates this spec's "role gate"
  concern with a weaker implementation (trusts `session.user.roles` instead of re-reading the
  DB — see `auth.md` §8 for the staleness mechanism). Two independent specs now flag the same
  file for deletion.
- **No shared `requireRole(key)` / `requireOwnedResource(model, id)` helper exists**, despite
  the identical pattern being hand-rolled per-file at every Layer 2 and Layer 3 call site (§3,
  §4). Not a bug — every instance checked in this pass is correct — but it's copy-paste risk:
  each new feature has to remember to write the check itself, with no compiler/lint enforcement
  that it did. A future refactor extracting `requireRole` and a generic ownership-scoped fetcher
  would remove an entire class of "forgot the check" risk, at the cost of an abstraction layer
  the team may or may not want this early.
- **No code path anywhere in `src/` grants `ADMIN`** outside the dev-only `/dev/login?role=admin`
  bypass (`auth.md` §3/§9). Until feature #19 (admin dashboard) exists, the only way to get an
  admin session appears to be direct DB manipulation or the dev route — worth confirming this is
  understood/intentional rather than an oversight before anyone needs a real admin account.

## 10. Findings for the team lead

1. **No production path to grant the `ADMIN` role.** `ADMIN` is excluded from self-registration
   by design (`registration.md` §2) and no admin-management UI/action exists yet (feature #19 is
   still `missing`). Today, the *only* two admin-gated screens that exist — the dispute queue —
   are literally unreachable for any real user until either that feature ships or someone
   manually flips `roles` in the database. Flagging so it's a known gap, not a surprise, when
   disputes need to actually be arbitrated before admin-dashboard is built.
2. **Inconsistent Layer 2 enforcement on "browse" pages** (§3, §8): `/dashboard/ad-spaces`,
   `/dashboard/messages`, `/dashboard/reports`, `/dashboard/settings` have zero role check —
   reachable by any onboarded user of any role. This may be entirely intentional (shared
   utility pages), but nothing in the code documents that decision, so it's indistinguishable
   from "the author forgot the `roleKeys.includes(...)` line" that appears on nearly every
   sibling page. Recommend either a one-line comment confirming intent on each, or adding the
   missing checks if any of the four turn out to expose role-specific data that shouldn't be
   universally visible (not confirmed either way in this pass — would need each page's fetcher
   inspected, which belongs to its own feature spec).
3. **`setActiveRole`'s error handling breaks convention** (§8) — three raw `throw new Error(...)`
   calls where the rest of the RBAC surface returns typed `null`/error-state values. Low
   severity (it's a same-origin, self-triggered action — a user can't make someone else hit this
   path), but worth a quick pass to match the rest of the codebase's action error-handling style.
4. **Process note, not a code finding**: as of this run, six open, unmerged PRs already exist
   for `docs/spec/auth.md` (#1, #2, #4, #5, #6, #8) and one for `docs/spec/registration.md` (#7)
   — none merged into `private-area-foundation`. Because `docs/spec/INDEX.md` on the base branch
   still shows both as `missing`, each nightly systems-analyst run has been re-picking item #1
   from the top of the queue and re-doing the same spec (PR #8's own description independently
   flagged this too). This run deliberately skipped both #1 and #2 and picked #3
   (`rbac-guards.md`) instead, since that one has no open PR yet — otherwise this would have
   been the seventh near-duplicate `auth.md` PR. **Recommend merging one auth.md PR (or a
   reconciled combination of them — they cover overlapping but not identical ground) and one
   registration.md PR, then closing the rest, so the base branch's queue state reflects reality
   and future nightly runs stop duplicating work.**
