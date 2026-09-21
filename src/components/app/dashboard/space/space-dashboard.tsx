import Link from "next/link";
import {
  LockIcon,
  CheckCircleIcon,
  DevicesIcon,
  CameraIcon,
  PlusIcon,
} from "@/components/marketing/icons";
import { KpiCard } from "@/components/app/dashboard/kpi-card";
import { BroadcastCard } from "@/components/app/dashboard/space/broadcast-card";
import { OccupancyCalendar } from "@/components/app/dashboard/space/occupancy-calendar";
import { getSpaceDashboardData, formatShekels } from "@/lib/dashboard-space";
import type { AppUser } from "@/lib/app-user";

/** לוח-הבקרה של בעל שטחי הפרסום (כובע "מדיה") */
export async function SpaceDashboard({ user }: { user: AppUser }) {
  const { company, kpis, broadcasts, calendar } = await getSpaceDashboardData(user.id);

  const headline = company ? `ניהול שטחי פרסום · ${company}` : "ניהול שטחי פרסום";
  const subtitle =
    kpis.proofsPending > 0
      ? `תפוסת השטחים השבוע עומדת על ${kpis.occupancyPct}%. יש ${kpis.proofsPending} ${
          kpis.proofsPending === 1 ? "הוכחת שידור" : "הוכחות שידור"
        } להעלאה לשחרור כספי נאמנות.`
      : `תפוסת השטחים השבוע עומדת על ${kpis.occupancyPct}%. אין הוכחות שידור שממתינות לך.`;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-on-surface font-display text-2xl font-bold sm:text-3xl">
            {headline}
          </h1>
          <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
            {subtitle}
          </p>
        </div>
        <Link
          href="/dashboard/assets/new"
          className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-lg px-5 text-sm font-semibold transition-colors"
        >
          <PlusIcon className="size-4" />
          הוספת נכס חדש
        </Link>
      </header>

      {/* רצועת KPI */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<LockIcon className="size-5" />}
          iconTone="primary"
          accent
          href="/dashboard/contracts"
          label="נעול בנאמנות (קרובים)"
          value={formatShekels(kpis.escrowUpcoming)}
          badge={{ label: `${kpis.escrowUpcomingDeals} עסקאות בנאמנות`, tone: "primary" }}
        />
        <KpiCard
          icon={<CheckCircleIcon className="size-5" />}
          iconTone="success"
          href="/dashboard/contracts"
          label="זמין למשיכה (אושר)"
          value={formatShekels(kpis.availableToWithdraw)}
          badge={
            kpis.availableToWithdraw > 0 ? { label: "שוחרר לארנק", tone: "success" } : undefined
          }
        />
        <KpiCard
          icon={<DevicesIcon className="size-5" />}
          iconTone="warning"
          href="/dashboard/bookings"
          label="תפוסת שטחים (השבוע)"
          value={`${kpis.occupancyPct}%`}
          hint={kpis.occupancyHint}
        />
        <KpiCard
          icon={<CameraIcon className="size-5" />}
          iconTone="error"
          danger={kpis.proofsPending > 0}
          accent={kpis.proofsPending > 0}
          href="/dashboard/contracts"
          label="דוחות ממתינים להוכחה"
          value={String(kpis.proofsPending)}
          hint={kpis.proofsPending === 0 ? "הכול מעודכן" : "דורש טיפול לשחרור התשלום"}
        />
      </div>

      {/* תצוגה מפוצלת */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="flex flex-col gap-4 lg:col-span-2">
          <h2 className="border-outline-variant text-on-surface font-display border-b pb-2 text-xl font-bold">
            שידורים פעילים וקמפיינים באוויר
          </h2>
          {broadcasts.length === 0 ? (
            <p className="border-outline-variant bg-surface-lowest text-on-surface-variant rounded-xl border border-dashed p-8 text-center text-sm">
              אין שידורים פעילים כרגע. כשמפרסם ישריין שטח — הוא יופיע כאן עם סטטוס הנאמנות.
            </p>
          ) : (
            broadcasts.map((b) => <BroadcastCard key={b.id} item={b} />)
          )}
        </section>

        <div className="flex flex-col gap-4 lg:col-span-1">
          <h2 className="border-outline-variant text-on-surface font-display border-b pb-2 text-xl font-bold">
            תפוסת נכסים לפי תאריכים
          </h2>
          <OccupancyCalendar calendar={calendar} />
        </div>
      </div>
    </div>
  );
}
