"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { sendMessage } from "@/lib/actions/message-actions";
import { ConversationList } from "@/components/app/messages/conversation-list";
import { MessageThread } from "@/components/app/messages/message-thread";
import type {
  ConversationSummary,
  MessageAttachment,
  MessageFilterKey,
  ThreadEntry,
} from "@/lib/messages";

type MobileView = "list" | "thread";

function nowTime(): string {
  return new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

let localId = 0;
const nextId = () => `local-${++localId}`;

export function MessagesWorkspace({
  conversations: initial,
}: {
  conversations: ConversationSummary[];
}) {
  const [conversations, setConversations] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [filter, setFilter] = useState<MessageFilterKey>("all");
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const appendEntry = useCallback((conversationId: string, entry: ThreadEntry, preview: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, entries: [...c.entries, entry], preview, timeLabel: nowTime(), unread: false }
          : c,
      ),
    );
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMobileView("thread");
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: false } : c)));
  }, []);

  const handleSend = useCallback(
    (body: string) => {
      if (!selectedId) return;
      appendEntry(
        selectedId,
        { type: "message", id: nextId(), direction: "out", body, time: nowTime(), read: false },
        body,
      );
      startTransition(async () => {
        await sendMessage(selectedId, body);
      });
    },
    [selectedId, appendEntry],
  );

  const handleAttach = useCallback(
    (attachment: MessageAttachment) => {
      if (!selectedId) return;
      appendEntry(
        selectedId,
        {
          type: "message",
          id: nextId(),
          direction: "out",
          attachment,
          time: nowTime(),
          read: false,
        },
        `📎 ${attachment.name}`,
      );
    },
    [selectedId, appendEntry],
  );

  return (
    <div className="border-outline-variant bg-surface-lowest shadow-ambient flex h-[calc(100dvh-7rem)] min-h-[32rem] flex-col overflow-hidden rounded-xl border lg:h-[calc(100dvh-9.5rem)] lg:flex-row">
      <div
        className={cn(
          "border-outline-variant min-h-0 flex-col lg:flex lg:w-80 lg:shrink-0 lg:border-e",
          mobileView === "list" ? "flex flex-1" : "hidden",
        )}
      >
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelect}
          filter={filter}
          onFilterChange={setFilter}
          query={query}
          onQueryChange={setQuery}
        />
      </div>

      <div
        className={cn(
          "min-w-0 flex-1 flex-col lg:flex",
          mobileView === "thread" ? "flex" : "hidden",
        )}
      >
        <MessageThread
          conversation={selected}
          onBack={() => setMobileView("list")}
          onSend={handleSend}
          onAttach={handleAttach}
        />
      </div>
    </div>
  );
}
