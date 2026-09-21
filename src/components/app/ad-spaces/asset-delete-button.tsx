"use client";

import { useFormStatus } from "react-dom";
import { deleteAdSpaceAsset } from "@/lib/actions/ad-space-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm("לארכב את הנכס? הוא יוסר מהקטלוג ומרשימת הנכסים שלך.")) {
          e.preventDefault();
        }
      }}
      className="border-outline-variant text-on-surface-variant hover:border-error hover:text-error inline-flex h-10 shrink-0 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors disabled:opacity-60"
    >
      {pending ? "מארכב…" : "ארכוב הנכס"}
    </button>
  );
}

/** ארכוב (soft-delete) של נכס פרסום. חסום כשיש שריון פעיל — אז רק מושבת. */
export function AssetDeleteButton({
  assetId,
  blockedByBookings,
}: {
  assetId: string;
  blockedByBookings?: boolean;
}) {
  return (
    <form
      action={deleteAdSpaceAsset}
      className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
    >
      <div>
        <p className="text-on-surface text-sm font-semibold">ארכוב הנכס</p>
        <p className="text-on-surface-variant mt-0.5 text-xs">
          {blockedByBookings
            ? "לא ניתן לארכב — יש שריון פעיל או עתידי לנכס. הנכס הושבת מהקטלוג."
            : "הנכס יוסר מהקטלוג ומהרשימה. פעולה זו אינה הפיכה מהממשק."}
        </p>
      </div>
      <input type="hidden" name="assetId" value={assetId} />
      <SubmitButton />
    </form>
  );
}
