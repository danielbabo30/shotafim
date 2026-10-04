# Spec: Long-form content (posts / guides / legal)

> status: documented · updated: 2026-10-04 · owning agent: frontend-marketing

## 1. Business purpose

Three public, unauthenticated content types that live entirely in Payload CMS (not Prisma)
and share one block-based body-rendering system:

- **Posts** (`/resources/blog`, `/resources/blog/[slug]`) — marketing blog/resource articles.
  Used for SEO content marketing and as a homepage carousel
  (`src/app/(frontend)/(marketing)/page.tsx:6-32` renders `ArticleCarousel` from `getAllArticles()`).
- **Guides** (`/guides`, `/guides/[slug]`) — the help-center / how-to library, searchable and
  filterable by audience (advertiser / creator / media-owner / finance).
- **Legal pages** (`/legal`, `/legal/[slug]`) — a closed set of exactly 4 statutory documents
  (accessibility, privacy, terms, cookies) that `registration-actions.ts` and the registration
  UI link to and record consent against (see `legal-consent.ts`, cross-referenced in
  `registration.md`).

All three are read-only to site visitors (`access: { read: () => true }` on every collection)
and editable only through the separate `/admin` Payload panel — there is no app-facing
create/edit UI and no Prisma involvement at all.

## 2. Roles involved

This feature has **no relationship to the app's `UserRole` enum or RBAC system**
(`rbac-guards.md`). Two actors only:

- **Site visitor** (anyone, no auth) — reads `/resources/blog*`, `/guides*`, `/legal*`. No role
  check anywhere in these routes.
- **Payload CMS editor** (`collection: "users"`, `src/collections/Users.ts:7-25`) — a completely
  separate auth system from the app's Auth.js `User` table, used only to log into `/admin`.
  `Users` has no `role`/permission field and none of `Posts`/`Guides`/`LegalPages` declare
  `access.create`/`update`/`delete`, so **every** Payload editor account has full read/write on
  all three collections (and on every other CMS collection/global) — there is no
  editor-vs-admin distinction inside the CMS, unlike the app's own role system.

## 3. User flow

**Blog (`/resources/blog`):**
1. Index page (`.../resources/blog/page.tsx:13-44`) loads `getAllArticles()` +
   `getFeaturedArticle()` in parallel, shows the featured post via `FeaturedArticle`, then the
   rest as a card grid (`ArticleCard`).
2. Clicking a card → `/resources/blog/[slug]` (`.../blog/[slug]/page.tsx:45-107`): hero
   (breadcrumbs, category, author/date meta, share buttons), optional cover image, two-column
   body (`ArticleBody` rendering `RenderBlock[]`) + sticky sidebar (`ArticleToc` built from H2
   headings only, plus a static `ArticleSidebarCta`), then author bio and a feedback strip below
   the fold, then up to 3 related articles (same category first, then others).
3. `generateStaticParams` pre-renders every known slug at build time; `dynamicParams` is left at
   its default (`true`), so a slug added to the CMS after the last build still renders on
   demand. The whole `(marketing)` route group revalidates every 60s
   (`src/app/(frontend)/(marketing)/layout.tsx:6-7`) — that is the **only** cache-invalidation
   mechanism; the comment there says on-demand revalidation via a Payload hook is planned but
   not built.

**Guides (`/guides`):**
1. Lobby (`.../guides/page.tsx:16-33`) loads `getGuidesByCategory()` (guides grouped by the 4
   fixed `GUIDE_CATEGORIES`, empty categories omitted) and `getPopularGuides()` (guides flagged
   `popular`, or the first 3 overall if none are flagged). `GuideExplorer` is a client component
   doing in-memory free-text + audience-tab filtering over the already-fetched groups (no
   server round-trip per keystroke).
