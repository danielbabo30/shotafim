# Spec: CMS-backed marketing site (pages + globals)

> status: documented · updated: 2026-10-03 · owning agent: frontend-marketing

## 1. Business purpose

The public marketing site (home, how-it-works, contact, the three `/solutions/*` pages, plus the
header/footer shell and the dark side-panel on the auth screens) is editable by non-developers
through the Payload admin panel (`/admin`) instead of being hard-coded. Content editors change
headings, body copy, CTAs, stats and images for these pages without a deploy; layout, icons and
component structure stay fixed in code (CLAUDE.md §3). This spec covers the CMS infrastructure
itself (Payload config, the relevant `globals`/`collections`, their fetchers) and the marketing
pages that are *entirely* globals-driven. Long-form content (`posts`/`guides`/`legal-pages`) and
the public index/`/explore` page are separate features — see the "Completed specs" note below.

## 2. Roles involved

Two unrelated user systems:

- **Payload CMS users** (`src/collections/Users.ts:7-25`) — content editors who log into
  `/admin`. Separate table/auth system from the app's `User` (Auth.js). `auth: true`
  (`Users.ts:13`) is the only access control; there is no roles/permissions field, so every CMS
  user that can authenticate has full read/write on every global and collection (see §7).
- **Site visitors** — anyone, including logged-out — read every global/collection used here
  (`access: { read: () => true }` on all of them, e.g. `SiteSettings.ts:11-13`,
  `Homepage.ts:31-33`, `Media.ts:12-14`). No app `UserRole` gates any of this content.

## 3. User flow

