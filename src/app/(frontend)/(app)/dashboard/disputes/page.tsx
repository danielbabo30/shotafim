import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { getDisputeQueue, DISPUTE_STATUS_META } from "@/lib/disputes";
import { ChevronLeftIcon } from "@/components/marketing/icons";

export const metadata: Metadata = { title: "תור מחלוקות" };

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function DisputesQueuePage() {
  await requireAdmin();
  const queue = await getDisputeQueue();

  const open = queue.filter((d) => DISPUTE_STATUS_META[d.status].open);
  const closed = queue.filter((d) => !DISPUTE_STATUS_META[d.status].open);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-on-surface text-2xl font-bold sm:text-3xl">תור מחלוקות</h1>
        <p className="text-on-surface-variant mt-1 text-sm">
          {open.length} מחלוקות ממתינות להכרעה · {closed.length} הוכרעו. כל תיק נפתח עם הראיות
          מצורפות.
        </p>
      </header>

      {queue.length === 0 ? (
        <div className="border-outline-variant bg-surface-lowest text-on-surface-variant rounded-lg border p-8 text-center text-sm">
          אין מחלוקות במערכת. 🎉
        </div>
      ) : (
        <div className="border-outline-variant bg-surface-lowest overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-outline-variant text-on-surface-variant border-b text-xs">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">עילה</th>
                <th className="px-4 py-3 text-start font-semibold">קמפיין / צדדים</th>
                <th className="px-4 py-3 text-start font-semibold">סוג</th>
                <th className="px-4 py-3 text-start font-semibold">נפתחה</th>
                <th className="px-4 py-3 text-start font-semibold">סטטוס</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {[...open, ...closed].map((d) => (
                <tr
                  key={d.id}
                  className="border-outline-variant/50 hover:bg-surface-container/50 border-b transition-colors last:border-0"
                >
                  <td className="px-4 py-3">
                    <span className="text-on-surface font-medium">{d.reasonLabel}</span>
                    {d.messageCount > 0 && (
                      <span className="text-on-surface-variant"> · {d.messageCount} הודעות</span>
                    )}
                  </td>
                  <td className="text-on-surface-variant px-4 py-3">
                    <div className="text-on-surface">{d.campaignTitle}</div>
                    <div className="text-xs">
                      {d.businessName} ↔ {d.providerName ?? "—"}
                    </div>
                  </td>
                  <td className="text-on-surface-variant px-4 py-3 text-xs">
                    {d.compensationModel === "REVENUE_SHARE" ? "תשלום פר רכישה" : "סכום קבוע"}
                  </td>
                  <td className="text-on-surface-variant px-4 py-3 text-xs whitespace-nowrap">
                    {dateFmt.format(d.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${DISPUTE_STATUS_META[d.status].className}`}
                    >
                      {DISPUTE_STATUS_META[d.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Link
                      href={`/dashboard/disputes/${d.id}`}
                      className="text-primary hover:text-primary-hover inline-flex items-center gap-1 text-xs font-semibold"
                    >
                      פתח תיק
                      <ChevronLeftIcon className="size-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
