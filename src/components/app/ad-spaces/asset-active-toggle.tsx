"use client";

import { useFormStatus } from "react-dom";
import { toggleAdSpaceActive } from "@/lib/actions/ad-space-actions";
import { cn } from "@/lib/cn";

function SubmitButton({ isActive }: { isActive: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 shrink-0 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors disabled:opacity-60",
        isActive
          ? "border-outline-variant text-on-surface hover:bg-surface-container"
          : "border-primary bg-primary text-on-primary hover:bg-primary-hover",
      )}
    >
      {pending ? "מעדכן…" : isActive ? "השבתת הנכס" : "הפעלת הנכס"}
    </button>
  );
}

/** מתג הפעלה/השבתה של נכס — כתיבה אמיתית ל-DB דרך toggleAdSpaceActive */
export function AssetActiveToggle({ assetId, isActive }: { assetId: string; isActive: boolean }) {
  return (
    <form
      action={toggleAdSpaceActive}
      className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
    >
      <div>
        <p className="text-on-surface text-sm font-semibold">
          {isActive ? "הנכס פעיל ומוצג בקטלוג" : "הנכס מוסתר מהקטלוג"}
        </p>
        <p className="text-on-surface-variant mt-0.5 text-xs">
          {isActive
            ? "מפרסמים יכולים למצוא ולשריין אותו ביומן."
            : "לא יופיע בחיפוש ולא ניתן לשריון עד להפעלה מחדש."}
        </p>
      </div>
      <input type="hidden" name="assetId" value={assetId} />
      <input type="hidden" name="active" value={String(!isActive)} />
      <SubmitButton isActive={isActive} />
    </form>
  );
}
