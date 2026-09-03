"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ShieldCheckIcon } from "@/components/marketing/icons";
import { openDispute, DISPUTE_ACTION_INITIAL } from "@/lib/actions/dispute-actions";
import type { ContractDisputeContext } from "@/lib/disputes";

/**
 * "פתח מחלוקת / פנייה לבוררות" — לחדר העבודה, לשני סוגי החוזים.
 * מרונדר ב-contracts/[id]/page.tsx עצמו (לא בתוך פאנל) כדי להימנע מהתנגשות עריכה.
 */
export function DisputeButton({
  contractId,
  context,
}: {
  contractId: string;
  context: ContractDisputeContext;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(openDispute, DISPUTE_ACTION_INITIAL);

  if (context.existing) {
    return (
      <Link
        href={`/dashboard/contracts/${contractId}`}
        className="border-outline-variant text-on-surface-variant hover:bg-surface-container flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium"
      >
        <ShieldCheckIcon className="size-3.5" />
        מחלוקת נפתחה — בטיפול צוות המערכת
      </Link>
    );
  }

  if (!context.canOpen) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-error hover:bg-error-container/40 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
      >
        <ShieldCheckIcon className="size-3.5" />
        פתח מחלוקת / פנייה לבוררות המערכת
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="border-error/30 bg-error-container/20 flex flex-col gap-2 rounded-lg border p-3"
    >
      <input type="hidden" name="contractId" value={contractId} />
      <p className="text-on-surface text-xs font-semibold">פתיחת מחלוקת בהכרעת אדמין</p>

      <label className="text-on-surface-variant text-xs">עילת המחלוקת</label>
      <select
        name="reason"
        required
        defaultValue=""
        className="border-outline-variant bg-surface-lowest text-on-surface rounded-lg border px-3 py-2 text-sm"
      >
        <option value="" disabled>
          בחר עילה…
        </option>
        {context.reasons.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      <textarea
        name="description"
        required
        rows={3}
        placeholder="פרט מה קרה, מה הבקשה, ומה הראיות (לפחות 10 תווים)…"
        className="border-outline-variant bg-surface-lowest text-on-surface rounded-lg border px-3 py-2 text-sm"
      />

      {state.status === "error" && (
        <p className="text-error text-xs font-medium">{state.message}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-error text-on-error h-10 flex-1 rounded-lg text-sm font-semibold disabled:opacity-60"
        >
          {pending ? "שולח…" : "פתח מחלוקת"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-on-surface-variant h-10 px-3 text-sm"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}