2. Guide detail (`.../guides/[slug]/page.tsx:39-112`): breadcrumb + "official guide" badge +
   reading time + last-updated date, prerequisites box, body (prose blocks plus two
   guide-specific block types: numbered `steps` with optional CTA buttons, and red `caution`
   boxes), a feedback strip, and a sidebar with TOC (H2 headings **and** step titles,
   `getGuideTocItems`) plus a "next guide" link resolved from a free-text `nextGuideSlug` field.
   Emits `HowTo` JSON-LD built from the same steps/prerequisites.

**Legal (`/legal`):**
1. `/legal` unconditionally redirects to `/legal/<first entry in LEGAL_PAGES>` (today:
   `accessibility`) — `.../legal/page.tsx:5-7`.
2. `/legal/[slug]` (`.../legal/[slug]/page.tsx:39-76`) is a closed set: `dynamicParams = false`
   and `generateStaticParams` returns exactly the 4 `LEGAL_PAGES` slugs, so any other slug 404s
   at the routing layer before `getLegalPage` even runs. Renders title, "last updated" date,
   a tab bar (`LegalNav`) to the other 3 documents, intro paragraph, then the shared prose
   blocks.
3. Linked from registration (`src/app/(frontend)/(auth)/register/page.tsx:127-131`, terms +
   privacy checkboxes) — see `registration.md` for the consent-recording side.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Route | `src/app/(frontend)/(marketing)/resources/blog/page.tsx` | Blog index |
| Route | `src/app/(frontend)/(marketing)/resources/blog/[slug]/page.tsx` | Article detail + `Article` JSON-LD |
| Route | `src/app/(frontend)/(marketing)/guides/page.tsx` | Guides lobby |
| Route | `src/app/(frontend)/(marketing)/guides/[slug]/page.tsx` | Guide detail + `HowTo` JSON-LD |
| Route | `src/app/(frontend)/(marketing)/legal/page.tsx` | Redirect → first legal doc |
| Route | `src/app/(frontend)/(marketing)/legal/[slug]/page.tsx` | Legal document (closed set, `dynamicParams = false`) |
| Layout | `src/app/(frontend)/(marketing)/layout.tsx:6-7` | `export const revalidate = 60` — shared ISR window for all of the above |
| Component | `src/components/marketing/{featured-article,article-card,article-carousel,article-hero,article-body,article-toc,article-sidebar-cta,author-bio,article-feedback,related-articles,share-buttons}.tsx` | Blog-specific presentation |
| Component | `src/components/marketing/{guide-hero,guide-explorer,guide-category-card,guide-popular-row,guide-help-card,guide-article-header,guide-prereqs,guide-body,guide-steps,guide-caution}.tsx` | Guide-specific presentation (`GuideExplorer` is the only client-filtering piece) |
| Component | `src/components/marketing/legal-nav.tsx` | Tab bar between the 4 legal docs (reads `LEGAL_PAGES` directly, not via a fetcher) |
| Component (shared) | `src/components/marketing/prose-blocks.tsx` (`ProseBlock`) | Single renderer for the 7 shared body-block types; consumed by `ArticleBody`, `GuideBody`, and directly by the legal page |
| Fetcher | `src/lib/posts.ts` | `getAllArticles · getArticle · getFeaturedArticle · getRelatedArticles`, all `cache()`-wrapped |
| Fetcher | `src/lib/guides.ts` | `getAllGuides · getGuide · getPopularGuides · getGuidesByCategory` |
| Fetcher | `src/lib/legal.ts` | `getLegalPage` (used) · `getLegalPages` (defined, **never imported** — dead, see §10) |
| Helper | `src/lib/post-content.ts` | `toRenderBlocks` (CMS block → `RenderBlock`, assigns heading anchors), `getTocItems`, `splitParagraphs` |
| Helper | `src/lib/guide-content.ts` | `toGuideRenderBlocks` (extends `RenderBlock` with `steps`/`caution`), `getGuideTocItems` |
| Constants | `src/lib/post-categories.ts` · `src/lib/guide-categories.ts` · `src/lib/legal-pages.ts` | Single source of truth for select options, consumed by both the Payload collection config and the frontend components |
| Seed/fallback | `src/lib/posts-defaults.ts` (4 posts) · `src/lib/guides-defaults.ts` (16 guides) · `src/lib/legal-defaults.ts` (4 docs) | Used both as one-time CMS seed data and as the runtime fallback when the CMS collection can't be reached (see §8) |
| Cross-domain | `src/lib/legal-consent.ts` | `LEGAL_VERSION` / `PARTNERSHIP_AGREEMENT_VERSION` — consumed by `registration-actions.ts`/`application-actions.ts` to write `LegalConsent` rows; not otherwise tied to the `legal-pages` collection (no version field on `LegalPage` yet, per the comment at `legal-consent.ts:19`) |
| CMS collection | `src/collections/Posts.ts` | `posts` — defines its body blocks **inline** (duplicated from `content-blocks.ts`, see comment at `content-blocks.ts:8-9`) |
| CMS collection | `src/collections/Guides.ts` | `guides` — body = `PROSE_BLOCKS` (shared) + `steps` + `caution` |
| CMS collection | `src/collections/LegalPages.ts` | `legal-pages` — body = `PROSE_BLOCKS` only, `slug` is a closed `select` sourced from `LEGAL_PAGES` |
| CMS collection (shared) | `src/collections/content-blocks.ts` | `PROSE_BLOCKS` — the 7 block types shared by Guides and LegalPages (Posts duplicates them, see above) |
| Manual type mirror | `src/payload-types.ts:571-777` | `PostBlock · Post · GuideBlock · Guide · LegalBlock · LegalPage` — hand-maintained, matches the collection configs as of this pass |
| Seed runner | `src/seed/seed.ts:150-193` | Creates each seed post/guide/legal doc **once** (checked by `where: { slug: { equals } }`), never overwrites existing CMS rows |
| Seed trigger | `src/app/(frontend)/dev/seed/route.ts` | `GET /dev/seed`, 404s outside `NODE_ENV=development` |
| Infra | `src/lib/payload.ts` | `getPayloadClient()` — Payload Local API singleton, used by every fetcher above inside a `try/catch` that returns `null` on failure |
| Infra | `src/lib/admin-preview.ts` | `previewBySlug("/resources/blog")` / `previewBySlug("/guides")` — "open on frontend" button in `/admin`, wired into `Posts.ts:23` and `Guides.ts:24` (not used by `LegalPages.ts`, which has no `admin.preview`) |

