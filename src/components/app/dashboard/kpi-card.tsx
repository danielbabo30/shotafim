import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { StatusChip } from "@/components/app/status-chip";
import { ChevronLeftIcon } from "@/components/marketing/icons";
import type { ChipTone } from "@/lib/dashboard-brand";

type IconTone = "primary" | "neutral" | "warning" | "success" | "error";

const ICON_TONES: Record<IconTone, string> = {
  primary: "bg-primary-fixed text-primary",
  neutral: "bg-surface-container text-on-surface-variant",
  warning: "bg-warning-container text-warning",
  success: "bg-success-container text-success",
  error: "bg-error-container text-error",
};

/**
 * כרטיס KPI ללוח-הבקרה — אייקון, תווית, ערך גדול, ורמזים אופציונליים.
 * מיושר לרצועת ה-KPI ב-DESIGN (accent בקצה ההתחלה, נקודת "חי", תגית).
 * עם `href` — הכרטיס כולו לחיץ ומוביל למסך הרלוונטי, עם הרמה עדינה ב-hover.
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
  danger = false,
  href,
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
  /** טיפול "דורש טיפול" — מסגרת ורקע בגוון error, תווית וערך אדומים */
  danger?: boolean;
  /** יעד ניווט — הופך את הכרטיס כולו ל-<Link> */
  href?: string;
}) {
  const className = cn(
    "shadow-ambient-sm group relative flex flex-col overflow-hidden rounded-xl border p-5",
    danger ? "border-error bg-error-container/25" : "border-outline-variant bg-surface-lowest",
    href &&
      "hover:shadow-ambient focus-visible:ring-primary transition-all outline-none hover:-translate-y-0.5 focus-visible:ring-2",
  );

  const body = (
    <>
      {accent && (
        <span
          className={cn("absolute inset-y-0 start-0 w-1", danger ? "bg-error" : "bg-primary")}
          aria-hidden
        />
      )}
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
        {badge ? (
          <StatusChip tone={badge.tone ?? "neutral"} className="px-2 py-0.5">
            {badge.label}
          </StatusChip>
        ) : href ? (
          <ChevronLeftIcon
            className={cn(
              "size-5 transition-colors",
              danger ? "text-error/70 group-hover:text-error" : "text-on-surface-variant group-hover:text-primary",
            )}
            aria-hidden
          />
        ) : null}
      </div>

      <p className={cn("mb-1 text-sm", danger ? "text-error" : "text-on-surface-variant")}>{label}</p>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className={cn("font-display text-3xl font-bold", danger ? "text-error" : "text-on-surface")}>
          {value}
        </p>
        {hint && <p className="text-on-surface-variant text-sm">{hint}</p>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}
