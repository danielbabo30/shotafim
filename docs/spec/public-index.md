# Spec: Public index / explore

> status: documented · updated: 2026-10-05 · owning agent: frontend-marketing

## 1. Business purpose

Intended to be an unauthenticated, SEO-indexable public directory — the
marketing-site mirror of the gated `/dashboard/businesses` directory — so a
business/creator/ad-space could be discovered by a visitor with no account
and no login. Today it is **not implemented**: `/explore` is a static
placeholder page with hardcoded Hebrew copy announcing that the real
directory "will arrive in a future phase," and that in the meantime
"registered users can search businesses via the personal area"
(`src/app/(frontend)/(marketing)/explore/page.tsx:15-17`). This is a more
bare case than `ProofOfPlay` (`deliverables.md` §10 finding 1, which at
least had a schema and a read path) — here there is no backing data model,
fetcher, or component at all, just prose.

## 2. Roles involved

None. The page has no session/role check in any direction — same markup for
an anonymous visitor and any logged-in role (`explore/page.tsx` — no
imports from `@/lib/app-user`, no `searchParams`, no conditional branch).

## 3. User flow

1. Visitor follows the "אינדקס" nav link (`src/lib/site.ts:10`, the only
   live link to this route anywhere in the app) or navigates to `/explore`
   directly.
2. `ExplorePage` (`explore/page.tsx:11-20`) renders inside the shared
   marketing shell (`SiteHeader`/`SiteFooter` via
   `src/app/(frontend)/(marketing)/layout.tsx:9-17`) — a heading ("אינדקס
   עסקים") and one paragraph of static copy. No data is fetched, so there is
   no loading, empty, filtered, or paginated state to describe.
3. There is nothing to click: the page contains zero `<Link>`/CTA elements
   (confirmed by the exploration pass that produced this spec — grepped the
   full file, 20 lines). A visitor who wants the real functionality has to
   already have an account and role (`creator` or `space`) and navigate to
   `/dashboard/businesses` themselves; nothing on `/explore` points them
   there.

There is no alternate/error state because there is no input, no data
source, and no action — the entire "flow" is: load the route, read static
text.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Route | `src/app/(frontend)/(marketing)/explore/page.tsx` | The entire feature — 20 lines, static JSX, no data |
| Layout | `src/app/(frontend)/(marketing)/layout.tsx` | Shared marketing shell; sets `export const revalidate = 60` (line 7), inherited but meaningless here (nothing to revalidate) |
| Component | `src/components/ui/container.tsx` | Only shared component the page actually renders (`<Container>`) |
| Nav config | `src/lib/site.ts:10` | `{ href: "/explore", label: "אינדקס" }` — the only live link to this route |
| Stale cross-reference | `src/lib/solutions-ad-spaces-defaults.ts:17` | `secondaryCta: { label: "צפה במפת שטחים", href: "/explore" }` ("view the ad-space map") — points at `/explore`, which has no map; stale copy left over from before the Sept 6 de-scope (see §9) |
| Adjacent gated feature (not part of this route) | `src/app/(frontend)/(app)/dashboard/businesses/page.tsx` + `[businessId]/page.tsx` | Where the real, working directory now lives — authenticated, role-gated (§7 of `marketplace.md`); its fetchers are listed below for cross-reference only |
| Adjacent fetcher | `src/lib/business-directory.ts` (`getBusinessDirectory`, `getBusinessDetail`) | The real Prisma-backed implementation of "search businesses" — powers `/dashboard/businesses` only, not `/explore` |

No `src/lib/explore.ts` or `src/lib/public-index.ts` exists. No component
under `src/components/marketing/**` is imported by this route (the
similarly-named `guide-explorer.tsx` backs the unrelated `/guides`
content-marketing page and has no relationship to `/explore`).

## 5. Data model

None. The route makes no Prisma call and references no model. For
cross-reference, the data the feature's copy alludes to ("אינדקס עסקים
ציבורי") is `BusinessProfile` (`prisma/schema.prisma:501-528`,
`status: ProfileStatus @default(ACTIVE)`, `deletedAt: DateTime?`) — exactly
the model `getBusinessDirectory` already queries
(`src/lib/business-directory.ts:36-43`: `status: "ACTIVE", deletedAt: null`,
plus free-text `name` search, `categories.some.categorySlug`, and
`locations.some.cityId` filters) for the *gated* directory. That fetcher's
own doc-comment is explicit about the split: "שכבת קריאה לחיפוש עסקים
**באזור האישי** (`/dashboard/businesses`)" ("read layer for business search
**in the personal area**") — i.e. the working implementation was written
only for the authenticated surface, never for `/explore`
(`business-directory.ts:6`).

