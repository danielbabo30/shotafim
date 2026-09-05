# Code Map — where is what

> updated: 2026-09-05 · maintained by: systems-analyst. Update on any structural change.

## Skeleton

| Domain | Key folders |
| --- | --- |
| Marketing site + public index | `src/app/(frontend)/(marketing)/**` · `src/components/marketing/**` · `src/components/ui/**` |
| Private area | `src/app/(frontend)/(app)/dashboard/**` · `src/components/app/**` |
| Registration + auth | `src/app/(frontend)/(auth)/**` · `src/components/auth/**` · `src/app/api/auth/[...nextauth]/**` · `src/lib/{app-user,auth-helpers}.ts` |
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
- role guard: `requireActiveUser` · `roleKeys` · `activeRole` · `redirect("/dashboard")`
- DB writes: `prisma.$transaction` · `.create(` · `.update(`
- plugin auth: `src/lib/track/{crypto,auth}.ts` · `hmac` · `siteSecret`
- enums: `prisma/schema.prisma` (search `enum ` + name) · manual mirror in `src/payload-types.ts`
- NextAuth config/session shape: `src/auth.ts` · `src/types/next-auth.d.ts`
- ⚠️ dead guard, do not reuse: `src/lib/auth-helpers.ts` (`requireUser`/`requireRole` —
  unused, skips onboarding/suspension checks that `requireActiveUser` enforces; see
  `auth.md` §9-10)

## Commands
`npm run dev` · `npm run typecheck` · `npm run lint` · `npm run format` · `npm run build` · `npm run db:migrate` · `npm run db:seed` · `npm run plugin:build`
