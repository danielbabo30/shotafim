"use client";

import { useState } from "react";
import { ThumbDownIcon, ThumbUpIcon } from "@/components/marketing/icons";

/** רצועת משוב "האם התוכן עזר?" — מצב מקומי בלבד. `subject` מתאים את הניסוח (מאמר / מדריך). */
export function ArticleFeedback({ subject = "המאמר" }: { subject?: string }) {
  const [done, setDone] = useState(false);

  const btn =
    "border-outline-variant text-on-surface-variant hover:bg-surface-container flex size-10 items-center justify-center rounded-full border transition-colors";

  return (
    <div className="border-outline-variant/60 mt-8 flex items-center justify-between gap-4 border-t pt-8">
      <p className="font-bold" aria-live="polite">
        {done ? "תודה על המשוב!" : `האם ${subject} הזה עזר לך?`}
      </p>
      {!done && (
        <div className="flex gap-3">
          <button
            type="button"
            aria-label={`${subject} עזר`}
            className={`${btn} hover:text-primary`}
            onClick={() => setDone(true)}
          >
            <ThumbUpIcon className="size-5" />
          </button>
          <button
            type="button"
            aria-label={`${subject} לא עזר`}
            className={`${btn} hover:text-error`}
            onClick={() => setDone(true)}
          >
            <ThumbDownIcon className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
