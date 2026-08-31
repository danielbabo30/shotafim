import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { StatusChip } from "@/components/app/status-chip";
import type { ChipTone } from "@/lib/dashboard-brand";

type IconTone = "primary" | "neutral" | "warning" | "success";

const ICON_TONES: Record<IconTone, string> = {
  primary: "bg-primary-fixed text-primary",
  neutral: "bg-surface-container text-on-surface-variant",
  warning: "bg-warning-container text-warning",
  success: "bg-success-container text-success",
};

/**
 * כרטיס KPI ללוח-הבקרה — אייקון, תווית, ערך גדול, ורמזים אופציונליים.
 * מיושר לרצועת ה-KPI ב-DESIGN (accent בקצה ההתחלה, נקודת "חי", תגית).
 */
export function KpiCard({
  icon,
  iconTone = "neutral",
  label,
  value,
  hint,
  badge,
  accent = false,
  live = false,
}: {
  icon: ReactNode;
  iconTone?: IconTone;
  label: string;
  value: string;
  hint?: string;
  badge?: { label: string; tone?: ChipTone };
  /** פס-accent אנכי בקצה ההתחלה של הכרטיס */
  accent?: boolean;
  /** נקודת פעימה ירוקה בפינה — משהו קורה עכשיו */
  live?: boolean;
}) {
  return (
    <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm relative flex flex-col overflow-hidden rounded-xl border p-5">
      {accent && <span className="bg-primary absolute inset-y-0 start-0 w-1" aria-hidden />}
      {live && (
        <span className="absolute end-4 top-4 flex size-3" aria-hidden>
          <span className="bg-success absolute inline-flex size-full animate-ping rounded-full opacity-75" />
          <span className="bg-success relative inline-flex size-3 rounded-full" />
        </span>
      )}

      <div className="mb-4 flex items-start justify-between gap-3">
        <span className={cn("grid size-9 place-items-center rounded-lg", ICON_TONES[iconTone])}>
          {icon}
        </span>
        {badge && (
          <StatusChip tone={badge.tone ?? "neutral"} className="px-2 py-0.5">
            {badge.label}
          </StatusChip>
        )}
      </div>

      <p className="text-on-surface-variant mb-1 text-sm">{label}</p>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="font-display text-on-surface text-3xl font-bold">{value}</p>
        {hint && <p className="text-on-surface-variant text-sm">{hint}</p>}
      </div>
    </div>
  );
}
