# Table of Contents — BridgeAd Specs

> updated: 2026-09-28. Any code change to a documented feature → update its row here (date + status).
> Code map: [`code-map.md`](code-map.md) · Data model: [`data-model.md`](data-model.md) · Template: [`_TEMPLATE.md`](_TEMPLATE.md)
> Specs are in English. A one-time Hebrew spec pass is planned for end of development.

> **2026-09-21 cleanup note:** between 2026-09-05 and 2026-09-17, 15 separate nightly
> systems-analyst runs opened spec PRs (#1–#15) against this branch, but none had been merged —
> so this table kept reading `missing` for everything, and several nights independently
> re-documented the same feature (six duplicate PRs for `auth.md`, two for `registration.md`)
> before later runs started checking open PRs first. This update reconciles that backlog in one
> pass: the best PR for each of the first 8 queue items was merged in priority order (auth,
> registration, rbac-guards, campaigns, marketplace, applications, contracts, deliverables); the
> duplicate/superseded PRs (#1, #2, #4, #6, #8, #15) were closed with a comment pointing to the
> merged version. **Going forward: before starting the "next missing" item, check open `spec/*`
> PRs against this branch, not just this table** — a PR can exist and be worth merging even
> though this file still shows `missing` until it lands.

> **2026-09-28 note:** the same backlog pattern is forming again, without the duplication
> this time — PRs #17–#22 (`messages`, `disputes`, `reviews`, `payments`,
> `ad-space-bookings`, `partner-programs`, queue items #9–14) are all still open against
> `private-area-foundation`, one per night since 2026-09-22, because nothing has merged
> them. Each night's run correctly checked for open PRs and moved to the next un-PR'd
> item instead of duplicating (that's why tonight's run picked #15, `tracking-engine.md`,
> not #9) — but the queue only has 8 items left after this one, and at the current merge
> rate the whole backlog will be sitting unmerged before it runs out. Team lead: worth
> merging #17–#22 (or delegating a merge pass) before the queue empties.

## Work queue for systems-analyst (priority order)

| # | Feature | Spec file | Status | Updated | Domain agent |
| --- | --- | --- | --- | --- | --- |
| 1 | Auth + sign-in (NextAuth) | [`auth.md`](auth.md) | documented | 2026-09-07 | private-area |
| 2 | Multi-step registration + role selection | [`registration.md`](registration.md) | documented | 2026-09-09 | private-area |
| 3 | Guards & roles (RBAC) | [`rbac-guards.md`](rbac-guards.md) | documented | 2026-09-11 | private-area |
| 4 | Campaigns (create, wizard, brief) | [`campaigns.md`](campaigns.md) | documented | 2026-09-12 | private-area |
| 5 | Marketplace + creator/space profiles | [`marketplace.md`](marketplace.md) | documented | 2026-09-13 | private-area |
| 6 | Applications / pitches | [`applications.md`](applications.md) | documented | 2026-09-14 | private-area |
| 7 | Contract room + contracts | [`contracts.md`](contracts.md) | documented | 2026-09-15 | private-area |
| 8 | Deliverables + submissions + feedback | [`deliverables.md`](deliverables.md) | documented | 2026-09-16 | private-area |
| 9 | Messaging / conversations | `messages.md` | missing | — | private-area |
| 10 | Disputes | `disputes.md` | missing | — | private-area |
| 11 | Reviews | `reviews.md` | missing | — | private-area |
| 12 | Escrow + Transactions + Invoices | `payments.md` | missing | — | payments-escrow |
| 13 | AdSpace bookings + schedules | `ad-space-bookings.md` | missing | — | payments-escrow |
| 14 | Revenue-share partnerships (PartnerProgram) | `partner-programs.md` | missing | — | partnerships-tracking |
| 15 | Tracking engine (clicks, attribution) | [`tracking-engine.md`](tracking-engine.md) | documented | 2026-09-28 | partnerships-tracking |
| 16 | Anomaly detection + enforcement | `anomaly-enforcement.md` | missing | — | partnerships-tracking |
| 17 | WooCommerce plugin (bridgead-woo) | `woo-plugin.md` | missing | — | partnerships-tracking |
| 18 | Payout checkpoints + reconcile + monitor | `payout-cron.md` | missing | — | payments-escrow |
| 19 | Admin dashboard | `admin-dashboard.md` | missing | — | private-area |
| 20 | CMS-backed marketing site (pages + globals) | `marketing-cms.md` | missing | — | frontend-marketing |
| 21 | Long-form content (posts / guides / legal) | `content-long.md` | missing | — | frontend-marketing |
| 22 | Public index / explore | `public-index.md` | missing | — | frontend-marketing |

## Completed specs

| Feature | Spec file | Documented | Key findings for team lead |
| --- | --- | --- | --- |
| Auth + sign-in (NextAuth) | [`auth.md`](auth.md) | 2026-09-07 | `/sign-in` never migrated onto design tokens / `AuthSplitScreen`, unlike `/register` (CLAUDE.md §3 drift); `User.lastLoginAt` never written by the real sign-in path; no forced sign-out on suspend/ban (session lives until next `requireActiveUser()` check); `requireUser`/`requireRole` in `auth-helpers.ts` are dead code |
| Multi-step registration + role selection | [`registration.md`](registration.md) | 2026-09-09 | Google sign-up has no consent checkbox but `completeRegistration` records consent for every provider anyway; `BusinessLocation` is required even for `ONLINE`-only brands, contradicting the schema's own comment; re-submitting step 2 fully replaces `User.roles` (no append) |
| Guards & roles (RBAC) | [`rbac-guards.md`](rbac-guards.md) | 2026-09-11 | No production path grants the `ADMIN` role (only the dev-only `/dev/login?role=admin` bypass) — the only two admin-gated screens (disputes) are unreachable in production today; several "browse" pages (`ad-spaces`, `messages`, `reports`, `settings`) have zero role check, undocumented whether that's intentional; `setActiveRole` throws raw `Error`s instead of the typed error states every other guard uses |
| Campaigns (create, wizard, brief) | [`campaigns.md`](campaigns.md) | 2026-09-12 | Draft campaigns are a dead end — the UI promises "save as draft for editing" but no edit/publish-from-draft action exists anywhere; `CampaignStatus.CANCELLED` is unreachable (no writer), so a brand can never retract a published brief |
| Marketplace + creator/space profiles | [`marketplace.md`](marketplace.md) | 2026-09-13 | Inconsistent role gating between `/dashboard/marketplace` (soft message) and `/dashboard/ad-spaces` (no gate at all); detail pages check `roleKeys` where `activeRole` may be intended; `getCreatorProfile()` has no guard of its own, relies entirely on its one caller; empty/thin creator profiles aren't flagged in the browse list |
| Applications / pitches | [`applications.md`](applications.md) | 2026-09-14 | `submitApplication`'s update branch never carries over a changed ad-space-asset selection when completing a reservation invite (silently keeps the original); no way to decline an invitation or cancel one that was sent |
| Contract room + contracts | [`contracts.md`](contracts.md) | 2026-09-15 | **`submitDeliverable`/`requestRevision`/`approveAndRelease` never check `Contract.compensationModel`** — calling them on a revenue-share contract would release the partnership deposit as a flat-fee payment (wrong recorded amount) and bypass the checkpoint-based commission payout system entirely; no row-level locking on the ad-space booking overlap check |
| Deliverables + submissions + feedback | [`deliverables.md`](deliverables.md) | 2026-09-16 | **`ProofOfPlay` (ad-space "proof it broadcast") has zero write path anywhere in the app** — the dashboard flags computed from it are permanently `false`, so ad-space escrow release rests entirely on brand trust, not evidence; revision requests can be sent with no note/explanation; external-link deliverable submissions skip every safeguard (size/MIME/checksum) applied to uploads |
| Tracking engine (clicks, attribution) | [`tracking-engine.md`](tracking-engine.md) | 2026-09-28 | **`MaintenanceWindow` has zero write path anywhere in the app** (same pattern as `ProofOfPlay` above) — the offline-alert email promises brands "declare a maintenance window and the alert auto-closes," but there's no create action, so every real maintenance window today triggers a full false-positive auto-pause of live partnerships; self-purchase anomaly detection (`runMonitor`) hashes against an arbitrary first `TrackedSite`'s API key per business, so it silently never fires for any additional store a business connects; `OrderCommissionStatus.ON_HOLD` is fully rendered/handled downstream but has no writer — likely belongs to the not-yet-built disputes feature (#10) |

## QA
Test scenarios: [`qa/INDEX.md`](qa/INDEX.md) · Regression: [`qa/regression.md`](qa/regression.md)
