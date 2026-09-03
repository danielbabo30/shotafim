"use client";

import { useActionState, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { BoltIcon, LinkIcon, PriceTagIcon } from "@/components/marketing/icons";
import { CONTRACT_ACTION_INITIAL } from "@/lib/contract-room";
import {
  fundPartnerDeposit,
  submitGateChoice,
  topUpPartnerDeposit,
} from "@/lib/actions/partner-actions";
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
const dateFmt = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const STATUS_META: Record<PartnerProgramView["status"], { label: string; className: string }> = {
  PENDING_DEPOSIT: { label: "ממתין להפקדת פיקדון", className: "bg-warning-container text-warning" },
  ACTIVE: { label: "פעיל", className: "bg-success-container text-success" },
  GATE_80: { label: "שער 80% — נדרשת החלטה", className: "bg-warning-container text-warning" },
  PAUSED: { label: "מושהה", className: "bg-error-container text-on-error-container" },
  CLOSED: { label: "הסתיים", className: "bg-surface-container text-on-surface-variant" },
};

const feedbackClass = (status: string) =>
  cn(
    "rounded-lg px-3 py-2 text-sm font-medium",
    status === "success"
      ? "bg-success-container text-success"
      : "bg-error-container text-on-error-container",
  );

export function PartnerProgramPanel({ program }: { program: PartnerProgramView }) {
  const isBrand = program.viewerParty === "brand";
  const live = program.status === "ACTIVE" || program.status === "GATE_80";
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

      {/* פיקדון + ניצול */}
      <div className="border-outline-variant bg-surface-container flex flex-col gap-2 rounded-lg border p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-on-surface-variant text-xs">
            {program.depositFunded ? "נוצל מהפיקדון" : "פיקדון נדרש"}
          </span>
          <span className="text-on-surface text-lg font-bold">
            {program.depositFunded
              ? `${currency.format(program.drainedILS)} / ${currency.format(program.depositILS)}`
              : currency.format(program.requiredDepositILS)}
          </span>
        </div>
        {program.depositFunded && (
          <>
            <div className="bg-surface-lowest h-2 overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full",
                  program.utilizationPct >= 100
                    ? "bg-error"
                    : program.utilizationPct >= 80
                      ? "bg-warning"
                      : "bg-primary",
                )}
                style={{ width: `${Math.min(100, program.utilizationPct)}%` }}
              />
            </div>
            <span className="text-on-surface-variant text-xs">
              {program.utilizationPct}% ניצול · הפיקדון מנוקז לפי עמלות מאושרות
            </span>
          </>
        )}
      </div>

      {/* לינק / קופון — "עולה לאוויר" רק כשהשותפות פעילה */}
      <div className="flex flex-col gap-2">
        <LinkRow
          value={`go.bridgead.co.il/r/${program.refCode}`}
          live={live}
          icon={<LinkIcon className="text-on-surface-variant size-4 shrink-0" />}
        />
        {program.couponCode && (
          <LinkRow
            value={program.couponCode}
            suffix={
              program.couponDiscountPct != null
                ? `${program.couponDiscountPct}% הנחה לקונה`
                : undefined
            }
            live={live}
            icon={<PriceTagIcon className="text-on-surface-variant size-4 shrink-0" />}
          />
        )}
      </div>

      <div className="border-outline-variant flex flex-col gap-3 border-t pt-4">
        <ActionSection program={program} isBrand={isBrand} />
      </div>
    </div>
  );
}

