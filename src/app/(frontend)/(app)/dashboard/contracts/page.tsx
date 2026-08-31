import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/app-user";
import { listBusinessContracts } from "@/lib/contracts";
import { CONTRACT_STATUS_META } from "@/lib/contract-room";
import { ChevronLeftIcon } from "@/components/marketing/icons";

export const metadata: Metadata = { title: "חוזים" };

const currency = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});
const shortDate = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium" });

export default async function ContractsPage() {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("brand")) redirect("/dashboard");

  const contracts = await listBusinessContracts();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-on-surface text-2xl font-bold">חוזים</h1>
        <p className="text-on-surface-variant mt-1 text-sm">
          הסכמי העבודה הפעילים מול יוצרים ובעלי שטחים.
        </p>
      </header>

      {contracts.length === 0 ? (
        <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border border-dashed p-10 text-center">
          <h2 className="text-on-surface text-lg font-bold">עוד אין חוזים</h2>
          <p className="text-on-surface-variant mx-auto mt-2 max-w-md text-sm leading-relaxed">
            חוזה נוצר לאחר אישור הצעת מחיר של יוצר והפקדת התקציב לנאמנות.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {contracts.map((c) => {
            const meta = CONTRACT_STATUS_META[c.status];
            return (
              <li key={c.id}>
                <Link
                  href={`/dashboard/contracts/${c.id}`}
                  className="border-outline-variant bg-surface-lowest shadow-ambient-sm hover:border-primary flex items-center justify-between gap-3 rounded-lg border p-5 transition-colors"
                >
                  <div className="min-w-0">
                    <h3 className="text-on-surface truncate text-base font-bold">
                      {c.campaignTitle}
                    </h3>
                    <p className="text-on-surface-variant mt-1 text-xs">
                      מול {c.providerName} · יעד {shortDate.format(c.deadline)} ·{" "}
                      {currency.format(c.agreedPriceILS)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                    <ChevronLeftIcon className="text-on-surface-variant size-4" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
