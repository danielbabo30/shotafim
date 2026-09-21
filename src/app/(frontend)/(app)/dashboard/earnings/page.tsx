import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/app-user";
import { formatShekels } from "@/lib/dashboard-brand";
import {
  getCreatorEarnings,
  TRANSACTION_TYPE_LABELS,
  ESCROW_STATUS_LABELS,
  INVOICE_DOC_TYPE_LABELS,
} from "@/lib/earnings";
import { StatCard } from "@/components/app/stat-card";
import {
  WalletIcon,
  LockIcon,
  CheckCircleIcon,
  BankIcon,
  InfoIcon,
} from "@/components/marketing/icons";

export const metadata: Metadata = { title: "הכנסות" };

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const fmtDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : "—");

const TXN_STATUS_LABEL: Record<string, string> = {
  PENDING: "ממתין",
  SUCCESS: "הושלם",
  FAILED: "נכשל",
};

export default async function EarningsPage() {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("creator")) redirect("/dashboard");

  const data = await getCreatorEarnings(user.id, true);
  const { kpis, escrow, transactions, invoices } = data;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-on-surface text-2xl font-bold sm:text-3xl">הכנסות</h1>
        <p className="text-on-surface-variant text-sm">
          תשלומים מקמפיינים, יתרות בנאמנות ומשיכות לחשבון הבנק.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="יתרה זמינה למשיכה"
          value={formatShekels(kpis.availableBalance)}
          icon={<WalletIcon className="size-5" />}
          tone="success"
          hint="שוחרר אליך פחות מה שכבר נמשך"
        />
        <StatCard
          label="נעול בנאמנות"
          value={formatShekels(kpis.heldInEscrow)}
          icon={<LockIcon className="size-5" />}
          tone="primary"
          hint="תקציב מובטח שממתין לשחרור"
        />
        <StatCard
          label="סך שוחרר"
          value={formatShekels(kpis.totalReleased)}
          icon={<CheckCircleIcon className="size-5" />}
          hint="מצטבר מכל הקמפיינים"
        />
        <StatCard
          label="נמשך לבנק"
          value={formatShekels(kpis.withdrawn)}
          icon={<BankIcon className="size-5" />}
          hint="סך המשיכות שבוצעו"
        />
      </div>

      <p className="border-outline-variant bg-surface-container text-on-surface-variant flex items-start gap-2 rounded-lg border p-3 text-xs leading-relaxed">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        המשיכות מעובדות ידנית על ידי צוות שותפים עד לחיבור מלא של ספק סליקה. יתרה זמינה משוחררת
        לחשבון הבנק שהוגדר בהגדרות תוך 3 ימי עסקים.
      </p>

      {/* נאמנות לפי חוזה */}
      <section className="flex flex-col gap-3">
        <h2 className="text-on-surface text-lg font-bold">נאמנות לפי קמפיין</h2>
        {escrow.length === 0 ? (
          <p className="border-outline-variant bg-surface-lowest text-on-surface-variant rounded-xl border p-4 text-sm">
            עדיין אין תקציבים בנאמנות. הם יופיעו כאן ברגע שמפרסם יפקיד תקציב עבור קמפיין שלך.
          </p>
        ) : (
          <div className="border-outline-variant overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[40rem] text-start text-sm">
              <thead className="bg-surface-container text-on-surface-variant">
                <tr>
                  <th className="p-3 text-start font-medium">קמפיין</th>
                  <th className="p-3 text-start font-medium">מפרסם</th>
                  <th className="p-3 text-start font-medium">סכום</th>
                  <th className="p-3 text-start font-medium">סטטוס</th>
                  <th className="p-3 text-start font-medium">הופקד</th>
                  <th className="p-3 text-start font-medium">שוחרר</th>
                </tr>
              </thead>
              <tbody className="divide-outline-variant divide-y">
                {escrow.map((e) => (
                  <tr key={e.contractId} className="text-on-surface">
                    <td className="p-3">{e.campaignTitle}</td>
                    <td className="p-3">{e.businessName}</td>
                    <td className="p-3 font-semibold">{formatShekels(e.amount)}</td>
                    <td className="p-3">{ESCROW_STATUS_LABELS[e.status]}</td>
                    <td className="p-3">{fmtDate(e.fundedAt)}</td>
                    <td className="p-3">{fmtDate(e.releasedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* יומן תנועות */}
      <section className="flex flex-col gap-3">
        <h2 className="text-on-surface text-lg font-bold">יומן תנועות</h2>
        {transactions.length === 0 ? (
          <p className="border-outline-variant bg-surface-lowest text-on-surface-variant rounded-xl border p-4 text-sm">
            אין עדיין תנועות כספיות בחשבון שלך.
          </p>
        ) : (
          <div className="border-outline-variant overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[36rem] text-start text-sm">
              <thead className="bg-surface-container text-on-surface-variant">
                <tr>
                  <th className="p-3 text-start font-medium">תאריך</th>
                  <th className="p-3 text-start font-medium">סוג</th>
                  <th className="p-3 text-start font-medium">קמפיין</th>
                  <th className="p-3 text-start font-medium">סכום</th>
                  <th className="p-3 text-start font-medium">עמלה</th>
                  <th className="p-3 text-start font-medium">סטטוס</th>
                </tr>
              </thead>
              <tbody className="divide-outline-variant divide-y">
                {transactions.map((t) => (
                  <tr key={t.id} className="text-on-surface">
                    <td className="p-3">{fmtDate(t.createdAt)}</td>
                    <td className="p-3">{TRANSACTION_TYPE_LABELS[t.type]}</td>
                    <td className="p-3">{t.context ?? "—"}</td>
                    <td className="p-3 font-semibold">{formatShekels(t.amount)}</td>
                    <td className="p-3">{t.feeAmount ? formatShekels(t.feeAmount) : "—"}</td>
                    <td className="p-3">{TXN_STATUS_LABEL[t.status] ?? t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* חשבוניות */}
      <section className="flex flex-col gap-3">
        <h2 className="text-on-surface text-lg font-bold">חשבוניות וקבלות</h2>
        {invoices.length === 0 ? (
          <p className="border-outline-variant bg-surface-lowest text-on-surface-variant rounded-xl border p-4 text-sm">
            חשבוניות מס וקבלות על תשלומים שקיבלת יופיעו כאן.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="border-outline-variant bg-surface-lowest flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm"
              >
                <div>
                  <p className="text-on-surface font-semibold">
                    {INVOICE_DOC_TYPE_LABELS[inv.documentType] ?? inv.documentType}
                    {inv.number ? ` · ${inv.number}` : ""}
                  </p>
                  <p className="text-on-surface-variant text-xs">
                    {inv.issuedBy} · {fmtDate(inv.issuedAt)}
                  </p>
                </div>
                <span className="text-on-surface font-semibold">
                  {formatShekels(inv.totalAmount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
