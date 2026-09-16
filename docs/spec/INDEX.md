# Table of Contents — BridgeAd Specs

> updated: 2026-09-16. Any code change to a documented feature → update its row here (date + status).
> Code map: [`code-map.md`](code-map.md) · Data model: [`data-model.md`](data-model.md) · Template: [`_TEMPLATE.md`](_TEMPLATE.md)
> Specs are in English. A one-time Hebrew spec pass is planned for end of development.

> ⚠️ **Process note for the next nightly run (and for whoever reviews the PR backlog):**
> This table only ever reflects a **merged** state — every row below still reads `missing`
> because **no spec PR has been merged into `private-area-foundation` since the first one
> opened on 2026-09-05**. As of this run there are **13 open, unmerged `spec/*` PRs**
> (#1–#13), including **six separate duplicate PRs for item #1 alone** (#1, #2, #4, #5, #6,
> #8 — all titled "Auth + sign-in"), because each night's job read this same stale `missing`
> row and redid the same work. Items #2–#7 also already have one open PR each (#7, #9, #10,
> #11, #12, #13). **Before picking "the next missing row," check open PRs first** — this run
> did, and picked #8 (Deliverables) since #1–#7 were all already covered by a pending PR.
> **This needs a team-lead decision**, not another nightly workaround: merge (or close) the
> backlog, ideally picking one of the six auth PRs and closing the other five, so this table
> starts reflecting reality again.

## Work queue for systems-analyst (priority order)

| # | Feature | Spec file | Status | Updated | Domain agent |
| --- | --- | --- | --- | --- | --- |
| 1 | Auth + sign-in (NextAuth) | `auth.md` | missing | — | private-area |
| 2 | Multi-step registration + role selection | `registration.md` | missing | — | private-area |
| 3 | Guards & roles (RBAC) | `rbac-guards.md` | missing | — | private-area |
| 4 | Campaigns (create, wizard, brief) | `campaigns.md` | missing | — | private-area |
| 5 | Marketplace + creator/space profiles | `marketplace.md` | missing | — | private-area |
| 6 | Applications / pitches | `applications.md` | missing | — | private-area |
| 7 | Contract room + contracts | `contracts.md` | missing | — | private-area |
| 8 | Deliverables + submissions + feedback | [`deliverables.md`](deliverables.md) | documented | 2026-09-16 | private-area |
| 9 | Messaging / conversations | `messages.md` | missing | — | private-area |
| 10 | Disputes | `disputes.md` | missing | — | private-area |
| 11 | Reviews | `reviews.md` | missing | — | private-area |
| 12 | Escrow + Transactions + Invoices | `payments.md` | missing | — | payments-escrow |
| 13 | AdSpace bookings + schedules | `ad-space-bookings.md` | missing | — | payments-escrow |
| 14 | Revenue-share partnerships (PartnerProgram) | `partner-programs.md` | missing | — | partnerships-tracking |
| 15 | Tracking engine (clicks, attribution) | `tracking-engine.md` | missing | — | partnerships-tracking |
| 16 | Anomaly detection + enforcement | `anomaly-enforcement.md` | missing | — | partnerships-tracking |
| 17 | WooCommerce plugin (bridgead-woo) | `woo-plugin.md` | missing | — | partnerships-tracking |
| 18 | Payout checkpoints + reconcile + monitor | `payout-cron.md` | missing | — | payments-escrow |
| 19 | Admin dashboard | `admin-dashboard.md` | missing | — | private-area |
| 20 | CMS-backed marketing site (pages + globals) | `marketing-cms.md` | missing | — | frontend-marketing |
| 21 | Long-form content (posts / guides / legal) | `content-long.md` | missing | — | frontend-marketing |
| 22 | Public index / explore | `public-index.md` | missing | — | frontend-marketing |

## Completed specs
_(each of these currently exists only as an open, unmerged PR against `private-area-foundation` — see the process note above)_

| Feature | Spec file | PR | Key findings for team lead |
| --- | --- | --- | --- |
| Auth + sign-in (NextAuth) | `auth.md` | #1, #2, #4, #5, #6, #8 (pick one, close the rest) | Open redirect via unvalidated `callbackUrl` (PR #2); `/sign-in` doesn't use the design system unlike `/register`; `allowDangerousEmailAccountLinking: true` |
| Multi-step registration + role selection | `registration.md` | #7 | Google sign-up has no consent checkbox but `completeRegistration` records consent anyway; online-only brands forced to enter a physical address |
| Guards & roles (RBAC) | `rbac-guards.md` | #9 | No production path grants `ADMIN`; inconsistent role-gating on several "browse" pages |
| Campaigns (create, wizard, brief) | `campaigns.md` | #10 | Draft campaigns are a dead end (no edit/publish-from-draft path); `CampaignStatus.CANCELLED` is unreachable |
| Marketplace + creator/space profiles | `marketplace.md` | #11 | Inconsistent role gating between `/dashboard/marketplace` and `/dashboard/ad-spaces` |
| Applications / pitches | `applications.md` | #12 | Updating an `INVITED` application silently drops a changed ad-space selection; no way to decline/cancel an invite |
| Contract room + contracts | `contracts.md` | #13 | `submitDeliverable`/`requestRevision`/`approveAndRelease` never check `compensationModel` — could release a revenue-share deposit as a flat fee |
| Deliverables + submissions + feedback | [`deliverables.md`](deliverables.md) | *(this PR)* | `ProofOfPlay` (ad-space "proof it ran") has zero write path anywhere in the app — the dashboard flags it computes from it are permanently false; revision requests can be sent with no note/explanation |

## QA
Test scenarios: [`qa/INDEX.md`](qa/INDEX.md) · Regression: [`qa/regression.md`](qa/regression.md)
