"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CloseIcon } from "@/components/marketing/icons";
import { inviteToCampaign } from "@/lib/actions/application-actions";

export type OpenCampaign = { id: string; title: string };

const field =
  "bg-surface-low text-on-surface focus:bg-surface-lowest focus:ring-primary h-11 w-full rounded-lg border-0 px-4 transition-colors focus:ring-2 focus:outline-none";

/**
 * "הזמנה לבריף" — כפתור שפותח דיאלוג לבחירת קמפיין פתוח.
 * אם למפרסם אין קמפיין פתוח, הכפתור הוא Link ל-/dashboard/campaigns/new.
 */
export function InviteToCampaignDialog({
  creatorUserId,
  openCampaigns,
  className,
  label = "הזמנה לבריף",
}: {
  creatorUserId: string;
  openCampaigns: OpenCampaign[];
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(inviteToCampaign, null);

  if (openCampaigns.length === 0) {
    return (
      <Link href="/dashboard/campaigns/new" className={className}>
        {label}
      </Link>
    );
  }

  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()}>
        {label}
      </button>

      <dialog
        ref={ref}
        className="bg-surface-lowest text-on-surface m-auto w-[min(28rem,92vw)] rounded-xl p-0 shadow-xl backdrop:bg-black/40"
      >
        <form action={formAction} className="flex flex-col gap-4 p-6">
          <input type="hidden" name="creatorUserId" value={creatorUserId} />
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-on-surface text-lg font-bold">הזמנת היוצר לבריף</h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="סגירה"
              className="text-on-surface-variant hover:text-on-surface -me-1 -mt-1 rounded-lg p-1"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>

          <p className="text-on-surface-variant text-sm leading-relaxed">
            היוצר יקבל הזמנה להגיש הצעה לבריף שתבחרו. המחיר וזמן האספקה ימולאו מראש מהחבילה הזולה
            שלו וניתנים לשינוי בהגשה.
          </p>

          {state?.status === "error" && state.message && (
            <p className="bg-error-container text-on-error-container rounded-lg p-3 text-sm">
              {state.message}
            </p>
          )}

          <div>
            <label
              htmlFor="invite-campaign"
              className="text-on-surface mb-1 block text-sm font-semibold"
            >
              בחרו בריף פתוח
            </label>
            <select
              id="invite-campaign"
              name="campaignId"
              required
              className={field}
              defaultValue=""
            >
              <option value="" disabled>
                — בחרו —
              </option>
              {openCampaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="md" onClick={() => ref.current?.close()}>
              ביטול
            </Button>
            <Button type="submit" size="md" disabled={pending}>
              {pending ? "שולח…" : "שלח הזמנה"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
