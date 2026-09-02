import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/app-user";
import { getAdSpaceSchedule } from "@/lib/ad-space-schedule";
import { ScheduleGantt } from "@/components/app/ad-spaces/schedule-gantt";
import { ChevronLeftIcon, ArrowIcon } from "@/components/marketing/icons";

export const metadata: Metadata = { title: "ניהול לוז שטחי הפרסום" };

const LEGEND = [
  { label: "בנאמנות (ממתין להפקדה)", className: "bg-primary-container" },
  { label: "שידור מאושר / משדר", className: "bg-success" },
  { label: "הושלם", className: "bg-surface-highest border border-outline-variant" },
  { label: "סלוט פנוי", className: "border border-dashed border-outline-variant bg-transparent" },
];

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("space")) redirect("/dashboard");

  const { month } = await searchParams;
  const data = await getAdSpaceSchedule(month);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/dashboard/assets"
          className="text-on-surface-variant hover:text-primary inline-flex w-fit items-center gap-1 text-xs font-medium transition-colors"
        >
          <ArrowIcon className="size-3.5" />
          שטחי הפרסום שלי
        </Link>
        <h1 className="text-on-surface text-2xl font-bold">יומן שיבוצים וזמני שידור</h1>
        <p className="text-on-surface-variant max-w-2xl text-sm leading-relaxed">
          תצוגה חודשית של כל שטחי הפרסום שלך — מתי כל שטח משובץ, על ידי מי, ומתי הוא פנוי לשריון
          חדש.
        </p>
      </header>

      {!data.hasProfile ? (
        <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border p-6">
          <h2 className="text-on-surface text-lg font-bold">צריך קודם פרופיל בעל שטחים</h2>
          <p className="text-on-surface-variant mt-2 max-w-lg text-sm leading-relaxed">
            יומן השיבוצים נפתח לאחר השלמת פרופיל בעל השטחים והוספת נכס מדיה ראשון.
          </p>
        </div>
      ) : (
        <>
          {/* בקרת חודש + מקרא */}
          <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col gap-4 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="border-outline-variant bg-surface-low flex items-center gap-2 rounded-lg border p-1">
              <Link
                href={`/dashboard/bookings?month=${data.prevMonth}`}
                aria-label="חודש קודם"
                className="text-on-surface-variant hover:bg-surface-container hover:text-primary rounded-md p-1.5 transition-colors"
              >
                <ChevronLeftIcon className="size-4 rotate-180" />
              </Link>
              <span className="text-on-surface min-w-32 text-center text-sm font-bold">
                {data.monthLabel}
              </span>
              <Link
                href={`/dashboard/bookings?month=${data.nextMonth}`}
                aria-label="חודש הבא"
                className="text-on-surface-variant hover:bg-surface-container hover:text-primary rounded-md p-1.5 transition-colors"
              >
                <ChevronLeftIcon className="size-4" />
              </Link>
            </div>

            <p className="text-on-surface-variant text-xs">
              {data.totalAssets} שטחי פרסום · {data.bookedNow} משובצים כרגע
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {LEGEND.map((item) => (
                <span
                  key={item.label}
                  className="text-on-surface-variant flex items-center gap-1.5 text-xs"
                >
                  <span className={`size-3 rounded-sm ${item.className}`} aria-hidden />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          {data.rows.length === 0 ? (
            <p className="border-outline-variant text-on-surface-variant rounded-lg border border-dashed px-4 py-10 text-center text-sm">
              עוד אין שטחי פרסום להצגה ביומן.
            </p>
          ) : (
            <ScheduleGantt rows={data.rows} daysInMonth={data.daysInMonth} today={data.today} />
          )}
        </>
      )}
    </div>
  );
}
