import { cn } from "@/lib/cn";

/** פס התקדמות לתהליך ההרשמה הרב-שלבי. */
export function AuthProgress({
  step,
  total,
  label,
  center = false,
}: {
  step: number;
  total: number;
  label: string;
  center?: boolean;
}) {
  const pct = Math.round((step / total) * 100);

  return (
    <div className={cn("mb-10", center && "text-center")}>
      <p className="text-on-surface-variant mb-2 text-xs font-semibold">
        שלב {step} מתוך {total}: {label}
      </p>
      <div
        className={cn(
          "bg-surface-container h-2 w-full overflow-hidden rounded-full",
          center && "mx-auto max-w-md",
        )}
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="bg-primary h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
