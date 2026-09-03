"use client";

import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { BoltIcon, LinkIcon, PriceTagIcon, ShieldCheckIcon } from "@/components/marketing/icons";
import { CONTRACT_ACTION_INITIAL } from "@/lib/contract-room";
import { fundPartnerDeposit } from "@/lib/actions/partner-actions";
import {
  ATTRIBUTION_MODE_LABEL,
  COMMISSION_BASIS_LABEL,
  COMMISSION_SCOPE_LABEL,
} from "@/lib/partner-terms";
import type { PartnerProgramView } from "@/lib/partner-program";

const currency = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});
const dateFmt = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" });

const STATUS_META: Record<PartnerProgramView["status"], { label: string; className: string }> = {
  PENDING_DEPOSIT: { label: "ממתין להפקדת פיקדון", className: "bg-warning-container text-warning" },
  ACTIVE: { label: "פעיל", className: "bg-success-container text-success" },
  GATE_80: { label: "שער 80% — נדרשת החלטה", className: "bg-warning-container text-warning" },
  PAUSED: { label: "מושהה", className: "bg-error-container text-on-error-container" },
  CLOSED: { label: "הסתיים", className: "bg-surface-container text-on-surface-variant" },
};

export function PartnerProgramPanel({ program }: { program: PartnerProgramView }) {
  const [state, action, pending] = useActionState(fundPartnerDeposit, CONTRACT_ACTION_INITIAL);
  const isBrand = program.viewerParty === "brand";
  const isActive = program.status === "ACTIVE";
  const commissionText =
    program.commissionType === "PERCENT"
      ? `${program.commissionValue}% מהרכישה`
      : `${currency.format(program.commissionValue)} לרכישה`;
  const status = STATUS_META[program.status];

  return (
    <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col gap-5 rounded-lg border p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BoltIcon className="text-primary size-5" />
          <h2 className="text-on-surface text-sm font-semibold">שותפות — תשלום פר רכישה</h2>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", status.className)}>
          {status.label}
        </span>
      </div>

      {state.status !== "idle" && state.message && (
        <p
          role="status"
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium",
            state.status === "success"
              ? "bg-success-container text-success"
              : "bg-error-container text-on-error-container",
          )}
        >
          {state.message}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Row term="עמלה" detail={commissionText} />
        <Row term="בסיס" detail={COMMISSION_BASIS_LABEL[program.commissionBasis]} />
        <Row term="היקף" detail={COMMISSION_SCOPE_LABEL[program.commissionScope]} />
        <Row term="מצב שיוך" detail={ATTRIBUTION_MODE_LABEL[program.attributionMode]} />
        <Row term="תחזית רכישות" detail={`${program.estimatedPurchases}`} />
        <Row term="ערך הזמנה ממוצע" detail={currency.format(program.assumedAovILS)} />
        <Row term="עמלת פלטפורמה" detail={`${program.platformFeePct}%`} />
        <Row term="התחלה" detail={dateFmt.format(program.startDate)} />
        <Row term="סיום" detail={dateFmt.format(program.endDate)} />
      </dl>

      <div className="border-outline-variant bg-surface-container rounded-lg border p-4 text-center">
        <p className="text-on-surface text-2xl font-bold">
          {currency.format(program.requiredDepositILS)}
        </p>
        <p className="text-on-surface-variant text-xs">
          {program.depositFunded ? "פיקדון מופקד ומוחזק בנאמנות" : "פיקדון נדרש להפעלת השותפות"}
        </p>
      </div>

      {/* לינק / קופון — "עולה לאוויר" רק כשהשותפות ACTIVE */}
      <div className="flex flex-col gap-2">
        <div className="border-outline-variant flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <LinkIcon className="text-on-surface-variant size-4 shrink-0" />
          <span dir="ltr" className="text-on-surface truncate font-mono text-xs">
            go.bridgead.co.il/r/{program.refCode}
          </span>
          <span
            className={cn(
              "ms-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              isActive
                ? "bg-success-container text-success"
                : "bg-surface-container text-on-surface-variant",
            )}
          >
            {isActive ? "פעיל" : "ממתין"}
          </span>
        </div>
        {program.couponCode && (
          <div className="border-outline-variant flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <PriceTagIcon className="text-on-surface-variant size-4 shrink-0" />
            <span dir="ltr" className="text-on-surface font-mono text-xs">
              {program.couponCode}
            </span>
            {program.couponDiscountPct != null && (
              <span className="text-on-surface-variant text-xs">
                ({program.couponDiscountPct}% הנחה לקונה)
              </span>
            )}
            <span
              className={cn(
                "ms-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                isActive
                  ? "bg-success-container text-success"
                  : "bg-surface-container text-on-surface-variant",
              )}
            >
              {isActive ? "פעיל" : "ממתין"}
            </span>
          </div>
        )}
      </div>

      <div className="border-outline-variant flex flex-col gap-3 border-t pt-4">
        {program.status === "PENDING_DEPOSIT" && isBrand ? (
          <form action={action} className="flex flex-col gap-2">
            <input type="hidden" name="contractId" value={program.contractId} />
            <p className="text-on-surface-variant text-xs">
              הפקדת הפיקדון תפעיל את הלינק והקופון. הסכום מוחזק בנאמנות ומנוקז לפי מכירות בפועל.
            </p>
            <button
              type="submit"
              disabled={pending}
              className="bg-primary text-on-primary hover:bg-primary-hover h-11 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {pending
                ? "מפקיד…"
                : `הפקד ${currency.format(program.requiredDepositILS)} לנאמנות`}
            </button>
          </form>
        ) : program.status === "PENDING_DEPOSIT" ? (
          <p className="text-on-surface-variant rounded-lg px-3 py-2 text-center text-xs leading-relaxed">
            הלינק והקופון יופעלו לאחר שהמפרסם יפקיד את פיקדון השותפות.
          </p>
        ) : (
          <p className="text-on-surface-variant flex items-center justify-center gap-1.5 text-xs">
            <ShieldCheckIcon className="size-3.5" />
            מעקב הקליקים והרכישות, שער ה-80% ותחנות התשלום — בפיתוח.
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ term, detail }: { term: string; detail: string }) {
  return (
    <div>
      <dt className="text-on-surface-variant text-xs">{term}</dt>
      <dd className="text-on-surface mt-0.5 font-medium">{detail}</dd>
    </div>
  );
}
