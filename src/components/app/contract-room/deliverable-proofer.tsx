"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { SendIcon } from "@/components/marketing/icons";
import { formatTimecode, SUBMISSION_STATUS_META } from "@/lib/contract-room";
import type { RoomSubmission } from "@/lib/contracts";
import { addFeedback, toggleFeedbackResolved } from "@/lib/actions/contract-actions";

const shortDate = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long" });

export function DeliverableProofer({
  contractId,
  submissions,
  readOnly,
}: {
  contractId: string;
  submissions: RoomSubmission[];
  /** אין הוספה/סימון הערות אחרי אישור סופי */
  readOnly: boolean;
}) {
  const [activeId, setActiveId] = useState(submissions.at(-1)?.id ?? "");
  const [videoTime, setVideoTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const active = useMemo(
    () => submissions.find((s) => s.id === activeId) ?? submissions.at(-1) ?? null,
    [submissions, activeId],
  );

  if (!active) {
    return (
      <section className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border p-8 text-center">
        <p className="text-on-surface-variant text-sm">היוצר עדיין לא העלה תוצר לבדיקה.</p>
      </section>
    );
  }

  const seekTo = (seconds: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = seconds;
    void el.play().catch(() => {});
  };

  return (
    <section className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col overflow-hidden rounded-lg border">
      {/* וידאו — תצוגה מקדימה של תוצר; אין כתוביות בשלב זה */}
      <video
        ref={videoRef}
        key={active.id}
        src={active.fileUrl}
        controls
        onTimeUpdate={(e) => setVideoTime(e.currentTarget.currentTime)}
        className="bg-inverse-surface aspect-video w-full"
      />

      {/* טאבים של גרסאות */}
      <div className="border-outline-variant flex gap-1 overflow-x-auto border-b px-3">
        {submissions.map((s) => {
          const isActive = s.id === active.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-3 text-sm transition-colors",
                isActive
                  ? "border-primary text-primary font-semibold"
                  : "text-on-surface-variant hover:text-on-surface border-transparent",
              )}
            >
              גרסה v{s.version} · {shortDate.format(s.submittedAt)}
              {isActive && (
                <span
                  className={cn(
                    "ms-2 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    SUBMISSION_STATUS_META[s.status].className,
                  )}
                >
                  {SUBMISSION_STATUS_META[s.status].label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 p-6">
        {active.notes && (
          <p className="text-on-surface-variant bg-surface-container rounded-lg px-3 py-2 text-sm">
            הערת היוצר: {active.notes}
          </p>
        )}

        {!readOnly && (
          <form
            action={addFeedback}
            className="border-outline-variant focus-within:border-primary flex items-center gap-2 rounded-lg border p-2 transition-colors"
          >
            <input type="hidden" name="contractId" value={contractId} />
            <input type="hidden" name="submissionId" value={active.id} />
            <input type="hidden" name="timestampSeconds" value={Math.floor(videoTime)} />
            <span className="bg-surface-container text-on-surface-variant shrink-0 rounded px-2 py-1 font-mono text-xs">
              {formatTimecode(videoTime)}
            </span>
            <input
              name="feedbackText"
              required
              autoComplete="off"
              placeholder="הוסף הערה בנקודת הזמן הזו…"
              className="text-on-surface placeholder:text-on-surface-variant min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
            />
            <button
              type="submit"
              aria-label="הוסף הערה"
              className="bg-primary text-on-primary hover:bg-primary-hover shrink-0 rounded-md p-1.5 transition-colors"
            >
              <SendIcon className="size-4" />
            </button>
          </form>
        )}

        <ul className="flex flex-col gap-2">
          {active.feedback.length === 0 && (
            <li className="text-on-surface-variant py-4 text-center text-sm">
              אין הערות על גרסה זו.
            </li>
          )}
          {active.feedback.map((f) => (
            <li
              key={f.id}
              className="hover:bg-surface-container flex gap-3 rounded-lg border border-transparent p-3 transition-colors"
            >
              {f.timestampSeconds != null ? (
                <button
                  type="button"
                  onClick={() => seekTo(f.timestampSeconds!)}
                  className="text-primary bg-primary/10 h-fit shrink-0 rounded px-2 py-1 font-mono text-xs hover:underline"
                >
                  {formatTimecode(f.timestampSeconds)}
                </button>
              ) : (
                <span className="bg-surface-high text-on-surface-variant h-fit shrink-0 rounded px-2 py-1 font-mono text-xs">
                  כללי
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-on-surface text-sm">{f.feedbackText}</p>
                {!readOnly && <ResolveToggle contractId={contractId} feedback={f} />}
                {readOnly && f.isResolved && (
                  <span className="text-success mt-1 inline-block text-xs font-medium">טופל ✓</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ResolveToggle({
  contractId,
  feedback,
}: {
  contractId: string;
  feedback: { id: string; isResolved: boolean };
}) {
  const [pending, start] = useTransition();
  return (
    <label className="mt-2 flex w-fit cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={feedback.isResolved}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          const fd = new FormData();
          fd.set("contractId", contractId);
          fd.set("feedbackId", feedback.id);
          fd.set("resolved", String(next));
          start(() => {
            void toggleFeedbackResolved(fd);
          });
        }}
        className="accent-primary size-4 rounded"
      />
      <span className="text-on-surface-variant text-xs">טופל ע״י היוצר</span>
    </label>
  );
}
