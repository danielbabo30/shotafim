"use client";

import { useActionState } from "react";
import { resolveAnomalyFlag, DISPUTE_ACTION_INITIAL } from "@/lib/actions/dispute-actions";

/** כפתור "סמן כטופל" לדגל אנומליה בודד (אדמין). */
export function ResolveAnomalyButton({
  flagId,
  disputeId,
}: {
  flagId: string;
  disputeId?: string;
}) {
  const [state, formAction, pending] = useActionState(resolveAnomalyFlag, DISPUTE_ACTION_INITIAL);

  if (state.status === "success") {
    return <span className="text-success text-xs font-medium">✓ טופל</span>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="flagId" value={flagId} />
      {disputeId && <input type="hidden" name="disputeId" value={disputeId} />}
      <button
        type="submit"
        disabled={pending}
        className="text-primary hover:text-primary-hover text-xs font-semibold disabled:opacity-60"
      >
        {pending ? "…" : "סמן כטופל"}
      </button>
    </form>
  );
}
