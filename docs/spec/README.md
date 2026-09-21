# BridgeAd / שותפים — System Specification

Living, reverse-engineered documentation of the system. Goal: when a bug shows up or a
feature needs work, find the full context and the relevant files in under a minute —
without burning tokens on search.

**Language:** specs are written in **English** (denser for agents to read/write). A
one-time Hebrew specification pass is planned for the **end of development**.

## Layout

| File | Contents |
| --- | --- |
| `INDEX.md` | Table of contents — every feature, spec status, last-updated date, links, work queue |
| `code-map.md` | "Where is what" map — domain → folders/files → useful grep terms |
| `data-model.md` | Prisma data-model overview — model groups, enums, status transitions |
| `_TEMPLATE.md` | Template for a new feature spec |
| `<feature>.md` | Single-feature spec |
| `qa/` | Test scenarios — `qa/INDEX.md`, `qa/regression.md`, `qa/<feature>.md` |

## Maintained by

- **systems-analyst** (nightly routine) — adds one spec per run, following the priority queue in `INDEX.md`.
- **Every dev agent** — touched an already-documented feature → must update `<feature>.md` and its row in `INDEX.md` (date + status).
- **qa** — maintains `qa/`.

## Statuses

`missing` — no spec · `documented` — specced and current · `stale` — code changed, spec did not · `partial` — incomplete spec
