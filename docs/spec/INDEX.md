# Table of Contents — BridgeAd Specs

> updated: 2026-09-13. Any code change to a documented feature → update its row here (date + status).
> Note: features #1-4 (auth, registration, RBAC guards, campaigns) each already have an open, unmerged spec PR (see PR history) — their rows below still read `missing` because this branch hasn't absorbed those PRs yet, not because no one has documented them. See PR for this spec for details.
> Code map: [`code-map.md`](code-map.md) · Data model: [`data-model.md`](data-model.md) · Template: [`_TEMPLATE.md`](_TEMPLATE.md)
> Specs are in English. A one-time Hebrew spec pass is planned for end of development.

## Work queue for systems-analyst (priority order)

| # | Feature | Spec file | Status | Updated | Domain agent |
| --- | --- | --- | --- | --- | --- |
| 1 | Auth + sign-in (NextAuth) | `auth.md` | missing | — | private-area |
| 2 | Multi-step registration + role selection | `registration.md` | missing | — | private-area |
| 3 | Guards & roles (RBAC) | `rbac-guards.md` | missing | — | private-area |
| 4 | Campaigns (create, wizard, brief) | `campaigns.md` | missing | — | private-area |
| 5 | Marketplace + creator/space profiles | [`marketplace.md`](marketplace.md) | documented | 2026-09-13 | private-area |
| 6 | Applications / pitches | `applications.md` | missing | — | private-area |
| 7 | Contract room + contracts | `contracts.md` | missing | — | private-area |
| 8 | Deliverables + submissions + feedback | `deliverables.md` | missing | — | private-area |
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
| Feature | Spec | Date | Findings for lead |
| --- | --- | --- | --- |
| Marketplace + creator/space profiles | [`marketplace.md`](marketplace.md) | 2026-09-13 | inconsistent role gating between the creator-marketplace and ad-space-marketplace list pages; `roleKeys` vs `activeRole` inconsistency on brand-only detail pages; `getCreatorProfile()` has no guard of its own; empty/thin creator profiles aren't flagged in the browse list |

## QA
Test scenarios: [`qa/INDEX.md`](qa/INDEX.md) · Regression: [`qa/regression.md`](qa/regression.md)
