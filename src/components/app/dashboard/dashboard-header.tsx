import Link from "next/link";
import { DownloadIcon } from "@/components/marketing/icons";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "בוקר טוב";
  if (hour < 17) return "צהריים טובים";
  if (hour < 21) return "ערב טוב";
  return "לילה טוב";
}

/** כותרת לוח-הבקרה — ברכה לפי שעה + פעולת "דוח חודשי" */
export function DashboardHeader({
  name,
  subtitle = "הנה תמונת המצב של הפעילות שלכם היום.",
  action,
}: {
  name: string | null;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-on-surface text-2xl font-bold sm:text-3xl">
          {greeting()}
          {name ? `, ${name}` : ""} <span className="align-middle">👋</span>
        </h1>
        <p className="text-on-surface-variant mt-1 text-base">{subtitle}</p>
      </div>
      {action ?? (
        <Link
          href="/dashboard/reports"
          className="border-outline-variant text-on-surface bg-surface-lowest hover:bg-surface-low shadow-ambient-sm inline-flex h-10 items-center gap-2 self-start rounded-lg border px-4 text-sm font-medium transition-colors"
        >
          <DownloadIcon className="size-4" />
          דוח חודשי
        </Link>
      )}
    </div>
  );
}
