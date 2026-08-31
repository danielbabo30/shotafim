import { cn } from "@/lib/cn";

/** ראשי-תיבות משם — עד שתי אותיות, פיצול לפי רווח / קו-תחתון / מקף */
function initials(name: string): string {
  const tokens = name.split(/[\s_\-—]+/u).filter(Boolean);
  return tokens
    .slice(0, 2)
    .map((t) => t[0]!)
    .join("")
    .toUpperCase();
}

/**
 * אווטאר עגול לשיחה — תמונה אם יש, אחרת ראשי-תיבות על רקע משטח.
 * משותף לרשימת השיחות ולכותרת ה-thread.
 */
export function MessageAvatar({
  name,
  src,
  online,
  className,
}: {
  name: string;
  src?: string;
  online?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="border-outline-variant size-full rounded-full border object-cover"
        />
      ) : (
        <span className="border-outline-variant bg-surface-container text-on-surface-variant font-display grid size-full place-items-center rounded-full border text-sm font-bold">
          {initials(name)}
        </span>
      )}
      {online ? (
        <span
          className="bg-success border-surface-lowest absolute end-0 bottom-0 size-3 rounded-full border-2"
          aria-hidden
        />
      ) : null}
    </span>
  );
}