## 5. Data model

No Prisma models. Three Payload collections (Postgres, schema `payload` —
`src/payload.config.ts:71-75`), seeded/pushed via Payload's own dev-time `push` (not a
Prisma migration):

**`posts`** (`src/collections/Posts.ts:10-239`) — `title`, `slug` (unique, regex-validated
lowercase-kebab), `excerpt`, `category` (7-value `select`, options from `POST_CATEGORIES`),
`readingMinutes`, `publishedAt` (date, drives list sort), `featured` (bool — exactly one post
should be featured; see §8), `coverImage` (upload → `media`), `author` (group: name/role/avatar/
bio), `body` (blocks, 7 types: `lead · prose · heading · image · quote · keyPoints · callout ·
list` — 8 actually, see block list below), `seo` (optional metaTitle/metaDescription).

**`guides`** (`src/collections/Guides.ts:11-190`) — `title`, `slug` (unique, same validation),
`excerpt`, `category` (4-value `select` from `GUIDE_CATEGORIES`), `audience` (4-value `select`
from `GUIDE_AUDIENCES`), `readingMinutes`, `publishedAt`, `official`/`popular` (bools),
`stepsBadge` (optional override text), `intro`, `prerequisites` (array of `{text}`), `body`
(blocks: the 7 shared `PROSE_BLOCKS` + `steps` + `caution`), `nextGuideSlug` (plain text, **not**
a relationship — see §8), `seo`.

**`legal-pages`** (`src/collections/LegalPages.ts:13-69`) — `slug` (`select`, options
hard-coded from `LEGAL_PAGES` in `src/lib/legal-pages.ts:10-15`, unique — closed set of exactly
4: `accessibility · privacy · terms · cookies`), `title`, `intro` (optional), `body` (blocks =
`PROSE_BLOCKS` only), `seo`.

