"use client";

import { useEffect, useRef, useTransition } from "react";
import { MessageAvatar } from "@/components/app/messages/message-avatar";
import { MessageList } from "@/components/app/messages/message-list";
import { MessageComposer } from "@/components/app/messages/message-composer";
import type { ThreadEntry } from "@/lib/messages";
import { CONTRACT_ACTION_INITIAL } from "@/lib/contract-room";
import { sendRoomMessage } from "@/lib/actions/contract-actions";

export function RoomChat({
  contractId,
  counterparty,
  entries,
}: {
  contractId: string;
  counterparty: { name: string; image: string | null; handle: string | null };
  entries: ThreadEntry[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  return (
    <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex min-h-[420px] flex-col overflow-hidden rounded-lg border">
      <header className="border-outline-variant flex items-center gap-3 border-b p-4">
        <MessageAvatar
          name={counterparty.name}
          src={counterparty.image ?? undefined}
          className="size-10"
        />
        <div className="min-w-0">
          <h2 className="text-on-surface truncate text-sm font-bold">{counterparty.name}</h2>
          {counterparty.handle && (
            <p className="text-on-surface-variant text-xs">@{counterparty.handle}</p>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="bg-surface min-h-0 flex-1 overflow-y-auto p-4">
        <MessageList entries={entries} />
      </div>

      <MessageComposer
        onSend={(body) => {
          const fd = new FormData();
          fd.set("contractId", contractId);
          fd.set("body", body);
          start(() => {
            void sendRoomMessage(CONTRACT_ACTION_INITIAL, fd);
          });
        }}
        onAttach={() => {
          /* צירוף קבצים — Stage 8 */
        }}
      />
      {pending && <span className="sr-only">שולח הודעה…</span>}
    </div>
  );
}
