# Spec: AdSpace bookings + schedules

> status: documented · updated: 2026-09-26 · owning agent: payments-escrow

## 1. Business purpose
Ad-space owners (billboards, digital screens, transit, newsletters, podcasts) sell fixed
time windows, not one-off deliverables. The `AdSpaceBooking` model is the calendar
primitive that should (a) prevent the same physical/digital slot from being double-sold
to two brands, and (b) drive every "when is this space occupied / free / live" view a
space owner or brand sees: the owner's schedule Gantt (`/dashboard/bookings`), the
owner's per-asset occupancy list (`/dashboard/assets`), the owner's dashboard KPIs/
calendar (`/dashboard`), and the brand-facing marketplace availability badge
(`/dashboard/ad-spaces`, `/dashboard/ad-spaces/[id]`).

## 2. Roles involved
- **`space` (AdSpaceOwnerProfile)** — lists media assets, sees who is booked when
  (`/dashboard/bookings`, `/dashboard/assets`), sees escrow/broadcast state per
  booking on the main dashboard (`/dashboard`, `docs/spec/deliverables.md` for the
  proof-of-play side of that same screen).
- **`brand` (BusinessProfile)** — browses ad spaces (`/dashboard/ad-spaces`), views
  one space's availability and upcoming bookings (`/dashboard/ad-spaces/[id]`), and
  either reserves a window directly (`reserveAdSpace`) or applies to an
  `AD_SPACE`/`BOTH` campaign brief that an ad-space owner then fulfils.
- No admin surface reads or writes `AdSpaceBooking` — see §9/§10.

## 3. User flow

### 3a. Brand-initiated reservation ("שריין ביומן" / "הצעת חסות")
1. Brand opens a space's detail page (`/dashboard/ad-spaces/[id]`) and clicks
   the CTA, which opens `ReserveAdSpaceDialog` (only rendered when
   `space.availability !== "booked"`).
2. Brand picks `startDate`/`endDate` (native `<input type="date">`, no calendar-driven
   day-blocking — see §8) and an optional note, and submits.
3. `reserveAdSpace` (`src/lib/actions/application-actions.ts:470-543`) creates, in one
   transaction: a synthetic single-asset `Campaign` (`targetType: "AD_SPACE"`,
   `status: "OPEN_FOR_PITCHES"`) and a `CampaignApplication` with
   `status: "INVITED"`, `adSpaceAssetId`, and the requested
   `requestedStartDate`/`requestedEndDate`. No overlap check happens at this step.