**Shared block vocabulary** (`PROSE_BLOCKS`, `src/collections/content-blocks.ts:11-116`):
`lead · prose · heading(h2|h3) · image · quote · keyPoints · callout · list(ordered?)`. Guides
add `steps` (array of `{title, body, ctaLabel?, ctaHref?}`) and `caution`
(`src/collections/Guides.ts:138-171`). Posts re-declare the same 8 shared types **inline**
inside `Posts.ts:115-227` instead of importing `PROSE_BLOCKS` — a second source of truth that
has to be kept in sync by hand (acknowledged in `content-blocks.ts:8-9`).

**Status/lifecycle:** none of the three collections has a draft/publish status field or
Payload's `versions`/draft config — every row in the collection is live and publicly readable
the instant it's saved in `/admin` (no "scheduled" or "draft" state to transition through).

**Fallback/seed data** (`posts-defaults.ts`, `guides-defaults.ts`, `legal-defaults.ts`) uses a
parallel, hand-written block type per content type (`PostSeedBlock`, not directly `PostBlock`)
that is cast (`as PostBlock[]` / `as unknown as GuideBlock[]`) rather than type-checked against
the real Payload block union — a seed block typo would not be caught by `tsc` against the CMS
shape, only against its own loosely-typed `PostSeedBlock`/`LegalSeedBlock` definition.

## 6. API contracts

None. All three are pure Server Component reads via the Payload **Local API**
(`payload.find(...)` in-process, no HTTP hop) — no `src/app/api/**` route exists for posts,
guides, or legal pages.

## 7. Guards & permissions

- **Read (site visitors):** `access: { read: () => true }` on all three collections — fully
  public, no auth, no app-level role check anywhere in the route tree (confirmed: no
  `requireActiveUser`/`roleKeys` reference in any of the 6 route files above).
- **Write (`/admin`):** only `read` is overridden; `create`/`update`/`delete` are left at
  Payload's default, which (for a collection with `auth: true` configured as `admin.user`)
  grants full access to **any** authenticated Payload `users` row. There is no field- or
  collection-level access control distinguishing editors from each other, and no role field on
  `Users` (`src/collections/Users.ts:18-24`) to build one on top of later without a schema
  change.
- **Legal slug validation:** enforced twice, redundantly but consistently — at the CMS layer
  (`select` field with a fixed option list) and at the route layer (`dynamicParams = false` +
  `generateStaticParams` returning only the 4 known slugs, so an unknown slug 404s before
  `getLegalPage` runs).

## 8. Known edge cases

- **Per-item CMS/seed fallback is inconsistent across the three content types.** `getArticle`/
  `getGuide` (`src/lib/posts.ts:154-162`, `src/lib/guides.ts:174-183`) only fall back to seed
  data wholesale, when the **entire** collection is empty (`docs?.length` check) — once a single
  post/guide exists in the CMS, a slug missing from the CMS 404s immediately with **no**
  per-item fallback to its seed definition, even though that seed still exists in code. By
  contrast `getLegalPage` (`src/lib/legal.ts:69-76`) falls back **per document**: each of the 4
  slugs independently checks the CMS first, then its own seed. Practical effect: after the
  one-time seed run, deleting a single post or guide row in `/admin` (instead of just not
  seeding it) permanently 404s that slug — including for internal links (e.g. a guide's
  `nextGuideSlug`, a homepage carousel entry) — while deleting one of the 4 legal docs silently
  reverts just that one document to its seed text. This asymmetry is easy to trip over
  operationally and isn't documented anywhere in code.
- **`nextGuideSlug` is free text, not a relationship** (`src/collections/Guides.ts:174-178`).
  A typo or a renamed/deleted target guide fails silently — `resolveNext`
  (`src/lib/guides.ts:141-148`) just returns `null` and the "next guide" sidebar link quietly
  disappears; no admin-side validation flags the broken reference.
