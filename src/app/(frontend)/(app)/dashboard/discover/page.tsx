import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/app-user";
import { listDiscoverCampaigns } from "@/lib/applications";
import { formatShekels } from "@/lib/dashboard-brand";
import { deliverableLabel, targetTypeLabel } from "@/lib/campaign-brief";
import { ArrowIcon, CalendarIcon, UsersIcon } from "@/components/marketing/icons";

export const metadata: Metadata = { title: "גילוי בריפים" };

const dateFmt = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long" });

export default async function DiscoverPage() {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("creator") && !user.roleKeys.includes("space")) {
    redirect("/dashboard");
  }

  const campaigns = await listDiscoverCampaigns();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-on-surface text-2xl font-bold">גילוי בריפים</h1>
        <p className="text-on-surface-variant mt-1 max-w-2xl text-sm leading-relaxed">
          בריפים פתוחים של מפרסמים שמתאימים לחשבון שלך. הגש הצעה — עם אישור המפרסם נפתח חדר עבודה
          ותקציב מובטח בנאמנות.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <p className="text-on-surface-variant border-outline-variant rounded-xl border border-dashed p-8 text-sm">
          כרגע אין בריפים פתוחים שמתאימים לך. נעדכן כשייפתחו חדשים.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {campaigns.map((c) => (
            <li
              key={c.id}
              className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col gap-3 rounded-xl border p-5"
            >
              <div>
                <p className="text-on-surface-variant text-xs">
                  {c.brandName} · {targetTypeLabel(c.targetType)}
                </p>
                <h2 className="text-on-surface mt-1 text-base font-bold">{c.title}</h2>
              </div>

              <p className="text-on-surface-variant line-clamp-2 text-sm leading-relaxed">
                {c.description}
              </p>

              {c.deliverables.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {c.deliverables.slice(0, 4).map((d) => (
                    <span
                      key={d}
                      className="bg-surface-container text-on-surface-variant rounded-full px-2.5 py-1 text-xs font-medium"
                    >
                      {deliverableLabel(d)}
                    </span>
                  ))}
                </div>
              )}

              <dl className="text-on-surface-variant mt-auto flex flex-wrap gap-x-5 gap-y-1 text-xs">
                <div className="flex items-center gap-1">
                  <dt>תקציב:</dt>
                  <dd className="text-on-surface font-semibold">
                    {c.totalBudgetILS > 0 ? formatShekels(c.totalBudgetILS) : "—"}
                  </dd>
                </div>
                <div className="flex items-center gap-1">
                  <CalendarIcon className="size-3.5" />
                  {c.endDate ? dateFmt.format(c.endDate) : "גמיש"}
                </div>
                <div className="flex items-center gap-1">
                  <UsersIcon className="size-3.5" />
                  {c.applicationCount} הצעות
                </div>
              </dl>

              <Link
                href={`/dashboard/campaigns/${c.id}`}
                className="text-primary inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
              >
                צפייה והגשת הצעה
                <ArrowIcon className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