4. The space owner sees the invitation among their applications
   (`/dashboard/campaigns/[id]` pre-filled `ApplyForm`, `prefill` prop) and completes it
   via `submitApplication`'s **update branch** (the `existing.status === "INVITED"`
   path, `application-actions.ts:93-106`) — this only rewrites price/days/cover
   letter/pricing-package, **never** the dates or the `adSpaceAssetId** (see
   `docs/spec/applications.md` §10 for the sibling finding on `adSpaceAssetId`; the same
   update object also never touches `requestedStartDate`/`requestedEndDate`, so those
   two fields are frozen at whatever the brand asked for in step 2 for the lifetime of
   the application).
5. Brand accepts (`acceptApplication`) → overlap check → `Contract` created →
   `AdSpaceBooking` row created with `status: "RESERVED"` (see §5 for the exact
   sequence).

### 3b. Campaign-initiated application (brief-first)
1. Brand publishes a normal campaign brief with `targetType: "AD_SPACE"` or `"BOTH"`
   (`docs/spec/campaigns.md`).
2. A space owner applies from the brief page using the shared `ApplyForm`
   (`src/components/app/pitch/apply-form.tsx`), selecting one of their
   `AdSpaceAsset`s from a `<select>`.
3. `submitApplication`'s **create branch** (`application-actions.ts:107-127`) persists
   `adSpaceAssetId` but **there is no date input anywhere in this form** — see §8/§10,
   this is the main finding of this spec.
4. If accepted, `acceptApplication` runs with `bookingWindow = null` (because
   `requestedStartDate`/`requestedEndDate` were never set), so **no overlap check runs
   and no `AdSpaceBooking` row is ever created** for this contract, even though the
   `Contract.adSpaceAssetId` is set and the deliverable/escrow flow proceeds normally.

### 3c. Space owner reviews their calendar
1. `/dashboard/bookings` (space role only) → `getAdSpaceSchedule` → month-by-month
   Gantt (`ScheduleGantt`) of every active asset's bookings for the selected month,
   plus computed free slots between them.
2. `/dashboard/assets` → `getMyAdSpaces` → per-asset card showing `available` /
   `booked` / `broadcasting` / `inactive` derived from the single "active now" booking
   row (if any) and campaign/business name via the linked `Contract`.
3. `/dashboard` (space role) → `getSpaceDashboardData` → KPI strip (escrow held /
   available to withdraw / occupancy % / proofs pending) + monthly occupancy-load
   calendar + broadcast cards, all reading the same `bookings` relation
   (see `docs/spec/deliverables.md` for the proof-of-play half of the broadcast-card
   state machine).

### 3d. Brand browses availability
1. `/dashboard/ad-spaces` (no role guard — see `docs/spec/marketplace.md` §10, not
   re-flagged here) → `getAdSpacesData` → card grid with `availability: "booked" |
   "available"` derived from whether any booking's window covers *right now*.
2. `/dashboard/ad-spaces/[id]` (brand-only) → `getAdSpaceDetail` → same availability
   badge + list of all upcoming bookings with `statusLabel`; the "reserve" CTA is
   hidden only when the asset is booked *right now*, not when a requested future
   window would overlap an existing future booking (that overlap is only ever
   enforced server-side, at `acceptApplication` time, and only for the reservation
   flow in §3a — see §8).

## 4. File map
| Layer | Path | Role |
| --- | --- | --- |
| Route | `src/app/(frontend)/(app)/dashboard/bookings/page.tsx` | Space-owner monthly Gantt schedule (`getAdSpaceSchedule`) |
| Route | `src/app/(frontend)/(app)/dashboard/assets/page.tsx` | Space-owner asset list w/ derived occupancy status (`getMyAdSpaces`) |
| Route | `src/app/(frontend)/(app)/dashboard/page.tsx` → `SpaceDashboard` | Space-owner home: KPIs, broadcast cards, occupancy calendar (`getSpaceDashboardData`) |
| Route | `src/app/(frontend)/(app)/dashboard/ad-spaces/page.tsx` | Brand marketplace browse (`getAdSpacesData`) |
| Route | `src/app/(frontend)/(app)/dashboard/ad-spaces/[id]/page.tsx` | Brand asset detail + upcoming bookings + reserve CTA (`getAdSpaceDetail`) |
| Component | `src/components/app/ad-spaces/schedule-gantt.tsx` | Renders `ScheduleRow[]` as a day-grid per asset |
| Component | `src/components/app/ad-spaces/ad-space-explorer.tsx` / `ad-space-card.tsx` | Marketplace grid/filter UI |
| Component | `src/components/app/dashboard/space/{space-dashboard,occupancy-calendar,broadcast-card}.tsx` | Space-owner home widgets |
| Component | `src/components/app/pitch/reserve-ad-space-dialog.tsx` | Brand-side "reserve a window" form → `reserveAdSpace` |
| Component | `src/components/app/pitch/apply-form.tsx` | Shared apply form (creator packages **and** ad-space assets) — no date fields |
| Fetcher | `src/lib/ad-space-schedule.ts` (`getAdSpaceSchedule`) | Builds the monthly Gantt rows/segments/free-slots for the connected owner |
| Fetcher | `src/lib/my-ad-spaces.ts` (`getMyAdSpaces`) | Per-asset "active now" booking + upcoming count |
| Fetcher | `src/lib/dashboard-space.ts` (`getSpaceDashboardData`) | KPIs, broadcast-card state machine, occupancy-load calendar |
| Fetcher | `src/lib/ad-spaces.ts` (`getAdSpacesData`, `getAdSpaceDetail`) | Brand-facing marketplace list/detail + availability derivation |
| Action | `src/lib/actions/application-actions.ts` (`reserveAdSpace`, `submitApplication`, `acceptApplication`) | Only writers of `CampaignApplication.requestedStartDate/EndDate` and the only creator of `AdSpaceBooking` rows |
| Action | `src/lib/actions/ad-space-actions.ts` (`deleteAdSpaceAsset`) | Blocks hard-delete when active/future bookings exist (soft-deactivates instead) |
| Dev seed | `src/app/(frontend)/dev/seed-ad-spaces/route.ts` | Only other `AdSpaceBooking.create()` call site (fixture data) |

## 5. Data model
`AdSpaceBooking` (`prisma/schema.prisma:928-943`):
- `id`, `adSpaceAssetId` → `AdSpaceAsset`, `contractId` → `Contract` (`onDelete: Cascade`
  — a deleted contract deletes its bookings), `startDate`, `endDate`,
  `status: BookingStatus @default(RESERVED)`, `createdAt`/`updatedAt`.
- Indexes: `[adSpaceAssetId, startDate, endDate]` (used by the overlap query),
  `[contractId]`.

`BookingStatus` enum (`prisma/schema.prisma:147-153`): `RESERVED · CONFIRMED ·
BROADCASTING · COMPLETED · CANCELLED`.

**Status transitions — actual, not aspirational:**
```
(none) ──(acceptApplication, only when application has both requestedStartDate
           AND requestedEndDate AND adSpaceAssetId — application-actions.ts:319-329)──► RESERVED
