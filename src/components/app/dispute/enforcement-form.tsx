"use client";

import { useActionState, useState } from "react";
import { issueEnforcement, DISPUTE_ACTION_INITIAL } from "@/lib/actions/dispute-actions";

const TYPES = [
  { value: "WARNING", label: "אזהרה — תיעוד בלבד, ללא סנקציה" },
  { value: "FINE", label: "קנס — סכום שנרשם לחובת המשתמש" },
  { value: "SUSPENSION", label: "השעיה — החשבון מושהה (SUSPENDED)" },
  { value: "BAN", label: "חסימה — החשבון נחסם לצמיתות (BANNED)" },
];

export function EnforcementForm({
  disputeId,
  parties,
}: {
  disputeId?: string;
  parties: { userId: string; name: string; role: string }[];
}) {
  const [state, formAction, pending] = useActionState(issueEnforcement, DISPUTE_ACTION_INITIAL);
  const [type, setType] = useState("");

  return (
    <form
      action={formAction}
      className="border-outline-variant bg-surface-lowest flex flex-col gap-3 rounded-lg border p-5"
    >
      {disputeId && <input type="hidden" name="disputeId" value={disputeId} />}
      <h3 className="text-on-surface text-sm font-bold">פעולת אכיפה</h3>

      <label className="text-on-surface-variant text-xs">כלפי מי</label>
      <select
        name="targetUserId"
        required
        defaultValue=""
        className="border-outline-variant bg-surface-container text-on-surface rounded-lg border px-3 py-2 text-sm"
      >
        <option value="" disabled>
          בחר משתמש…
        </option>
        {parties.map((p) => (
          <option key={p.userId} value={p.userId}>
            {p.name} ({p.role})
          </option>
        ))}
      </select>

      <label className="text-on-surface-variant text-xs">סוג</label>
      <select
        name="type"
        required
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="border-outline-variant bg-surface-container text-on-surface rounded-lg border px-3 py-2 text-sm"
      >
        <option value="" disabled>
          בחר סוג…
        </option>
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {type === "FINE" && (
        <input
          name="amountILS"
          type="number"
          min={1}
          step="1"
          required
          placeholder="סכום הקנס (₪)"
          className="border-outline-variant bg-surface-container text-on-surface rounded-lg border px-3 py-2 text-sm"
        />
      )}

      <textarea
        name="reason"
        required
        rows={2}
        placeholder="נימוק לאכיפה…"
        className="border-outline-variant bg-surface-container text-on-surface rounded-lg border px-3 py-2 text-sm"
      />

      {state.status === "error" && (
        <p className="text-error text-xs font-medium">{state.message}</p>
      )}
      {state.status === "success" && (
        <p className="text-success text-xs font-medium">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="border-error text-error hover:bg-error-container/40 h-11 rounded-lg border text-sm font-semibold disabled:opacity-60"
      >
        {pending ? "רושם…" : "רשום פעולת אכיפה"}
      </button>
    </form>
  );
}
