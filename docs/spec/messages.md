# Spec: Messaging / conversations

> status: documented · updated: 2026-09-22 · owning agent: private-area

## 1. Business purpose

Lets any two authenticated users on the platform exchange text messages, either standalone (opened from a business's public dashboard page) or attached to a `Contract`'s workspace (the contract room's own chat tab). It's the generic communication layer the rest of the private area links into rather than a feature with its own business object — no quotes/pitches negotiation actually flows through it (see §10, finding 2).

## 2. Roles involved

No role restriction. `/dashboard/messages` sits behind `requireActiveUser()` only (`src/app/(frontend)/(app)/layout.tsx:14`) — every authenticated, active-status user of any role can open the messages page and both compose actions (`sendMessage`, `startBusinessConversation`). This matches the pattern `rbac-guards.md` §10 already flagged: several "browse"-style pages have zero role check; `messages` is explicitly one of them there. Not re-litigated as a new finding here.

## 3. User flow

**Opening a conversation directly (business page):**
1. From `/dashboard/businesses/[businessId]`, any signed-in user submits a form bound to `startBusinessConversation(business.userId)` (`src/app/(frontend)/(app)/dashboard/businesses/[businessId]/page.tsx:146`).
2. The action rejects self-conversations and requires the target `BusinessProfile` to be `status: ACTIVE` and not soft-deleted (`src/lib/actions/message-actions.ts:59-69`).
3. It looks for an existing exactly-two-participant `Conversation` with `campaignId: null, contractId: null` between the two users (`message-actions.ts:71-83` — filtered by candidate list then narrowed in code to `participants.length === 2`, since Prisma can't express "exactly N related rows" in a `where`). If none exists, it creates one plus two `ConversationParticipant` rows in a `$transaction` (`message-actions.ts:87-98`).
4. Redirects to `/dashboard/messages?conversation=<id>` (`message-actions.ts:102`).

**Opening/using the contract-room chat tab:**
1. On `/dashboard/contracts/[id]`, `<RoomChat>` (`src/components/app/contract-room/room-chat.tsx`) renders the same `MessageList`/`MessageComposer` components as the standalone inbox, fed by `entries` already assembled server-side (`getContractRoom`, `src/lib/contracts.ts` — same `ThreadEntry` shape as `src/lib/messages.ts`, per that file's own doc-comment at `src/lib/messages.ts:9`).
2. Sending calls `sendRoomMessage` (`src/lib/actions/contract-actions.ts:421-452`), a Server Action (not the plain async function `sendMessage` is) invoked via `useTransition` + a manually built `FormData` (`room-chat.tsx:48-56`).
3. On the first message ever sent in that contract's room, `sendRoomMessage` lazily creates the `Conversation` (`contractId` + `campaignId` set, one participant per `[business.userId, providerId]`, deduped with `Set` in case business and provider are somehow the same account) — `contract-actions.ts:434-446`. Every later call reuses `contract.conversations[0]`.
4. Attachments in this composer are a visible but disabled no-op: `onAttach={() => { /* צירוף קבצים — Stage 8 */ }}` (`room-chat.tsx:57-59`) — explicitly deferred, not a bug.

**Standalone inbox (`/dashboard/messages`):**
1. `MessagesPage` (`src/app/(frontend)/(app)/dashboard/messages/page.tsx`) loads `getMessagesData(user.id)` and passes it plus the optional `?conversation=` query param into `<MessagesWorkspace>` (client component, all further interaction is client-state, no route change on selecting a conversation).
2. The left pane (`<ConversationList>`) offers a text search (`matchesQuery`, client-side substring match over name/handle/preview/context label — `conversation-list.tsx:21-28`) and three filter chips: "הכל" (all), "חוזים פעילים" (contract-linked), "הצעות מחיר" ("quotes" — matches `campaign`/`application` context kind) — `conversation-list.tsx:9-19`. See §10 finding 1: the "quotes" filter can never match anything.
3. Selecting a conversation (`handleSelect`, `messages-workspace.tsx:60-64`) sets it active and optimistically flips its local `unread` flag to `false` — client state only, not persisted (§10 finding 3).
4. `<MessageThread>` shows the header (avatar, name, handle or an "מחובר/ת" online pill that's never actually set — see §8), the context bar (only for `kind === "contract"`, showing the escrow amount and a link back to the contract room — `thread-context-bar.tsx`), the message list, and the composer.
5. Sending (`handleSend`, `messages-workspace.tsx:66-79`): appends an optimistic local `ThreadEntry` immediately, then calls the `sendMessage` server action in a `startTransition`. The action's actual result (success/error) is awaited but never inspected or surfaced to the UI (§8).
6. Attaching a file (`handleAttach`, `messages-workspace.tsx:81-98`): appends a local `ThreadEntry` with the attachment's client-side metadata (name, computed size/kind string) — **no upload, no server call, nothing persisted** (§10 finding 1). Refreshing the page loses it entirely.
7. "הודעה חדשה" (new message) and "פעולות נוספות" (more actions) buttons in the header/list (`conversation-list.tsx:58-64`, `message-thread.tsx:74-80`) render with no `onClick` — dead UI (§8).

## 4. File map

| Layer | Path | Role |
| --- | --- | --- |
| Route | `src/app/(frontend)/(app)/dashboard/messages/page.tsx` | Standalone inbox; `requireActiveUser()` only, no role gate |
| Component | `src/components/app/messages/messages-workspace.tsx` | Client state owner: selection, optimistic send/attach, filter/query state |
| Component | `src/components/app/messages/conversation-list.tsx` | Left pane: search, filter chips, conversation rows |
| Component | `src/components/app/messages/message-thread.tsx` | Right pane: header, context bar, message list, composer |
| Component | `src/components/app/messages/message-list.tsx` | Renders `ThreadEntry[]` — system/day/message bubbles, read receipts, attachment chip |
| Component | `src/components/app/messages/message-composer.tsx` | Textarea + send button + file picker (client-only attachment metadata, no upload) |
| Component | `src/components/app/messages/message-avatar.tsx` | Shared avatar (image or initials) + online dot, used by both inbox and contract-room chat |
| Component | `src/components/app/messages/thread-context-bar.tsx` | Contract-linked conversations only: escrow amount chip + link to contract room |
| Component (contract room reuse) | `src/components/app/contract-room/room-chat.tsx` | Contract room's own chat tab — reuses `MessageAvatar`/`MessageList`/`MessageComposer`, wires to `sendRoomMessage` instead of `sendMessage` |
| Fetcher | `src/lib/messages.ts` (`getMessagesData`) | All conversations for a user + full `ThreadEntry[]` per conversation, `cache()`-wrapped |
| Fetcher (contract room's own copy) | `src/lib/contracts.ts` (`getContractRoom`) | Builds the same `ThreadEntry[]` shape for the single contract's conversation |
| Action | `src/lib/actions/message-actions.ts` | `sendMessage` (plain async function, not a `useActionState`-shaped action), `startBusinessConversation` (redirects) |
| Action (contract room) | `src/lib/actions/contract-actions.ts` (`sendRoomMessage`, lines 421-452) | Server Action shape (`_prev, formData) => ContractActionState`; lazily creates the `Conversation` on first send |

## 5. Data model

- `Conversation` (`prisma/schema.prisma:1070-1084`): `campaignId?`, `contractId?` (both optional FKs — a conversation is "contextless" only when both are null), `updatedAt` (`@updatedAt`, auto-bumped **only when a field on the `Conversation` row itself is written** — see §10 finding 4 for why this makes contract-room conversations sort incorrectly). Has-many `participants`, `messages`.
- `ConversationParticipant` (`schema.prisma:1086-1097`): composite PK `[conversationId, userId]`, `lastReadAt: DateTime?` — **declared in the schema but never read or written anywhere in `src/`** (confirmed: zero matches for `lastReadAt` outside the schema file itself). The read-receipt/unread logic actually used is entirely `Message.readAt`-based instead (see below) — `lastReadAt` is fully dead schema.
- `Message` (`schema.prisma:1099-1112`): `conversationId`, `senderId`, `body`, `attachmentUrl: String?`, `readAt: DateTime?`. **`readAt` has zero write call sites anywhere in `src/`** (confirmed by grep — only ever `select`ed/read, never set on create or via any `update`) — see §10 finding 5. `attachmentUrl` likewise has no writer; it exists on the model but the composer never persists an attachment (finding 1) so it's always null in practice.

**Enums:** none specific to this domain (`Conversation`/`Message`/`ConversationParticipant` carry no enum fields).

## 6. API contracts

None — both `sendMessage`/`startBusinessConversation` and `sendRoomMessage` are Next.js Server Actions invoked directly from client components, not REST/route-handler endpoints.

## 7. Guards & permissions

- `sendMessage` (`message-actions.ts:19-49`): `requireActiveUser()`, then an explicit `ConversationParticipant` existence check scoped to `(conversationId, userId)` before allowing the write (`message-actions.ts:29-35`) — IDOR-safe, a non-participant simply gets `{status: "error"}`.
- `startBusinessConversation` (`message-actions.ts:56-103`): `requireActiveUser()`, rejects `businessUserId === user.id`, requires the target business `ACTIVE`/not-deleted. No participant check needed since it creates the conversation itself.
- `sendRoomMessage` (`contract-actions.ts:421-452`): goes through `loadContractParty` (same helper `deliverables.md`/`contracts.md` document — party-scoped query, returns `null` for a non-party `contractId` rather than a 403-after-the-fact). Either contract party (business or provider) can send.
- No guard anywhere checks `Conversation.campaignId`/`contractId` against the *current* state of that campaign/contract (e.g. a `DISPUTED` or `REFUNDED` contract's chat stays fully open — same pattern `deliverables.md` §8 already noted for the feedback composer, not re-documented as a new finding).

## 8. Known edge cases

- **"מחובר/ת" (online) indicator is permanently dead.** `ConversationSummary.online` is declared in the type (`src/lib/messages.ts:59`) and rendered by both `<MessageAvatar>` (green dot) and `<MessageThread>`'s header text, but `getMessagesData` never sets it (`messages.ts:201-212` — the returned object has no `online` key at all, so it's always `undefined`/falsy). Every conversation always shows the offline state (handle text, no dot).
- **"הודעה חדשה" and "פעולות נוספות" buttons are unwired.** `conversation-list.tsx:58-64` (new message) and `message-thread.tsx:74-80` (more actions, a `MoreVerticalIcon` kebab) render with no `onClick` handler — visible, clickable-looking, do nothing.
- **`sendMessage`'s result is discarded.** `messages-workspace.tsx:74-76` awaits `sendMessage(...)` inside `startTransition` but never inspects the returned `SendMessageResult` — if the write fails (e.g. the participant check rejects it, which given the current UI can't normally happen but could after a stale page load following removal from a conversation that doesn't exist yet as a feature), the optimistically-appended bubble stays in the UI forever with no error shown and the message was never actually saved.
- **Attachment metadata omits the actual `File` object.** `MessageComposer`'s `onAttach` only passes `{kind, name, meta}` (`message-composer.tsx:71-76`) — even if a future Stage 8 wired up real uploads, the current `MessageAttachment` type/callback chain would need to change to carry the `File`/bytes through, not just cosmetic metadata.

## 9. Tech debt / TODOs in code

- `room-chat.tsx:57-59` — explicit in-code marker: `/* צירוף קבצים — Stage 8 */` (file attachments deferred to a named future stage). The standalone inbox's composer has the identical gap with no such marker (§10 finding 1) — worth aligning so both note the same deferred status, or scoping Stage 8 to cover both.
- `src/lib/messages.ts:9` doc-comment explicitly says its `ThreadEntry` shape "tracks `getContractRoom` in `src/lib/contracts.ts`" — two independent fetchers hand-maintain the same shape rather than sharing one; a change to one (e.g. adding a new `ThreadEntry` variant) must be mirrored manually in the other or they silently drift.
- `ConversationParticipant.lastReadAt` and `Message.readAt`/`attachmentUrl` are schema columns with no production writer (see §5) — either dead schema to prune or an unfinished read-receipt/attachment feature, worth a product decision either way.

## 10. Findings for the team lead

1. **File attachments in the standalone inbox are a pure UI illusion — no upload, no persistence.** `handleAttach` (`messages-workspace.tsx:81-98`) appends a local `ThreadEntry` built entirely from `File.name`/`File.size`/`File.type` read client-side; no request is made, `Message.attachmentUrl` is never written, and `MessageComposer`'s file `<input>` (`message-composer.tsx:64-79`) never calls any upload endpoint. The attachment bubble looks fully sent (with a working-looking download icon, `message-list.tsx:106-117`, that has no `onClick`) and then vanishes on refresh since it was never saved. This is the messaging-domain equivalent of the `ProofOfPlay` gap `deliverables.md` §10 flagged — a UI that implies a working feature with zero backing implementation. The contract-room chat's own composer is honest about the same gap (`room-chat.tsx:57-59`, a no-op with a "Stage 8" comment) but the standalone inbox gives no such signal to a developer reading only that file.
2. **The "quotes" filter chip can never show a result.** `matchesFilter` treats `filter === "quotes"` as `context?.kind === "campaign" || context?.kind === "application"` (`conversation-list.tsx:18`), but `getMessagesData` only ever produces `kind: "contract"` (when `conv.contract` is set) or `kind: "direct"` (`messages.ts:166-178`) — `"campaign"`/`"application"` are unreachable because both real conversation-creation call sites (`startBusinessConversation`, `sendRoomMessage`) either set both `campaignId`+`contractId` together (contract room — always resolves to `"contract"`, the `campaign` branch never gets a chance) or set neither (direct). No conversation exists anywhere in the write paths with `campaignId` set alone. A user clicking "הצעות מחיר" always sees "אין שיחות תואמות" (no matching conversations) regardless of their actual data — likely a leftover from an intended-but-unbuilt "message a business about a campaign/application from its page" flow (the campaign brief / application detail pages don't offer a "message" action the way the business profile page does).
3. **Read state (`unread`, per-message read receipts) doesn't persist — it's recomputed from `Message.readAt`, which nothing ever writes.** `getMessagesData`'s `unread` flag (`messages.ts:199`) and outgoing double-check receipt (`messages.ts:195`) are both derived from `Message.readAt == null`, but there is zero write call site for `readAt` anywhere in `src/` (confirmed by grep across the repo). Net effect: every message from the other party is permanently "unread" from the database's point of view (masked in the open conversation only by `messages-workspace.tsx:63`'s client-side `unread: false` override, which is lost on refresh/re-navigation), and an outgoing message's double-checkmark ("read by them") can never appear — `entry.read` is always `false`/`undefined` for every message ever sent, forever, for every user. If any future feature (an unread-count nav badge, an email digest) is built on top of `unread`/`readAt` as currently modeled, it will always report everything as unread.
4. **Contract-room conversations don't bump `Conversation.updatedAt` on new messages, so they sort by creation time, not last activity, in the standalone inbox.** `sendRoomMessage` only calls `prisma.message.create` (`contract-actions.ts:448`) — unlike `sendMessage`, which explicitly follows up with `prisma.conversation.update({ data: { updatedAt: new Date() } })` (`message-actions.ts:41-44`) precisely because Prisma's `@updatedAt` only fires on a write to the `Conversation` row's own scalar fields, not on a related `Message` insert. `getMessagesData` sorts by `orderBy: { updatedAt: "desc" }` (`messages.ts:117`), so a contract-room conversation with an active, ongoing chat can sink below older, cold direct conversations in the inbox's ordering — the most-recently-active thread isn't reliably at the top. `lastActivity` for the *timestamp shown* on each row is computed correctly (falls back to the last message's own `createdAt`, `messages.ts:164`), so this only affects sort order, not the displayed time — but sort order is the whole point of an inbox list.
