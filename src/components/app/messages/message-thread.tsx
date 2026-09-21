"use client";

import { useEffect, useRef } from "react";
import { ChatIcon, ChevronLeftIcon, MoreVerticalIcon } from "@/components/marketing/icons";
import { MessageAvatar } from "@/components/app/messages/message-avatar";
import { ThreadContextBar } from "@/components/app/messages/thread-context-bar";
import { MessageList } from "@/components/app/messages/message-list";
import { MessageComposer } from "@/components/app/messages/message-composer";
import type { ConversationSummary, MessageAttachment } from "@/lib/messages";

export function MessageThread({
  conversation,
  onBack,
  onSend,
  onAttach,
}: {
  conversation: ConversationSummary | null;
  onBack: () => void;
  onSend: (body: string) => void;
  onAttach: (attachment: MessageAttachment) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const entryCount = conversation?.entries.length ?? 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entryCount, conversation?.id]);

  if (!conversation) {
    return (
      <div className="text-on-surface-variant flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="bg-surface-container text-on-surface-variant grid size-14 place-items-center rounded-full">
          <ChatIcon className="size-7" />
        </span>
        <p className="text-sm">בחרו שיחה מהרשימה כדי להציג את ההתכתבות.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* כותרת השיחה */}
      <header className="border-outline-variant bg-surface-lowest flex items-center gap-3 border-b px-4 py-3">
        <button
          type="button"
          aria-label="חזרה לרשימת השיחות"
          onClick={onBack}
          className="text-on-surface-variant hover:bg-surface-container -ms-2 rounded-lg p-2 transition-colors lg:hidden"
        >
          <ChevronLeftIcon className="size-5 rotate-180" />
        </button>

        <MessageAvatar
          name={conversation.name}
          src={conversation.avatarUrl}
          online={conversation.online}
          className="size-10"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-on-surface truncate text-base font-bold">{conversation.name}</h2>
          <p className="text-on-surface-variant flex items-center gap-1.5 text-xs">
            {conversation.online ? (
              <>
                <span className="bg-success size-1.5 rounded-full" />
                מחובר/ת
              </>
            ) : (
              conversation.handle
            )}
          </p>
        </div>

        <button
          type="button"
          aria-label="פעולות נוספות"
          className="text-on-surface-variant hover:bg-surface-container rounded-lg p-2 transition-colors"
        >
          <MoreVerticalIcon className="size-5" />
        </button>
      </header>

      {conversation.context ? <ThreadContextBar context={conversation.context} /> : null}

      {/* זרם ההודעות */}
      <div ref={scrollRef} className="bg-surface min-h-0 flex-1 overflow-y-auto p-4">
        <MessageList entries={conversation.entries} />
      </div>

      <MessageComposer onSend={onSend} onAttach={onAttach} />
    </div>
  );
}
