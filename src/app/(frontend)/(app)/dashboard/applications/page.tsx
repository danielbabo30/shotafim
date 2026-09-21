import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveUser } from "@/lib/app-user";
import { listBrandApplications, listProviderApplications } from "@/lib/applications";
import { formatShekels } from "@/lib/dashboard-brand";
import { APPLICATION_STATUS_META } from "@/lib/pitch";
import { ApplicationReviewItem } from "@/components/app/pitch/application-review-item";
import { StatusChip } from "@/components/app/status-chip";
import { withdrawApplication } from "@/lib/actions/application-actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "פניות והצעות" };

const dateFmt = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long" });

export default async function ApplicationsPage() {
  const user = await requireActiveUser();
  if (user.activeRole === "brand") return <BrandInbox />;
  return <ProviderPitches />;
}

async function BrandInbox() {
  const applications = await listBrandApplications();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-on-surface text-2xl font-bold">פניות והצעות</h1>
        <p className="text-on-surface-variant mt-1 text-sm leading-relaxed">
          הצעות שהתקבלו לבריפים שלך וממתינות למענה. אישור הצעה יוצר חוזה ופותח חדר עבודה.
        </p>
      </div>

      {applications.length === 0 ? (
        <p className="text-on-surface-variant border-outline-variant rounded-xl border border-dashed p-8 text-sm">
          אין הצעות שממתינות למענה.{" "}
          <Link href="/dashboard/campaigns" className="text-primary font-medium hover:underline">
            נהל את הקמפיינים שלך
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {applications.map((a) => (
            <ApplicationReviewItem
              key={a.id}
              application={a}
              campaignTitle={a.campaign.title}
              campaignHref={`/dashboard/campaigns/${a.campaign.id}`}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

async function ProviderPitches() {
  const pitches = await listProviderApplications();

  const invitations = pitches.filter((p) => p.status === "INVITED");
  const myPitches = pitches.filter((p) => p.status !== "INVITED");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-on-surface text-2xl font-bold">פניות והצעות</h1>
        <p className="text-on-surface-variant mt-1 text-sm leading-relaxed">
          הזמנות שקיבלת ממפרסמים וההצעות שהגשת. הצעה שאושרה פותחת חדר עבודה.
        </p>
      </div>

      {invitations.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-on-surface text-lg font-bold">
            הזמנות שקיבלת ({invitations.length})
          </h2>
          <ul className="flex flex-col gap-3">
            {invitations.map((p) => (
              <li
                key={p.id}
                className="border-primary/40 bg-primary-fixed/20 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-5"
              >
                <div className="min-w-0">
                  <p className="text-on-surface font-semibold">{p.campaign.title}</p>
                  <p className="text-on-surface-variant text-xs">
                    {p.brandName} הזמין אותך להגיש הצעה
                  </p>
                </div>
                <Link
                  href={`/dashboard/campaigns/${p.campaign.id}`}
                  className="bg-primary text-on-primary hover:bg-primary-hover rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                >
                  עיון והגשת הצעה
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-on-surface text-lg font-bold">ההצעות שלי</h2>
        {myPitches.length === 0 ? (
          <p className="text-on-surface-variant border-outline-variant rounded-xl border border-dashed p-8 text-sm">
            עדיין לא הגשת הצעות.{" "}
            <Link href="/dashboard/discover" className="text-primary font-medium hover:underline">
              עיין בבריפים פתוחים
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {myPitches.map((p) => {
              const meta = APPLICATION_STATUS_META[p.status];
              return (
                <li
                  key={p.id}
                  className="border-outline-variant bg-surface-lowest rounded-xl border p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/campaigns/${p.campaign.id}`}
                        className="text-on-surface font-semibold hover:underline"
                      >
                        {p.campaign.title}
                      </Link>
                      <p className="text-on-surface-variant text-xs">
                        {p.brandName} · הוגש ב-{dateFmt.format(p.createdAt)}
                      </p>
                    </div>
                    <StatusChip tone={meta.tone}>{meta.label}</StatusChip>
                  </div>

                  <dl className="text-on-surface-variant mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <div className="flex gap-1.5">
                      <dt className="text-xs">הצעת מחיר:</dt>
                      <dd className="text-on-surface font-medium">
                        {formatShekels(p.proposedPriceILS)}
                      </dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-xs">זמן אספקה:</dt>
                      <dd className="text-on-surface font-medium">
                        {p.estimatedDeliveryDays} ימים
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {p.contractId && (
                      <Link
                        href={`/dashboard/contracts/${p.contractId}`}
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        מעבר לחדר העבודה
                      </Link>
                    )}
                    {p.status === "SUBMITTED" && (
                      <form action={withdrawApplication}>
                        <input type="hidden" name="applicationId" value={p.id} />
                        <Button type="submit" variant="ghost" size="md">
                          בטל הצעה
                        </Button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
