# Code Map — where is what

> updated: 2026-09-16 · maintained by: systems-analyst. Update on any structural change.

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

## Deliverables / submissions / feedback (contract sub-domain)
`src/components/app/contract-room/deliverable-proofer.tsx` (submission viewer + feedback UI, all parties) ·
`src/lib/{contracts,contract-room,deliverable-upload}.ts` (fetcher + pure helpers) ·
`src/lib/actions/contract-actions.ts` (`submitDeliverable · addFeedback · toggleFeedbackResolved · requestRevision · approveAndRelease`) ·
`src/lib/storage.ts` (local-disk only — blob driver unimplemented) ·
`src/app/api/contract-files/[attachmentId]/route.ts` (authenticated file serving).
`ProofOfPlay`/`ProofType` (ad-space "proof it broadcast") is schema-only — no create path exists anywhere; see [`deliverables.md`](deliverables.md) §10.

## Useful grep terms
- role guard: `requireActiveUser` · `roleKeys` · `activeRole` · `redirect("/dashboard")`
- DB writes: `prisma.$transaction` · `.create(` · `.update(`
- plugin auth: `src/lib/track/{crypto,auth}.ts` · `hmac` · `siteSecret`
- enums: `prisma/schema.prisma` (search `enum ` + name) · manual mirror in `src/payload-types.ts`
- dead/unimplemented features: grep the model name in lowercase-first form (e.g. `proofOfPlay\.`) across `src/` before trusting a schema model has a real write path

## Commands
`npm run dev` · `npm run typecheck` · `npm run lint` · `npm run format` · `npm run build` · `npm run db:migrate` · `npm run db:seed` · `npm run plugin:build`
