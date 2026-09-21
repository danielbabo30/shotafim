import { cn } from "@/lib/cn";
import { ShieldCheckIcon } from "@/components/marketing/icons";
import type { PartnerJournalEntry, PartnerJournalTone } from "@/lib/partner-dashboard";

const DOT: Record<PartnerJournalTone, string> = {
  neutral: "bg-outline",
  info: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
};

const relTime = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * יומן אירועים משותף — immutable, שני הצדדים רואים את אותו הדבר, אף אחד לא עורך (§8).
 */
export function PartnerEventJournal({ entries }: { entries: PartnerJournalEntry[] }) {
  return (
    <div className="border-outline-variant bg-surface-lowest flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <ShieldCheckIcon className="text-on-surface-variant size-4" />
        <h3 className="text-on-surface text-sm font-semibold">יומן אירועים</h3>
        <span className="text-on-surface-variant text-[11px]">משותף · לקריאה בלבד</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-on-surface-variant py-2 text-center text-xs">
          עדיין אין אירועים. קליקים ורכישות יירשמו כאן אוטומטית וייראו לשני הצדדים.
        </p>
      ) : (
        <ol className="flex flex-col gap-0">
          {entries.map((e, i) => (
            <li key={e.id} className="relative flex gap-3 ps-1 pb-3 last:pb-0">
              <span className="relative flex flex-col items-center">
                <span className={cn("mt-1 size-2 shrink-0 rounded-full", DOT[e.tone])} />
                {i < entries.length - 1 && (
                  <span className="bg-outline-variant absolute top-3 h-full w-px" aria-hidden />
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-on-surface text-xs leading-snug">{e.text}</span>
                <span className="text-on-surface-variant text-[10px]">{relTime.format(e.at)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