function ActionSection({ program, isBrand }: { program: PartnerProgramView; isBrand: boolean }) {
  const [fundState, fundAction, funding] = useActionState(
    fundPartnerDeposit,
    CONTRACT_ACTION_INITIAL,
  );
  const [gateState, gateAction, gating] = useActionState(submitGateChoice, CONTRACT_ACTION_INITIAL);
  const [topUpState, topUpAction, toppingUp] = useActionState(
    topUpPartnerDeposit,
    CONTRACT_ACTION_INITIAL,
  );
  const [addAmount, setAddAmount] = useState("");
  const feedback = [fundState, gateState, topUpState].find((s) => s.status !== "idle");
  const myChoice = isBrand ? program.openGate?.brandChoice : program.openGate?.providerChoice;

  const topUpForm = (
    <form action={topUpAction} className="flex flex-col gap-2">
      <input type="hidden" name="contractId" value={program.contractId} />
      <label className="text-on-surface-variant text-xs">סכום הטענה (₪)</label>
      <input
        name="addAmountILS"
        type="number"
        min={1}
        step={100}
        inputMode="numeric"
        value={addAmount}
        onChange={(e) => setAddAmount(e.target.value)}
        className="border-outline-variant bg-surface-container focus:border-primary text-on-surface rounded-lg border px-3 py-2 text-sm focus:outline-none"
      />
      <button
        type="submit"
        disabled={toppingUp || !addAmount}
        className="bg-primary text-on-primary hover:bg-primary-hover h-11 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
      >
        {toppingUp ? "מטעין…" : "הטען פיקדון והמשך"}
      </button>
    </form>
  );

  return (
    <>
      {feedback && feedback.status !== "idle" && feedback.message && (
        <p role="status" className={feedbackClass(feedback.status)}>
          {feedback.message}
        </p>
      )}

      {program.status === "PENDING_DEPOSIT" && isBrand && (
        <form action={fundAction} className="flex flex-col gap-2">
          <input type="hidden" name="contractId" value={program.contractId} />
          <p className="text-on-surface-variant text-xs">
            הפקדת הפיקדון תפעיל את הלינק והקופון. הסכום מוחזק בנאמנות ומנוקז לפי מכירות בפועל.
          </p>
          <button
            type="submit"
            disabled={funding}
            className="bg-primary text-on-primary hover:bg-primary-hover h-11 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {funding ? "מפקיד…" : `הפקד ${currency.format(program.requiredDepositILS)} לנאמנות`}
          </button>
        </form>
      )}

      {program.status === "PENDING_DEPOSIT" && !isBrand && (
        <p className="text-on-surface-variant rounded-lg px-3 py-2 text-center text-xs leading-relaxed">
          הלינק והקופון יופעלו לאחר שהמפרסם יפקיד את פיקדון השותפות.
        </p>
      )}

      {program.status === "GATE_80" && program.openGate && (
        <div className="flex flex-col gap-3">
          <p className="text-on-surface text-sm font-medium">
            נוצלו {program.utilizationPct}% מהפיקדון. יש להחליט יחד — להטעין ולהמשיך, או לעצור.
          </p>
          <div className="text-on-surface-variant flex gap-3 text-xs">
            <span>מפרסם: {choiceLabel(program.openGate.brandChoice)}</span>
            <span>יוצר: {choiceLabel(program.openGate.providerChoice)}</span>
          </div>
          {!myChoice ? (
            <form action={gateAction} className="flex gap-2">
              <input type="hidden" name="contractId" value={program.contractId} />
              <button
                type="submit"
                name="choice"
                value="CONTINUE"
                disabled={gating}
                className="border-outline text-on-surface hover:bg-surface-container h-10 flex-1 rounded-lg border text-sm font-medium disabled:opacity-60"
              >
                המשך
              </button>
              <button
                type="submit"
                name="choice"
                value="STOP"
                disabled={gating}
                className="border-outline text-on-surface hover:bg-surface-container h-10 flex-1 rounded-lg border text-sm font-medium disabled:opacity-60"
              >
                עצור
              </button>
            </form>
          ) : (
            <p className="text-on-surface-variant text-xs">
              בחירתך נרשמה: {choiceLabel(myChoice)}.
            </p>
          )}
          {isBrand && <div className="border-outline-variant border-t pt-3">{topUpForm}</div>}
        </div>
      )}

      {program.status === "PAUSED" && isBrand && (
        <div className="flex flex-col gap-2">
          <p className="text-on-surface-variant text-xs">
            השותפות מושהית. הטענת פיקדון תחזיר את הלינק והקופון לפעילות.
          </p>
          {topUpForm}
        </div>
      )}

      {program.status === "PAUSED" && !isBrand && (
        <p className="text-on-surface-variant rounded-lg px-3 py-2 text-center text-xs leading-relaxed">
          השותפות מושהית עד שהמפרסם יטעין את הפיקדון מחדש.
        </p>
      )}

      {program.status === "ACTIVE" && (
        <p className="text-on-surface-variant text-center text-xs leading-relaxed">
          השותפות פעילה. מעקב הקליקים, הרכישות והעמלות מוצג למטה — שני הצדדים רואים את אותם נתונים.
        </p>
      )}

      {program.status === "CLOSED" && (
        <p className="text-on-surface-variant text-center text-xs leading-relaxed">
          השותפות הסתיימה ויתרת הפיקדון הוחזרה למפרסם.
        </p>
      )}
    </>
  );
}

function choiceLabel(c: "CONTINUE" | "STOP" | null | undefined): string {
  if (c === "CONTINUE") return "המשך";
  if (c === "STOP") return "עצור";
  return "ממתין";
}

function LinkRow({
  value,
  suffix,
  live,
  icon,
}: {
  value: string;
  suffix?: string;
  live: boolean;
  icon: ReactNode;
}) {
  return (
    <div className="border-outline-variant flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      {icon}
      <span dir="ltr" className="text-on-surface truncate font-mono text-xs">
        {value}
      </span>
      {suffix && <span className="text-on-surface-variant text-xs">({suffix})</span>}
      <span
        className={cn(
          "ms-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
          live
            ? "bg-success-container text-success"
            : "bg-surface-container text-on-surface-variant",
        )}
      >
        {live ? "פעיל" : "ממתין"}
      </span>
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
