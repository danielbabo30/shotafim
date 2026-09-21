"use client";

import { cn } from "@/lib/cn";
import { PlusIcon, LocationIcon } from "@/components/marketing/icons";

export type MapPoint = {
  id: string;
  title: string;
  priceShort: string;
  availability: "immediate" | "booked";
  map: { x: number; y: number };
};

/**
 * מפה סכמטית — תצוגת מיקומים משוערת מעל רשת. שילוב מפה אמיתית (ספק מפות)
 * יגיע בהמשך; הפינים ממוקמים לפי אחוזים מנתוני השטח.
 */
export function AdSpaceMap({
  points,
  hoveredId,
  onHover,
}: {
  points: MapPoint[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}) {
  return (
    <div className="border-outline-variant bg-surface-low relative h-[600px] overflow-hidden rounded-xl border">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-outline-variant) 1px, transparent 1px), linear-gradient(90deg, var(--color-outline-variant) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          opacity: 0.45,
        }}
        aria-hidden
      />

      <span className="bg-surface-lowest/90 text-on-surface-variant border-outline-variant absolute start-3 top-3 rounded-full border px-2.5 py-1 text-xs backdrop-blur">
        מפה סכמטית — מיקומים משוערים
      </span>

      {points.map((p) => {
        const active = hoveredId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onMouseEnter={() => onHover(p.id)}
            onMouseLeave={() => onHover(null)}
            title={p.title}
            style={{ insetInlineStart: `${p.map.x}%`, top: `${p.map.y}%` }}
            className={cn(
              "shadow-ambient absolute -translate-x-1/2 -translate-y-full rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-transform",
              p.availability === "booked"
                ? "bg-surface-lowest text-on-surface-variant border-outline-variant border"
                : "bg-primary text-on-primary",
              active && "z-10 scale-110",
            )}
          >
            {p.priceShort}
          </button>
        );
      })}

      {points.length === 0 && (
        <p className="text-on-surface-variant absolute inset-0 grid place-items-center text-sm">
          אין שטחים תואמים להצגה על המפה
        </p>
      )}

      {/* פקדי תצוגה — ויזואליים, מפה אינטראקטיבית תגיע עם ספק המפות */}
      <div className="absolute end-4 top-4 flex flex-col gap-2" aria-hidden>
        <span className="border-outline-variant bg-surface-lowest text-on-surface-variant grid size-9 place-items-center rounded-lg border">
          <PlusIcon className="size-4" />
        </span>
        <span className="border-outline-variant bg-surface-lowest text-on-surface-variant grid size-9 place-items-center rounded-lg border">
          <span className="block h-0.5 w-3.5 rounded bg-current" />
        </span>
        <span className="border-outline-variant bg-surface-lowest text-on-surface-variant mt-1 grid size-9 place-items-center rounded-lg border">
          <LocationIcon className="size-4" />
        </span>
      </div>

      <div className="border-outline-variant bg-surface-lowest/90 absolute start-1/2 bottom-4 flex -translate-x-1/2 items-center gap-5 rounded-lg border px-4 py-2.5 backdrop-blur">
        <span className="text-on-surface-variant flex items-center gap-2 text-xs">
          <span className="bg-primary size-3 rounded-full" />
          זמין מיידית
        </span>
        <span className="text-on-surface-variant flex items-center gap-2 text-xs">
          <span className="border-outline-variant bg-surface-lowest size-3 rounded-full border-2" />
          תפוס
        </span>
      </div>
    </div>
  );
}
