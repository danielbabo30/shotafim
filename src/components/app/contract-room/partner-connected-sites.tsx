import { cn } from "@/lib/cn";
import { GlobeIcon } from "@/components/marketing/icons";
import { SITE_STATUS_LABEL, type PartnerConnectedSite } from "@/lib/partner-dashboard";

const DOT: Record<PartnerConnectedSite["status"], string> = {
  ACTIVE: "bg-success",
  STALE: "bg-warning",
  OFFLINE: "bg-error",
  DEACTIVATED: "bg-outline",
};

const heDateTime = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** אתרי WooCommerce מחוברים + סטטוס ה-heartbeat — תצוגת המפרסם (§8). */
export function PartnerConnectedSites({ sites }: { sites: PartnerConnectedSite[] }) {
  return (
    <div className="border-outline-variant bg-surface-lowest flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <GlobeIcon className="text-on-surface-variant size-4" />
        <h3 className="text-on-surface text-sm font-semibold">אתרים מחוברים</h3>
      </div>

      {sites.length === 0 ? (
        <p className="text-on-surface-variant py-1 text-xs leading-relaxed">
          אין אתר מחובר. חיבור תוסף ה-WooCommerce וצימוד האתר נעשים בהגדרות המותג.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sites.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn("size-2 shrink-0 rounded-full", DOT[s.status])} aria-hidden />
                <span dir="ltr" className="text-on-surface truncate font-mono text-xs">
                  {s.url}
                </span>
              </div>
              <span className="text-on-surface-variant shrink-0 text-[11px]">
                {SITE_STATUS_LABEL[s.status]}
                {s.lastHeartbeatAt ? ` · ${heDateTime.format(s.lastHeartbeatAt)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