RESERVED ──(no writer exists anywhere in src/)──► CONFIRMED | BROADCASTING | COMPLETED | CANCELLED
```
`RESERVED` is the **only** value ever written by application code (the dev-seed route
`seed-ad-spaces/route.ts:252` is the one other `.create()` call site, and it hard-codes
sample statuses for fixture purposes only — grep confirms `.update()`/`.delete()` on
`adSpaceBooking` has zero hits in `src/`). See §10 finding 1.

Every consumer that reads `BookingStatus` treats `CONFIRMED`/`BROADCASTING` as
reachable, live states:
- `src/lib/ad-spaces.ts:235` — `isLive: a.bookings.some((b) => b.status === "BROADCASTING")`
- `src/lib/my-ad-spaces.ts:84-88,175-176` — `bookingKind()`/`status` derive
  `"broadcasting"`/`"confirmed"` display states from `BookingStatus` first, falling back
  to `EscrowHold.status === "HELD"` only for the `RESERVED` case
- `src/lib/ad-space-schedule.ts:79-84,64` — `segmentKind()` maps `COMPLETED` →
  `"completed"` and `BROADCASTING` → `"broadcasting"` segment colors in the Gantt
  legend on `/dashboard/bookings`
- `src/app/(frontend)/(app)/dashboard/ad-spaces/[id]/page.tsx:166-169` — highlights a
  booking row in red when `status === "BROADCASTING"`

None of these branches is reachable in production: every booking is `RESERVED` from
creation to (functional) end of life. The "confirmed" visual state most users actually
see is a **different** signal in disguise — `escrowHeld` (whether `EscrowHold.status
=== "HELD"`) — computed independently in both `my-ad-spaces.ts` and
`ad-space-schedule.ts` (duplicated logic, not shared). "Broadcasting" and "completed"
have no way to ever render. See §10 finding 1.

`CampaignApplication.requestedStartDate`/`requestedEndDate` (`prisma/schema.prisma:832-833`,
both nullable `DateTime?`) are the only place the *requested* booking window lives
before a `Contract`/`AdSpaceBooking` exists. Written only by `reserveAdSpace`
(`application-actions.ts:534-535`); never written by `submitApplication`'s create
branch, so a fresh (non-invited) application to an `AD_SPACE` campaign has both fields
permanently `null`. See §8/§10 finding 2.

## 6. API contracts
No dedicated route handler — everything is server actions (`"use server"`) plus
cached RSC fetchers. No JSON API contract to document.

## 7. Guards & permissions
- `/dashboard/bookings` — `if (!user.roleKeys.includes("space")) redirect("/dashboard")`
  (`bookings/page.tsx:24`).
- `/dashboard/ad-spaces/[id]` — `if (!user.roleKeys.includes("brand")) redirect("/dashboard")`
  (`[id]/page.tsx:30`).
- `/dashboard/ad-spaces` — **no role check at all**; any authenticated active user can
  browse the marketplace (already flagged in `docs/spec/marketplace.md` §10, not
  duplicated as a new finding here).
- `reserveAdSpace`/`inviteToCampaign` — gated by `requireBrandBusiness()`
  (`application-actions.ts:386-395`, `roleKeys.includes("brand")` + an existing
  `BusinessProfile` row).
- `submitApplication`/`acceptApplication` — gated by `requireActiveUser()` +
  `TARGET_TYPES_FOR_ROLE` role/target-type matching (submit) or
  `roleKeys.includes("brand")` + campaign ownership (`loadOwnedApplication`, accept).
- `deleteAdSpaceAsset`/`updateAdSpaceAsset`/`toggleAdSpaceActive` — gated by
  `resolveOwner()` (`ad-space-actions.ts:26-34`, `roleKeys.includes("space")` + owning
  `AdSpaceOwnerProfile`) and, for edit/delete, an ownership-scoped `findFirst`.
- No guard anywhere is `AdSpaceBooking`-specific; every check above is at the asset,
  application, or contract level, and `AdSpaceBooking` rows are only ever reached
  through one of those parents.

## 8. Known edge cases
- **Direct campaign-brief applications to `AD_SPACE`/`BOTH` briefs never capture a
  booking window and never create an `AdSpaceBooking` row** — see §3b, §10 finding 2.
  The overlap-prevention system this feature exists for simply does not run for that
  path.
- **No client-side date blocking** in `ReserveAdSpaceDialog` — the `<input
  type="date">` fields accept any date; a brand can submit a window that visibly
  overlaps an existing booking shown two paragraphs above on the same detail page, and
  only finds out at `acceptApplication` time (when the *space owner* clicks accept,
  not when the brand submits) via the thrown `"השטח כבר משובץ בתאריכים המבוקשים"`
  error — surfaced as an uncaught server-action exception to the space owner, not a
  friendly field error to the brand who picked the bad dates.
- **The overlap check has no row-level locking** (`application-actions.ts:196-207`) —
  already flagged as a `Contract`-lifecycle finding in `docs/spec/contracts.md` §10;
  the same race applies to any two concurrent `acceptApplication` calls targeting
  overlapping windows on the same asset.
- **A `RESERVED` booking is never released.** There is no code path that sets
  `AdSpaceBooking.status` to `CANCELLED` or deletes it independent of its `Contract`
  (only `onDelete: Cascade` via `Contract` deletion, and nothing deletes a `Contract`
  either). If a booked contract later ends in `DISPUTED → REFUNDED`
  (`docs/spec/contracts.md` §5) or is otherwise abandoned, its `AdSpaceBooking` row
  stays `RESERVED` forever and permanently blocks that window from every future
  overlap check and every availability view — the slot can never be re-sold.
- `deleteAdSpaceAsset` blocks a hard delete when `_count.bookings > 0` for
  `RESERVED`/`CONFIRMED`/`BROADCASTING` rows with `endDate >= now`
  (`ad-space-actions.ts:241-257`) and silently soft-deactivates instead — the caller
  gets redirected with `?blocked=bookings` but no toast/explanation is rendered by the
  edit page for that query param (not verified further — outside this spec's file map).
- `getAdSpaceDetail`'s "booked" badge only reflects a booking active **right now**
  (`startDate <= now && endDate >= now`); a space that is fully booked for the next six
  months but not booked *today* still shows "פנוי לשריון" (available) with the reserve
  CTA visible.

## 9. Tech debt / TODOs in code
- No inline `TODO`/`FIXME` comments found in any file in the §4 file map (checked via
  grep across `src/lib/{ad-spaces,my-ad-spaces,dashboard-space,ad-space-schedule}.ts`,
  `src/lib/actions/{application,ad-space}-actions.ts`).
- `bookingKind()` (`my-ad-spaces.ts:84-88`) and `segmentKind()`
  (`ad-space-schedule.ts:79-84`) independently re-implement the same
  "`BookingStatus` + `EscrowHold.status==="HELD"`" → display-state mapping with
  different output types (`BookingKind` vs `ScheduleSegmentKind`) and no shared
  helper — a future status-mapping change (e.g. actually wiring up `CONFIRMED`/
  `BROADCASTING`, see finding 1) needs to be made in both places by hand.

## 10. Findings for the team lead
1. **`AdSpaceBooking.status` only ever takes the value `RESERVED` in production —
   `CONFIRMED`, `BROADCASTING`, `COMPLETED`, and `CANCELLED` are all dead enum
   values with zero writers anywhere in `src/`.** Every UI that reads this field
   (the `/dashboard/bookings` Gantt legend's "שידור מאושר / משדר" and "הושלם"
   segments, `isLive` on the marketplace card, the red "live now" highlight on the
   ad-space detail page, `bookingKind()` on `/dashboard/assets`) is dead code that can
   never render its intended state. What actually drives the "confirmed-looking"
   green segment today is a parallel, undocumented signal (`EscrowHold.status ===
   "HELD"`), computed by copy-pasted logic in two different files. This is the same
   shape of gap as `docs/spec/deliverables.md`'s `ProofOfPlay` finding — a whole
   status dimension the schema and UI were built for, that nothing in the app
   actually drives.
2. **A space owner applying to a normal `AD_SPACE`/`BOTH` campaign brief (as opposed
   to accepting a brand's direct "reserve ביומן" invite) never gets asked for a date
   window, and the resulting contract gets no `AdSpaceBooking` row at all** —
   `ApplyForm` (shared with creator-package applications) has no start/end date
   fields, and `submitApplication`'s create branch never writes
   `requestedStartDate`/`requestedEndDate`. This silently disables the one thing this
   whole feature exists to guarantee (no double-booking a physical/digital slot) for
   what looks like the primary "respond to a brief" flow, not just an edge case — only
   the brand-initiated `reserveAdSpace` shortcut goes through the booking system at
   all.
3. **A `RESERVED` booking can never be freed once created** — no cancel/release path
   exists, so a refunded, disputed, or otherwise dead contract permanently occupies
   its calendar window (§8). Combined with finding 2, the net effect is that the
   booking calendar is neither reliably populated (many real bookings never get a row)
   nor reliably accurate for the rows it does have (dead rows are never cleared).
