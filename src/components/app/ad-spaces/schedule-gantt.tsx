import { cn } from "@/lib/cn";
import { formatShekels } from "@/lib/dashboard-brand";
import {
  ScreenIcon,
  BillboardIcon,
  BusIcon,
  MailIcon,
  PlayCircleIcon,
  LockIcon,
} from "@/components/marketing/icons";
import type { AdSpaceMediaType } from "@/lib/ad-spaces";
import type { ScheduleRow, ScheduleSegmentKind } from "@/lib/ad-space-schedule";

const MEDIA_ICON: Record<AdSpaceMediaType, (p: { className?: string }) => React.JSX.Element> = {
  digital_billboard: ScreenIcon,
  static_billboard: BillboardIcon,
  transit: BusIcon,
  newsletter: MailIcon,
  podcast: PlayCircleIcon,
};

const SEGMENT_STYLE: Record<ScheduleSegmentKind, string> = {
  escrow: "bg-primary-container text-on-primary-container",
  confirmed: "bg-success text-white",
  broadcasting: "bg-success text-white",
  completed: "bg-surface-highest text-on-surface-variant",
};

const NAME_COL = "w-40 shrink-0 sm:w-48";

export function ScheduleGantt({
  rows,
  daysInMonth,
  today,
}: {
  rows: ScheduleRow[];
  daysInMonth: number;
  today: number | null;
}) {
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const cols = { gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` };
  // רוחב מינימלי כדי שהימים יישארו קריאים — גלילה אופקית מתחת לזה
  const minWidth = { minWidth: `${daysInMonth * 34}px` };

  return (
    <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm overflow-x-auto rounded-lg border">
      <div>
        {/* כותרת ימים */}
        <div className="border-outline-variant bg-surface-low flex border-b">
          <div
            className={cn(
              NAME_COL,
              "border-outline-variant text-on-surface-variant border-e px-4 py-2 text-xs font-bold",
            )}
          >
            נכס מדיה
          </div>
          <div className="grid flex-1" style={{ ...cols, ...minWidth }}>
            {days.map((d) => (
              <div
                key={d}
                className={cn(
                  "border-outline-variant/40 text-on-surface-variant border-e py-2 text-center text-[11px] tabular-nums",
                  d === today && "text-primary bg-primary/10 font-bold",
                )}
              >
                {d}
              </div>
            ))}
          </div>
        </div>

        {/* שורות לפי נכס */}
        {rows.map((row) => {
          const Icon = MEDIA_ICON[row.mediaType];
          return (
            <div key={row.id} className="border-outline-variant/60 flex border-b last:border-b-0">
              <div className={cn(NAME_COL, "border-outline-variant border-e px-4 py-3")}>
                <div className="text-on-surface truncate text-sm font-semibold">{row.title}</div>
                <div className="text-on-surface-variant mt-0.5 flex items-center gap-1 text-xs">
                  <Icon className="text-primary/60 size-3.5 shrink-0" />
                  <span className="truncate">{row.mediaLabel}</span>
                  {!row.isActive && <span className="text-outline">· לא פעיל</span>}
                </div>
              </div>

              <div className="relative flex-1" style={minWidth}>
                {/* קווי רשת + הדגשת היום */}
                <div className="absolute inset-0 grid" style={cols} aria-hidden>
                  {days.map((d) => (
                    <div
                      key={d}
                      className={cn(
                        "border-outline-variant/20 border-e",
                        d === today && "bg-primary/[0.06]",
                      )}
                    />
                  ))}
                </div>

                {/* שיבוצים + סלוטים פנויים */}
                <div className="relative grid py-2" style={cols}>
                  {row.free.map((slot) => (
                    <div
                      key={`free-${slot.startDay}`}
                      style={{ gridColumn: `${slot.startDay} / ${slot.endDay + 1}`, gridRow: 1 }}
                      className="border-outline-variant/70 text-outline mx-0.5 flex h-9 items-center justify-center rounded border border-dashed text-[11px]"
                      title={`פנוי · ${slot.startDay}–${slot.endDay} בחודש`}
                    >
                      {slot.endDay - slot.startDay >= 2 && "פנוי"}
                    </div>
                  ))}

                  {row.segments.map((seg, i) => (
                    <div
                      key={`seg-${i}`}
                      style={{ gridColumn: `${seg.startDay} / ${seg.endDay + 1}`, gridRow: 1 }}
                      className={cn(
                        "mx-0.5 flex h-9 items-center gap-1.5 overflow-hidden rounded px-2 text-xs font-medium",
                        SEGMENT_STYLE[seg.kind],
                      )}
                      title={`${seg.label}${seg.sub ? ` · ${seg.sub}` : ""}${
                        seg.clippedStart || seg.clippedEnd ? " (חורג מהחודש המוצג)" : ""
                      }`}
                    >
                      {seg.clippedStart && <span className="shrink-0 opacity-70">…</span>}
                      {seg.kind === "escrow" && <LockIcon className="size-3 shrink-0 opacity-80" />}
                      <span className="truncate">{seg.label}</span>
                      {seg.price != null && (
                        <span className="ms-auto shrink-0 opacity-80 max-sm:hidden">
                          {formatShekels(seg.price)}
                        </span>
                      )}
                      {seg.clippedEnd && <span className="shrink-0 opacity-70">…</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
