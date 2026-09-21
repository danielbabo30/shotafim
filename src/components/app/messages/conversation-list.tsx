"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { SearchIcon, PenSquareIcon } from "@/components/marketing/icons";
import { MessageAvatar } from "@/components/app/messages/message-avatar";
import type { ConversationSummary, MessageFilterKey } from "@/lib/messages";

const FILTERS: { key: MessageFilterKey; label: string }[] = [
  { key: "all", label: "הכל" },
  { key: "contracts", label: "חוזים פעילים" },
  { key: "quotes", label: "הצעות מחיר" },
];

function matchesFilter(conv: ConversationSummary, filter: MessageFilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "contracts") return conv.context?.kind === "contract";
  return conv.context?.kind === "campaign" || conv.context?.kind === "application";
}

function matchesQuery(conv: ConversationSummary, q: string): boolean {
  if (!q) return true;
  const haystack = [conv.name, conv.handle, conv.preview, conv.context?.label]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q.toLowerCase());
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  query,
  onQueryChange,
}: {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: MessageFilterKey;
  onFilterChange: (filter: MessageFilterKey) => void;
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const rows = useMemo(
    () => conversations.filter((c) => matchesFilter(c, filter) && matchesQuery(c, query)),
    [conversations, filter, query],
  );

  return (
    <div className="flex h-full flex-col">
      {/* כותרת + חיפוש + סינון */}
      <div className="border-outline-variant flex flex-col gap-3 border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-on-surface text-xl font-bold">הודעות</h1>
          <button
            type="button"
            aria-label="הודעה חדשה"
            className="text-on-surface-variant hover:bg-surface-container rounded-lg p-2 transition-colors"
          >
            <PenSquareIcon className="size-5" />
          </button>
        </div>

        <div className="relative">
          <SearchIcon className="text-on-surface-variant pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="חיפוש הודעות..."
            className="border-outline-variant bg-surface-low text-on-surface placeholder:text-on-surface-variant focus:outline-primary w-full rounded-lg border py-2 ps-3 pe-9 text-sm focus:outline-2"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilterChange(f.key)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors",
                filter === f.key
                  ? "bg-primary-fixed text-on-primary-fixed"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-high",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* רשימה */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="text-on-surface-variant p-6 text-center text-sm">אין שיחות תואמות.</p>
        ) : (
          <ul>
            {rows.map((conv) => {
              const active = conv.id === selectedId;
              return (
                <li key={conv.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(conv.id)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b p-4 text-start transition-colors",
                      "border-outline-variant/60",
                      active
                        ? "bg-surface-low border-s-primary border-s-2"
                        : "hover:bg-surface-low/60",
                    )}
                  >
                    <MessageAvatar
                      name={conv.name}
                      src={conv.avatarUrl}
                      online={conv.online}
                      className="size-12"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm",
                            conv.unread
                              ? "text-on-surface font-bold"
                              : "text-on-surface font-medium",
                          )}
                        >
                          {conv.name}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-xs",
                            conv.unread ? "text-primary font-semibold" : "text-on-surface-variant",
                          )}
                        >
                          {conv.timeLabel}
                        </span>
                      </span>

                      {conv.context ? (
                        <span className="border-outline-variant bg-surface text-on-surface-variant w-fit max-w-full truncate rounded border px-1.5 py-0.5 text-[11px] font-medium">
                          {conv.context.label}
                        </span>
                      ) : null}

                      <span className="flex items-center gap-2">
                        <span className="text-on-surface-variant flex-1 truncate text-sm">
                          {conv.preview}
                        </span>
                        {conv.unread ? (
                          <span className="bg-primary size-2 shrink-0 rounded-full" />
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