- **`featured` on `posts` is an independent boolean per row, not a single-select/radio** — if an
  editor marks two posts `featured: true`, `getFeaturedArticle` (`src/lib/posts.ts:164-167`)
  silently takes whichever comes first in `-publishedAt` order; nothing prevents or surfaces the
  double-flag.
- **No sitemap.xml or robots.txt exists anywhere in the app** (`src/app/**` has no `sitemap.ts`/
  `robots.ts`). All three content types rely entirely on internal links + per-page canonical
  tags for discovery; likely belongs with `marketing-cms.md`/`public-index.md` (queue #20/#22,
  still `missing`) rather than being fixed here, but it directly undercuts the `Article`/`HowTo`
  JSON-LD already invested in these exact pages.
- Guide/article **"last updated" dates shown to visitors are Payload's auto-managed `updatedAt`**
  (bumped on *any* field save, including a typo fix), while the separate editor-set
  `publishedAt` field is what drives list sort order — editing one does not touch the other, so
  "sorted by publish date" and "last updated: …" can tell visibly different stories for the same
  document.

## 9. Tech debt / TODOs in code

- `src/app/(frontend)/(marketing)/layout.tsx:6` — explicit TODO: "בהמשך: on-demand revalidation
  דרך hook ב-Payload" (on-demand revalidation via a Payload hook, planned, not built). Today the
  only invalidation for all long-form content (and every other CMS-backed marketing page) is the
  blanket `revalidate = 60` on the whole `(marketing)` route group — a CMS save can take up to a
  minute to appear.
- `src/collections/Posts.ts:115-227` duplicates `PROSE_BLOCKS` inline instead of importing it
  from `content-blocks.ts`, acknowledged in the latter's own comment
  (`content-blocks.ts:8-9`: "תוכן חדש (Guides) צורך מכאן" — new content consumes from here,
  implying Posts predates the shared module and was never migrated).
- `src/lib/legal.ts:79-81` (`getLegalPages`) is dead code — grep confirms no importer anywhere
  in `src/`; `LegalNav` and the `/legal` index redirect both read the `LEGAL_PAGES` constant
  directly instead of going through this `cache()`-wrapped fetcher.
- `src/payload-types.ts` is hand-maintained (no working Payload CLI generator, per
  `CLAUDE.md` §"סביבה ובדיקות") — `PostBlock`/`Post`/`GuideBlock`/`Guide`/`LegalPage` currently
  match their collection configs, but any future field added to `Posts.ts`/`Guides.ts`/
  `LegalPages.ts`/`content-blocks.ts` without a matching manual edit here will silently type as
  `any`/missing rather than fail a build.

## 10. Findings for the team lead

1. **"Was this helpful?" collects nothing.** `ArticleFeedback` (`src/components/marketing/
   article-feedback.tsx:1-40`) is rendered on every article and every guide and visually looks
   like a feedback mechanism ("thank you for your feedback!" on click), but it is pure
   client-side `useState` — the thumbs-up/down click is never sent anywhere (no server action,
   no API call, no Prisma write). It's also unrelated to the real `ContentFeedback` Prisma model
   (used for contract-deliverable review notes, see `deliverables.md`) — anyone reading "feedback"
   in this codebase could reasonably assume the two are connected; they are not. If product
   actually wants to know whether content is helpful, nothing today records it.
2. **Deleting a single seeded post/guide in `/admin` permanently breaks that URL, with no
   recovery short of recreating it by hand** — see §8 first bullet. This is the kind of thing an
   editor would only discover by hitting the 404 themselves (e.g. via a stale homepage carousel
   link or a guide's "next guide" pointer), since nothing in `/admin` warns that the slug had a
   seed fallback that is now unreachable.
3. **Every Payload `/admin` login has unrestricted write access to all CMS content** (§7) — there
   is no concept of a restricted content-editor role versus a full admin inside the CMS, separate
   from (and with none of the protections of) the app's own RBAC system. Worth a deliberate
   decision rather than a default if `/admin` access is ever handed to someone outside the core
   team.
