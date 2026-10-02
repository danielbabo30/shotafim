# Code Map — where is what

> updated: 2026-10-02 · maintained by: systems-analyst. Update on any structural change.

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

- **Dashboards:** `dashboard-brand · dashboard-creator · dashboard-space · admin-dashboard · partner-dashboard` — note `partner-dashboard` is *not* an admin surface despite the name: it's the per-contract revenue-share metrics view shown to the business/provider themselves inside their own contract room, gated by ownership not `requireAdmin()`. See `docs/spec/admin-dashboard.md` §4.
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
- dead/unimplemented features: grep the model name in lowercase-first form (e.g. `proofOfPlay\.`) across `src/` before trusting a schema model has a real write path — `ProofOfPlay` and `src/lib/auth-helpers.ts`'s guards are both confirmed-dead as of this pass

## Notes from specced features
- **Admin surface is `/dashboard` + `/dashboard/disputes/**`, not a dedicated `/dashboard/admin/**`
  route.** `requireAdmin()` (`src/lib/admin-guard.ts`) now has 5 call sites (grown from the 2 that
  `rbac-guards.md` documented): the 2 dispute pages plus `resolveDispute`/`issueEnforcement`/
  `resolveAnomalyFlag` in `src/lib/actions/dispute-actions.ts`. The `/dashboard` landing page
  itself reaches its `AdminDashboard` branch with **no explicit admin check** (an `else` after
  ruling out brand/space/creator) — see `docs/spec/admin-dashboard.md` §8. One admin-gated action,
  `triggerPayoutCheckpoint` (`src/lib/actions/partner-actions.ts`), hand-rolls its own check
  instead of reusing `requireAdmin()`, and has no UI caller anywhere.
- **No profile-verification or general user-management UI exists**, despite the admin sidebar
  nav (`src/lib/app-nav.ts`) already linking to `/dashboard/verifications` — that route doesn't
  exist (404). `VerificationStatus`/`ProfileStatus` have zero writers anywhere in `src/`. Full
  detail: `docs/spec/admin-dashboard.md` §5/§8/§10.
- **`src/proxy.ts`, not `middleware.ts`.** Next.js 16 renamed Middleware to Proxy — same file convention/purpose, new filename. It's an *optimistic* cookie-presence check only (`PROTECTED_PREFIXES`: `/dashboard`, `/register/{roles,profile,complete}` — bare `/register` is deliberately excluded), not an authorization boundary; the real DB-backed check is `requireActiveUser()` in `(app)/layout.tsx` and in nearly every individual page/action. See `docs/spec/auth.md` §3/§7 and `docs/spec/rbac-guards.md` §3.
- **No shared `requireRole(key)` or ownership-scoped generic fetcher exists anywhere.** Every page/action hand-rolls its own `roleKeys.includes(...)` check and its own `findFirst`-scoped-by-`userId` ownership lookup. `requireAdmin()` is the only shared, reusable role-check function, and it's used in exactly two places (disputes). Full detail: `docs/spec/rbac-guards.md`.

## Commands
`npm run dev` · `npm run typecheck` · `npm run lint` · `npm run format` · `npm run build` · `npm run db:migrate` · `npm run db:seed` · `npm run plugin:build`
