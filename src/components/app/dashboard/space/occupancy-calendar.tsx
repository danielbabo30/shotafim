import Link from "next/link";
import { cn } from "@/lib/cn";
import { ChevronLeftIcon } from "@/components/marketing/icons";
import type { SpaceCalendar } from "@/lib/dashboard-space";

/** גווני העומס — עוצמת הרקע עולה עם מספר השטחים המשובצים באותו יום */
const LOAD_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-surface-container text-on-surface-variant",
  1: "bg-primary/15 text-primary",
  2: "bg-primary/35 text-primary",
  3: "bg-primary/60 text-on-primary",
  4: "bg-primary text-on-primary font-bold",
};

/** יומן תפוסה מיני — מפת חום של שיבוצי הנכסים בחודש הנוכחי */
export function OccupancyCalendar({ calendar }: { calendar: SpaceCalendar }) {
  return (
    <section className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col gap-4 rounded-xl border p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-on-surface font-display text-base font-bold">{calendar.monthLabel}</h3>
        <span className="text-on-surface-variant text-xs">שיבוצים לפי יום</span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {calendar.weekdays.map((w) => (
          <div key={w} className="text-on-surface-variant pb-1 text-xs font-semibold">
            {w}
          </div>
        ))}

        {calendar.days.map((d, i) =>
          d.inMonth ? (
            <div
              key={i}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded text-xs",
                LOAD_CLASS[d.load],
                d.isToday && "ring-primary ring-2 ring-offset-1",
              )}
            >
              {d.day}
              {d.flag && (
                <span
                  className="bg-error absolute start-1/2 bottom-1 size-1 -translate-x-1/2 rounded-full"
                  aria-hidden
                />
              )}
            </div>
          ) : (
            <div key={i} className="aspect-square" aria-hidden />
          ),
        )}
      </div>

      <Link
        href="/dashboard/bookings"
        className="border-outline-variant text-primary hover:bg-surface-low mt-1 flex h-10 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors"
      >
        מעבר ליומן השיבוצים המלא
        <ChevronLeftIcon className="size-4" />
      </Link>
    </section>
  );
}
