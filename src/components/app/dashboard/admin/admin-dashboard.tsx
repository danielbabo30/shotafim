import Link from "next/link";
import { GavelIcon, ScreenIcon, WarningIcon, ChevronLeftIcon } from "@/components/marketing/icons";
import { KpiCard } from "@/components/app/dashboard/kpi-card";
import { DashboardHeader } from "@/components/app/dashboard/dashboard-header";
import { getAdminDashboardData, SITE_STATUS_META } from "@/lib/admin-dashboard";
import { ANOMALY_SEVERITY_META } from "@/lib/disputes";
import { ResolveAnomalyButton } from "@/components/app/dispute/resolve-anomaly-button";
import type { AppUser } from "@/lib/app-user";

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** לוח הבקרה של כובע הניהול — בריאות ניטור, התראות תוסף ותור מחלוקות (§8). */
export async function AdminDashboard({ user }: { user: AppUser }) {
  const d = await getAdminDashboardData();
  const { counts } = d.siteHealth;
  const sitesTotal = counts.ACTIVE + counts.STALE + counts.OFFLINE + counts.DEACTIVATED;
  const sitesDown = counts.STALE + counts.OFFLINE;

  return (
    <div className="flex flex-col gap-8">
      <DashboardHeader
        name={user.name}
        subtitle="בריאות ניטור התוסף, התראות פתוחות ותור מחלוקות — כל מה שדורש הכרעת אדמין."
        action={
          <Link
            href="/dashboard/disputes"
            className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm inline-flex h-10 items-center gap-2 self-start rounded-lg px-4 text-sm font-semibold transition-colors"
          >
            <GavelIcon className="size-4" />
            תור המחלוקות
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<GavelIcon className="size-5" />}
          iconTone={d.disputes.openCount > 0 ? "warning" : "neutral"}
          label="מחלוקות פתוחות"
          value={String(d.disputes.openCount)}
          hint="ממתינות להכרעה"
          href="/dashboard/disputes"
        />
        <KpiCard
          icon={<ScreenIcon className="size-5" />}
          iconTone={sitesDown > 0 ? "error" : "success"}
          label="אתרים בבעיית ניטור"
          value={`${sitesDown} / ${sitesTotal}`}
          hint={`${counts.ACTIVE} מדווחים תקין`}
        />
        <KpiCard
          icon={<WarningIcon className="size-5" />}
          iconTone={d.openAlerts.total > 0 ? "warning" : "neutral"}
          label="התראות תוסף פתוחות"
          value={String(d.openAlerts.total)}
          hint={`${d.webhookMismatches.length} פערי digest`}
        />
        <KpiCard
          icon={<WarningIcon className="size-5" />}
          iconTone={d.anomalies.openCount > 0 ? "error" : "neutral"}
          label="דגלי אנומליה פתוחים"
          value={String(d.anomalies.openCount)}
          hint={
            d.anomalies.bySeverity.HIGH
              ? `${d.anomalies.bySeverity.HIGH} בחומרה גבוהה`
              : `${d.stuckOrders} הזמנות תקועות ב-PENDING`
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* בריאות אתרים */}
        <section className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border p-6">
          <h2 className="text-on-surface mb-4 text-sm font-bold">בריאות ניטור התוסף</h2>
          {d.siteHealth.needsAttention.length === 0 ? (
            <p className="text-on-surface-variant text-sm">
              כל האתרים המחוברים מדווחים תקין ({counts.ACTIVE}).
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {d.siteHealth.needsAttention.map((s) => (
                <li
                  key={s.id}
                  className="border-outline-variant/60 bg-surface-container flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-on-surface truncate text-sm font-medium" dir="ltr">
                      {s.siteUrl}
                    </p>
                    <p className="text-on-surface-variant text-xs">
                      {s.businessName}
                      {s.lastHeartbeatAt
                        ? ` · heartbeat אחרון ${dateFmt.format(s.lastHeartbeatAt)}`
                        : " · אין heartbeat"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${SITE_STATUS_META[s.status].className}`}
                  >
                    {SITE_STATUS_META[s.status].label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* תור מחלוקות */}
        <section className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-on-surface text-sm font-bold">מחלוקות בתור</h2>
            <Link
              href="/dashboard/disputes"
              className="text-primary hover:text-primary-hover inline-flex items-center gap-1 text-xs font-semibold"
            >
              לכל המחלוקות
              <ChevronLeftIcon className="size-3.5" />
            </Link>
          </div>
          {d.disputes.recent.length === 0 ? (
            <p className="text-on-surface-variant text-sm">אין מחלוקות פתוחות. 🎉</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {d.disputes.recent.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/dashboard/disputes/${r.id}`}
                    className="border-outline-variant/60 hover:bg-surface-container flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-on-surface truncate text-sm font-medium">
                        {r.reasonLabel}
                      </p>
                      <p className="text-on-surface-variant text-xs">{r.businessName}</p>
                    </div>
                    <span className="text-on-surface-variant shrink-0 text-xs">
                      {dateFmt.format(r.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* פערי digest */}
      {d.webhookMismatches.length > 0 && (
        <section className="border-warning/40 bg-warning-container/40 rounded-lg border p-6">
          <h2 className="text-on-surface mb-1 text-sm font-bold">
            פערים בין digest להזמנות שנקלטו ({d.webhookMismatches.length})
          </h2>
          <p className="text-on-surface-variant mb-4 text-xs">
            ה-reconciliation הלילי מצא הזמנות ב-digest של האתר שלא נקלטו דרך webhook — חשד לדיווח
            חסר.
          </p>
          <ul className="flex flex-col gap-1.5">
            {d.webhookMismatches.map((m, i) => (
              <li key={i} className="text-on-surface-variant flex justify-between gap-2 text-xs">
                <span dir="ltr" className="truncate">
                  {m.siteUrl}
                </span>
                <span className="shrink-0">
                  {m.businessName} · {dateFmt.format(m.detectedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* דגלי אנומליה */}
      {d.anomalies.recent.length > 0 && (
        <section className="border-error/40 bg-error-container/25 rounded-lg border p-6">
          <h2 className="text-on-surface mb-1 text-sm font-bold">
            דגלי אנומליה פתוחים ({d.anomalies.openCount})
          </h2>
          <p className="text-on-surface-variant mb-4 text-xs">
            מנוע הניטור סימן חריגות שדורשות בדיקה — הן מצורפות אוטומטית לתיקי מחלוקת קשורים.
          </p>
          <ul className="flex flex-col gap-2">
            {d.anomalies.recent.map((a) => (
              <li
                key={a.id}
                className="border-outline-variant/60 bg-surface-lowest flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-on-surface text-sm font-medium">
                    {a.typeLabel}
                    <span
                      className={`ms-2 rounded-full px-2 py-0.5 text-xs font-semibold ${ANOMALY_SEVERITY_META[a.severity].className}`}
                    >
                      {ANOMALY_SEVERITY_META[a.severity].label}
                    </span>
                  </p>
                  <p className="text-on-surface-variant text-xs">
                    {a.detail} · {dateFmt.format(a.detectedAt)}
                  </p>
                </div>
                <ResolveAnomalyButton flagId={a.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