No enums, no status transitions, nothing to trace for this route itself.

## 6. API contracts

None. No fetcher, no server action, no API route backs this page.

## 7. Guards & permissions

| Surface | Guard | On failure |
| --- | --- | --- |
| `/explore` | None | N/A — fully public |

Confirmed via `src/proxy.ts`: `PROTECTED_PREFIXES` (lines 11-17) lists only
`/dashboard`, `/register/roles`, `/register/profile`, `/register/complete`;
`/explore` is not among them, so `isProtected` (lines 25-27) is `false` and
the proxy returns `NextResponse.next()` (line 28) with no session-cookie
check at all. The route is also not excluded by the proxy's matcher (lines
40-42 only exclude `/api`, `/admin`, `/_next/static`, `/_next/image`, and
static image extensions), so it runs through the proxy but is simply never
gated. There is no role check inside the page component either — there is
nothing to check against, since there is no data being scoped to a role.

## 8. Known edge cases

None apply — there is no search input, no filter, no list to paginate, no
empty-vs-populated state. The only "edge case" is that the page is
permanently in its own empty state.

## 9. Tech debt / TODOs in code

- **The entire feature is an unimplemented placeholder**, not a
  work-in-progress. Git history shows a deliberate two-step de-scope rather
  than an in-progress build:
  - `87a86e5` (2026-08-30, "Build CMS-backed RTL marketing site") created
    `/explore` with placeholder copy promising SSR/SSG content "once we
    define the data model."
  - `2ced87c` (2026-09-06, "Private area: settings, social OAuth connect,
    business search, creator earnings") **moved the real directory
    functionality behind auth** into `/dashboard/businesses`
    (`getBusinessDirectory`/`getBusinessDetail` were introduced in this same
    commit), rewrote `/explore`'s copy to explicitly defer the public
    version further, and removed a pre-existing `/explore/creators` nav
    link (per that commit's own message) that doesn't exist in the current
    tree. So the public index went from "coming next phase" to "moved to
    the private area, public version deferred again" — an active
    de-scoping, not a stalled build.
- **Dead/stale CTA**: `src/lib/solutions-ad-spaces-defaults.ts:17` still
  links a "view the ad-space map" secondary CTA to `/explore`, which has no
  map (or any ad-space content at all). This CTA currently lands a visitor
  on a page that contradicts its own label.
- **No sitemap or robots file exists anywhere in the app** (`find src/app
  -iname "sitemap*" -o -iname "robots*"` returns nothing) — not specific to
  this route, but relevant here since a public SEO-facing index page is
  exactly the kind of route a sitemap would normally need to enumerate.
- The page has `export const metadata` (static title/description only,
  `explore/page.tsx:4-7`) but no `generateMetadata`, no JSON-LD/structured
  data — consistent with there being no real content to describe.

## 10. Findings for the team lead

1. **Queue item #22 "Public index / explore" has no implementation to
   document beyond "it's a placeholder."** Unlike `ProofOfPlay`
   (`deliverables.md` §10) or the `CANCELLED` campaign status
   (`campaigns.md` §10), which are schema/enum values with no writer, this
   is route-only: no schema reference, no fetcher, no component. If the
   product intent is still "build a public directory," the groundwork
   (`getBusinessDirectory`/`getBusinessDetail` in
   `src/lib/business-directory.ts`, already filtering to safe, non-PII
   fields — see that file's own doc-comment, lines 9-10) already exists and
   would need a public (no-`requireActiveUser`) variant plus a public detail
   route; if the intent is "defer indefinitely," the placeholder copy and
   stale nav link are at least internally consistent and could stay as-is.
2. **Stale CTA pointing at a contentless page**
   (`src/lib/solutions-ad-spaces-defaults.ts:17`) — "צפה במפת שטחים" ("view
   the ad-space map") links to `/explore`, which has never had a map. Worth
   either removing the CTA or pointing it somewhere real (there is no public
   ad-space map anywhere in the app today).
3. Low severity, noted for completeness: the whole site has no
   `sitemap.ts`/`robots.ts`. Not this feature's bug specifically, but it
   means even a future real `/explore` wouldn't be submitted to search
   engines without that infrastructure also being built.
