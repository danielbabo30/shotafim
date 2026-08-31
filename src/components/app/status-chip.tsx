import { cn } from "@/lib/cn";
import type { ChipTone } from "@/lib/dashboard-brand";

const TONES: Record<ChipTone, string> = {
  primary: "bg-primary-fixed text-on-primary-fixed",
  neutral: "bg-surface-container text-on-surface-variant",
  warning: "bg-warning-container text-warning",
  success: "bg-success-container text-success",
};

/** תגית סטטוס (pill) — רקע רווי-נמוך, טקסט רווי-גבוה. משותפת ללוח-הבקרה. */
export function StatusChip({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: ChipTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
