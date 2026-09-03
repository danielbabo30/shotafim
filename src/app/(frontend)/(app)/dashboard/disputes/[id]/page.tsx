import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { getDisputeDetail, DISPUTE_STATUS_META, ANOMALY_SEVERITY_META } from "@/lib/disputes";
import { SITE_STATUS_META, PLUGIN_ALERT_META } from "@/lib/admin-dashboard";
import { ResolveDisputeForm } from "@/components/app/dispute/resolve-dispute-form";
import { EnforcementForm } from "@/components/app/dispute/enforcement-form";
import { ResolveAnomalyButton } from "@/components/app/dispute/resolve-anomaly-button";
import { ChevronLeftIcon } from "@/components/marketing/icons";

export const metadata: Metadata = { title: "תיק מחלוקת" };

const dt = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const shekel = (n: number) => `₪${n.toLocaleString("he-IL")}`;

export default async function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const d = await getDisputeDetail(id);
  if (!d) notFound();

  const statusMeta = DISPUTE_STATUS_META[d.status];
  const isOpen = statusMeta.open;
  const parties = [
    { userId: d.business.userId, name: d.business.name, role: "מפרסם" },
    { userId: d.provider.userId, name: d.provider.name ?? "ספק", role: "ספק" },
  ];
  const ev = d.evidence;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-8">
        <header className="border-outline-variant bg-surface-lowest rounded-lg border p-6">
          <nav className="text-on-surface-variant mb-3 flex items-center gap-1.5 text-xs">
            <Link href="/dashboard/disputes" className="hover:text-primary">
              תור מחלוקות
            </Link>
            <ChevronLeftIcon className="size-3.5" />
            <span className="text-on-surface font-medium">{d.reasonLabel}</span>
          </nav>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-on-surface text-xl font-bold">{d.reasonLabel}</h1>
              <p className="text-on-surface-variant mt-1 text-sm">
                {d.campaignTitle} · {d.business.name} ↔ {d.provider.name ?? "—"} ·{" "}
                {d.compensationModel === "REVENUE_SHARE" ? "תשלום פר רכישה" : "סכום קבוע"} ·{" "}
                {shekel(d.agreedPriceILS)}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusMeta.className}`}
            >
              {statusMeta.label}
            </span>
          </div>
          <p className="text-on-surface-variant mt-4 text-sm">
            נפתחה ע״י <span className="text-on-surface">{d.initiatorName ?? "—"}</span> ·{" "}
            {dt.format(d.createdAt)}
          </p>
          <p className="border-outline-variant/60 bg-surface-container text-on-surface mt-3 rounded-lg border p-3 text-sm whitespace-pre-wrap">
            {d.description}
          </p>
          {d.resolutionNotes && (
            <div className="border-success/40 bg-success-container/40 mt-3 rounded-lg border p-3 text-sm">
              <p className="text-on-surface font-semibold">
                הוכרעה ע״י {d.arbitratorName ?? "אדמין"} ·{" "}
                {d.resolvedAt ? dt.format(d.resolvedAt) : ""}
              </p>
              <p className="text-on-surface-variant mt-1 whitespace-pre-wrap">
                {d.resolutionNotes}
              </p>
            </div>
          )}
        </header>

        {/* ראיות מצורפות */}
        <section className="border-outline-variant bg-surface-lowest rounded-lg border p-6">
          <h2 className="text-on-surface mb-4 text-sm font-bold">ראיות מצורפות</h2>

          {ev.program && (
            <div className="border-outline-variant/60 bg-surface-container mb-4 rounded-lg border p-4">
              <p className="text-on-surface mb-2 text-xs font-semibold">
                תוכנית שותפות {ev.program.refCode} · {ev.program.status} · {ev.program.clickCount}{" "}
                קליקים
              </p>
              <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                {[
                  ["הזמנות", ev.program.orders.total],
                  ["ממתינות", ev.program.orders.pending],
                  ["מאושרות", ev.program.orders.approved],
                  ["בוטלו", ev.program.orders.reversed],
                ].map(([k, v]) => (
                  <div key={k} className="bg-surface-lowest rounded-md p-2">
                    <dt className="text-on-surface-variant">{k}</dt>
                    <dd className="text-on-surface font-bold">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-on-surface-variant mt-2 text-xs">
                עמלה מצטברת {shekel(ev.program.grossCommissionILS)} · ביטולים{" "}
                {shekel(ev.program.reversalsILS)}
              </p>
              {ev.program.checkpoints.length > 0 && (
                <ul className="text-on-surface-variant mt-2 space-y-0.5 text-xs">
                  {ev.program.checkpoints.map((cp, i) => (
                    <li key={i}>
                      תחנה {dt.format(cp.scheduledFor)} — {cp.status}
                      {cp.paidILS > 0 && ` · שולם ${shekel(cp.paidILS)}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {ev.sites.length > 0 && (
            <div className="mb-4">
              <p className="text-on-surface-variant mb-2 text-xs font-semibold">אתרים מחוברים</p>
              <ul className="flex flex-col gap-1.5">
                {ev.sites.map((s, i) => (
                  <li
                    key={i}
                    className="border-outline-variant/60 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
                  >
                    <span className="text-on-surface truncate" dir="ltr">
                      {s.siteUrl}
                    </span>
                    <span className="flex items-center gap-2">
                      {s.openAlerts.map((a, j) => (
                        <span key={j} className="text-warning">
                          {PLUGIN_ALERT_META[a.type as keyof typeof PLUGIN_ALERT_META]}
                        </span>
                      ))}
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${
                          SITE_STATUS_META[s.status as keyof typeof SITE_STATUS_META].className
                        }`}
                      >
                        {SITE_STATUS_META[s.status as keyof typeof SITE_STATUS_META].label}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ev.anomalies.length > 0 && (
            <div className="border-error/40 bg-error-container/25 mb-4 rounded-lg border p-4">
              <p className="text-on-surface mb-2 text-xs font-semibold">
                דגלי אנומליה פתוחים ({ev.anomalies.length})
              </p>
              <ul className="flex flex-col gap-2">
                {ev.anomalies.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="text-on-surface font-medium">{a.typeLabel}</span>
                      <span
                        className={`ms-2 rounded-full px-2 py-0.5 font-semibold ${ANOMALY_SEVERITY_META[a.severity].className}`}
                      >
                        {ANOMALY_SEVERITY_META[a.severity].label}
                      </span>
                      <p className="text-on-surface-variant">
                        {a.detail} · {dt.format(a.detectedAt)}
                      </p>
                    </div>
                    <ResolveAnomalyButton flagId={a.id} disputeId={d.id} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-on-surface-variant mb-2 text-xs font-semibold">יומן אירועים</p>
          {ev.eventLog.length === 0 ? (
            <p className="text-on-surface-variant text-xs">אין רשומות ביומן לישויות של תיק זה.</p>
          ) : (
            <ol className="border-outline-variant/60 border-s ps-3">
              {ev.eventLog.map((e, i) => (
                <li key={i} className="text-on-surface-variant py-1 text-xs">
                  <span className="text-on-surface font-medium">{e.action}</span>
                  {" · "}
                  {e.entityType}
                  {e.actorName ? ` · ${e.actorName}` : ""} · {dt.format(e.at)}
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* פרוטוקול */}
        {d.messages.length > 0 && (
          <section className="border-outline-variant bg-surface-lowest rounded-lg border p-6">
            <h2 className="text-on-surface mb-4 text-sm font-bold">פרוטוקול המחלוקת</h2>
            <ul className="flex flex-col gap-3">
              {d.messages.map((m) => (
                <li key={m.id} className="text-sm">
                  <p className="text-on-surface-variant text-xs">
                    {m.senderName ?? "—"} · {dt.format(m.createdAt)}
                  </p>
                  <p className="text-on-surface whitespace-pre-wrap">{m.message}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="flex flex-col gap-6 lg:col-span-4">
        {isOpen ? (
          <ResolveDisputeForm disputeId={d.id} />
        ) : (
          <div className="border-outline-variant bg-surface-lowest text-on-surface-variant rounded-lg border p-5 text-sm">
            המחלוקת הוכרעה — {statusMeta.label}.
          </div>
        )}

        <EnforcementForm disputeId={d.id} parties={parties} />

        {d.enforcementActions.length > 0 && (
          <div className="border-outline-variant bg-surface-lowest rounded-lg border p-5">
            <h3 className="text-on-surface mb-2 text-sm font-bold">אכיפות שנרשמו</h3>
            <ul className="flex flex-col gap-2 text-xs">
              {d.enforcementActions.map((e) => (
                <li key={e.id} className="text-on-surface-variant">
                  <span className="text-on-surface font-medium">{e.type}</span> · {e.targetName} ·{" "}
                  {e.amountILS != null ? `${shekel(e.amountILS)} · ` : ""}
                  {dt.format(e.createdAt)}
                  <p>{e.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
