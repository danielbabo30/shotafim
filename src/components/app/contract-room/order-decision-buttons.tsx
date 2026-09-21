"use client";

import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { CONTRACT_ACTION_INITIAL } from "@/lib/contract-room";
import { decideAttributedOrder } from "@/lib/actions/partner-actions";
import type { PartnerOrderRow } from "@/lib/partner-dashboard";

type Decision = "APPROVE" | "HOLD" | "REVERSE";

const DECISION_LABEL: Record<Decision, string> = {
  APPROVE: "אשר",
  HOLD: "עצור לבירור",
  REVERSE: "בטל עמלה",
};

/** אילו החלטות זמינות לפי סטטוס ההזמנה הנוכחי */
function optionsFor(status: PartnerOrderRow["status"]): Decision[] {
  switch (status) {
    case "PENDING":
      return ["APPROVE", "HOLD", "REVERSE"];
    case "ON_HOLD":
      return ["APPROVE", "REVERSE"];
    case "APPROVED":
      return ["REVERSE"];
    default:
      return [];
  }
}

/**
 * כפתורי החלטת מפרסם על הזמנה משויכת בודדת — קוראים ל-decideAttributedOrder (WP-2, 5b).
 * מוצג רק בתצוגת המפרסם.
 */
export function OrderDecisionButtons({
  orderId,
  status,
}: {
  orderId: string;
  status: PartnerOrderRow["status"];
}) {
  const [state, action, pending] = useActionState(decideAttributedOrder, CONTRACT_ACTION_INITIAL);
  const options = optionsFor(status);
  if (options.length === 0) return null;

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="flex gap-1">
        {options.map((decision) => (
          <button
            key={decision}
            type="submit"
            name="decision"
            value={decision}
            disabled={pending}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50",
              decision === "APPROVE"
                ? "bg-primary text-on-primary hover:bg-primary-hover"
                : "border-outline text-on-surface-variant hover:bg-surface-container border",
            )}
          >
            {DECISION_LABEL[decision]}
          </button>
        ))}
      </div>
      {state.status === "error" && state.message && (
        <span className="text-error text-[10px]">{state.message}</span>
      )}
    </form>
  );
}
