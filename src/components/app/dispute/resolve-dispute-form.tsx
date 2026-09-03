"use client";

import { useActionState } from "react";
import { resolveDispute, DISPUTE_ACTION_INITIAL } from "@/lib/actions/dispute-actions";

const OPTIONS = [
  { value: "RESOLVED_PAYOUT", label: "תשלום לספק — הכסף בנאמנות משוחרר ליוצר/לבעל השטח" },
  { value: "RESOLVED_REFUND", label: "החזר למפרסם — הכסף בנאמנות חוזר למפרסם" },
  { value: "SPLIT", label: "פיצול — הכספים מחולקים לפי החלטת הבורר" },
];

export function ResolveDisputeForm({ disputeId }: { disputeId: string }) {
  const [state, formAction, pending] = useActionState(resolveDispute, DISPUTE_ACTION_INITIAL);

  return (
    <form
      action={formAction}
      className="border-outline-variant bg-surface-lowest flex flex-col gap-3 rounded-lg border p-5"
    >
      <input type="hidden" name="disputeId" value={disputeId} />
      <h3 className="text-on-surface text-sm font-bold">הכרעת המחלוקת</h3>

      <fieldset className="flex flex-col gap-2">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className="border-outline-variant/60 has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <input
              type="radio"
              name="resolution"
              value={o.value}
              required
              className="text-primary focus:ring-primary mt-0.5"
            />
            <span className="text-on-surface-variant">{o.label}</span>
          </label>
        ))}
      </fieldset>

      <textarea
        name="notes"
        required
        rows={3}
        placeholder="נימוק ההכרעה — יירשם בתיק וגלוי לשני הצדדים…"
        className="border-outline-variant bg-surface-container text-on-surface rounded-lg border px-3 py-2 text-sm"
      />

      {state.status === "error" && (
        <p className="text-error text-xs font-medium">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-on-primary hover:bg-primary-hover h-11 rounded-lg text-sm font-semibold disabled:opacity-60"
      >
        {pending ? "מכריע…" : "הכרע את המחלוקת"}
      </button>
    </form>
  );
}
