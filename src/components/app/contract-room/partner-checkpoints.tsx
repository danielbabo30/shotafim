import { CalendarIcon } from "@/components/marketing/icons";
import {
  CHECKPOINT_STATUS_LABEL,
  type PartnerCheckpointRow,
} from "@/lib/partner-dashboard";

const nis = (n: number) => `₪${Math.round(n).toLocaleString("en-US")}`;
const dateFmt = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long" });

/**
 * לוח תחנות התשלום — תאריך התחנה הבאה + היסטוריית התחנות (§8, "תאריך התחנה הבאה").
 * העיבוד עצמו (trigger/cron, שחרור עמלות) — WP-2. כאן תצוגה בלבד.
 */
export function PartnerCheckpoints({
  nextCheckpoint,
  checkpoints,
}: {
  nextCheckpoint: Date | null;
  checkpoints: PartnerCheckpointRow[];
}) {
  return (
    <div className="border-outline-variant bg-surface-lowest flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <CalendarIcon className="text-on-surface-variant size-4" />
        <h3 className="text-on-surface text-sm font-semibold">תחנות תשלום</h3>
      </div>

      <div>
        <span className="text-on-surface-variant text-xs">התחנה הבאה</span>
        <p className="text-on-surface mt-0.5 text-sm font-medium">
          {nextCheckpoint ? dateFmt.format(nextCheckpoint) : "אין תחנה מתוזמנת"}
        </p>
      </div>

      {checkpoints.length > 0 && (
        <ul className="border-outline-variant flex flex-col gap-1.5 border-t pt-2">
          {checkpoints.map((c) => (
            <li
              key={c.id}
              className="text-on-surface-variant flex items-center justify-between text-xs"
            >
              <span>{dateFmt.format(c.scheduledFor)}</span>
              <span className={c.status === "PAID" ? "text-success font-medium" : undefined}>
                {CHECKPOINT_STATUS_LABEL[c.status]}
                {c.status === "PAID" ? ` · ${nis(c.paidILS)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
