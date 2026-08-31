import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/app-user";
import { getBrandContext, listBrandCampaigns } from "@/lib/campaigns";
import { CampaignStatusBadge } from "@/components/app/campaign-status-badge";
import { deliverableLabel, targetTypeLabel } from "@/lib/campaign-brief";
import { PlusIcon } from "@/components/marketing/icons";

export const metadata: Metadata = { title: "קמפיינים" };

const currency = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});
const shortDate = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium" });

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("brand")) redirect("/dashboard");

  const [brand, campaigns, { created }] = await Promise.all([
    getBrandContext(),
    listBrandCampaigns(),
    searchParams,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-on-surface text-2xl font-bold">קמפיינים</h1>
          <p className="text-on-surface-variant mt-1 text-sm">הבריפים שפרסמתם והטיוטות שבעבודה.</p>
        </div>
        {brand && (
          <Link
            href="/dashboard/campaigns/new"
            className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors"
          >
            <PlusIcon className="size-4" />
            קמפיין חדש
          </Link>
        )}
      </header>

      {created && (
        <p className="border-success/30 bg-success-container text-success rounded-lg border px-4 py-3 text-sm font-medium">
          הבריף נשמר בהצלחה.
        </p>
      )}

      {!brand ? (
        <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border p-6">
          <h2 className="text-on-surface text-lg font-bold">צריך קודם פרופיל עסקי</h2>
          <p className="text-on-surface-variant mt-2 text-sm leading-relaxed">
            ניהול קמפיינים נפתח לאחר השלמת פרופיל העסק. מסך ההגדרה בבנייה.
          </p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border border-dashed p-10 text-center">
          <h2 className="text-on-surface text-lg font-bold">עוד אין קמפיינים</h2>
          <p className="text-on-surface-variant mx-auto mt-2 max-w-md text-sm leading-relaxed">
            צרו בריף ראשון: הגדירו יעד, תוצרים ותקציב — ופרסמו אותו לקבלת הצעות מיוצרים ומבעלי
            שטחים.
          </p>
          <Link
            href="/dashboard/campaigns/new"
            className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm mt-6 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors"
          >
            <PlusIcon className="size-4" />
            יצירת בריף קמפיין
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {campaigns.map((campaign) => (
            <li
              key={campaign.id}
              className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-on-surface truncate text-base font-bold">{campaign.title}</h3>
                  <p className="text-on-surface-variant mt-1 text-xs">
                    {targetTypeLabel(campaign.targetType)} · עודכן{" "}
                    {shortDate.format(campaign.updatedAt)}
                  </p>
                </div>
                <CampaignStatusBadge status={campaign.status} />
              </div>

              {campaign.deliverables.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {campaign.deliverables.map((d) => (
                    <span
                      key={d}
                      className="bg-surface-container text-on-surface-variant rounded-full px-2.5 py-1 text-xs font-medium"
                    >
                      {deliverableLabel(d)}
                    </span>
                  ))}
                </div>
              )}

              <dl className="text-on-surface-variant mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                <div className="flex gap-1">
                  <dt>תקציב:</dt>
                  <dd className="text-on-surface font-medium">
                    {campaign.totalBudgetILS > 0 ? currency.format(campaign.totalBudgetILS) : "—"}
                  </dd>
                </div>
                <div className="flex gap-1">
                  <dt>מועד סיום:</dt>
                  <dd className="text-on-surface font-medium">
                    {campaign.endDate ? shortDate.format(campaign.endDate) : "—"}
                  </dd>
                </div>
                <div className="flex gap-1">
                  <dt>הצעות שהתקבלו:</dt>
                  <dd className="text-on-surface font-medium">{campaign.applicationCount}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