**Editor side:**
1. Editor opens `/admin`, signs in (Payload's own session, `Users` collection), picks a global
   under the "עיצוב האתר" (site design) or "הגדרות אתר" (site settings) admin groups
   (`admin.group` on each global, e.g. `Homepage.ts:35`, `SiteSettings.ts:15`).
2. Edits tabbed fields (`type: "tabs"` — every page-global here uses one tab per page section).
3. Saves. Payload writes directly to Postgres (schema `payload`, separate from the app's Prisma
   `public` schema — `payload.config.ts:67-75`).
4. Editor clicks the "preview" link in the admin UI (`admin.preview`, e.g. `Homepage.ts:36`,
   wired through `previewPath()`/`previewBySlug()` in `src/lib/admin-preview.ts:12-20`) to open
   the live frontend page in a new tab and check the result.

**Visitor side:**
1. Visitor requests a marketing route. The route's Server Component calls one `cache()`-wrapped
   fetcher per global it needs (table in §4), in parallel via `Promise.all` (e.g.
   `src/app/(frontend)/(marketing)/page.tsx:17`, `contact/page.tsx:15-18`).
2. Each fetcher calls `payload.findGlobal({ slug, depth })` through the shared Local API client
   (`src/lib/payload.ts:6`) and merges the result over a hard-coded `*-defaults.ts` object field by
   field (so a half-filled global still renders something coherent) — see §5/§8 for the exact
   emptiness check each fetcher uses.
3. Marketing pages are statically generated with **time-based revalidation only**:
   `export const revalidate = 60` in `src/app/(frontend)/(marketing)/layout.tsx:7` — a saved CMS
   edit can take up to 60s to appear on the live site; there is no on-demand revalidation webhook
   yet (comment on the same line says this is planned).
4. `SiteHeader`/`SiteFooter` (rendered by the same layout, `layout.tsx:12,14`) call
   `getShellData()` (`src/lib/cms.ts:60-78`) once per request for `site-settings` +
   `main-navigation`, used across every page under this layout.

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| CMS bootstrap | `src/payload.config.ts:31-78` | Registers every collection/global below, Postgres adapter (`schemaName: "payload"`, `push` only in dev), Hebrew admin i18n |
| CMS client | `src/lib/payload.ts:6` | `getPayloadClient()` — shared Local API instance for every fetcher |
| Admin panel route | `src/app/(payload)/admin/[[...segments]]/page.tsx`, `src/app/(payload)/layout.tsx:1-30` | Payload-generated admin UI mount — "do not add app logic here" |
| Admin API | `src/app/(payload)/api/[...slug]/route.ts`, `.../graphql/route.ts` | Payload's REST/GraphQL API (used by the admin UI itself) |
| Preview helper | `src/lib/admin-preview.ts:7-20` | `previewPath()`/`previewBySlug()` — builds the "open in frontend" link shown in the admin editor |
| Global: site shell | `src/globals/SiteSettings.ts`, `src/globals/MainNavigation.ts` | Logo, site name, auth button labels/links (§6), footer columns/newsletter/legal links, nav items |
| Fetcher: site shell | `src/lib/cms.ts:21-78` | `getShellData()` — merges both globals + `cms-defaults.ts` |
| Global: company info | `src/globals/CompanyInfo.ts` | Single source of truth for legal name, email/phone/WhatsApp, address/hours, socials |
| Fetcher: company info | `src/lib/company-info.ts:14-48` | `getCompanyInfo()` + `supportEmail()`/`telHref()`/`whatsappHref()` helpers |
| Global: homepage | `src/globals/Homepage.ts` | Hero, stats, 3 role cards (brand/influencer/space), escrow steps, articles-strip toggle |
| Fetcher: homepage | `src/lib/homepage.ts:14-39`, defaults `src/lib/homepage-defaults.ts` | `getHomepageData()` |
| Route: homepage | `src/app/(frontend)/(marketing)/page.tsx:16-42` | Renders `Hero`/`StatsBar`/`RoleCards`/`EscrowSteps`/`ArticleCarousel`; article strip also depends on `getAllArticles()` from `src/lib/posts.ts` (posts feature) |
| Global: how-it-works | `src/globals/HowItWorks.ts` | Hero, 4-step timeline, old-way/new-way comparison table, FAQ |
| Fetcher/route | `src/lib/how-it-works.ts`, defaults `how-it-works-defaults.ts`; `src/app/(frontend)/(marketing)/how-it-works/page.tsx` | — |
| Global: contact | `src/globals/ContactPage.ts` | Hero, form copy (+ `form.note` explicitly documents the form as non-functional, `ContactPage.ts:76-84`), contact-card heading/note |
| Fetcher/route | `src/lib/contact.ts:14-37`, defaults `contact-defaults.ts`; `src/app/(frontend)/(marketing)/contact/page.tsx:14-43` | Combines `getContactData()` + `getCompanyInfo()` |
| Form UI (no backend) | `src/components/marketing/contact-form.tsx:20-125` | Client component; `onSubmit` just calls `setSent(true)`, comment at line 58: `// TODO: חיבור למערכת פניות` |
| Globals: solutions pages (×3) | `src/globals/SolutionsBrands.ts`, `SolutionsCreators.ts`, `SolutionsAdSpaces.ts` | Identical shape per page: hero, stats, feature showcase, workflow steps, CTA banner |
| Fetchers/routes (×3) | `src/lib/solutions-{brands,creators,ad-spaces}.ts` + matching `*-defaults.ts`; `src/app/(frontend)/(marketing)/solutions/{brands,creators,ad-spaces}/page.tsx` | Same merge pattern as homepage (see `solutions-brands.ts:14-47` as the representative example) |
| Global: auth side-panel | `src/globals/AuthPanel.ts` | Dark panel copy/metric/testimonial shown beside the registration form |
| Consumer | `src/components/auth/auth-split-screen.tsx` (used by `src/app/(frontend)/(auth)/register/page.tsx`) | **Not** used by `/sign-in` — pre-existing drift documented in `docs/spec/auth.md` §10, unrelated to this spec's own findings |
| Global: register-roles copy | `src/globals/RegisterRoles.ts` | Headings + 3 role-card copy (brand/creator/space) for `/register/roles`; role *logic* is in `docs/spec/registration.md` |
| Consumer | `src/app/(frontend)/(auth)/register/roles/page.tsx` | — |
| Collection: media | `src/collections/Media.ts:6-32` | Upload collection backing every `relationTo: "media"` field above (logo, avatars, testimonial photo) |
| Collection: categories | `src/collections/Categories.ts:12-101` | Domain taxonomy (brand/creator/space categories); not rendered by any page in this spec, but registered in the same `payload.config.ts` — see `docs/spec/marketplace.md` for its consumers |
| Collection: CMS users | `src/collections/Users.ts:7-25` | Payload-auth editors; see §2 |
| Shell components | `src/components/marketing/site-header.tsx` (19 lines), `site-nav.tsx` (242 lines), `header-auth-actions.tsx:14-48`, `site-footer.tsx` (65 lines), `logo.tsx`, `newsletter-form.tsx` | Render `ShellData` from `getShellData()`; `HeaderAuthActions` is a client island that fetches `/api/auth/session` itself rather than receiving server-known auth state (see §8) |
| Defaults (seed + fallback) | `src/lib/cms-defaults.ts`, `homepage-defaults.ts`, `how-it-works-defaults.ts`, `contact-defaults.ts`, `company-info-defaults.ts`, `solutions-*-defaults.ts` | Used both as the runtime fallback when a global is empty/unreachable, and as `npm run db:seed` initial values (per file header comments) |

Not in this spec's scope (separate queue items, same `payload.config.ts`/`src/app/(frontend)/(marketing)/**` tree): `src/collections/{Posts,Guides,LegalPages,content-blocks}.ts` and
`guides/[slug]`, `resources/blog/[slug]`, `legal/[slug]` routes → long-form content; `explore/page.tsx` → public index.

## 5. Data model

Not Prisma — every model here is a Payload **global** (singleton, no `id` list) or **collection**,
stored in the Postgres `payload` schema (separate from the app's `public` schema used by Prisma;
`payload.config.ts:72-74`). There are no enums or status transitions in this feature — all content
fields are text/textarea/array/group/upload, no workflow state.

| Slug | Kind | Defined at | Notes |
| --- | --- | --- | --- |
| `site-settings` | global | `SiteSettings.ts:9` | branding, `auth.{personalAreaUrl,loginUrl,signupUrl,loginLabel,signupLabel,loggedInLabel}` (`:49-96`), footer |
| `main-navigation` | global | `MainNavigation.ts:10` | `items[]`, each `link` or `dropdown` with `children[]` |
| `company-info` | global | `CompanyInfo.ts:20` | contact + social; `SOCIAL_PLATFORMS` const (`:10-17`) drives the `social.platform` select |
| `homepage` | global | `Homepage.ts:29` | see §4 |
| `how-it-works` | global | `HowItWorks.ts:11` | see §4 |
| `contact-page` | global | `ContactPage.ts:11` | see §4 |
| `solutions-brands` / `solutions-creators` / `solutions-ad-spaces` | global | `SolutionsBrands.ts:20` et al. | identical shape, three instances |
| `auth-panel` | global | `AuthPanel.ts:11` | see §4 |
| `register-roles` | global | `RegisterRoles.ts:31` | see §4 |
| `media` | collection (upload) | `Media.ts:6` | `imageSizes`: `thumbnail` (300w), `medium` (900w) (`:17-20`) |
| `categories` | collection | `Categories.ts:12` | out of scope here, see §4 note |
| `users` | collection (auth) | `Users.ts:7` | CMS editors |

**Manual type mirror risk (CLAUDE.md, "ה-CLI של Payload שבור"):** every type consumed above
(`Homepage`, `SiteSetting`, `MainNavigation`, `ContactPage`, `SolutionsBrands`, `CompanyInfo`,
`AuthPanel`, `RegisterRoles`, `Media`, …) comes from `src/payload-types.ts`, which is **hand
maintained**, not generated (`cms:types` script exists in `package.json:21` but is documented as
broken). Every field added to a global/collection file in `src/globals/`/`src/collections/` must be
mirrored there by hand or the fetcher's TS types silently drift from the real schema — every
global file's own header comment repeats this (e.g. `Homepage.ts:7`, `ContactPage.ts:7`).

## 6. API contracts

No bespoke app API routes for this feature. Payload's own generic REST/GraphQL API is mounted at
`src/app/(payload)/api/[...slug]/route.ts` and `.../graphql/route.ts` (used internally by the
`/admin` UI). All frontend reads go through the **Local API** (`getPayloadClient()` →
`payload.findGlobal({ slug, depth })`), not HTTP — see fetchers in §4. There is no public JSON API
for this content and no write endpoint reachable from the public site (the contact form and
newsletter form in §4 don't call any endpoint at all — see §9).

## 7. Guards & permissions

- **Read:** every global/collection in scope declares `access: { read: () => true }` — fully
  public, no auth check (e.g. `SiteSettings.ts:11-13`, `Media.ts:12-14`, `Categories.ts:18-20`).
- **Write:** none of them override `create`/`update`/`delete` in `access`, so Payload's default
  applies — any authenticated `users` (Payload) session can write. Since `Users.ts` has no
  roles/permissions field, this means **every CMS user has unrestricted write access to every
  global and collection**, including ones outside their own area (e.g. a content writer could
  edit `site-settings.auth.signupUrl` or delete `media` used elsewhere). No field-level or
  document-level access control exists anywhere in this collection/global set.
- **Admin panel access itself** is gated only by Payload's own `Users` auth (`auth: true`,
  `Users.ts:13`) — unrelated to the app's `requireAdmin()`/RBAC system documented in
  `docs/spec/rbac-guards.md` (different `User` table entirely, see §2).
- Visitor-facing routes (`/`, `/how-it-works`, `/contact`, `/solutions/*`) have no auth/role gate
  of their own — they're public marketing pages, consistent with `src/proxy.ts`'s
  `PROTECTED_PREFIXES` not including any of them.

## 8. Known edge cases

- **Empty-global detection is inconsistent in strictness but consistent in shape:** every fetcher
  treats the global as "not yet filled in" by checking only one required leaf field
  (`!data?.hero?.headingLead`, e.g. `homepage.ts:23`, `contact.ts:23`, `solutions-brands.ts:23`;
  `company-info.ts:22` uses `!data?.legalName`) and falls back to the *entire* defaults object —
  it does not fall back field-by-field for a *partially* filled global past that first check
  (array fields are defaulted individually afterward, e.g. `homepage.ts:27`, but scalar groups are
  shallow-merged, e.g. `hero: { ...DEFAULT_HOMEPAGE.hero, ...data.hero }` at `homepage.ts:26`, so
  an empty-string value saved on purpose — as opposed to `undefined` — would NOT be replaced by the
  default, since `""` is truthy for the `||` checks only where used, but here it's a spread merge,
  so an explicit empty string in a non-required text field passes through as `""`).
- **`HeaderAuthActions` renders logged-out UI first, every time.** It's a client component that
  starts with `loggedIn === null` and only shows the "personal area" button once a `useEffect`
  fetch to `/api/auth/session` resolves (`header-auth-actions.tsx:15-26`); `null` falls through to
  the logged-out branch (`:28` only matches `true`). A returning signed-in visitor always sees a
  flash of "התחברות / הרשמה למערכת" before it swaps to "האזור האישי" — by design, per the comment
  at `header-auth-actions.tsx:10-12` (kept client-side "so pages stay static for SEO"), but it is a
  visible flash on every navigation, not just first load, since the header remounts per route.
- **`solutions-*` fetchers and `homepage`/`how-it-works`/`contact` all independently re-implement
  the same merge pattern** (no shared helper) — a bug fixed in one (e.g. the empty-global check) is
  not automatically fixed in the other five.

## 9. Tech debt / TODOs in code

- `src/components/marketing/contact-form.tsx:16,58` — "כרגע UI בלבד. אין שליחה אמיתית ואין שמירה" /
  `// TODO: חיבור למערכת פניות` — the contact form has no backend at all; `setSent(true)` is the
  entire "submit" handler.
- `src/components/marketing/newsletter-form.tsx:9,31` — same pattern: `// TODO: חיבור לספק דיוור`,
  no email-provider integration.
- `src/app/(frontend)/(marketing)/layout.tsx:5-6` — "בהמשך: on-demand revalidation דרך hook ב-
  Payload" — cache invalidation is purely the 60s ISR window (`revalidate = 60`, same file line 7);
  grepping `src/payload.config.ts` and every file in `src/globals/`/`src/collections/` confirms
  there are no `hooks:` blocks anywhere in this CMS config, so no `afterChange` hook triggers
  revalidation today.
- No `sitemap.ts`/`robots.ts` found under `src/app/` — a CMS-driven marketing site with no sitemap
  is a discoverability gap, though not called out by any TODO in code.

## 10. Findings for the team lead

1. **`SiteSettings.auth.signupUrl` field default contradicts the app's own fallback default, and
   would silently misroute new users.** The Payload field default is `"/sign-in"`
   (`SiteSettings.ts:68-73`), but the code-level fallback used by `getShellData()` when the field
   is unset is `"/register"` (`src/lib/cms-defaults.ts:11`). `/sign-in` is sign-in only — it has no
   registration flow (`src/app/(frontend)/(auth)/sign-in/page.tsx`, confirmed against
   `docs/spec/registration.md`). Today this doesn't matter because no one has saved the "כניסה
   ואיזור אישי" tab yet, so `settings?.auth` is `undefined` and `DEFAULT_AUTH` (`/register`) wins
   entirely (`src/lib/cms.ts:68`). But the moment any editor opens that tab in `/admin` and saves —
   even without touching `signupUrl` — Payload will persist its own field default (`"/sign-in"`)
   for that sub-field, `settings.auth` becomes a defined (partial) object, and the shallow merge
   `{ ...DEFAULT_AUTH, ...(settings?.auth ?? {}) }` (`cms.ts:68`) then prefers the CMS value — so
   every "הרשמה למערכת" button sitewide (header + footer: `site-nav.tsx:148`,
   `header-auth-actions.tsx:43`) would start pointing new users at the sign-in page instead of
   registration, with no error or warning anywhere. Recommend changing the field's `defaultValue`
   at `SiteSettings.ts:72` to `"/register"` to match `DEFAULT_AUTH`.
2. **Every CMS editor account has unrestricted write access to all CMS content** (§7) — there is
   no roles/permissions model on the `users` collection, so any content-editor credential can also
   rewrite `site-settings.auth.*` links, delete shared `media`, or edit pages outside their remit.
   Likely fine for a single-admin pre-launch stage, but worth a deliberate decision before more
   editors are onboarded, not a default that was explicitly chosen.
3. **Both public-facing forms on this site (contact form, newsletter signup) are non-functional
   UI** (§9) — a visitor who submits either gets a convincing "success" state
   (`contact-form.tsx:38-52`, `newsletter-form.tsx:29`) but nothing is sent, stored or logged
   anywhere. This is flagged in the code itself but worth surfacing in case anyone assumes contact
   requests are reaching someone.
