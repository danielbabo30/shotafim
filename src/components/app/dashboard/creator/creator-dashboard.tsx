import Link from "next/link";
import {
  WalletIcon,
  LockIcon,
  SendIcon,
  StarIcon,
  ClockIcon,
  RocketIcon,
} from "@/components/marketing/icons";
import { DashboardHeader } from "@/components/app/dashboard/dashboard-header";
import { KpiCard } from "@/components/app/dashboard/kpi-card";
import { ContractProgressCard } from "@/components/app/dashboard/creator/contract-progress-card";
import { BriefMiniCard } from "@/components/app/dashboard/creator/brief-mini-card";
import { getCreatorDashboardData, formatShekels } from "@/lib/dashboard-creator";

/** לוח-הבקרה של היוצר (כובע "יוצר תוכן") */
export async function CreatorDashboard() {
  const { name, headlineHint, kpis, contracts, briefs } = await getCreatorDashboardData();

  return (
    <div className="flex flex-col gap-8">
      <DashboardHeader
        name={name}
        subtitle={headlineHint}
        action={
          <Link
            href="/dashboard/earnings"
            className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm inline-flex h-11 items-center gap-2 self-start rounded-lg px-5 text-sm font-semibold transition-colors"
          >
            <WalletIcon className="size-4" />
            משיכת כספים לחשבון הבנק
          </Link>
        }
      />

      {/* רצועת KPI */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<WalletIcon className="size-5" />}
          iconTone="success"
          href="/dashboard/contracts"
          label="זמין למשיכה מיידית"
          value={formatShekels(kpis.availableToWithdraw)}
          badge={
            kpis.availableToWithdraw > 0 ? { label: "מוכן למשיכה", tone: "success" } : undefined
          }
        />
        <KpiCard
          icon={<LockIcon className="size-5" />}
          iconTone="primary"
          accent
          href="/dashboard/contracts"
          label="מובטח בנאמנות (Escrow)"
          value={formatShekels(kpis.escrowGuaranteed)}
        />
        <KpiCard
          icon={<SendIcon className="size-5" />}
          iconTone="warning"
          href="/dashboard/applications"
          label="הצעות שהגשת (ממתינות)"
          value={String(kpis.pendingApplications)}
          hint={kpis.pendingApplications === 0 ? "אין הצעות פתוחות" : "ממתינות למענה המותג"}
        />
        <KpiCard
          icon={<StarIcon className="size-5" />}
          iconTone="warning"
          label="ציון אמינות והשלמה"
          value={`${kpis.reliabilityScore}%`}
          hint="עמידה בזמנים וסיום קמפיינים"
        />
      </div>

      {/* תצוגה מפוצלת */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="flex flex-col gap-4 lg:col-span-8">
          <h2 className="text-on-surface font-display flex items-center gap-2 text-xl font-bold">
            <ClockIcon className="text-primary size-5" />
            קמפיינים בעבודה ודד-ליינים קרובים
          </h2>
          {contracts.length === 0 ? (
            <p className="border-outline-variant bg-surface-lowest text-on-surface-variant rounded-xl border border-dashed p-8 text-center text-sm">
              אין קמפיינים בעבודה כרגע. הגישו הצעה לבריף פתוח כדי להתחיל.
            </p>
          ) : (
            contracts.map((c) => <ContractProgressCard key={c.id} item={c} />)
          )}
        </section>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <h2 className="text-on-surface font-display flex items-center gap-2 text-xl font-bold">
            <RocketIcon className="text-warning size-5" />
            בריפים חדשים
          </h2>
          {briefs.length === 0 ? (
            <p className="border-outline-variant bg-surface-lowest text-on-surface-variant rounded-xl border border-dashed p-6 text-center text-sm">
              אין כרגע בריפים פתוחים שמתאימים לך.
            </p>
          ) : (
            <>
              {briefs.map((b) => (
                <BriefMiniCard key={b.id} item={b} />
              ))}
              <Link
                href="/dashboard/discover"
                className="border-outline-variant text-primary hover:bg-surface-low flex h-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors"
              >
                לכל הבריפים הפתוחים
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
