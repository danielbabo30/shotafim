import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Tone = "primary" | "success" | "neutral";

const ICON_TONES: Record<Tone, string> = {
  primary: "bg-surface-highest text-primary",
  success: "bg-success-container text-success",
  neutral: "bg-surface-container text-on-surface-variant",
};

/**
 * כרטיס KPI של האזור האישי — תווית, ערך גדול (font-display), אייקון ורמז תחתון.
 * משטח לבן עם מסגרת 1px וצל אמביינטי (DESIGN.md § Elevation).
 */
export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  /** יעד ניווט — הופך את הכרטיס כולו ל-<Link> עם הרמה עדינה ב-hover */
  href?: string;
}) {
  const className = cn(
    "border-outline-variant bg-surface-lowest shadow-ambient group flex flex-col gap-4 rounded-xl border p-6",
    href &&
      "hover:shadow-ambient-lg focus-visible:ring-primary transition-all outline-none hover:-translate-y-0.5 focus-visible:ring-2",
  );

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-on-surface-variant text-sm font-medium">{label}</h3>
          <p className="text-on-surface font-display text-3xl font-bold">{value}</p>
        </div>
        <span
          className={cn("grid size-10 shrink-0 place-items-center rounded-lg", ICON_TONES[tone])}
        >
          {icon}
        </span>
      </div>
      {hint ? (
        <p className="text-on-surface-variant flex items-center gap-1.5 text-xs font-medium">
          {hint}
        </p>
      ) : null}
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
