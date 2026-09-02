"use client";

import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { SendIcon, UploadFileIcon, DocumentIcon, DownloadIcon } from "@/components/marketing/icons";
import {
  formatTimecode,
  SUBMISSION_STATUS_META,
  CONTRACT_ACTION_INITIAL,
  type ContractParty,
} from "@/lib/contract-room";
import { mediaKindFromMime, UPLOAD_ACCEPT, MAX_UPLOAD_MB } from "@/lib/deliverable-upload";
import type { RoomSubmission } from "@/lib/contracts";
import {
  addFeedback,
  toggleFeedbackResolved,
  submitDeliverable,
} from "@/lib/actions/contract-actions";

const shortDate = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long" });

export function DeliverableProofer({
  contractId,
  submissions,
  viewerParty,
  canSubmit,
  readOnly,
}: {
  contractId: string;
  submissions: RoomSubmission[];
  viewerParty: ContractParty;
  /** הספק יכול להעלות גרסה חדשה כרגע */
  canSubmit: boolean;
  /** אין הוספה/סימון הערות אחרי אישור סופי */
  readOnly: boolean;
}) {
  const isProvider = viewerParty === "provider";
  const canComment = !isProvider && !readOnly;
  const [activeId, setActiveId] = useState(submissions.at(-1)?.id ?? "");
  const [videoTime, setVideoTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const active = useMemo(
    () => submissions.find((s) => s.id === activeId) ?? submissions.at(-1) ?? null,
    [submissions, activeId],
  );

  if (!active) {
    return (
      <section className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col gap-4 rounded-lg border p-8">
        <p className="text-on-surface-variant text-center text-sm">
          {isProvider ? "טרם העלית תוצר לבדיקה." : "היוצר עדיין לא העלה תוצר לבדיקה."}
        </p>
        {isProvider && canSubmit && (
          <SubmitDeliverableForm contractId={contractId} nextVersion={1} />
        )}
      </section>
    );
  }

  const kind = mediaKindFromMime(active.mimeType);

  const seekTo = (seconds: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = seconds;
    void el.play().catch(() => {});
  };

  return (
    <section className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col overflow-hidden rounded-lg border">
      {/* תצוגת התוצר — לפי סוג הקובץ */}
      {kind === "video" ? (
        <video
          ref={videoRef}
          key={active.id}
          src={active.fileUrl}
          controls
          onTimeUpdate={(e) => setVideoTime(e.currentTarget.currentTime)}
          className="bg-inverse-surface aspect-video w-full"
        />
      ) : kind === "image" ? (
        // תוצר פרטי בממדים שרירותיים, מוגש דרך route מאומת — next/image לא רלוונטי כאן
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={active.id}
          src={active.fileUrl}
          alt={`תוצר גרסה v${active.version}`}
          className="bg-surface-container max-h-[28rem] w-full object-contain"
        />
      ) : (
        <div className="bg-surface-container flex flex-col items-center gap-3 p-10 text-center">
          <DocumentIcon className="text-on-surface-variant size-12" />
          <p className="text-on-surface text-sm font-medium">{active.fileName ?? "קובץ התוצר"}</p>
          <a
            href={active.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-primary text-on-primary hover:bg-primary-hover inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
          >
            <DownloadIcon className="size-4" />
            פתיחה / הורדה
          </a>
        </div>
      )}

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

        {isProvider && active.status === "REVISION_REQUESTED" && (
          <p className="bg-error-container text-on-error-container rounded-lg px-3 py-2 text-sm">
            המפרסם ביקש תיקונים. עיין בהערות למטה והעלה גרסה מעודכנת.
          </p>
        )}

        {canComment && (
          <form
            action={addFeedback}
            className="border-outline-variant focus-within:border-primary flex items-center gap-2 rounded-lg border p-2 transition-colors"
          >
            <input type="hidden" name="contractId" value={contractId} />
            <input type="hidden" name="submissionId" value={active.id} />
            {kind === "video" && (
              <>
                <input type="hidden" name="timestampSeconds" value={Math.floor(videoTime)} />
                <span className="bg-surface-container text-on-surface-variant shrink-0 rounded px-2 py-1 font-mono text-xs">
                  {formatTimecode(videoTime)}
                </span>
              </>
            )}
            <input
              name="feedbackText"
              required
              autoComplete="off"
              placeholder={kind === "video" ? "הוסף הערה בנקודת הזמן הזו…" : "הוסף הערה…"}
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
                {canComment && <ResolveToggle contractId={contractId} feedback={f} />}
                {!canComment && f.isResolved && (
                  <span className="text-success mt-1 inline-block text-xs font-medium">טופל ✓</span>
                )}
              </div>
            </li>
          ))}
        </ul>

        {isProvider && canSubmit && (
          <div className="border-outline-variant border-t pt-4">
            <SubmitDeliverableForm contractId={contractId} nextVersion={active.version + 1} />
          </div>
        )}
      </div>
    </section>
  );
}

function SubmitDeliverableForm({
  contractId,
  nextVersion,
}: {
  contractId: string;
  nextVersion: number;
}) {
  const [state, formAction, pending] = useActionState(submitDeliverable, CONTRACT_ACTION_INITIAL);
  const [mode, setMode] = useState<"file" | "url">("file");

  const inputCls =
    "border-outline-variant bg-surface-container focus:border-primary text-on-surface w-full rounded-lg border px-3 py-2 text-sm focus:outline-none";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <h3 className="text-on-surface flex items-center gap-2 text-sm font-bold">
        <UploadFileIcon className="size-4" />
        העלאת גרסה v{nextVersion} לבדיקה
      </h3>

      {state.status !== "idle" && state.message && (
        <p
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            state.status === "error"
              ? "bg-error-container text-on-error-container"
              : "bg-success-container text-success",
          )}
        >
          {state.message}
        </p>
      )}

      {/* בורר: קובץ / קישור */}
      <div className="border-outline-variant bg-surface-container flex gap-1 rounded-lg border p-1">
        {(["file", "url"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === m
                ? "bg-surface-lowest text-primary shadow-ambient-sm"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {m === "file" ? "העלאת קובץ" : "קישור חיצוני"}
          </button>
        ))}
      </div>

      {mode === "file" ? (
        <>
          <input
            key="file"
            name="file"
            type="file"
            required
            accept={UPLOAD_ACCEPT}
            className={cn(
              inputCls,
              "file:border-outline-variant file:bg-surface-lowest file:text-on-surface file:me-3 file:rounded file:border file:px-3 file:py-1 file:text-xs",
            )}
          />
          <p className="text-on-surface-variant text-xs">
            וידאו, תמונה או PDF · עד {MAX_UPLOAD_MB}MB
          </p>
        </>
      ) : (
        <input
          key="url"
          name="fileUrl"
          type="url"
          required
          dir="ltr"
          placeholder="https://… קישור לקובץ הווידאו / התמונה"
          className={cn(inputCls, "text-start")}
        />
      )}

      <textarea
        name="notes"
        rows={2}
        placeholder="הערות להגשה (אופציונלי) — מה שונה מהגרסה הקודמת…"
        className={inputCls}
      />
      <input type="hidden" name="contractId" value={contractId} />
      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-on-primary hover:bg-primary-hover h-11 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
      >
        {pending ? "מעלה…" : "שלח לבדיקת המפרסם"}
      </button>
    </form>
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
