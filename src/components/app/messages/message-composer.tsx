"use client";

import { useRef, useState } from "react";
import { PaperclipIcon, SendIcon } from "@/components/marketing/icons";
import type { MessageAttachment } from "@/lib/messages";

const MAX_HEIGHT = 128; // px — ~8rem

/** שורת גודל קובץ קריאה — "48MB • וידאו" */
function formatAttachmentMeta(file: File): string {
  const mb = file.size / (1024 * 1024);
  const size = mb >= 1 ? `${Math.round(mb)}MB` : `${Math.max(1, Math.round(file.size / 1024))}KB`;
  const kind = file.type.startsWith("video/")
    ? "וידאו"
    : file.type.startsWith("image/")
      ? "תמונה"
      : "קובץ";
  return `${size} • ${kind}`;
}

function attachmentKind(file: File): MessageAttachment["kind"] {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return "document";
}

export function MessageComposer({
  onSend,
  onAttach,
}: {
  onSend: (body: string) => void;
  onAttach: (attachment: MessageAttachment) => void;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }

  function submit() {
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
    requestAnimationFrame(resize);
  }

  return (
    <div className="border-outline-variant bg-surface-lowest border-t p-3 md:p-4">
      <div className="border-outline-variant bg-surface focus-within:border-primary focus-within:ring-primary/40 flex items-end gap-2 rounded-xl border p-2 transition-all focus-within:ring-2">
        <button
          type="button"
          aria-label="הוסף קובץ"
          onClick={() => fileRef.current?.click()}
          className="text-on-surface-variant hover:bg-surface-container hover:text-primary shrink-0 rounded-lg p-2 transition-colors"
        >
          <PaperclipIcon className="size-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onAttach({
                kind: attachmentKind(file),
                name: file.name,
                meta: formatAttachmentMeta(file),
              });
            }
            e.target.value = "";
          }}
        />

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            resize();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="כתוב הודעה..."
          className="text-on-surface placeholder:text-on-surface-variant max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent py-2 text-sm focus:outline-none"
        />

        <button
          type="button"
          aria-label="שלח"
          onClick={submit}
          disabled={!value.trim()}
          className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm shrink-0 rounded-lg p-2 transition-colors disabled:pointer-events-none disabled:opacity-40"
        >
          <SendIcon className="size-5" />
        </button>
      </div>
    </div>
  );
}
