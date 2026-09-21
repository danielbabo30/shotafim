"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { StatusChip } from "@/components/app/status-chip";
import type { ChipTone } from "@/lib/dashboard-brand";
import type { EscrowStatus } from "@/lib/reports";
import {
  MegaphoneIcon,
  ScreenIcon,
  VideoIcon,
  ReceiptIcon,
  DocumentIcon,
  DownloadIcon,
  ChartBarIcon,
  ChevronLeftIcon,
} from "@/components/marketing/icons";

export type LedgerRow = {
  id: string;
  ref: string;
  campaign: string;
  counterparty: string;
  counterpartyKind: "campaign" | "space" | "video";
  depositedAt: string;
  amountLabel: string;
  status: EscrowStatus;
  statusShort: string;
  statusTone: ChipTone;
  href?: string;
};

export type InvoiceRow = {
  id: string;
  number: string;
  issuedBy: string;
  issuedAt: string;
  amountLabel: string;
};

type Tab = "ledger" | "invoices";
type Filter = "all" | EscrowStatus;

const KIND_ICON = {
  campaign: MegaphoneIcon,
  space: ScreenIcon,
  video: VideoIcon,
} as const;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "כל הסטטוסים" },
  { value: "held", label: "נעול בנאמנות" },
  { value: "released", label: "שוחרר לספק" },
  { value: "refunded", label: "הוחזר בזיכוי" },
];

const th = "text-on-surface-variant px-4 py-3 text-start text-xs font-semibold whitespace-nowrap";
const td = "px-4 py-4 align-middle text-sm";

export function ReportsTabs({
  ledger,
  ledgerTotal,
  invoices,
}: {
  ledger: LedgerRow[];
  ledgerTotal: number;
  invoices: InvoiceRow[];
}) {
  const [tab, setTab] = useState<Tab>("ledger");
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(
    () => (filter === "all" ? ledger : ledger.filter((r) => r.status === filter)),
    [ledger, filter],
  );

  return (
    <section className="flex flex-col gap-6">
      {/* לשוניות */}
      <div
        role="tablist"
        aria-label="דוחות פיננסיים"
        className="border-outline-variant flex gap-6 border-b"
      >
        <TabButton
          active={tab === "ledger"}
          onClick={() => setTab("ledger")}
          icon={<ReceiptIcon className="size-5" />}
        >
          יומן תנועות ונאמנות
        </TabButton>
        <TabButton
          active={tab === "invoices"}
          onClick={() => setTab("invoices")}
          icon={<DocumentIcon className="size-5" />}
        >
          חשבוניות מס וקבלות
        </TabButton>
      </div>

      {tab === "ledger" ? (
        <div className="border-outline-variant bg-surface-lowest shadow-ambient overflow-hidden rounded-xl border">
          {/* סרגל כלים */}
          <div className="border-outline-variant flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-on-surface-variant">סינון לפי סטטוס</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as Filter)}
                className="border-outline-variant bg-surface-low text-on-surface focus:outline-primary rounded-lg border px-3 py-1.5 text-sm focus:outline-2"
              >
                {FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="text-primary hover:bg-surface-container inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors"
            >
              <DownloadIcon className="size-4" />
              ייצוא CSV
            </button>
          </div>

          {/* טבלה */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-surface-low border-outline-variant border-b">
                <tr>
                  <th className={th}>מזהה עסקה</th>
                  <th className={th}>קמפיין / ספק</th>
                  <th className={th}>תאריך הפקדה</th>
                  <th className={th}>סכום בש״ח</th>
                  <th className={th}>סטטוס נאמנות</th>
                  <th className={cn(th, "text-end")}>פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-outline-variant divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-low/60 transition-colors">
                    <td
                      className={cn(
                        td,
                        "text-on-surface-variant font-mono text-xs whitespace-nowrap",
                      )}
                    >
                      {r.ref}
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <span className="bg-surface-container text-on-surface-variant grid size-8 shrink-0 place-items-center rounded-full">
                          {(() => {
                            const Icon = KIND_ICON[r.counterpartyKind];
                            return <Icon className="size-4" />;
                          })()}
                        </span>
                        <span className="flex flex-col leading-tight">
                          <span className="text-on-surface font-medium">{r.campaign}</span>
                          <span className="text-on-surface-variant text-xs">{r.counterparty}</span>
                        </span>
                      </div>
                    </td>
                    <td className={cn(td, "text-on-surface-variant whitespace-nowrap")}>
                      {r.depositedAt}
                    </td>
                    <td
                      className={cn(
                        td,
                        "font-medium whitespace-nowrap",
                        r.status === "refunded" && "text-outline line-through",
                      )}
                    >
                      {r.amountLabel}
                    </td>
                    <td className={td}>
                      <StatusChip tone={r.statusTone}>{r.statusShort}</StatusChip>
                    </td>
                    <td className={cn(td, "text-end whitespace-nowrap")}>
                      {r.href ? (
                        <Link
                          href={r.href}
                          className="text-primary hover:text-primary-hover inline-flex items-center gap-1 text-sm font-semibold"
                        >
                          לחדר עבודה
                          <ChevronLeftIcon className="size-4" />
                        </Link>
                      ) : (
                        <span className="text-on-surface-variant text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-on-surface-variant px-4 py-10 text-center text-sm"
                    >
                      אין תנועות בסטטוס זה.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="border-outline-variant text-on-surface-variant border-t px-4 py-3 text-sm">
            מציג {rows.length} מתוך {ledgerTotal} תנועות
          </div>
        </div>
      ) : (
        <div className="border-outline-variant bg-surface-lowest shadow-ambient overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-surface-low border-outline-variant border-b">
                <tr>
                  <th className={th}>מספר חשבונית</th>
                  <th className={th}>הופקה על ידי</th>
                  <th className={th}>תאריך</th>
                  <th className={th}>סכום כולל מע״מ</th>
                  <th className={cn(th, "text-end")}>קובץ</th>
                </tr>
              </thead>
              <tbody className="divide-outline-variant divide-y">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-low/60 transition-colors">
                    <td
                      className={cn(
                        td,
                        "text-on-surface-variant font-mono text-xs whitespace-nowrap",
                      )}
                    >
                      {inv.number}
                    </td>
                    <td className={cn(td, "text-on-surface font-medium")}>{inv.issuedBy}</td>
                    <td className={cn(td, "text-on-surface-variant whitespace-nowrap")}>
                      {inv.issuedAt}
                    </td>
                    <td className={cn(td, "font-medium whitespace-nowrap")}>{inv.amountLabel}</td>
                    <td className={cn(td, "text-end")}>
                      <button
                        type="button"
                        className="text-primary hover:bg-surface-container inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors"
                      >
                        <DownloadIcon className="size-4" />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-outline-variant text-on-surface-variant flex items-center gap-1.5 border-t px-4 py-3 text-xs">
            <ChartBarIcon className="size-4 shrink-0" />
            החשבוניות נאספות אוטומטית מהספקים עם שחרור כל תשלום מהנאמנות.
          </div>
        </div>
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "-mb-px flex items-center gap-2 border-b-2 px-2 pb-3 text-sm font-semibold whitespace-nowrap transition-colors",
        active
          ? "border-primary text-primary"
          : "text-on-surface-variant hover:text-on-surface border-transparent",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
