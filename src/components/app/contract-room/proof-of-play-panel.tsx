"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/app/status-chip";
import { submitProofOfPlay, verifyProofOfPlay } from "@/lib/actions/proof-actions";
import { CONTRACT_ACTION_INITIAL } from "@/lib/contract-room";
import { PROOF_TYPE_LABELS, type ProofOfPlayView } from "@/lib/proof-of-play-labels";

const field =
  "bg-surface-low text-on-surface focus:bg-surface-lowest focus:ring-primary h-11 w-full rounded-lg border-0 px-4 transition-colors focus:ring-2 focus:outline-none";
const labelCls = "text-on-surface mb-1 block text-sm font-semibold";

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** הוכחות שידור בחדר העבודה של חוזה שטח פרסום — בעל השטח מוסיף, המפרסם מאשר */
export function ProofOfPlayPanel({
  contractId,
  viewerParty,
  canUpload,
  proofs,
}: {
  contractId: string;
  viewerParty: "brand" | "provider";
  canUpload: boolean;
  proofs: ProofOfPlayView[];
}) {
  const [state, formAction, pending] = useActionState(submitProofOfPlay, CONTRACT_ACTION_INITIAL);

  return (
    <section
      id="proof-of-play"
      className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col gap-4 rounded-lg border p-6"
    >
      <h2 className="text-on-surface text-lg font-bold">הוכחות שידור</h2>

      {proofs.length === 0 ? (
        <p className="text-on-surface-variant text-sm">עדיין לא הוגשו הוכחות שידור.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {proofs.map((p) => (
            <li
              key={p.id}
              className="border-outline-variant flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0 text-sm">
                <p className="text-on-surface font-semibold">{PROOF_TYPE_LABELS[p.proofType]}</p>
                <a
                  href={p.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary break-all hover:underline"
                >
                  {p.fileUrl}
                </a>
                {p.notes && <p className="text-on-surface-variant mt-1">{p.notes}</p>}
                <p className="text-on-surface-variant mt-1 text-xs">
                  {dateFmt.format(p.uploadedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusChip tone={p.verifiedByBrand ? "success" : "warning"}>
                  {p.verifiedByBrand ? "אושרה" : "ממתינה לאישור"}
                </StatusChip>
                {viewerParty === "brand" && !p.verifiedByBrand && (
                  <form action={verifyProofOfPlay}>
                    <input type="hidden" name="proofId" value={p.id} />
                    <Button type="submit" size="md">
                      אשר הוכחה
                    </Button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canUpload && (
        <form
          action={formAction}
          className="border-outline-variant flex flex-col gap-3 border-t pt-4"
        >
          <input type="hidden" name="contractId" value={contractId} />
          {state?.status === "error" && state.message && (
            <p className="bg-error-container text-on-error-container rounded-lg p-3 text-sm">
              {state.message}
            </p>
          )}
          {state?.status === "success" && state.message && (
            <p className="bg-success-container text-success rounded-lg p-3 text-sm">
              {state.message}
            </p>
          )}
          <div>
            <label htmlFor="proof-type" className={labelCls}>
              סוג הוכחה
            </label>
            <select id="proof-type" name="proofType" className={field} defaultValue="PHOTO_PROOF">
              {Object.entries(PROOF_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="proof-url" className={labelCls}>
              קישור להוכחה (תמונה / וידאו / קובץ)
            </label>
            <input
              id="proof-url"
              name="fileUrl"
              type="url"
              required
              maxLength={500}
              placeholder="https://"
              className={field}
              dir="ltr"
            />
          </div>
          <div>
            <label htmlFor="proof-notes" className={labelCls}>
              הערות (אופציונלי)
            </label>
            <textarea
              id="proof-notes"
              name="notes"
              rows={2}
              maxLength={1000}
              className={`${field} h-auto py-2.5`}
            />
          </div>
          <Button type="submit" size="md" disabled={pending} className="w-full sm:w-auto">
            {pending ? "שולח…" : "שלח הוכחת שידור"}
          </Button>
        </form>
      )}
    </section>
  );
}
