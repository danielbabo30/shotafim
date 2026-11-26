"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { CONTRACT_ACTION_INITIAL } from "@/lib/contract-room";
import { activatePartnerProgramForPoc } from "@/lib/actions/partner-actions";

/** טופס קטן: הפעלת תוכנית שותפות במצב POC (בלי פיקדון) — אדמין בלבד */
export function ActivatePocForm({ programId }: { programId: string }) {
  const [state, action, pending] = useActionState(
    activatePartnerProgramForPoc,
    CONTRACT_ACTION_INITIAL,
  );
  return (
    <form action={action} className="flex items-center justify-end gap-3">
      <input type="hidden" name="programId" value={programId} />
      {state.status !== "idle" && (
        <span
          role="status"
          className={state.status === "error" ? "text-error text-xs" : "text-success text-xs"}
        >
          {state.message}
        </span>
      )}
      <Button type="submit" size="md" disabled={pending}>
        {pending ? "מפעיל…" : "הפעל (POC)"}
      </Button>
    </form>
  );
}
