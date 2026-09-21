import {
  ShieldCheckIcon,
  MegaphoneIcon,
  MailIcon,
  VerifiedIcon,
} from "@/components/marketing/icons";
import { DashboardHeader } from "@/components/app/dashboard/dashboard-header";
import { KpiCard } from "@/components/app/dashboard/kpi-card";
import { CampaignList } from "@/components/app/dashboard/campaign-list";
import { EscrowLedger } from "@/components/app/dashboard/escrow-ledger";
import { RosterCta } from "@/components/app/dashboard/roster-cta";
import { getBrandDashboardData, formatShekels } from "@/lib/dashboard-brand";
import type { AppUser } from "@/lib/app-user";

/** לוח-הבקרה של המפרסם (כובע "מותג") */
export async function BrandDashboard({ user }: { user: AppUser }) {
  const { kpis, campaigns, ledger } = await getBrandDashboardData(user.id);

  return (
    <div className="flex flex-col gap-8">
      <DashboardHeader name={user.name} />

      {/* רצועת KPI */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<ShieldCheckIcon className="size-5" />}
          iconTone="primary"
          accent
          href="/dashboard/reports"
          label="תקציב נעול בנאמנות (Escrow)"
          value={formatShekels(kpis.escrowLocked)}
          badge={{ label: `${kpis.escrowDeals} עסקאות מוגנות`, tone: "primary" }}
        />
        <KpiCard
          icon={<MegaphoneIcon className="size-5" />}
          href="/dashboard/campaigns"
          label="קמפיינים פעילים"
          value={String(kpis.activeCampaigns)}
          hint={kpis.activeCampaignsBreakdown}
        />
        <KpiCard
          icon={<MailIcon className="size-5" />}
          iconTone="warning"
          href="/dashboard/applications"
          label="הצעות חדשות לבדיקה"
          value={String(kpis.pendingApplications)}
          badge={{ label: "דורש מענה", tone: "warning" }}
        />
        <KpiCard
          icon={<VerifiedIcon className="size-5" />}
          iconTone="success"
          live
          href="/dashboard/contracts"
          label="תוצרים שממתינים לאישורכם"
          value={String(kpis.pendingDeliverables)}
          hint={kpis.pendingDeliverablesHint}
        />
      </div>

      {/* תצוגה מפוצלת */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <CampaignList campaigns={campaigns} />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-4">
          <EscrowLedger entries={ledger} />
          <RosterCta />
        </div>
      </div>
    </div>
  );
}
