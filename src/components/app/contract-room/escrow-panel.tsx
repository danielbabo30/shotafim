"use client";

import { useActionState, useState } from "react";
import { cn } from "@/lib/cn";
import { CheckCircleIcon, LockIcon, ShieldCheckIcon } from "@/components/marketing/icons";
import { CONTRACT_ACTION_INITIAL } from "@/lib/contract-room";
import { approveAndRelease, requestRevision } from "@/lib/actions/contract-actions";

const currency = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

export type Milestone = { label: string; done: boolean };

export function EscrowPanel({
  contractId,
  escrowAmountILS,
  milestones,
  canApprove,
  canRequestRevision,
  revisionRoundsLeft,
  released,
}: {
  contractId: string;
  escrowAmountILS: number;
  milestones: Milestone[];
  canApprove: boolean;
  canRequestRevision: boolean;
  revisionRoundsLeft: number;
  released: boolean;
}) {
  const [approveState, approveAction, approving] = useActionState(
    approveAndRelease,
    CONTRACT_ACTION_INITIAL,
  );
  const [revisionState, revisionAction, revising] = useActionState(
    requestRevision,
    CONTRACT_ACTION_INITIAL,
  );
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [showRevision, setShowRevision] = useState(false);

  const feedback = approveState.status !== "idle" ? approveState : revisionState;

  return (
    <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col gap-6 rounded-lg border p-6">
      {/* סכום בנאמנות */}
      <div className="border-outline-variant bg-surface-container rounded-lg border p-4 text-center">
        <LockIcon className="text-primary mx-auto mb-2 size-7" />
        <p className="text-on-surface text-2xl font-bold">{currency.format(escrowAmountILS)}</p>
        <p className="text-on-surface-variant text-sm">
          {released ? "שוחררו ליוצר" : "נעולים בנאמנות BridgeAd"}
        </p>
      </div>

      {/* אבני דרך */}
      <div className="flex flex-col gap-3">
        <h2 className="text-on-surface text-sm font-semibold">סטטוס אבני דרך</h2>
        {milestones.map((m) => (
          <div
            key={m.label}
            className={cn("flex items-center gap-3 text-sm", !m.done && "opacity-50")}
          >
            {m.done ? (
              <CheckCircleIcon className="text-success size-5 shrink-0" />
            ) : (
              <span className="border-outline size-5 shrink-0 rounded-full border-2" />
            )}
            <span className="text-on-surface">{m.label}</span>
          </div>
        ))}
      </div>

      {feedback.status !== "idle" && feedback.message && (
        <p
          role="status"
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium",
            feedback.status === "success"
              ? "bg-success-container text-success"
              : "bg-error-container text-on-error-container",
          )}
        >
          {feedback.message}
        </p>
      )}

      {/* פעולות */}
      <div className="border-outline-variant flex flex-col gap-3 border-t pt-4">
        {released ? (
          <p className="bg-success-container text-success flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold">
            <CheckCircleIcon className="size-5" />
            התוצר אושר והתשלום שוחרר
          </p>
        ) : (
          <>
            {confirmApprove ? (
              <form action={approveAction} className="flex flex-col gap-2">
                <input type="hidden" name="contractId" value={contractId} />
                <p className="text-on-surface-variant text-xs">
                  פעולה סופית: התשלום ישוחרר ליוצר ולא ניתן יהיה לבקש תיקונים נוספים.
                </p>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={approving}
                    className="bg-success text-on-primary h-11 flex-1 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {approving ? "משחרר…" : "כן, אשר ושחרר"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmApprove(false)}
                    className="border-outline text-on-surface hover:bg-surface-container h-11 rounded-lg border px-4 text-sm font-medium"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                disabled={!canApprove}
                onClick={() => setConfirmApprove(true)}
                className="bg-success text-on-primary flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                title={canApprove ? undefined : "אין תוצר שממתין לאישור"}
              >
                <CheckCircleIcon className="size-5" />
                אשר תוצר ושחרר תשלום ליוצר
              </button>
            )}

            {showRevision ? (
              <form action={revisionAction} className="flex flex-col gap-2">
                <input type="hidden" name="contractId" value={contractId} />
                <textarea
                  name="note"
                  rows={3}
                  placeholder="פרט מה צריך לתקן (יתווסף כהערה ליוצר)…"
                  className="border-outline-variant bg-surface-container focus:border-primary text-on-surface w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={revising}
                    className="border-outline text-on-surface hover:bg-surface-container h-11 flex-1 rounded-lg border text-sm font-semibold disabled:opacity-60"
                  >
                    {revising ? "שולח…" : "שלח בקשת תיקונים"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRevision(false)}
                    className="text-on-surface-variant h-11 px-3 text-sm"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                disabled={!canRequestRevision}
                onClick={() => setShowRevision(true)}
                className="border-outline text-on-surface hover:bg-surface-container flex h-11 items-center justify-center rounded-lg border text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
              >
                בקש סבב תיקונים נוסף (נשארו {revisionRoundsLeft})
              </button>
            )}
          </>
        )}

        <button
          type="button"
          disabled
          title="פנייה לבוררות המערכת — בקרוב"
          className="text-error mt-1 flex items-center justify-center gap-1.5 text-xs disabled:opacity-60"
        >
          <ShieldCheckIcon className="size-3.5" />
          פתח מחלוקת / פנייה לבוררות המערכת
        </button>
      </div>
    </div>
  );
}
