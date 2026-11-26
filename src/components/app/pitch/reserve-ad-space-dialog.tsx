"use client";

import { useActionState, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CloseIcon } from "@/components/marketing/icons";
import { reserveAdSpace } from "@/lib/actions/application-actions";

const field =
  "bg-surface-low text-on-surface focus:bg-surface-lowest focus:ring-primary h-11 w-full rounded-lg border-0 px-4 transition-colors focus:ring-2 focus:outline-none";
const labelCls = "text-on-surface mb-1 block text-sm font-semibold";
const errCls = "text-error mt-1 text-xs";

/**
 * "שריין ביומן" / "הצעת חסות" — פותח בריף AD_SPACE ממוקד לשטח בודד
 * עם חלון תאריכים מבוקש. בעל השטח מקבל הזמנה ומתאם.
 */
export function ReserveAdSpaceDialog({
  assetId,
  label,
  className,
}: {
  assetId: string;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(reserveAdSpace, null);
  const errors = state?.fieldErrors ?? {};
  const uid = useId();
  const startId = `${uid}-start`;
  const endId = `${uid}-end`;
  const noteId = `${uid}-note`;

  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()}>
        {label}
      </button>

      <dialog
        ref={ref}
        className="bg-surface-lowest text-on-surface m-auto w-[min(30rem,92vw)] rounded-xl p-0 shadow-xl backdrop:bg-black/40"
      >
        <form action={formAction} className="flex flex-col gap-4 p-6">
          <input type="hidden" name="adSpaceAssetId" value={assetId} />
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-on-surface text-lg font-bold">{label}</h2>
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
            נפתח בריף ייעודי לשטח הזה ובעל השטח יקבל בקשת שריון לחלון שתבחרו. המחיר יוצע לפי מחיר
            הבסיס וניתן למשא ומתן.
          </p>

          {state?.status === "error" && state.message && (
            <p className="bg-error-container text-on-error-container rounded-lg p-3 text-sm">
              {state.message}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={startId} className={labelCls}>
                תאריך התחלה
              </label>
              <input
                id={startId}
                name="startDate"
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                className={field}
              />
              {errors.startDate && <p className={errCls}>{errors.startDate}</p>}
            </div>
            <div>
              <label htmlFor={endId} className={labelCls}>
                תאריך סיום
              </label>
              <input id={endId} name="endDate" type="date" required className={field} />
              {errors.endDate && <p className={errCls}>{errors.endDate}</p>}
            </div>
          </div>

          <div>
            <label htmlFor={noteId} className={labelCls}>
              הערה לבעל השטח (אופציונלי)
            </label>
            <textarea
              id={noteId}
              name="note"
              rows={3}
              className={`${field} h-auto py-2.5`}
              maxLength={1000}
              placeholder="פרטים על הקמפיין, חומרים, דרישות מיוחדות…"
            />
            {errors.note && <p className={errCls}>{errors.note}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="md" onClick={() => ref.current?.close()}>
              ביטול
            </Button>
            <Button type="submit" size="md" disabled={pending}>
              {pending ? "שולח…" : "שלח בקשת שריון"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
