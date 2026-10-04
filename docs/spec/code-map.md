# Code Map — where is what

> updated: 2026-10-04 · maintained by: systems-analyst. Update on any structural change.

## Skeleton

| Domain | Key folders |
| --- | --- |
| Marketing site + public index | `src/app/(frontend)/(marketing)/**` · `src/components/marketing/**` · `src/components/ui/**` |
| Private area | `src/app/(frontend)/(app)/dashboard/**` · `src/components/app/**` |
| Registration + auth | `src/app/(frontend)/(auth)/**` (`register`, `register/roles`, `register/profile`, `register/complete`, `sign-in`) · `src/components/auth/**` · `src/app/api/auth/[...nextauth]/**` · `src/auth.ts` (Auth.js v5 config) · `src/proxy.ts` (edge/optimistic gate — see Guards row below) · `src/lib/{app-user,auth-helpers,admin-guard,registration,registration-schema}.ts` · `src/lib/actions/registration-actions.ts` — see `docs/spec/auth.md` + `docs/spec/registration.md` |
| Guards / RBAC (cross-cutting — see `rbac-guards.md`) | No single system; per-file `roleKeys.includes(...)` checks + per-file `load<Resource>Owned`/`Party` ownership helpers inside `src/lib/actions/*.ts`. Only shared reusable guard: `requireAdmin()` (`src/lib/admin-guard.ts`). Dead duplicate: `src/lib/auth-helpers.ts` (`requireUser`/`requireRole` — unused, don't reach for it) |
| CMS (Payload) | `src/collections/**` · `src/globals/**` · `src/app/(payload)/**` · `src/lib/{cms,payload}.ts` |
| Data | `prisma/schema.prisma` · `prisma/migrations/**` · `prisma/seed/**` · `src/seed/**` · `src/payload-types.ts` (manual!) |
| Money | models `EscrowHold/Transaction/Invoice/AdSpaceBooking/PayoutCheckpoint` · `src/lib/reports.ts` · `src/app/api/cron/{reconcile,checkpoints}/**` |
| Partnerships + tracking | `src/lib/track/**` · `src/lib/partner-*.ts` · `src/lib/plugin-*.ts` · `src/app/api/{track,plugin}/**` · `wp-plugin/**` |
| Data seeding | `src/app/(frontend)/dev/**` (seed routes) · `npm run db:seed` |

## Fetchers by domain (`src/lib/`, all wrapped in `cache()`)

- **Dashboards:** `dashboard-brand · dashboard-creator · dashboard-space · admin-dashboard · partner-dashboard`
- **Campaigns:** `campaigns · campaign-brief · applications · pitch` — campaign brief/wizard detail in `docs/spec/campaigns.md`; pitches/invites detail in `docs/spec/applications.md`
- **Marketplace:** `marketplace · marketplace-query · creator-profile · my-ad-spaces · ad-spaces · ad-space-schedule · ad-space-asset-form` — see `docs/spec/marketplace.md`
- **Contracts:** `contracts · contract-room · deliverable-upload · reviews · review-form` — contract lifecycle in `docs/spec/contracts.md`; deliverables/submissions/feedback sub-domain in `docs/spec/deliverables.md`
- **Messaging/disputes:** `messages · disputes`
- **Partners:** `partner-program · partner-codes · partner-constants · partner-terms · partner-deposit · partner-dashboard · plugin-connection · plugin-form · qr`
- **CMS/content:** `homepage · posts · guides · legal · legal-pages · solutions-* · how-it-works · contact · company-info · cms · site` (+ `*-defaults.ts`)
- **Infra:** `app-user · app-nav · auth-helpers · admin-guard · prisma · payload · email · storage · cities · partner-categories-query · legal-consent · registration*`

## Server actions (`src/lib/actions/`)
`ad-space · app · application · campaign · contract · dispute · message · partner · plugin · registration · review · settings`
(`settings-actions.ts` owns all creator/space-owner profile, channel, pricing-package and image writes — see `docs/spec/marketplace.md`)

## API routes (`src/app/api/`)
`auth/[...nextauth]` · `track/{click,order,order-status,digest}` · `plugin/{heartbeat,deactivated}` · `plugin-download` · `contract-files/[attachmentId]` · `cron/{reconcile,monitor,checkpoints}`

## Deliverables / submissions / feedback (contract sub-domain — see `docs/spec/deliverables.md`)
`src/components/app/contract-room/deliverable-proofer.tsx` (submission viewer + feedback UI, all parties) ·
`src/lib/{contracts,contract-room,deliverable-upload}.ts` (fetcher + pure helpers) ·
`src/lib/actions/contract-actions.ts` (`submitDeliverable · addFeedback · toggleFeedbackResolved · requestRevision · approveAndRelease`) ·
`src/lib/storage.ts` (local-disk driver only — `blob` driver unimplemented) ·
`src/app/api/contract-files/[attachmentId]/route.ts` (authenticated file serving).
`ProofOfPlay`/`ProofType` (ad-space "proof it broadcast") is schema-only — no create path exists anywhere; see `docs/spec/deliverables.md` §10.

## Useful grep terms
- role guard: `requireActiveUser` · `requireAdmin` · `roleKeys` · `activeRole` · `redirect("/dashboard")` — watch for pages that check `roleKeys` where `activeRole` may be intended, or that skip a role check altogether (see `docs/spec/marketplace.md` §10, `docs/spec/rbac-guards.md` §10)
- ownership guard: `loadOwned` · `findFirst.*userId` · `owner: { userId` (per-resource scoping convention, hand-rolled per file — see `docs/spec/rbac-guards.md` §3)
- registration: `saveRoles` · `completeRegistration` · `requireRegistrationUser` · `RegistrationRoleKey` · `parseRegistration`
- applications/pitches: `CampaignApplication` · `ApplicationStatus` · `INVITED` · `invitedByUserId` · `TARGET_TYPES_FOR_ROLE` (`src/lib/pitch.ts`)
- campaign status transitions: `prisma.campaign.update` (only 2 call sites outside creation — accept-application flow → `IN_PROGRESS`, contract completion → `COMPLETED`; `CANCELLED` and draft→publish have no writer at all, see `docs/spec/campaigns.md` §10)
- contract lifecycle: `ContractStatus` · `loadContractParty` · `loadOwnedContract` · `fundEscrow` / `fundPartnerDeposit` (two funding paths, one `Contract.status` — see `docs/spec/contracts.md` §10)
- DB writes: `prisma.$transaction` · `.create(` · `.update(`
- plugin auth: `src/lib/track/{crypto,auth}.ts` · `hmac` · `siteSecret`
- enums: `prisma/schema.prisma` (search `enum ` + name) · manual mirror in `src/payload-types.ts`
- dead/unimplemented features: grep the model name in lowercase-first form (e.g. `proofOfPlay\.`) across `src/` before trusting a schema model has a real write path — `ProofOfPlay`, `src/lib/auth-helpers.ts`'s guards, and `getLegalPages()` (`src/lib/legal.ts` — unused, `LegalNav` reads `LEGAL_PAGES` directly) are all confirmed-dead as of this pass

## Long-form content (posts / guides / legal — see `docs/spec/content-long.md`)
Pure Payload CMS, no Prisma involvement, no API routes (Local API only), fully public read
(`access: { read: () => true }` on all three). Shared body-block vocabulary:
`src/collections/content-blocks.ts` (`PROSE_BLOCKS`, 8 types) is the source of truth consumed by
`Guides.ts`/`LegalPages.ts`; `Posts.ts` duplicates the same 8 types **inline** instead of
importing it — second source of truth, kept in sync by hand. Rendering: one shared
`ProseBlock` (`src/components/marketing/prose-blocks.tsx`) used by `ArticleBody`/`GuideBody`/the
legal page directly; guides add `GuideSteps`/`GuideCaution` on top. Normalization
(CMS block → render-ready block, stable heading/step anchors) happens server-side in
`src/lib/post-content.ts` / `src/lib/guide-content.ts`, consumed by `src/lib/{posts,guides,
legal}.ts`. Seed + runtime-fallback data lives in `*-defaults.ts` per type, loaded once by
`src/seed/seed.ts` via the dev-only `GET /dev/seed` route — **the Posts/Guides fallback is
all-or-nothing per collection** (falls back to seed only when the whole collection is empty),
while **legal falls back per-document** — an inconsistency, see `content-long.md` §8/§10.
CMS write access is flat: no role field on the Payload `users` collection, so every `/admin`
login can edit every collection/global, unlike the app's own RBAC.

## Notes from specced features
- **`src/proxy.ts`, not `middleware.ts`.** Next.js 16 renamed Middleware to Proxy — same file convention/purpose, new filename. It's an *optimistic* cookie-presence check only (`PROTECTED_PREFIXES`: `/dashboard`, `/register/{roles,profile,complete}` — bare `/register` is deliberately excluded), not an authorization boundary; the real DB-backed check is `requireActiveUser()` in `(app)/layout.tsx` and in nearly every individual page/action. See `docs/spec/auth.md` §3/§7 and `docs/spec/rbac-guards.md` §3.
- **No shared `requireRole(key)` or ownership-scoped generic fetcher exists anywhere.** Every page/action hand-rolls its own `roleKeys.includes(...)` check and its own `findFirst`-scoped-by-`userId` ownership lookup. `requireAdmin()` is the only shared, reusable role-check function, and it's used in exactly two places (disputes). Full detail: `docs/spec/rbac-guards.md`.

## Commands
`npm run dev` · `npm run typecheck` · `npm run lint` · `npm run format` · `npm run build` · `npm run db:migrate` · `npm run db:seed` · `npm run plugin:build`
