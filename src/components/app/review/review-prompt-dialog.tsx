"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CloseIcon, StarIcon, ChevronDownIcon } from "@/components/marketing/icons";
import { cn } from "@/lib/cn";
import { REVIEW_SUB_CRITERIA, REVIEW_FORM_INITIAL } from "@/lib/review-form";
import { submitReview, dismissReviewPrompt } from "@/lib/actions/review-actions";
import type { PendingReviewPrompt } from "@/lib/reviews";

const field =
  "border-outline-variant bg-surface-container focus:border-primary text-on-surface w-full rounded-lg border px-3 py-2 text-sm focus:outline-none";

/**
 * מודאל ביקורת על הצד השני בחוזה שהושלם.
 *  • mode="auto"    — נפתח מעצמו (המודאל הגלובלי ב-AppShell) + כפתור "דלג".
 *  • mode="trigger" — מרנדר כפתור "השאר ביקורת" (inline בחדר העבודה), בלי "דלג".
 */
export function ReviewPromptDialog({
  prompt,
  mode,
}: {
  prompt: PendingReviewPrompt;
  mode: "auto" | "trigger";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(submitReview, REVIEW_FORM_INITIAL);
  const [rating, setRating] = useState(0);
  const [showSub, setShowSub] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (mode === "auto") ref.current?.showModal();
  }, [mode]);

  useEffect(() => {
    if (state?.ok) ref.current?.close();
  }, [state]);

  const stars = [1, 2, 3, 4, 5];

  return (
    <>
      {mode === "trigger" && (
        <button
          type="button"
          onClick={() => ref.current?.showModal()}
          className="bg-primary text-on-primary hover:bg-primary-hover inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
        >
          <StarIcon className="size-4" />
          השאר ביקורת
        </button>
      )}

      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="bg-surface-lowest text-on-surface m-auto w-[min(30rem,92vw)] rounded-xl p-0 shadow-xl backdrop:bg-black/40"
      >
        <form action={formAction} className="flex flex-col gap-4 p-6">
          <input type="hidden" name="contractId" value={prompt.contractId} />
          <input type="hidden" name="rating" value={rating} />

          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-on-surface text-lg font-bold">
                איך היה שיתוף הפעולה?
              </h2>
              <p className="text-on-surface-variant mt-0.5 text-sm">
                ביקורת על {prompt.counterpartyName} · {prompt.campaignTitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="סגירה"
              className="text-on-surface-variant hover:text-on-surface -me-1 -mt-1 rounded-lg p-1"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>

          {state?.error && (
            <p className="bg-error-container text-on-error-container rounded-lg p-3 text-sm">
              {state.error}
            </p>
          )}

          {/* דירוג כללי */}
          <div className="flex items-center gap-1" role="radiogroup" aria-label="דירוג כללי">
            {stars.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={rating === s}
                aria-label={`${s} כוכבים`}
                onClick={() => setRating(s)}
                className="p-1"
              >
                <StarIcon
                  className={cn(
                    "size-8 transition-colors",
                    s <= rating ? "text-amber-400" : "text-outline",
                  )}
                />
              </button>
            ))}
          </div>

          <textarea
            name="feedbackText"
            required
            rows={3}
            placeholder="מה עבד טוב? מה אפשר לשפר?"
            className={field}
          />

          {/* תת-דירוגים — מכווץ */}
          <div className="border-outline-variant rounded-lg border">
            <button
              type="button"
              onClick={() => setShowSub((v) => !v)}
              className="text-on-surface-variant flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
            >
              דירוג מפורט (אופציונלי)
              <ChevronDownIcon
                className={cn("size-4 transition-transform", showSub && "rotate-180")}
              />
            </button>
            {showSub && (
              <div className="border-outline-variant flex flex-col gap-2 border-t p-3">
                {REVIEW_SUB_CRITERIA.map((c) => (
                  <label key={c.name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-on-surface-variant">{c.label}</span>
                    <select
                      name={c.name}
                      defaultValue=""
                      className="border-outline-variant bg-surface-container rounded border px-2 py-1 text-sm"
                    >
                      <option value="">—</option>
                      {stars.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isPublic"
              defaultChecked
              className="accent-primary size-4 rounded"
            />
            <span className="text-on-surface-variant">הצג את הביקורת בפרופיל הציבורי</span>
          </label>

          <div className="flex justify-end gap-2">
            {mode === "auto" && (
              <button
                type="submit"
                formAction={dismissReviewPrompt}
                formNoValidate
                className="text-on-surface-variant hover:text-on-surface h-11 rounded-lg px-4 text-sm font-medium"
              >
                דלג
              </button>
            )}
            <Button type="submit" size="md" disabled={pending || rating === 0}>
              {pending ? "שולח…" : "שלח ביקורת"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
