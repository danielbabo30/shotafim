# Code Map — where is what

> updated: 2026-09-11 · maintained by: systems-analyst. Update on any structural change.

## Skeleton

| Domain | Key folders |
| --- | --- |
| Marketing site + public index | `src/app/(frontend)/(marketing)/**` · `src/components/marketing/**` · `src/components/ui/**` |
| Private area | `src/app/(frontend)/(app)/dashboard/**` · `src/components/app/**` |
| Registration + auth | `src/app/(frontend)/(auth)/**` · `src/components/auth/**` · `src/app/api/auth/[...nextauth]/**` · `src/lib/{app-user,auth-helpers,registration,admin-guard}.ts` |
| Guards / RBAC (cross-cutting, see `rbac-guards.md`) | `src/proxy.ts` (Next.js 16's renamed `middleware.ts` — edge cookie check) · `src/lib/{app-user,admin-guard,registration}.ts` · per-file `load<Resource>Owned` helpers inside `src/lib/actions/*.ts` |
| CMS (Payload) | `src/collections/**` · `src/globals/**` · `src/app/(payload)/**` · `src/lib/{cms,payload}.ts` |
| Data | `prisma/schema.prisma` · `prisma/migrations/**` · `prisma/seed/**` · `src/seed/**` · `src/payload-types.ts` (manual!) |
| Money | models `EscrowHold/Transaction/Invoice/AdSpaceBooking/PayoutCheckpoint` · `src/lib/reports.ts` · `src/app/api/cron/{reconcile,checkpoints}/**` |
| Partnerships + tracking | `src/lib/track/**` · `src/lib/partner-*.ts` · `src/lib/plugin-*.ts` · `src/app/api/{track,plugin}/**` · `wp-plugin/**` |
| Data seeding | `src/app/(frontend)/dev/**` (seed routes) · `npm run db:seed` |

## Fetchers by domain (`src/lib/`, all wrapped in `cache()`)

- **Dashboards:** `dashboard-brand · dashboard-creator · dashboard-space · admin-dashboard · partner-dashboard`
- **Campaigns:** `campaigns · campaign-brief · applications · pitch`
- **Marketplace:** `marketplace · marketplace-query · creator-profile · my-ad-spaces · ad-spaces · ad-space-schedule · ad-space-asset-form`
- **Contracts:** `contracts · contract-room · deliverable-upload · reviews · review-form`
- **Messaging/disputes:** `messages · disputes`
- **Partners:** `partner-program · partner-codes · partner-constants · partner-terms · partner-deposit · partner-dashboard · plugin-connection · plugin-form · qr`
- **CMS/content:** `homepage · posts · guides · legal · legal-pages · solutions-* · how-it-works · contact · company-info · cms · site` (+ `*-defaults.ts`)
- **Infra:** `app-user · app-nav · auth-helpers · admin-guard · prisma · payload · email · storage · cities · partner-categories-query · legal-consent · registration*`

## Server actions (`src/lib/actions/`)
`ad-space · app · application · campaign · contract · dispute · message · partner · plugin · registration · review`

## API routes (`src/app/api/`)
`auth/[...nextauth]` · `track/{click,order,order-status,digest}` · `plugin/{heartbeat,deactivated}` · `plugin-download` · `contract-files/[attachmentId]` · `cron/{reconcile,monitor,checkpoints}`

## Useful grep terms
- role guard: `requireActiveUser` · `requireAdmin` · `roleKeys` · `activeRole` · `redirect("/dashboard")`
- ownership guard: `loadOwned` · `findFirst.*userId` · `owner: { userId` (per-resource scoping convention, see `rbac-guards.md` §3)
- DB writes: `prisma.$transaction` · `.create(` · `.update(`
- plugin auth: `src/lib/track/{crypto,auth}.ts` · `hmac` · `siteSecret`
- enums: `prisma/schema.prisma` (search `enum ` + name) · manual mirror in `src/payload-types.ts`

## Notes from specced features (see the feature's spec for detail)

- **`src/proxy.ts`, not `middleware.ts`.** Next.js 16 renamed Middleware to Proxy — same file
  convention/purpose, new name and filename. Don't search for `middleware.ts`, it doesn't exist
  in this codebase. It's an *optimistic* cookie-presence check only, not an authorization
  boundary — see `rbac-guards.md` §3/§8.
- **No shared `requireRole(key)` or ownership-scoped generic fetcher exists.** Every page/action
  hand-rolls its own `roleKeys.includes(...)` check and its own `findFirst`-scoped-by-`userId`
  ownership lookup. The one shared role-check function, `requireAdmin` (`src/lib/admin-guard.ts`),
  is currently used only by the dispute-arbitration screens. `src/lib/auth-helpers.ts`
  (`requireUser`/`requireRole`) is a dead, weaker duplicate — don't use it. Full detail:
  `rbac-guards.md`.

## Commands
`npm run dev` · `npm run typecheck` · `npm run lint` · `npm run format` · `npm run build` · `npm run db:migrate` · `npm run db:seed` · `npm run plugin:build`
