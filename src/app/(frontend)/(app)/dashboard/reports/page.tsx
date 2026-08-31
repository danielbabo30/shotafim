import type { Metadata } from "next";
import { requireActiveUser } from "@/lib/app-user";
import { formatShekels } from "@/lib/dashboard-brand";
import { getReportsData, ESCROW_STATUS_META } from "@/lib/reports";
import { StatCard } from "@/components/app/stat-card";
import { ReportsTabs } from "@/components/app/reports-tabs";
import { Button } from "@/components/ui/button";
import {
  LockIcon,
  WalletIcon,
  CheckCircleIcon,
  TrendUpIcon,
  InfoIcon,
  PlusIcon,
  DownloadIcon,
  ReceiptIcon,
} from "@/components/marketing/icons";

export const metadata: Metadata = { title: "דוחות" };

export default async function ReportsPage() {
  const user = await requireActiveUser();
  const data = await getReportsData(user.id);
  const { kpis } = data;

  const ledgerRows = data.ledger.map((t) => ({
    id: t.id,
    ref: t.ref,
    campaign: t.campaign,
    counterparty: t.counterparty,
    counterpartyKind: t.counterpartyKind,
    depositedAt: t.depositedAt,
    amountLabel: formatShekels(t.amount),
    status: t.status,
    statusShort: ESCROW_STATUS_META[t.status].short,
    statusTone: ESCROW_STATUS_META[t.status].tone,
    href: t.href,
  }));

  const invoiceRows = data.invoices.map((inv) => ({
    id: inv.id,
    number: inv.number,
    issuedBy: inv.issuedBy,
    issuedAt: inv.issuedAt,
    amountLabel: formatShekels(inv.amount),
  }));

  return (
    <div className="flex flex-col gap-8">
      {/* כותרת + פעולה ראשית */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-on-surface text-2xl font-bold">דוחות פיננסיים ונאמנות</h1>
          <p className="text-on-surface-variant mt-1 max-w-2xl text-sm leading-relaxed">
            מעקב אחר תקציבים נעולים בנאמנות, שחרור תשלומים וריכוז חשבוניות מס.
          </p>
        </div>
        <Button className="shrink-0">
          <PlusIcon className="size-4" />
          הפקד תקציב לארנק
        </Button>
      </div>

      {/* כרטיסי KPI */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          label="תקציב נעול בנאמנות (Escrow)"
          value={formatShekels(kpis.escrowLocked)}
          icon={<LockIcon className="size-5" />}
          tone="primary"
          hint={
            <>
              <InfoIcon className="size-4 shrink-0" />
              ממתין לשחרור או אישור קמפיינים
            </>
          }
        />
        <StatCard
          label="יתרה זמינה להקצאה מיידית"
          value={formatShekels(kpis.availableBalance)}
          icon={<WalletIcon className="size-5" />}
          tone="neutral"
          hint={
            <span className="text-primary flex items-center gap-1.5">
              <PlusIcon className="size-4 shrink-0" />
              הפקד עוד ליתרה
            </span>
          }
        />
        <StatCard
          label="סה״כ שוחרר ליוצרים החודש"
          value={formatShekels(kpis.releasedThisMonth)}
          icon={<CheckCircleIcon className="size-5" />}
          tone="success"
          hint={
            <>
              <TrendUpIcon className="size-4 shrink-0" />
              {kpis.releasedTrend}
            </>
          }
        />
      </div>

      {/* לשוניות: יומן תנועות / חשבוניות */}
      <ReportsTabs ledger={ledgerRows} ledgerTotal={data.ledgerTotal} invoices={invoiceRows} />

      {/* ריכוז חשבוניות חודשי */}
      <div className="border-outline-variant bg-surface-low flex flex-col items-start justify-between gap-4 rounded-xl border p-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="bg-surface-highest text-primary grid size-12 shrink-0 place-items-center rounded-xl">
            <ReceiptIcon className="size-6" />
          </span>
          <div>
            <h2 className="text-on-surface text-lg font-bold">ריכוז חשבוניות מס חודשי</h2>
            <p className="text-on-surface-variant mt-0.5 text-sm">
              קובץ PDF/Excel להנהלת חשבונות עבור חודש {data.bundleMonthLabel}
            </p>
          </div>
        </div>
        <Button variant="ghost" className="shrink-0">
          <DownloadIcon className="size-4" />
          הורד קובץ מרוכז
        </Button>
      </div>
    </div>
  );
}
