import { cn } from "@/lib/cn";
import {
  ShieldCheckIcon,
  PlayCircleIcon,
  DownloadIcon,
  DoubleCheckIcon,
  CheckIcon,
} from "@/components/marketing/icons";
import type { MessageAttachment, ThreadEntry } from "@/lib/messages";

/** זרם ההודעות של השיחה הפעילה */
export function MessageList({ entries }: { entries: ThreadEntry[] }) {
  return (
    <div className="flex flex-col gap-4">
      {entries.map((entry) => {
        if (entry.type === "system") {
          return (
            <div key={entry.id} className="flex justify-center">
              <span className="border-outline-variant bg-surface-container text-on-surface-variant inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
                <ShieldCheckIcon className="text-primary size-3.5 shrink-0" />
                {entry.text}
              </span>
            </div>
          );
        }

        if (entry.type === "day") {
          return (
            <div key={entry.id} className="flex justify-center">
              <span className="text-on-surface-variant text-xs font-medium">{entry.label}</span>
            </div>
          );
        }

        const outgoing = entry.direction === "out";
        return (
          <div key={entry.id} className={cn("flex", outgoing ? "justify-start" : "justify-end")}>
            <div className="flex max-w-[85%] flex-col gap-1 sm:max-w-[75%]">
              <div
                className={cn(
                  "rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                  outgoing
                    ? "bg-primary text-on-primary rounded-se-sm"
                    : "border-outline-variant bg-surface-lowest text-on-surface rounded-ss-sm border",
                )}
              >
                {entry.attachment ? (
                  <Attachment attachment={entry.attachment} outgoing={outgoing} />
                ) : null}
                {entry.body ? <p className="whitespace-pre-wrap">{entry.body}</p> : null}
              </div>

              <div
                className={cn(
                  "text-on-surface-variant flex items-center gap-1 text-[11px]",
                  outgoing ? "justify-start" : "justify-end",
                )}
              >
                <span>{entry.time}</span>
                {outgoing ? (
                  entry.read ? (
                    <DoubleCheckIcon className="text-primary size-3.5" />
                  ) : (
                    <CheckIcon className="size-3.5" />
                  )
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Attachment({
  attachment,
  outgoing,
}: {
  attachment: MessageAttachment;
  outgoing: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-1 flex items-center gap-3",
        outgoing ? "text-on-primary" : "text-on-surface",
      )}
    >
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-lg",
          outgoing ? "bg-on-primary/15 text-on-primary" : "bg-surface-highest text-primary",
        )}
      >
        <PlayCircleIcon className="size-6" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{attachment.name}</span>
        <span
          className={cn("text-xs", outgoing ? "text-on-primary/80" : "text-on-surface-variant")}
        >
          {attachment.meta}
        </span>
      </span>
      <button
        type="button"
        aria-label="הורדת הקובץ"
        className={cn(
          "ms-1 shrink-0 rounded-md p-1 transition-colors",
          outgoing
            ? "hover:bg-on-primary/15"
            : "text-on-surface-variant hover:bg-surface-container",
        )}
      >
        <DownloadIcon className="size-4" />
      </button>
    </div>
  );
}
