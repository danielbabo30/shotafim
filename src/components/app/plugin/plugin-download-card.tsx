import Link from "next/link";
import { DownloadIcon, ArrowIcon } from "@/components/marketing/icons";

/**
 * כרטיס הורדת תוסף המעקב — לשיבוץ בפאנל השותפות בחדר העבודה או במסך הקמת התוכנית.
 * ההורדה עצמה מוגנת ל-role brand ב-route (`/api/plugin-download`).
 */
export function PluginDownloadCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <span className="bg-primary-fixed text-primary grid size-9 shrink-0 place-items-center rounded-lg">
          <DownloadIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-on-surface text-sm font-bold">תוסף המעקב ל-WooCommerce</h3>
          <p className="text-on-surface-variant mt-1 text-xs leading-relaxed">
            מתקינים בחנות פעם אחת. דוגם קליקים ורכישות דרך הקישור והקופון של היוצר, ומחשב את העמלה
            אוטומטית.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {/* הורדת קובץ — route handler שמחזיר ZIP, לא עמוד; ‎<Link>‎ לא מתאים */}
        <a
          href="/api/plugin-download"
          download
          className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors"
        >
          <DownloadIcon className="size-4" />
          הורדת התוסף
        </a>
        {!compact && (
          <Link
            href="/dashboard/plugin"
            className="border-outline-variant text-on-surface hover:bg-surface-container inline-flex h-10 items-center gap-1.5 rounded-lg border px-4 text-sm font-semibold transition-colors"
          >
            הוראות התקנה וחיבור
            <ArrowIcon className="size-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
