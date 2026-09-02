import Link from "next/link";
import { BankIcon, ArrowDownIcon, ArrowUpIcon } from "@/components/marketing/icons";
import { formatShekels, type LedgerEntry } from "@/lib/dashboard-brand";

/** יומן תנועות הנאמנות — הטור הצר בלוח-הבקרה */
export function EscrowLedger({ entries }: { entries: LedgerEntry[] }) {
  return (
    <section className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col rounded-xl border p-5">
      <h2 className="font-display text-on-surface mb-4 flex items-center gap-2 text-xl font-bold">
        <BankIcon className="text-primary size-5" />
        יומן תנועות נאמנות
      </h2>

      <ul className="divide-outline-variant flex flex-col divide-y">
        {entries.map((e) => {
          const incoming = e.direction === "in";
          const inner = (
            <>
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={
                    incoming
                      ? "bg-success-container text-success grid size-8 shrink-0 place-items-center rounded-full"
                      : "bg-warning-container text-warning grid size-8 shrink-0 place-items-center rounded-full"
                  }
                >
                  {incoming ? (
                    <ArrowDownIcon className="size-4" />
                  ) : (
                    <ArrowUpIcon className="size-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-on-surface truncate text-sm font-medium">{e.title}</p>
                  <p className="text-on-surface-variant truncate text-xs">{e.timestamp}</p>
                </div>
              </div>
              <span
                className={
                  incoming
                    ? "text-success text-sm font-semibold"
                    : "text-on-surface-variant text-sm font-semibold"
                }
              >
                {incoming ? "+" : "−"}
                {formatShekels(e.amount)}
              </span>
            </>
          );
          return (
            <li key={e.id} className="first:pt-0">
              {e.href ? (
                <Link
                  href={e.href}
                  className="hover:bg-surface-low -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors"
                >
                  {inner}
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-3 py-3">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>

      <Link
        href="/dashboard/reports"
        className="border-outline-variant text-on-surface-variant hover:bg-surface-low mt-4 flex h-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors"
      >
        צפייה בכל התנועות
      </Link>
    </section>
  );
}
